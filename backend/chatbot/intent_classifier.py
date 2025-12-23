"""
This file helps us understand what the user wants when they ask a question.
It figures out if they want a chart and what kind of chart they need.
"""

import re
from enum import Enum


# These are the different types of questions users might ask
class ChartIntent(Enum):
    COMPARISON = "comparison"      # User wants to compare things
    TREND = "trend"                # User wants to see trends over time
    DISTRIBUTION = "distribution"   # User wants to see how things are distributed
    RANKING = "ranking"            # User wants to see rankings (top 10, etc.)
    STATISTICAL = "statistical"     # User explicitly asks for a chart
    NONE = "none"                  # User doesn't need a chart


class IntentClassifier:
    """
    This class looks at what the user typed and figures out what they want.
    It's like a smart helper that understands different ways people ask for charts.
    """

    def __init__(self):
        """When we create this class, we set up all the patterns to look for"""

        # Words that mean the user wants to COMPARE things
        # Like "compare", "versus", "vs", "which is higher", etc.
        self.comparison_keywords = [
            'compare', 'comparison', 'versus', 'vs', 'vs.',
            'which is higher', 'which is lower', 'which is better',
            'difference between', 'compared to', 'compared with',
            'contrast'
        ]

        # Words that mean the user wants to see TRENDS
        # Like "trends", "how has it changed", "over time", etc.
        self.trend_keywords = [
            'trends', 'trend', 'how has', 'how have',
            'changed', 'evolved', 'developed', 'grown',
            'increased', 'decreased', 'over time', 'over the years',
            'from 2020 to 2023', 'time series', 'historical'
        ]

        # Words that mean the user wants to see DISTRIBUTION
        # Like "distribution", "breakdown", "composition", etc.
        self.distribution_keywords = [
            'distribution', 'breakdown', 'composition',
            'proportion', 'percentage', 'share', 'split',
            'allocation', 'spread'
        ]

        # Words that mean the user wants to see RANKINGS
        # Like "top 10", "best", "highest", "rank", etc.
        self.ranking_keywords = [
            'top', 'best', 'highest', 'lowest', 'leading',
            'rank', 'ranking', 'ranked', 'order', 'sorted'
        ]

        # Words that mean the user explicitly wants a CHART
        # Like "show me a chart", "visualize", "graph", etc.
        self.chart_keywords = [
            'chart', 'graph', 'plot', 'visualization',
            'visualize', 'show me a chart', 'display a graph',
            'create a chart', 'generate a chart'
        ]

    def classify(self, user_query):
        """
        This is the main function. It takes what the user typed and figures out what they want.

        Args:
            user_query: The question the user asked (a string)

        Returns:
            A dictionary with information about what we found
        """
        # First, check if the query is valid
        if not user_query or not isinstance(user_query, str):
            return self._no_chart_needed()

        # Convert to lowercase to make matching easier
        query_lower = user_query.lower().strip()

        # Check what type of question this is
        # We'll check each type and see which one matches best

        # Check for comparison
        comparison_score = self._check_keywords(query_lower, self.comparison_keywords)

        # Check for trends
        trend_score = self._check_keywords(query_lower, self.trend_keywords)

        # Check for distribution
        distribution_score = self._check_keywords(query_lower, self.distribution_keywords)

        # Check for ranking
        ranking_score = self._check_keywords(query_lower, self.ranking_keywords)

        # Check for explicit chart request
        chart_score = self._check_keywords(query_lower, self.chart_keywords)

        # Find which one has the highest score
        scores = {
            ChartIntent.COMPARISON: comparison_score,
            ChartIntent.TREND: trend_score,
            ChartIntent.DISTRIBUTION: distribution_score,
            ChartIntent.RANKING: ranking_score,
            ChartIntent.STATISTICAL: chart_score
        }

        # Get the best match
        best_match = max(scores.items(), key=lambda x: x[1])
        best_intent = best_match[0]
        best_score = best_match[1]

        # If no keywords were found, user doesn't need a chart
        if best_score == 0:
            return self._no_chart_needed()

        # Calculate confidence (how sure we are)
        # More keywords found = higher confidence
        confidence = min(best_score / 5.0, 1.0)  # Normalize to 0-1

        # Figure out what type of chart to use
        chart_type = self._pick_chart_type(best_intent, query_lower)

        # Return our findings
        return {
            'intent': best_intent.value,
            'confidence': round(confidence, 2),
            'chart_type': chart_type,
            'requires_chart': True,
        }

    def _check_keywords(self, query, keywords):
        """
        Helper function to count how many keywords we found in the query.
        More matches = higher score.
        """
        score = 0
        for keyword in keywords:
            if keyword in query:
                score += 1
        return score

    def _pick_chart_type(self, intent, query):
        """
        Based on what the user wants, pick the best chart type.
        For example, comparisons work well with bar charts,
        trends work well with line charts, etc.
        """
        # First, check if user specifically asked for a chart type
        if 'bar' in query or 'column' in query:
            return 'bar'
        if 'line' in query or 'trend' in query:
            return 'line'
        if 'pie' in query or 'donut' in query:
            return 'pie'
        if 'scatter' in query:
            return 'scatter'

        # Otherwise, pick based on intent type
        if intent == ChartIntent.COMPARISON:
            return 'bar'  # Bar charts are good for comparing
        elif intent == ChartIntent.TREND:
            return 'line'  # Line charts show trends over time
        elif intent == ChartIntent.DISTRIBUTION:
            return 'pie'  # Pie charts show distributions
        elif intent == ChartIntent.RANKING:
            return 'bar'  # Bar charts are good for rankings
        else:
            return 'bar'  # Default to bar chart

    def _no_chart_needed(self):
        """Return a response saying no chart is needed"""
        return {
            'intent': ChartIntent.NONE.value,
            'confidence': 0.0,
            'chart_type': None,
            'requires_chart': False,
        }

    def extract_parameters(self, query, intent):
        """
        Extract useful information from the user's question.
        Like which countries they mentioned, what years, etc.
        """
        # Start with empty parameters
        params = {
            'countries': [],
            'years': [],
            'limit': None,
            'subfields': [],  # For subfield-specific comparisons
        }

        query_lower = query.lower()
        query_upper = query.upper()

        # Look for country names
        country_map = {
            'usa': 'US', 'united states': 'US', 'united states of america': 'US',
            'uk': 'GB', 'united kingdom': 'GB', 'britain': 'GB',
            'china': 'CN',
            'japan': 'JP',
            'germany': 'DE',
            'france': 'FR',
            'canada': 'CA',
            'australia': 'AU',
            'india': 'IN',
            'south korea': 'KR', 'korea': 'KR',
            'russia': 'RU',
            'brazil': 'BR',
            'mexico': 'MX',
        }

        # Check if any country names are in the query
        found_countries = []
        for country_name, country_code in country_map.items():
            if country_name in query_lower:
                if country_code not in found_countries:
                    found_countries.append(country_code)

        # Also look for 2-letter country codes (like US, CN, etc.)
        # But be careful - we don't want to match common words like "in", "of", "me"
        common_words = {'IN', 'OF', 'ME', 'IS', 'TO', 'BY', 'ON', 'AT', 'AN', 'AS', 'IT', 'IF', 'OR', 'BE', 'DO', 'WE', 'HE', 'SO', 'UP', 'GO', 'NO', 'MY', 'AM'}

        # Find all 2-letter uppercase words
        import re
        two_letter_codes = re.findall(r'\b([A-Z]{2})\b', query_upper)

        # Add valid country codes (not common words)
        for code in two_letter_codes:
            if code not in common_words and code not in found_countries:
                found_countries.append(code)

        if found_countries:
            params['countries'] = list(set(found_countries))

        # Look for years (4-digit numbers starting with 19 or 20)
        import re
        years_found = re.findall(r'\b(19|20)\d{2}\b', query)
        if years_found:
            # Get the full year numbers
            full_years = []
            for match in re.finditer(r'\b(19|20)\d{2}\b', query):
                full_years.append(int(match.group()))
            params['years'] = sorted(list(set(full_years)))

        # If it's a ranking question, look for numbers (like "top 10")
        if intent == ChartIntent.RANKING:
            import re
            # Look for patterns like "top 10", "top 5", etc.
            top_match = re.search(r'\btop (\d+)\b', query_lower)
            if top_match:
                params['limit'] = int(top_match.group(1))
            else:
                # Default to 10 if no number specified
                params['limit'] = 10

        # Extract subfield names from the query (for subfield-specific comparisons)
        # Common subfield names in research
        common_subfields = [
            'ecology', 'physics', 'chemistry', 'biology', 'mathematics',
            'engineering', 'computer science', 'astronomy', 'geology',
            'materials science', 'environmental science', 'biochemistry',
            'quantum physics', 'molecular biology', 'neuroscience',
            'genetics', 'evolution', 'climate', 'energy', 'nanotechnology',
            'artificial intelligence', 'machine learning', 'data science',
            'biomedical', 'mechanical engineering', 'electrical engineering',
            'civil engineering', 'chemical engineering', 'aerospace',
            'statistics', 'computational', 'theoretical', 'applied',
        ]

        # Look for subfield names in the query (check longer names first)
        found_subfields = []
        for subfield in sorted(common_subfields, key=len, reverse=True):
            # Use word boundaries to match whole words
            pattern = r'\b' + re.escape(subfield) + r'\b'
            if re.search(pattern, query_lower):
                if subfield not in found_subfields:
                    found_subfields.append(subfield)
                    # Remove shorter matches if a longer one is found
                    found_subfields = [sf for sf in found_subfields if not (sf != subfield and sf in subfield)]

        if found_subfields:
            params['subfields'] = found_subfields

        return params


# Global variable to store our classifier (so we don't create it multiple times)
_classifier_instance = None


def get_classifier():
    """Get the classifier instance (create it if it doesn't exist)"""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = IntentClassifier()
    return _classifier_instance


def classify_query(query):
    """
    Simple function to classify a query.
    This is what other parts of the code will call.
    """
    classifier = get_classifier()

    # Classify the query
    result = classifier.classify(query)

    # Extract parameters
    intent_enum = ChartIntent(result['intent'])
    params = classifier.extract_parameters(query, intent_enum)

    # Add parameters to result
    result['parameters'] = params

    return result


# Test the classifier if we run this file directly
if __name__ == "__main__":
    print("=" * 80)
    print("Testing Intent Classifier")
    print("=" * 80)

    # Create a classifier
    classifier = IntentClassifier()

    # Test questions
    test_questions = [
        "Compare research output between US and China",
        "Show me the top 10 subfields in Physical Sciences",
        "How has quantum physics research changed from 2020 to 2023?",
        "What is the distribution of research topics in Physics?",
        "Show me a chart of the top subfields",
        "What are the trends in AI research?",
        "Rank countries by research output",
        "Display a breakdown of research topics",
        "What is the top subfield?",
        "Tell me about quantum physics",
    ]

    # Test each question
    for question in test_questions:
        result = classifier.classify(question)
        intent_enum = ChartIntent(result['intent'])
        params = classifier.extract_parameters(question, intent_enum)

        print(f"\nQuestion: {question}")
        print(f"Intent: {result['intent']}")
        print(f"Confidence: {result['confidence']}")
        print(f"Chart Type: {result['chart_type']}")
        print(f"Needs Chart: {result['requires_chart']}")
        print(f"Parameters: {params}")
        print("-" * 80)
