# How to Run the Chatbot

This guide explains how to set up and run the chatbot API with RAG functionality.

## Prerequisites

1. **Python 3.8+** installed
2. **Main Flask API running** on port 5000 (for data fetching)
3. **Groq API Key** (for LLM functionality)

## Step 1: Install Dependencies

From the project root directory:

```bash
pip install -r requirements.txt
```

Or install chatbot-specific dependencies:

```bash
pip install flask flask-cors requests sentence-transformers groq numpy
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the `chatbot` directory (or set environment variables):

```bash
# Required for RAG functionality
export GROQ_API_KEY="your-groq-api-key-here"

# Optional: Customize ports
export PORT=5050
export API_BASE_URL="http://localhost:5000"
```

Or create `chatbot/.env`:

```
GROQ_API_KEY=your-groq-api-key-here
PORT=5050
API_BASE_URL=http://localhost:5000
```

**Note:** If you don't have a Groq API key, the RAG features will fail but the chatbot will still work with keyword-based chart selection.

## Step 3: Make Sure Main API is Running

The chatbot needs the main Flask API to fetch data. Start it first:

```bash
# From project root
python3 flask_api.py
```

This should run on `http://localhost:5000`

## Step 4: Run the Chatbot API

From the `chatbot` directory:

```bash
cd chatbot
python3 flask_api.py
```

Or from project root:

```bash
python3 -m chatbot.flask_api
```

You should see:

```
Starting Chatbot API on port 5050...
API Base URL: http://localhost:5000
Intent Classification: Enabled
 * Running on http://0.0.0.0:5050
```

## Step 5: Test the Chatbot

### Test 1: Health Check

```bash
curl http://localhost:5050/api/health
```

### Test 2: Send a Chat Message

```bash
curl -X POST http://localhost:5050/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me the top 10 subfields",
    "country": "US"
  }'
```

### Test 3: Test Intent Classification

```bash
curl -X POST http://localhost:5050/api/classify \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare US and China"
  }'
```

## Using with Frontend

The frontend should be configured to connect to:

- Chatbot API: `http://localhost:5050`
- Main API: `http://localhost:5000`

Make sure `NEXT_PUBLIC_CHATBOT_API_URL` is set in your frontend `.env`:

```
NEXT_PUBLIC_CHATBOT_API_URL=http://localhost:5050
```

## Troubleshooting

### Error: "GROQ_API_KEY environment variable not set"

**Solution:** Set the Groq API key:

```bash
export GROQ_API_KEY="your-key-here"
```

Or the chatbot will fall back to keyword-based chart selection.

### Error: "Connection refused" when fetching data

**Solution:** Make sure the main Flask API is running on port 5000:

```bash
python3 flask_api.py
```

### Error: "Module not found: sentence_transformers"

**Solution:** Install dependencies:

```bash
pip install sentence-transformers
```

### Error: "Module not found: groq"

**Solution:** Install groq:

```bash
pip install groq
```

### RAG features not working

If RAG fails, the chatbot automatically falls back to keyword-based chart selection. Check the console for error messages.

## Running in Production

For production, use a proper WSGI server:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5050 chatbot.flask_api:app
```

## Example Queries to Test

- "Show me the top 10 subfields"
- "Compare US and China"
- "Rank countries by research output"
- "Compare ecology and physics in US"
- "What is the distribution of subfields?"
- "Show me research trends"

## What Each Component Does

1. **intent_classifier.py**: Fast keyword-based intent detection and parameter extraction
2. **rag_chart_selector.py**: RAG-based chart type selection using embeddings and LLM
3. **flask_api.py**: Main API server that handles requests and coordinates everything
