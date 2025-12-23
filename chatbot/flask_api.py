"""
This is the Flask API for our chatbot.
It receives questions from users and figures out what kind of chart they need.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
from intent_classifier import classify_query

# Load environment variables from .env file
load_dotenv()

# Create the Flask app
app = Flask(__name__)
CORS(app)  # Allow requests from other domains (like our frontend)

# Get the port number from environment, or use 5050 as default
PORT = int(os.getenv('PORT', 5050))
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:5000')


@app.route('/')
def home():
    """This is the home page of our API"""
    return jsonify({
        'name': 'Chatbot API with Intent Classification',
        'version': '1.0.0',
        'endpoints': {
            '/api/health': 'Check if the API is working',
            '/api/chat': 'Send a message and get a response',
            '/api/classify': 'Just classify a query (without full response)'
        }
    })


@app.route('/api/health')
def health():
    """Check if the API is running and healthy"""
    return jsonify({
        'status': 'healthy',
        'service': 'chatbot-api',
        'intent_classifier': 'enabled'
    })


@app.route('/api/classify', methods=['POST'])
def classify_intent():
    """
    This endpoint just classifies a query - it doesn't generate a full response.
    Useful for testing or when you just want to know what type of chart is needed.

    Example request:
    {
        "query": "Show me the top 10 subfields in US"
    }

    Example response:
    {
        "success": true,
        "query": "Show me the top 10 subfields in US",
        "intent": "ranking",
        "confidence": 0.2,
        "chart_type": "bar",
        "requires_chart": true,
        "parameters": {
            "countries": ["US"],
            "years": [],
            "limit": 10
        }
    }
    """
    try:
        # Get the data from the request
        data = request.get_json()

        # Check if the query field exists
        if not data or 'query' not in data:
            return jsonify({
                'error': 'Please provide a "query" field in your request'
            }), 400

        query = data['query']

        # Make sure the query is valid
        if not isinstance(query, str) or not query.strip():
            return jsonify({
                'error': 'Query must be a non-empty string'
            }), 400

        # Classify the query using our classifier
        classification = classify_query(query)

        # Return the results
        return jsonify({
            'success': True,
            'query': query,
            **classification  # Add all classification results
        })

    except Exception as e:
        # If something goes wrong, return an error
        return jsonify({
            'error': f'Something went wrong: {str(e)}'
        }), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    This is the main chat endpoint. Users send messages here and get responses.

    Example request:
    {
        "message": "Show me the top 10 subfields in Physical Sciences",
        "country": "US"  // optional
    }

    Example response:
    {
        "response": "I'll show you the rankings. Fetching the top items...",
        "intent": {
            "intent": "ranking",
            "confidence": 0.2,
            "chart_type": "bar",
            "requires_chart": true,
            "parameters": {
                "countries": ["US"],
                "years": [],
                "limit": 10
            }
        },
        "has_chart": true,
        "chart_config": {
            "type": "bar",
            "data": null,
            "title": "Top 10 Rankings",
            "description": "This bar chart shows items ranked by their values."
        }
    }
    """
    try:
        # Get the data from the request
        data = request.get_json()

        # Check if the message field exists
        if not data or 'message' not in data:
            return jsonify({
                'error': 'Please provide a "message" field in your request'
            }), 400

        message = data['message']
        country = data.get('country', None)  # Optional country filter

        # Make sure the message is valid
        if not isinstance(message, str) or not message.strip():
            return jsonify({
                'error': 'Message must be a non-empty string'
            }), 400

        # Classify the message to understand what the user wants
        classification = classify_query(message)

        # If a country was provided, add it to the parameters
        if country:
            if 'parameters' not in classification:
                classification['parameters'] = {}
            if 'countries' not in classification['parameters']:
                classification['parameters']['countries'] = []
            if country.upper() not in classification['parameters']['countries']:
                classification['parameters']['countries'].append(country.upper())

        # Generate a response message
        # (Later this will use a RAG system, but for now we use a simple placeholder)
        response_text = generate_response(message, classification)

        # Build the response
        response = {
            'response': response_text,
            'intent': {
                'intent': classification['intent'],
                'confidence': classification['confidence'],
                'chart_type': classification['chart_type'],
                'requires_chart': classification['requires_chart'],
                'parameters': classification.get('parameters', {})
            },
            'has_chart': classification['requires_chart'],
        }

        # If a chart is needed, fetch actual data and add chart configuration
        if classification['requires_chart']:
            chart_data = fetch_chart_data(classification, country)
            response['chart_config'] = {
                'type': classification['chart_type'],
                'data': chart_data,
                'title': generate_chart_title(message, classification),
                'description': generate_chart_description(classification)
            }

        return jsonify(response)

    except Exception as e:
        # If something goes wrong, return an error with more details
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in chat endpoint: {error_details}")
        return jsonify({
            'error': f'Something went wrong: {str(e)}',
            'details': error_details if app.debug else None
        }), 500


def generate_response(message, classification):
    """
    Generate a response message based on what the user asked for.
    This is a simple version - later it will use a RAG system.
    """
    intent = classification['intent']

    # If no chart is needed, just acknowledge the question
    if intent == 'none':
        return f"I understand you're asking about: {message}. I'm processing your query..."

    # Different responses based on what type of chart is needed
    responses = {
        'comparison': "I'll help you compare the research data. Let me fetch the relevant information...",
        'trend': "I'll show you the trends over time. Analyzing the data...",
        'distribution': "I'll display the distribution breakdown. Gathering the data...",
        'ranking': "I'll show you the rankings. Fetching the top items...",
        'statistical': "I'll create a visualization for you. Processing the data...",
    }

    return responses.get(intent, "I'm processing your query and will generate a visual response...")


def generate_chart_title(message, classification):
    """Create a title for the chart based on the user's question"""
    intent = classification['intent']
    params = classification.get('parameters', {})

    # Start with a simple title (first 50 characters of the message)
    title = message[:50]

    # Make it better based on what type of chart it is
    if intent == 'ranking' and params.get('limit'):
        title = f"Top {params['limit']} Rankings"
    elif intent == 'comparison':
        countries = params.get('countries', [])
        subfields = params.get('subfields', [])

        if subfields and len(subfields) >= 2:
            # Multiple subfields comparison
            subfield_names = [s.title() for s in subfields[:2]]
            country_text = f" in {', '.join(countries)}" if countries else ""
            title = f"Subfield Comparison: {' vs '.join(subfield_names)}{country_text}"
        elif subfields and countries:
            # Subfield-specific comparison across countries
            subfield_name = subfields[0].title()  # Capitalize first letter
            title = f"{subfield_name} Comparison: {', '.join(countries)}"
        elif countries:
            # General country comparison
            title = f"Comparison: {', '.join(countries)}"
    elif intent == 'trend':
        years = params.get('years', [])
        if years:
            title = f"Trends ({min(years)}-{max(years)})"

    return title


def generate_chart_description(classification):
    """Create a description explaining what the chart shows"""
    intent = classification['intent']
    chart_type = classification['chart_type']

    # Different descriptions for different chart types
    descriptions = {
        'comparison': f"This {chart_type} chart compares the selected items side by side.",
        'trend': f"This {chart_type} chart shows how values have changed over time.",
        'distribution': f"This {chart_type} chart displays the proportional breakdown.",
        'ranking': f"This {chart_type} chart shows items ranked by their values.",
        'statistical': f"This {chart_type} chart visualizes the requested statistical data.",
    }

    return descriptions.get(intent, f"This {chart_type} chart displays the requested data.")


def fetch_chart_data(classification, country=None):
    """
    Fetch actual data from the main API based on the classification.
    This function gets the data needed to render the chart.
    """
    try:
        intent = classification.get('intent', 'none')
        params = classification.get('parameters', {})
        chart_type = classification.get('chart_type', 'bar')
        # Get countries to compare/analyze
        countries = params.get('countries', [])
        if country and country not in countries:
            countries.append(country)
        if not countries:
            countries = ['US']  # Default to US if no country specified

        # Ranking queries - get top subfields
        if intent == 'ranking':
            limit = params.get('limit', 10)
            country_code = countries[0] if countries else 'US'

            try:
                response = requests.get(
                    f"{API_BASE_URL}/api/countries/{country_code}/subfields",
                    timeout=5
                )
                if response.status_code == 200:
                    data = response.json()
                    subfields = data.get('data', [])[:limit]

                    # Format for chart
                    return {
                        'labels': [sf['name'] for sf in subfields],
                        'values': [sf['works_count'] for sf in subfields],
                        'data': subfields
                    }
            except Exception as e:
                print(f"Error fetching ranking data: {e}")
                return None

        # Comparison queries - compare multiple countries or subfields
        elif intent == 'comparison':
            comparison_data = []
            subfield_names = params.get('subfields', [])

            # Case 1: Compare multiple subfields (same country or different countries)
            # Example: "Compare ecology and physics" or "Compare ecology and physics in US"
            if len(subfield_names) >= 2:
                # Multiple subfields to compare
                country_code = countries[0] if countries else (country or 'US')

                try:
                    response = requests.get(
                        f"{API_BASE_URL}/api/countries/{country_code}/subfields",
                        timeout=5
                    )
                    if response.status_code == 200:
                        data = response.json()
                        all_subfields = data.get('data', [])

                        # Find each subfield mentioned
                        for subfield_name in subfield_names[:5]:  # Limit to 5 subfields
                            subfield_lower = subfield_name.lower()
                            matching_subfield = None

                            # Try to find the subfield
                            for sf in all_subfields:
                                sf_name_lower = str(sf.get('name', '')).lower()
                                if subfield_lower == sf_name_lower or subfield_lower in sf_name_lower or sf_name_lower in subfield_lower:
                                    if not matching_subfield or len(sf_name_lower) > len(str(matching_subfield.get('name', '')).lower()):
                                        matching_subfield = sf

                            if matching_subfield:
                                comparison_data.append({
                                    'name': matching_subfield.get('name', 'Unknown'),
                                    'value': matching_subfield.get('works_count', 0),
                                    'country': country_code,
                                    'subfield': matching_subfield.get('name', 'Unknown')
                                })

                        if comparison_data:
                            return {
                                'labels': [item['name'] for item in comparison_data],
                                'values': [item['value'] for item in comparison_data],
                                'data': comparison_data
                            }
                except Exception as e:
                    print(f"Error fetching subfield comparison data: {e}")

            # Case 2: Compare one subfield across multiple countries
            # Example: "Compare ecology in US and CA"
            elif len(subfield_names) == 1 and len(countries) >= 2:
                subfield_name = subfield_names[0]

                for country_code in countries[:3]:  # Limit to 3 countries
                    try:
                        response = requests.get(
                            f"{API_BASE_URL}/api/countries/{country_code}/subfields",
                            timeout=5
                        )
                        if response.status_code == 200:
                            data = response.json()
                            subfields = data.get('data', [])

                            # Find the subfield by name (case-insensitive, partial match)
                            matching_subfield = None
                            subfield_lower = subfield_name.lower()

                            # First try: exact match (case-insensitive)
                            for sf in subfields:
                                sf_name_lower = str(sf.get('name', '')).lower()
                                if sf_name_lower == subfield_lower:
                                    matching_subfield = sf
                                    break

                            # Second try: subfield name contains the search term or vice versa
                            if not matching_subfield:
                                for sf in subfields:
                                    sf_name_lower = str(sf.get('name', '')).lower()
                                    if subfield_lower in sf_name_lower or sf_name_lower in subfield_lower:
                                        if not matching_subfield or len(sf_name_lower) > len(str(matching_subfield.get('name', '')).lower()):
                                            matching_subfield = sf

                            if matching_subfield:
                                comparison_data.append({
                                    'name': f"{country_code}",
                                    'value': matching_subfield.get('works_count', 0),
                                    'country': country_code,
                                    'subfield': matching_subfield.get('name', 'Unknown'),
                                    'full_label': f"{country_code} - {matching_subfield.get('name', 'Unknown')}"
                                })
                    except Exception as e:
                        print(f"Error fetching comparison data for {country_code}: {e}")
                        continue

                if comparison_data:
                    labels = []
                    for item in comparison_data:
                        labels.append(f"{item['country']} - {item['subfield']}")

                    return {
                        'labels': labels,
                        'values': [item['value'] for item in comparison_data],
                        'data': comparison_data,
                        'subfield_name': subfield_name
                    }

            # Default: compare total works across countries (original behavior)
            for country_code in countries[:3]:  # Limit to 3 countries
                try:
                    response = requests.get(
                        f"{API_BASE_URL}/api/countries/{country_code}/data",
                        timeout=5
                    )
                    if response.status_code == 200:
                        data = response.json()
                        total_works = sum(sf['works_count'] for sf in data.get('subfields', []))
                        comparison_data.append({
                            'name': country_code,
                            'value': total_works
                        })
                except Exception as e:
                    print(f"Error fetching comparison data for {country_code}: {e}")
                    continue

            if comparison_data:
                return {
                    'labels': [item['name'] for item in comparison_data],
                    'values': [item['value'] for item in comparison_data],
                    'data': comparison_data
                }

        # Distribution queries - show distribution of subfields
        elif intent == 'distribution':
            country_code = countries[0] if countries else 'US'

            try:
                response = requests.get(
                    f"{API_BASE_URL}/api/countries/{country_code}/subfields",
                    timeout=5
                )
                if response.status_code == 200:
                    data = response.json()
                    subfields = data.get('data', [])[:10]  # Top 10 for distribution

                    total = sum(sf['works_count'] for sf in subfields)

                    return {
                        'labels': [sf['name'] for sf in subfields],
                        'values': [sf['works_count'] for sf in subfields],
                        'percentages': [round((sf['works_count'] / total * 100), 1) if total > 0 else 0 for sf in subfields],
                        'data': subfields
                    }
            except Exception as e:
                print(f"Error fetching distribution data: {e}")
                return None

        # Default: return ranking data
        country_code = countries[0] if countries else 'US'
        try:
            response = requests.get(
                f"{API_BASE_URL}/api/countries/{country_code}/subfields",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                subfields = data.get('data', [])[:10]

                return {
                    'labels': [sf['name'] for sf in subfields],
                    'values': [sf['works_count'] for sf in subfields],
                    'data': subfields
                }
        except Exception as e:
            print(f"Error fetching default data: {e}")
            return None

    except Exception as e:
        print(f"Error in fetch_chart_data: {e}")
        import traceback
        print(traceback.format_exc())
        return None

    return None


# Run the app when this file is executed
if __name__ == '__main__':
    print(f"Starting Chatbot API on port {PORT}...")
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Intent Classification: Enabled")
    app.run(debug=True, host='0.0.0.0', port=PORT)
