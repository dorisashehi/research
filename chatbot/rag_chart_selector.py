"""
RAG-based chart type selector using embeddings and LLM.
This helps determine the best chart type based on query semantics.
"""

import os
from typing import Dict, List, Optional, Tuple
from sentence_transformers import SentenceTransformer
from groq import Groq

# Initialize embedding model (using Hugging Face)
_embedding_model = None

# Initialize Groq client
_groq_client = None

# Knowledge base for chart selection
CHART_KNOWLEDGE_BASE = [
    {
        "text": "Bar charts are best for comparing discrete categories or items. Use bar charts when comparing countries, subfields, or ranked items.",
        "chart_type": "bar",
        "intent": "comparison",
        "use_case": "comparing items"
    },
    {
        "text": "Line charts show trends over time. Use line charts when showing how values change over years or time periods.",
        "chart_type": "line",
        "intent": "trend",
        "use_case": "temporal trends"
    },
    {
        "text": "Pie charts display proportions and distributions. Use pie charts when showing parts of a whole or percentage breakdowns.",
        "chart_type": "pie",
        "intent": "distribution",
        "use_case": "proportions"
    },
    {
        "text": "Rankings and top items work best with bar charts. Horizontal bar charts are better when you have many items or long labels.",
        "chart_type": "bar",
        "intent": "ranking",
        "use_case": "rankings"
    },
    {
        "text": "When comparing 2-3 items, bar charts are clearer than pie charts. Bar charts make it easier to see exact values.",
        "chart_type": "bar",
        "intent": "comparison",
        "use_case": "few items comparison"
    },
    {
        "text": "Show trends and changes over time with line charts. Line charts connect data points to show progression.",
        "chart_type": "line",
        "intent": "trend",
        "use_case": "time series"
    },
    {
        "text": "Distribution and breakdown queries should use pie charts. Pie charts show how a whole is divided into parts.",
        "chart_type": "pie",
        "intent": "distribution",
        "use_case": "breakdown"
    },
    {
        "text": "Compare research output between countries using bar charts. Bar charts make comparisons easy to see.",
        "chart_type": "bar",
        "intent": "comparison",
        "use_case": "country comparison"
    },
    {
        "text": "Top 10 or ranking queries typically use bar charts. Bar charts show rankings clearly from highest to lowest.",
        "chart_type": "bar",
        "intent": "ranking",
        "use_case": "top items"
    },
    {
        "text": "How has something changed or grown over time? Use line charts to show the progression and trends.",
        "chart_type": "line",
        "intent": "trend",
        "use_case": "growth over time"
    }
]


def get_embedding_model():
    """Get or create the embedding model."""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedding_model


def get_groq_client():
    """Get or create Groq client."""
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def embed_query(query: str) -> List[float]:
    """Convert query text to embedding vector."""
    model = get_embedding_model()
    embedding = model.encode(query, convert_to_numpy=True)
    return embedding.tolist()


def embed_knowledge_base():
    """Embed all knowledge base documents."""
    model = get_embedding_model()
    embeddings = []
    for doc in CHART_KNOWLEDGE_BASE:
        embedding = model.encode(doc['text'], convert_to_numpy=True)
        embeddings.append(embedding)
    return embeddings


def find_similar_documents(query: str, top_k: int = 5) -> List[Dict]:
    """Find most similar documents from knowledge base."""
    model = get_embedding_model()
    query_embedding = model.encode(query, convert_to_numpy=True)

    kb_embeddings = embed_knowledge_base()

    # Calculate similarities
    from numpy import dot
    from numpy.linalg import norm

    similarities = []
    for i, kb_embedding in enumerate(kb_embeddings):
        similarity = dot(query_embedding, kb_embedding) / (norm(query_embedding) * norm(kb_embedding))
        similarities.append((similarity, i))

    # Sort by similarity and get top k
    similarities.sort(reverse=True, key=lambda x: x[0])
    top_indices = [idx for _, idx in similarities[:top_k]]

    results = []
    for idx in top_indices:
        doc = CHART_KNOWLEDGE_BASE[idx].copy()
        doc['similarity'] = float(similarities[top_indices.index(idx)][0])
        results.append(doc)

    return results


def analyze_with_llm(query: str, intent: str, retrieved_context: List[Dict], data_info: Optional[Dict] = None) -> Dict:
    """Use LLM to analyze query and determine best chart type."""
    client = get_groq_client()

    context_text = "\n".join([f"- {doc['text']} (Chart type: {doc['chart_type']})" for doc in retrieved_context])

    data_context = ""
    if data_info:
        data_context = f"\nData information:\n- Number of items: {data_info.get('item_count', 'unknown')}\n- Data type: {data_info.get('data_type', 'unknown')}\n"

    prompt = f"""You are a data visualization expert. Based on the user's query and context, determine the best chart type.

User Query: "{query}"
Intent: {intent}

Relevant guidelines:
{context_text}
{data_context}

Determine the best chart type (bar, line, or pie) and provide:
1. Primary chart type recommendation
2. Confidence level (0.0 to 1.0)
3. Alternative chart type if applicable

Respond in this exact format:
CHART_TYPE: [bar/line/pie]
CONFIDENCE: [0.0-1.0]
ALTERNATIVE: [bar/line/pie or none]
REASONING: [brief explanation]
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a helpful data visualization expert."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=200
        )

        result_text = response.choices[0].message.content

        # Parse response
        chart_type = "bar"
        confidence = 0.7
        alternative = None
        reasoning = ""

        for line in result_text.split('\n'):
            if line.startswith('CHART_TYPE:'):
                chart_type = line.split(':', 1)[1].strip().lower()
            elif line.startswith('CONFIDENCE:'):
                try:
                    confidence = float(line.split(':', 1)[1].strip())
                except:
                    pass
            elif line.startswith('ALTERNATIVE:'):
                alt = line.split(':', 1)[1].strip().lower()
                if alt != 'none':
                    alternative = alt
            elif line.startswith('REASONING:'):
                reasoning = line.split(':', 1)[1].strip()

        return {
            'chart_type': chart_type,
            'confidence': confidence,
            'alternative': alternative,
            'reasoning': reasoning
        }
    except Exception as e:
        print(f"Error in LLM analysis: {e}")
        return {
            'chart_type': 'bar',
            'confidence': 0.5,
            'alternative': None,
            'reasoning': 'LLM analysis failed, using default'
        }


def select_chart_type_with_rag(query: str, intent: str, data_info: Optional[Dict] = None) -> Dict:
    """Main function to select chart type using RAG."""
    retrieved_docs = find_similar_documents(query, top_k=5)

    if not retrieved_docs:
        return {
            'chart_type': 'bar',
            'confidence': 0.5,
            'alternative': None,
            'reasoning': 'No relevant context found'
        }

    llm_result = analyze_with_llm(query, intent, retrieved_docs, data_info)

    return llm_result


def validate_chart_type_after_fetch(chart_type: str, fetched_data: Dict) -> Dict:
    """Validate and potentially adjust chart type based on actual fetched data."""
    if not fetched_data or not fetched_data.get('data'):
        return {
            'chart_type': chart_type,
            'adjusted': False,
            'reason': 'No data to validate'
        }

    data = fetched_data.get('data', [])
    item_count = len(data)
    labels = fetched_data.get('labels', [])

    # Adjustments based on data characteristics
    if chart_type == 'pie' and item_count > 10:
        return {
            'chart_type': 'bar',
            'adjusted': True,
            'reason': f'Pie chart not suitable for {item_count} items, switching to bar chart'
        }

    if chart_type == 'line' and item_count < 3:
        return {
            'chart_type': 'bar',
            'adjusted': True,
            'reason': f'Line chart needs at least 3 data points, switching to bar chart'
        }

    if chart_type == 'bar' and item_count > 15:
        return {
            'chart_type': 'bar',
            'adjusted': False,
            'suggestion': 'Consider using horizontal bar chart for better readability'
        }

    return {
        'chart_type': chart_type,
        'adjusted': False,
        'reason': 'Chart type is appropriate for the data'
    }
