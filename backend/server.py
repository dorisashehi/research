from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import pandas as pd
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import sys
import traceback

# Add chatbot directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'chatbot'))
from intent_classifier import classify_query

app = FastAPI(
    title="OpenAlex Physical Sciences API with Chatbot",
    version="1.3",
    description="API for exploring global research trends with AI-powered chatbot"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = "data"
data_cache = None


def load_data():
    global data_cache

    if data_cache is not None:
        return data_cache

    try:
        # Initialize with base files
        data_cache = {
            'fields': pd.read_csv(os.path.join(DATA_DIR, 'fields.csv')),
            'subfields': pd.read_csv(os.path.join(DATA_DIR, 'top_subfields_us.csv')),
            'funders': pd.read_csv(os.path.join(DATA_DIR, 'subfield_funders_us.csv')),
            'topics': pd.read_csv(os.path.join(DATA_DIR, 'top_topics_us.csv'))
        }

        # Load subfield topics data
        subfield_topics_path = os.path.join(DATA_DIR, 'subfield_topics_us.csv')
        if os.path.exists(subfield_topics_path):
            data_cache['subfield_topics'] = pd.read_csv(subfield_topics_path)

        # Load Yearly Trends Data
        yearly_sf_path = os.path.join(DATA_DIR, 'yearly_subfields.csv')
        if os.path.exists(yearly_sf_path):
            data_cache['yearly_subfields'] = pd.read_csv(yearly_sf_path)

        yearly_tp_path = os.path.join(DATA_DIR, 'yearly_subfield_topics.csv')
        if os.path.exists(yearly_tp_path):
            data_cache['yearly_topics'] = pd.read_csv(yearly_tp_path)

        print("✓ Data loaded successfully")
        return data_cache
    except Exception as e:
        print(f"Error loading data: {e}")
        return None


def reload_data():
    global data_cache
    data_cache = None
    return load_data()


# Pydantic models for request/response
class ClassifyRequest(BaseModel):
    query: str = Field(..., description="Query to classify")


class ChatRequest(BaseModel):
    message: str = Field(..., description="Chat message")
    country: Optional[str] = Field(None, description="Optional country filter")


@app.get('/')
async def home():
    return {
        'name': 'OpenAlex Physical Sciences API with Chatbot',
        'version': '1.3',
        'endpoints': {
            '/api/health': 'Check API health',
            '/api/trends/years': 'Get list of available years',
            '/api/trends/graph?year=2023': 'Get subfields graph for a specific year',
            '/api/trends/topics?year=2023&subfield_id=X': 'Get topics graph for a subfield in a specific year',
            '/api/chat': 'Send a message to the chatbot and get a response',
            '/api/classify': 'Classify a query to determine intent and chart type'
        }
    }


@app.get('/api/health')
async def health():
    data = load_data()
    if data is None:
        raise HTTPException(status_code=500, detail='Data files not found')
    return {'status': 'healthy', 'data_loaded': True, 'intent_classifier': 'enabled'}


# --- EXISTING ENDPOINTS ---
@app.get('/api/fields')
async def get_fields():
    data = load_data()
    return {'count': len(data['fields']), 'data': data['fields'].to_dict('records')}


@app.get('/api/subfields/graph')
async def get_subfields_graph():
    """Standard All-Time Graph"""
    data = load_data()
    if data is None or 'subfields' not in data:
        raise HTTPException(status_code=500, detail='Data not loaded')
    subfields_df = data['subfields'].head(10)
    return generate_graph_from_df(subfields_df)


@app.get('/api/topics/subfield/{subfield_id}')
async def get_topics_by_subfield(subfield_id: int):
    """All-Time Topics for a Subfield"""
    data = load_data()
    if data is None or 'subfield_topics' not in data:
        raise HTTPException(status_code=500, detail='Data not loaded')

    topics_df = data['subfield_topics']
    matching = topics_df[topics_df['subfield_id'] == subfield_id]
    if len(matching) == 0:
        raise HTTPException(status_code=404, detail='No topics found')
    return generate_graph_from_df(matching)


# --- TRENDS ENDPOINTS ---
@app.get('/api/trends/years')
async def get_available_years():
    """Returns list of years available in the dataset."""
    data = load_data()
    if data is None or 'yearly_subfields' not in data:
        raise HTTPException(
            status_code=404,
            detail='Yearly data not found. Run save_data_csv.py first.'
        )
    years = sorted(data['yearly_subfields']['year'].unique().tolist())
    return {'years': years}


@app.get('/api/trends/graph')
async def get_yearly_graph(year: int = Query(..., description="Year to get data for")):
    """Returns subfields graph for a specific year."""
    data = load_data()
    if data is None or 'yearly_subfields' not in data:
        raise HTTPException(status_code=404, detail='Yearly data not found')

    df = data['yearly_subfields']
    yearly_df = df[df['year'] == year]

    if yearly_df.empty:
        raise HTTPException(status_code=404, detail=f'No data found for year {year}')

    graph_data = generate_graph_from_df(yearly_df)
    graph_data['year'] = year
    return graph_data


@app.get('/api/trends/topics')
async def get_yearly_topics_graph(
    year: int = Query(..., description="Year to get data for"),
    subfield_id: int = Query(..., description="Subfield ID")
):
    """
    Returns topics graph for a specific subfield AND year.
    Usage: /api/trends/topics?year=2023&subfield_id=3315
    """
    data = load_data()
    if data is None or 'yearly_topics' not in data:
        raise HTTPException(status_code=404, detail='Yearly topics data not found')

    df = data['yearly_topics']

    # Filter by both Year and Subfield ID
    filtered_df = df[
        (df['year'] == year) &
        (df['subfield_id'] == subfield_id)
    ]

    if filtered_df.empty:
        raise HTTPException(
            status_code=404,
            detail=f'No topics found for subfield {subfield_id} in {year}'
        )

    graph_data = generate_graph_from_df(filtered_df)
    graph_data['year'] = year
    graph_data['subfield_id'] = subfield_id
    return graph_data


# --- HELPER FUNCTIONS FOR DATA ACCESS ---
def _get_countries_data():
    """Helper function to get countries data (used by endpoints and chatbot)"""
    countries_dir = os.path.join(DATA_DIR, 'countries')
    if not os.path.exists(countries_dir):
        return None

    countries = []
    for country_code in os.listdir(countries_dir):
        country_path = os.path.join(countries_dir, country_code)
        if os.path.isdir(country_path):
            subfields_path = os.path.join(country_path, 'subfields.csv')
            if os.path.exists(subfields_path):
                df = pd.read_csv(subfields_path)
                total_works = df['works_count'].sum() if not df.empty else 0
                countries.append({
                    'code': country_code,
                    'subfields_count': len(df),
                    'total_works': int(total_works)
                })
    return countries


def _get_country_subfields_data(country_code):
    """Helper function to get subfields data for a country"""
    country_dir = os.path.join(DATA_DIR, 'countries', country_code.upper())
    subfields_path = os.path.join(country_dir, 'subfields.csv')

    if not os.path.exists(subfields_path):
        return None

    df = pd.read_csv(subfields_path)
    return df.to_dict('records')


def _get_country_data_internal(country_code):
    """Helper function to get full country data"""
    country_code = country_code.upper()
    country_dir = os.path.join(DATA_DIR, 'countries', country_code)
    subfields_path = os.path.join(country_dir, 'subfields.csv')
    topics_path = os.path.join(country_dir, 'topics.csv')

    if not os.path.exists(subfields_path):
        return None

    try:
        subfields_df = pd.read_csv(subfields_path)
        topics_df = pd.read_csv(topics_path) if os.path.exists(topics_path) else pd.DataFrame()

        subfields_list = []
        for _, row in subfields_df.iterrows():
            subfield_id = int(row['id'])
            subfield_topics = []

            if not topics_df.empty and 'subfield_id' in topics_df.columns:
                matching_topics = topics_df[topics_df['subfield_id'] == subfield_id]
                if not matching_topics.empty:
                    topic_records = matching_topics[['id', 'name', 'works_count']].to_dict('records')
                    subfield_topics = topic_records[:5]

            subfields_list.append({
                'id': str(subfield_id),
                'name': str(row['name']),
                'works_count': int(row['works_count']),
                'topics': subfield_topics
            })

        return {
            'country_code': country_code,
            'subfields': subfields_list
        }
    except Exception as e:
        print(f"Error reading data for {country_code}: {e}")
        return None


# --- COUNTRY ENDPOINTS ---
@app.get('/api/countries')
async def get_countries():
    countries = _get_countries_data()
    if countries is None:
        raise HTTPException(status_code=404, detail='Countries data not found')
    return {'count': len(countries), 'data': countries}


@app.get('/api/countries/{country_code}/subfields')
async def get_country_subfields(country_code: str):
    subfields = _get_country_subfields_data(country_code)
    if subfields is None:
        raise HTTPException(
            status_code=404,
            detail=f'No data found for country {country_code}'
        )
    return {'count': len(subfields), 'data': subfields}


@app.get('/api/countries/{country_code}/topics')
async def get_country_topics(
    country_code: str,
    subfield_id: Optional[int] = Query(None, description="Optional subfield ID filter")
):
    country_dir = os.path.join(DATA_DIR, 'countries', country_code.upper())
    topics_path = os.path.join(country_dir, 'topics.csv')

    if not os.path.exists(topics_path):
        raise HTTPException(
            status_code=404,
            detail=f'No topics data found for country {country_code}'
        )

    df = pd.read_csv(topics_path)

    if subfield_id:
        df = df[df['subfield_id'] == subfield_id]
        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f'No topics found for subfield {subfield_id}'
            )

    return {'count': len(df), 'data': df.to_dict('records')}


@app.get('/api/countries/{country_code}/data')
async def get_country_data(country_code: str):
    country_data = _get_country_data_internal(country_code)
    if country_data is None:
        raise HTTPException(
            status_code=404,
            detail=f'No data found for country {country_code}'
        )
    return country_data


# --- HELPER FUNCTION ---
def generate_graph_from_df(df):
    nodes = []
    names = []

    if df.empty:
        return {'nodes': [], 'links': []}

    # 1. Build Nodes
    for _, row in df.iterrows():
        nodes.append({
            'id': str(row['id']),
            'name': row['name'],
            'us_works_count': int(row['us_works_count']),
            'size': 10 + (int(row['us_works_count']) / df['us_works_count'].max() * 40)
        })
        names.append(row['name'])

    # 2. Build Links (Semantic Similarity)
    links = []
    try:
        if len(names) > 1:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(names)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            threshold = 0.10

            for i in range(len(nodes)):
                for j in range(i + 1, len(nodes)):
                    sim = float(similarity_matrix[i][j])
                    if sim > threshold:
                        links.append({
                            'source': nodes[i]['id'],
                            'target': nodes[j]['id'],
                            'similarity': sim,
                            'strength': sim
                        })
    except Exception as e:
        print(f"Similarity error: {e}")
        links = []

    return {
        'nodes': nodes,
        'links': links,
        'min_works_count': int(df['us_works_count'].min()),
        'max_works_count': int(df['us_works_count'].max())
    }


# --- CHATBOT ENDPOINTS ---
@app.post('/api/classify')
async def classify_intent(request: ClassifyRequest):
    """
    This endpoint just classifies a query - it doesn't generate a full response.
    Useful for testing or when you just want to know what type of chart is needed.
    """
    try:
        query = request.query

        # Make sure the query is valid
        if not isinstance(query, str) or not query.strip():
            raise HTTPException(
                status_code=400,
                detail='Query must be a non-empty string'
            )

        # Classify the query using our classifier
        classification = classify_query(query)

        # Return the results
        return {
            'success': True,
            'query': query,
            **classification
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f'Something went wrong: {str(e)}'
        )


@app.post('/api/chat')
async def chat(request: ChatRequest):
    """
    This is the main chat endpoint. Users send messages here and get responses.
    """
    try:
        message = request.message
        country = request.country

        # Make sure the message is valid
        if not isinstance(message, str) or not message.strip():
            raise HTTPException(
                status_code=400,
                detail='Message must be a non-empty string'
            )

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
            # Add the original query to classification for context
            classification['original_query'] = message
            chart_data = fetch_chart_data(classification, country)
            response['chart_config'] = {
                'type': classification['chart_type'],
                'data': chart_data,
                'title': generate_chart_title(message, classification),
                'description': generate_chart_description(classification)
            }

        return response

    except HTTPException:
        raise
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error in chat endpoint: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f'Something went wrong: {str(e)}'
        )


def generate_response(message, classification):
    """Generate a response message based on what the user asked for."""
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
    if intent == 'ranking':
        # Check if it's about countries
        query_lower = message.lower()
        is_country_ranking = any(keyword in query_lower for keyword in ['countries', 'country', 'nations', 'by research output', 'by output'])

        if is_country_ranking:
            limit = params.get('limit', 10)
            title = f"Top {limit} Countries by Research Output"
        elif params.get('limit'):
            title = f"Top {params['limit']} Rankings"
        else:
            title = "Top Rankings"
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
            subfield_name = subfields[0].title()
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
    Fetch actual data from the local functions based on the classification.
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

        # Ranking queries - get top subfields or countries
        if intent == 'ranking':
            limit = params.get('limit', 10)

            # Check if the query is about ranking countries (not subfields)
            query_lower = classification.get('original_query', '').lower() if isinstance(classification.get('original_query'), str) else ''
            is_country_ranking = any(keyword in query_lower for keyword in ['countries', 'country', 'nations', 'by research output', 'by output'])

            if is_country_ranking:
                # Rank countries by total research output
                try:
                    all_countries = _get_countries_data()
                    if all_countries:
                        # Sort countries by total_works (descending)
                        sorted_countries = sorted(
                            all_countries,
                            key=lambda x: x.get('total_works', 0),
                            reverse=True
                        )[:limit]

                        # Format for chart
                        return {
                            'labels': [c['code'] for c in sorted_countries],
                            'values': [c['total_works'] for c in sorted_countries],
                            'data': sorted_countries
                        }
                except Exception as e:
                    print(f"Error fetching country ranking data: {e}")
                    print(traceback.format_exc())
                    return None
            else:
                # Rank subfields within a country (original behavior)
                country_code = countries[0] if countries else 'US'

                try:
                    subfields = _get_country_subfields_data(country_code)
                    if subfields:
                        subfields = subfields[:limit]

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
            if len(subfield_names) >= 2:
                country_code = countries[0] if countries else (country or 'US')

                try:
                    all_subfields = _get_country_subfields_data(country_code)
                    if all_subfields:
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
            elif len(subfield_names) == 1 and len(countries) >= 2:
                subfield_name = subfield_names[0]

                for country_code in countries[:3]:  # Limit to 3 countries
                    try:
                        subfields = _get_country_subfields_data(country_code)
                        if subfields:
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

            # Default: compare total works across countries
            for country_code in countries[:3]:  # Limit to 3 countries
                try:
                    country_data = _get_country_data_internal(country_code)
                    if country_data:
                        total_works = sum(sf['works_count'] for sf in country_data.get('subfields', []))
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
                subfields = _get_country_subfields_data(country_code)
                if subfields:
                    subfields = subfields[:10]  # Top 10 for distribution

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
            subfields = _get_country_subfields_data(country_code)
            if subfields:
                subfields = subfields[:10]

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
        print(traceback.format_exc())
        return None

    return None


if __name__ == '__main__':
    import uvicorn
    print("Starting OpenAlex Physical Sciences API with Chatbot on port 5000...")
    print("Chatbot endpoints: /api/chat, /api/classify")
    print("API docs available at: http://localhost:5000/docs")
    # Use import string for reload to work properly
    uvicorn.run("server:app", host='0.0.0.0', port=5000, reload=True)
