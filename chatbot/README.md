# Chatbot with Intent Classification

This chatbot can understand what users want when they ask questions. It figures out if they need a chart and what kind of chart would be best.

## What It Does

When a user asks a question, the chatbot:

1. Reads the question
2. Figures out what type of chart they need (if any)
3. Extracts useful information (like countries, years, etc.)
4. Returns a response with chart information

## Types of Questions It Understands

- **Comparison**: "Compare US vs China", "Which is higher..."
- **Trend**: "Show trends", "How has it changed over time"
- **Distribution**: "Distribution of...", "Breakdown by..."
- **Ranking**: "Top 10...", "Rank countries by..."
- **Chart Request**: "Show me a chart of...", "Visualize..."

## How to Run

### Step 1: Make sure you have the dependencies

The code needs:

- Flask
- flask-cors
- python-dotenv

These should already be in the main `requirements.txt` file.

### Step 2: Run the API

```bash
cd chatbot
python3 flask_api.py
```

The API will start on `http://localhost:5050` (or whatever port you set in the PORT environment variable).

## How to Use the API

### 1. Check if it's working

```bash
GET http://localhost:5050/api/health
```

This just checks if the API is running.

### 2. Classify a query

If you just want to know what type of chart is needed:

```bash
POST http://localhost:5050/api/classify
Content-Type: application/json

{
  "query": "Show me the top 10 subfields in US"
}
```

You'll get back:

```json
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
```

### 3. Send a chat message

This is the main endpoint for the chatbot:

```bash
POST http://localhost:5050/api/chat
Content-Type: application/json

{
  "message": "Compare research output between US and China",
  "country": "US"
}
```

You'll get back a full response with:

- A text response
- Information about what type of chart is needed
- Chart configuration (title, description, etc.)

## Example Questions

Here are some example questions you can try:

- "Compare research output between US and China"
- "Show me the top 10 subfields in Physical Sciences"
- "How has quantum physics research changed from 2020 to 2023?"
- "What is the distribution of research topics in Physics?"
- "Show me a chart of the top subfields"
- "Rank countries by research output"

## How It Works

The code is pretty simple:

1. **intent_classifier.py**: This file has a class that looks at the user's question and figures out what they want. It checks for keywords like "compare", "trend", "top 10", etc.

2. **flask_api.py**: This file creates a web API that receives questions and returns responses. It uses the intent classifier to understand what the user wants.

## Testing

You can test the intent classifier directly:

```bash
python3 intent_classifier.py
```

This will run some test questions and show you what the classifier finds.

## What's Next

Right now, the chatbot:

- ✅ Understands what type of chart is needed
- ✅ Extracts countries, years, and other parameters
- ✅ Returns placeholder responses

In the future, it will:

- Generate actual chart data
- Use a RAG system for better text responses
- Connect to the main API to fetch real data

## Troubleshooting

**The API won't start:**

- Make sure Flask is installed: `pip install flask flask-cors`
- Check if port 5050 is already in use

**The classifier doesn't work:**

- Make sure you're using Python 3
- Check that all imports work: `python3 -c "from intent_classifier import classify_query"`

**Can't find the module:**

- Make sure you're in the `chatbot` directory when running the code
- Or use: `python3 -m chatbot.flask_api` from the parent directory
