# Science and Technology Research Topic Trend Analysis

- **Project Scope**: Analyze the trends in science and technology research using data from OpenAlex.
- **Audience**: Researchers, policymakers, and students interested in understanding the trends in science and technology research.

## Project Overview

This project provides an interactive visualization platform for exploring global research trends in science and technology. It features:

1. **Interactive Globe Visualization**: A 3D globe showing research data by country with interactive exploration
2. **AI-Powered Chatbot**: A RAG (Retrieval-Augmented Generation) chatbot that answers questions about research data using natural language

## Video Walkthrough

Here's a walkthrough of implemented required features:

<img src='https://github.com/dorisashehi/research/reseach.gif' title='Video Walkthrough' width='' alt='Video Walkthrough' />

## Key Features

### Globe Visualization

- **3D Interactive Globe**: Navigate and explore countries on a beautiful 3D globe
- **Country Selection**: Click any country to view its research subfields and topics
- **Default US Selection**: The globe opens with the United States selected by default
- **Search Functionality**: Search for countries by name or code
- **Research Data Display**: View top research subfields and topics for each country

### AI Chatbot

- **Natural Language Queries**: Ask questions about research data in plain English
- **Country-Specific Queries**: Filter queries by country using the country selector
- **RAG Technology**: Uses Retrieval-Augmented Generation for accurate, context-aware responses
- **Conversational Interface**: Maintains conversation history for context

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip package manager
- A GROQ API key (for chatbot functionality)
- Node.js (optional, for serving static files)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ctp-project
   ```

2. **Create a virtual environment and activate it**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**

   Create a `.env` file in the project root directory:

   ```bash
   # Required for OpenAlex API
   OPENALEX_EMAIL=your-email@example.com

   # Required for chatbot functionality
   GROQ_API_KEY=your_groq_api_key_here
   ```

   **Note**:

   - Replace `your-email@example.com` with your email (used for OpenAlex API identification)
   - Replace `your_groq_api_key_here` with your actual GROQ API key (get one at https://console.groq.com/)

5. **Fetch the data** (if not already present)

   ```bash
   # Fetch base datasets for globe visualization
   python save_data_csv.py

   # Fetch country-specific data
   python save_country_data.py
   ```

## Running the Application

The application consists of three main components that need to be running:

### 1. Main Flask API (Globe Visualization Backend)

This serves the research data API for the globe visualization.

**Terminal 1:**

```bash
python flask_api.py
```

The API will start on `http://localhost:5000`

**API Endpoints:**

- `GET /api/health` - Health check and data status
- `GET /api/countries` - Get list of available countries
- `GET /api/countries/<country_code>/data` - Get research data for a specific country
- `GET /api/subfields/graph` - Get subfield graph data with similarity connections
- `GET /api/topics/subfield/<id>` - Get topics for specific subfield

### 2. Chatbot Flask API

This serves the RAG chatbot API.

**Terminal 2:**

```bash
cd chatbot
python flask_api.py
```

The chatbot API will start on `http://localhost:5050`

**API Endpoints:**

- `POST /api/chat` - Send chat messages and receive AI responses
  ```json
  {
    "message": "What is the top subfield in Physical Sciences?",
    "country": "US" // optional
  }
  ```

### 3. Frontend (Web Interface)

You can serve the frontend in two ways:

**Option A: Using Python HTTP Server (Recommended)**

```bash
# From project root directory
python -m http.server 8000
```

Then open `http://localhost:8000/index.html` in your browser.

**Option B: Direct File Access**
Simply open `index.html` in your web browser (some features may be limited due to CORS).

### Complete Setup Summary

1. **Terminal 1** - Main API:

   ```bash
   python flask_api.py
   ```

2. **Terminal 2** - Chatbot API:

   ```bash
   cd chatbot
   python flask_api.py
   ```

3. **Terminal 3** - Web Server (optional):

   ```bash
   python -m http.server 8000
   ```

4. **Browser** - Open:
   - `http://localhost:8000/index.html` (if using HTTP server)
   - Or directly open `index.html` from your file system

## Project Structure

```
ctp-project/
├── index.html              # Main globe visualization page
├── globe.js                # 3D globe implementation (Three.js)
├── subfields.html          # Force-directed graph visualization
├── flask_api.py            # Main Flask API for globe data
├── save_data_csv.py        # Script to fetch OpenAlex data
├── save_country_data.py    # Script to fetch country-specific data
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (create this)
├── data/                   # CSV data files
│   └── countries/          # Country-specific research data
├── chatbot/                # Chatbot module
│   ├── flask_api.py        # Chatbot Flask API
│   ├── chatbot.js          # Frontend chatbot interface
│   ├── chatbot.css         # Chatbot styling
│   ├── conversational.py   # RAG chain implementation
│   ├── load_data.py        # Data loading for vector store
│   ├── create_vectorstore.py  # Vector database creation
│   ├── country_mapping.py  # Country name to code mapping
│   └── db/                 # Vector database storage
└── README.md               # This file
```

## Data Sources

The application uses data from [OpenAlex](https://openalex.org/), a comprehensive open database of scholarly works:

- **Fields and Subfields**: Top research subfields in Physical Sciences (Domain ID: 3)
- **Topics**: Trending topics for each subfield based on works count
- **Work Counts**: Number of research works from institutions
- **Country Data**: Research data organized by country code (ISO 3166-1 alpha-2)

## Tech Stack

### Backend

- **Flask**: Web framework for API endpoints
- **Pandas**: Data manipulation and analysis
- **pyalex**: OpenAlex API client
- **LangChain**: RAG framework for chatbot
- **ChromaDB**: Vector database for semantic search
- **HuggingFace**: Embedding models for semantic search
- **Groq**: LLM provider for chatbot responses

### Frontend

- **Three.js**: 3D globe visualization
- **HTML5/CSS3**: Modern responsive design
- **JavaScript ES6+**: Interactive features and API communication

### Data Processing

- **OpenAlex API**: Real-time scholarly data fetching
- **TF-IDF**: Text feature extraction for similarity calculation
- **RAG (Retrieval-Augmented Generation)**: AI-powered question answering

## Visualization Features

### Globe Visualization

- **3D Interactive Globe**: Rotate, zoom, and explore countries
- **Country Highlighting**: Selected countries are highlighted with white borders
- **Search**: Type to search for countries by name or code
- **Info Panel**: Displays top research subfields and topics for selected countries
- **Auto-rotation**: Optional automatic globe rotation

### Chatbot Interface

- **Floating Button**: Accessible from bottom-left corner
- **Country Selector**: Filter queries by country
- **Conversation History**: Maintains context across messages
- **Suggested Questions**: Quick access to common queries
- **Real-time Status**: Shows online/offline status

## Data Refresh

The data can be refreshed to get the latest trends:

```bash
# Refresh all data
python save_data_csv.py
python save_country_data.py

# Rebuild chatbot vector store (if data changes)
cd chatbot
python create_vectorstore.py
```

## Chatbot RAG System

The chatbot uses a Retrieval-Augmented Generation (RAG) approach:

1. **Vector Store**: Research data is embedded and stored in ChromaDB
2. **Query Processing**: User queries are embedded and matched against the vector store
3. **Context Retrieval**: Relevant documents are retrieved based on semantic similarity
4. **LLM Generation**: Groq LLM generates responses using retrieved context
5. **Country Filtering**: Queries can be filtered by country for country-specific answers

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

- Main API (port 5000): Change port in `flask_api.py` or kill the process using port 5000
- Chatbot API (port 5050): Change `PORT` environment variable or kill the process using port 5050

### Chatbot Not Responding

- Ensure the chatbot Flask API is running on port 5050
- Check that `GROQ_API_KEY` is set in `.env`
- Verify the vector database exists in `chatbot/db/chroma_db_research/`

### Globe Not Loading

- Ensure the main Flask API is running on port 5000
- Check browser console for CORS errors
- Verify data files exist in the `data/` directory

### Missing Data

- Run `python save_data_csv.py` to fetch base data
- Run `python save_country_data.py` to fetch country-specific data
- Check that `.env` has `OPENALEX_EMAIL` set

## Future Enhancements

- [ ] Add more domains beyond Physical Sciences
- [ ] Support for time-series trend analysis
- [ ] Export functionality for graphs and data
- [ ] Additional visualization types
- [ ] Multi-language support

## Acknowledgments

- [OpenAlex](https://openalex.org/) for providing comprehensive scholarly data
- [D3.js](https://d3js.org/) for powerful data visualization capabilities
- [Three.js](https://threejs.org/) for 3D graphics
- [LangChain](https://www.langchain.com/) for RAG framework
- [Groq](https://groq.com/) for fast LLM inference
- The open science community for making research data accessible

## Video Walkthrough

Here's a walkthrough of implemented required features:

<img src='' title='Video Walkthrough' width='' alt='Video Walkthrough' />
# research
# research
