# Science and Technology Research Topic Trend Analysis

A comprehensive interactive platform for exploring global research trends in science and technology using data from OpenAlex. The platform features a 3D interactive globe visualization and an AI-powered chatbot for natural language queries about research data.

## 📋 Table of Contents

- [Project Description](#project-description)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Backend Functionality](#backend-functionality)
- [Chatbot Functionality](#chatbot-functionality)
- [Globe Visualization](#globe-visualization)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

## 🎯 Project Description

This project provides an interactive visualization platform for exploring global research trends in science and technology. It combines:

1. **3D Interactive Globe Visualization**: Explore research data by country on a beautiful, interactive 3D globe
2. **AI-Powered Chatbot**: Ask questions about research data in natural language and receive intelligent responses with visualizations
3. **Unified Backend API**: Single FastAPI server providing both data endpoints and chatbot functionality

### Key Features

- **Interactive 3D Globe**: Navigate and explore countries with real-time research data
- **Country-Specific Research Data**: View top subfields and topics for any country
- **Natural Language Queries**: Ask questions about research trends, comparisons, rankings, and distributions
- **Intent Classification**: Automatically detects user intent and generates appropriate visualizations
- **Real-time Data**: Fetches data from OpenAlex API for up-to-date research information
- **Responsive Design**: Modern, dark-themed UI with smooth animations

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ Globe Component   │         │ Chat Interface    │        │
│  │ (Three.js)        │         │ (React)           │        │
│  └────────┬─────────┘         └────────┬─────────┘        │
│           │                             │                   │
│           └─────────────┬───────────────┘                   │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/REST API
┌─────────────────────────┼───────────────────────────────────┐
│                  Backend (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Unified FastAPI Server                    │  │
│  │  ┌──────────────────┐    ┌──────────────────┐       │  │
│  │  │ Data Endpoints    │    │ Chatbot Endpoints │       │  │
│  │  │ - Countries       │    │ - /api/chat      │       │  │
│  │  │ - Subfields       │    │ - /api/classify  │       │  │
│  │  │ - Topics          │    │                  │       │  │
│  │  │ - Trends          │    │                  │       │  │
│  │  └──────────────────┘    └──────────────────┘       │  │
│  │                                                         │  │
│  │  ┌──────────────────┐    ┌──────────────────┐       │  │
│  │  │ Intent Classifier │    │ Data Helpers     │       │  │
│  │  │ (Rule-based)      │    │ (Direct Access)  │       │  │
│  │  └──────────────────┘    └──────────────────┘       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ CSV Files         │         │ OpenAlex API      │        │
│  │ - fields.csv      │         │ (External)        │        │
│  │ - subfields.csv   │         │                   │        │
│  │ - countries/      │         │                   │        │
│  └──────────────────┘         └──────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

1. **Frontend Layer**:

   - Next.js React application
   - Three.js for 3D globe rendering
   - React components for UI interactions
   - Chart visualization components

2. **Backend Layer**:

   - Unified FastAPI server (port 5000)
   - Data API endpoints
   - Chatbot endpoints with intent classification
   - Direct data access (no HTTP calls needed)

3. **Data Layer**:
   - CSV files for cached research data
   - Country-specific data directories
   - OpenAlex API for data fetching

## 🔄 Data Flow

### Globe Visualization Flow

```
User Interaction (Click Country)
    ↓
Frontend: Globe Component
    ↓
HTTP Request: GET /api/countries/{code}/data
    ↓
Backend: FastAPI
    ↓
Data Helper: _get_country_data_internal()
    ↓
Read CSV: data/countries/{code}/subfields.csv
    ↓
Process & Format Data
    ↓
JSON Response
    ↓
Frontend: Update Info Panel & Display Charts
```

### Chatbot Query Flow

```
User Types Question
    ↓
Frontend: Chat Interface
    ↓
HTTP Request: POST /api/chat
    ↓
Backend: Chat Endpoint
    ↓
Intent Classifier: classify_query()
    ├─→ Extract Intent (ranking/comparison/trend/etc.)
    ├─→ Extract Parameters (countries/years/limit)
    └─→ Determine Chart Type
    ↓
Fetch Chart Data: fetch_chart_data()
    ├─→ Use Helper Functions (direct data access)
    ├─→ Filter by Country/Subfield/Year
    └─→ Format for Chart
    ↓
Generate Response
    ├─→ Text Response
    ├─→ Chart Configuration
    └─→ Intent Metadata
    ↓
JSON Response
    ↓
Frontend: Display Message & Render Chart
```

### Data Fetching Flow

```
Script: save_country_data.py
    ↓
OpenAlex API: Filter by Domain & Country
    ↓
Process Results:
    ├─→ Extract Subfields
    ├─→ Extract Topics per Subfield
    └─→ Aggregate Work Counts
    ↓
Save to CSV:
    ├─→ data/countries/{code}/subfields.csv
    └─→ data/countries/{code}/topics.csv
    ↓
Backend: Load on Startup (cached)
```

## 🔧 Backend Functionality

The backend is a unified FastAPI server (`backend/server.py`) that provides both data API and chatbot functionality on port 5000. FastAPI provides automatic API documentation, type validation, and async support.

### Core Components

#### 1. Data Management

- **Data Caching**: In-memory cache for CSV data to improve performance
- **Lazy Loading**: Data loaded on first request and cached
- **Helper Functions**: Direct data access functions used by both endpoints and chatbot
  - `_get_countries_data()`: Get all countries with research data
  - `_get_country_subfields_data(country_code)`: Get subfields for a country
  - `_get_country_data_internal(country_code)`: Get full country data with topics

#### 2. Data API Endpoints

**Country Endpoints**:

- `GET /api/countries` - List all available countries
- `GET /api/countries/<code>/subfields` - Get subfields for a country
- `GET /api/countries/<code>/topics` - Get topics for a country (optionally filtered by subfield)
- `GET /api/countries/<code>/data` - Get complete country data (subfields + topics)

**Trend Endpoints**:

- `GET /api/trends/years` - Get available years for trend analysis
- `GET /api/trends/graph?year=2023` - Get subfields graph for a specific year
- `GET /api/trends/topics?year=2023&subfield_id=X` - Get topics graph for a subfield in a year

**Graph Endpoints**:

- `GET /api/subfields/graph` - Get all-time subfields graph with similarity connections
- `GET /api/topics/subfield/<id>` - Get topics for a specific subfield

**Graph Generation**:

- Uses TF-IDF vectorization to calculate semantic similarity between research areas
- Creates nodes (subfields/topics) with size based on work counts
- Generates links between similar items based on cosine similarity

#### 3. Chatbot Integration

The chatbot functionality is integrated directly into the main server:

- **Intent Classification**: Uses rule-based classifier to understand user queries
- **Direct Data Access**: Chatbot uses helper functions instead of HTTP requests (more efficient)
- **Chart Data Generation**: Automatically fetches and formats data based on user intent

### Data Structure

```
backend/
├── server.py              # Main FastAPI server (unified API)
├── save_country_data.py   # Script to fetch country data from OpenAlex
├── requirements.txt       # Python dependencies
├── data/                  # CSV data files
│   ├── fields.csv
│   ├── top_subfields_us.csv
│   ├── yearly_subfields.csv
│   └── countries/         # Country-specific data
│       ├── US/
│       │   ├── subfields.csv
│       │   └── topics.csv
│       ├── CN/
│       └── ...
└── chatbot/
    ├── intent_classifier.py  # Intent classification logic
    └── README.md
```

## 🤖 Chatbot Functionality

The chatbot provides intelligent, natural language interaction with research data.

### Intent Classification

The chatbot uses a rule-based intent classifier (`backend/chatbot/intent_classifier.py`) that recognizes:

1. **Ranking Queries**: "Top 10 subfields", "Rank countries by research output"
2. **Comparison Queries**: "Compare US vs China", "Compare ecology and physics"
3. **Trend Queries**: "Show trends", "How has research changed over time"
4. **Distribution Queries**: "Distribution of subfields", "Breakdown by topic"
5. **Statistical Queries**: "Show me a chart", "Visualize the data"

### Parameter Extraction

Automatically extracts:

- **Countries**: From country names or codes (US, China, etc.)
- **Years**: 4-digit years (2020, 2023, etc.)
- **Limits**: Numbers from "top N" queries
- **Subfields**: Common research subfield names (ecology, physics, etc.)

### Chart Type Selection

Based on intent, automatically selects appropriate chart types:

- **Ranking** → Bar chart
- **Comparison** → Bar chart
- **Trend** → Line chart
- **Distribution** → Pie chart
- **Statistical** → Bar chart (default)

### Chatbot Endpoints

#### `POST /api/chat`

Main chat endpoint that processes user messages and returns responses with chart data.

**Request**:

```json
{
  "message": "Show me the top 10 subfields in US",
  "country": "US" // optional
}
```

**Response**:

```json
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
    "data": {
      "labels": ["Physics", "Chemistry", ...],
      "values": [15000, 12000, ...],
      "data": [...]
    },
    "title": "Top 10 Rankings",
    "description": "This bar chart shows items ranked by their values."
  }
}
```

#### `POST /api/classify`

Classify a query without generating a full response (useful for testing).

**Request**:

```json
{
  "query": "Compare US vs China"
}
```

**Response**:

```json
{
  "success": true,
  "query": "Compare US vs China",
  "intent": "comparison",
  "confidence": 0.2,
  "chart_type": "bar",
  "requires_chart": true,
  "parameters": {
    "countries": ["US", "CN"],
    "years": [],
    "limit": null
  }
}
```

### Chart Data Fetching

The chatbot's `fetch_chart_data()` function intelligently fetches data based on intent:

- **Ranking Countries**: Fetches country data, sorts by total works
- **Ranking Subfields**: Fetches subfields for specified country, limits results
- **Comparison**: Fetches data for multiple countries or subfields
- **Distribution**: Fetches subfields and calculates percentages
- **Default**: Falls back to ranking subfields

All data fetching uses direct helper functions (no HTTP overhead).

## 🌍 Globe Visualization

The globe visualization provides an immersive 3D interface for exploring research data by country.

### Technical Implementation

**Technology**: Three.js for 3D rendering
**Component**: `frontend/components/globe-visualization.tsx`

### Features

#### 1. 3D Globe Rendering

- **Sphere Geometry**: 64-segment sphere for smooth rendering
- **Ocean Base**: Semi-transparent blue sphere representing oceans
- **Atmosphere Effect**: Shader-based atmospheric glow effect
- **Country Meshes**: Individual 3D meshes for each country
- **Border Lines**: Highlighted borders for selected countries

#### 2. Interactive Controls

- **Mouse Drag**: Rotate globe by dragging
- **Mouse Wheel**: Zoom in/out
- **Click Selection**: Click countries to view data
- **Auto-Rotation**: Optional automatic rotation
- **Rotation Speed Control**: Adjustable rotation speed

#### 3. Country Data Display

When a country is selected:

- **Info Panel**: Shows country name, code, and research statistics
- **Subfields List**: Top research subfields with work counts
- **Topics Display**: Topics for each subfield
- **Charts**: Visual representation of research distribution

#### 4. Search Functionality

- **Country Search**: Type to search countries by name or code
- **Dropdown Results**: Filtered results as you type
- **Quick Selection**: Click to select from search results

#### 5. Control Panel

Located in top-left corner:

- **Search Bar**: Find countries quickly
- **Auto-Rotate Toggle**: Enable/disable automatic rotation
- **Rotation Speed Slider**: Control rotation speed
- **Atmosphere Toggle**: Show/hide atmosphere effect
- **Reset View Button**: Return to default camera position

### Globe Data Flow

1. **Initialization**: Load country data from API
2. **Country Mapping**: Map country names to codes
3. **Mesh Creation**: Create 3D meshes for each country
4. **Selection**: User clicks country → Fetch detailed data
5. **Display**: Show subfields and topics in info panel

### Visual Features

- **Dark Theme**: Modern dark UI with cyan accents
- **Smooth Animations**: Transitions for all interactions
- **Responsive Design**: Adapts to different screen sizes
- **Starfield Background**: Optional starfield for space aesthetic
- **Color Coding**: Different colors for country borders

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+ (for frontend)
- pip package manager
- npm or pnpm (for frontend dependencies)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ctp-project
   ```

2. **Backend Setup**

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**

   ```bash
   cd frontend
   npm install  # or pnpm install
   ```

4. **Configure Environment Variables**

   Create a `.env` file in the `backend` directory:

   ```bash
   # Required for OpenAlex API
   OPENALEX_EMAIL=your-email@example.com
   ```

5. **Fetch Data**

   ```bash
   cd backend
   # Fetch base datasets
   python save_data_csv.py  # If this script exists

   # Fetch country-specific data
   python save_country_data.py
   ```

### Running the Application

1. **Start Backend Server**

   ```bash
   cd backend
   python server.py
   ```

   The API will start on `http://localhost:5000`

   **FastAPI Features:**

   - Interactive API documentation: `http://localhost:5000/docs` (Swagger UI)
   - Alternative docs: `http://localhost:5000/redoc` (ReDoc)
   - Automatic OpenAPI schema: `http://localhost:5000/openapi.json`

2. **Start Frontend**

   ```bash
   cd frontend
   npm run dev  # or pnpm dev
   ```

   The frontend will start on `http://localhost:3000` (or next available port)

3. **Open Browser**

   Navigate to `http://localhost:3000` to see the globe visualization

## 📁 Project Structure

```
ctp-project/
├── backend/
│   ├── server.py              # Unified FastAPI server
│   ├── save_country_data.py   # Script to fetch country data
│   ├── requirements.txt       # Python dependencies
│   ├── data/                  # CSV data files
│   │   ├── fields.csv
│   │   ├── top_subfields_us.csv
│   │   ├── yearly_subfields.csv
│   │   └── countries/         # Country-specific data
│   │       ├── US/
│   │       │   ├── subfields.csv
│   │       │   └── topics.csv
│   │       ├── CN/
│   │       └── ...
│   └── chatbot/
│       ├── intent_classifier.py  # Intent classification
│       └── README.md
│
├── frontend/
│   ├── app/                   # Next.js app directory
│   │   ├── page.tsx          # Main page
│   │   ├── layout.tsx        # App layout
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── globe-visualization.tsx  # 3D globe component
│   │   ├── chat-interface.tsx       # Chatbot UI
│   │   ├── chat-chart.tsx           # Chart component
│   │   ├── control-panel.tsx        # Globe controls
│   │   ├── info-panel.tsx           # Country info display
│   │   └── ui/                      # UI components
│   ├── public/               # Static assets
│   ├── package.json
│   └── next.config.mjs
│
└── README.md                  # This file
```

## 📡 API Documentation

### Base URL

```
http://localhost:5000
```

### Endpoints

#### Health Check

```http
GET /api/health
```

**Response**:

```json
{
  "status": "healthy",
  "data_loaded": true,
  "intent_classifier": "enabled"
}
```

#### Countries

```http
GET /api/countries
```

**Response**:

```json
{
  "count": 100,
  "data": [
    {
      "code": "US",
      "subfields_count": 10,
      "total_works": 1500000
    },
    ...
  ]
}
```

#### Country Data

```http
GET /api/countries/{country_code}/data
```

**Response**:

```json
{
  "country_code": "US",
  "subfields": [
    {
      "id": "3315",
      "name": "Physics",
      "works_count": 50000,
      "topics": [
        {
          "id": "1234",
          "name": "Quantum Physics",
          "works_count": 10000
        },
        ...
      ]
    },
    ...
  ]
}
```

#### Chat

```http
POST /api/chat
Content-Type: application/json

{
  "message": "Show me the top 10 subfields in US",
  "country": "US"
}
```

See [Chatbot Functionality](#-chatbot-functionality) section for response format.

## 🛠️ Tech Stack

### Backend

- **FastAPI**: Modern, fast web framework for API endpoints with automatic documentation
- **Uvicorn**: ASGI server for running FastAPI
- **Pydantic**: Data validation using Python type annotations
- **Pandas**: Data manipulation and analysis
- **pyalex**: OpenAlex API client
- **scikit-learn**: TF-IDF vectorization for similarity calculation
- **NumPy**: Numerical computations

### Frontend

- **Next.js**: React framework with server-side rendering
- **React**: UI library
- **Three.js**: 3D graphics and globe rendering
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Chart visualization library
- **Lucide React**: Icon library

### Data Sources

- **OpenAlex**: Comprehensive open database of scholarly works
- **Domain**: Physical Sciences (Domain ID: 3)
- **Data Format**: CSV files for efficient caching

## 🔍 Troubleshooting

### Port Already in Use

If port 5000 is already in use:

```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process or change port in server.py
```

### Chatbot Not Responding

- Ensure backend server is running on port 5000
- Check browser console for CORS errors
- Verify API URL in frontend: `NEXT_PUBLIC_CHATBOT_API_URL` or default `http://localhost:5000`

### Globe Not Loading

- Ensure backend server is running
- Check browser console for errors
- Verify data files exist in `backend/data/` directory
- Check API URL: `NEXT_PUBLIC_API_URL` or default `http://localhost:5000`

### Missing Data

- Run `python save_country_data.py` to fetch country data
- Check that `.env` has `OPENALEX_EMAIL` set
- Verify CSV files are in `backend/data/` directory

### Frontend Build Issues

```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

## 🎯 Future Enhancements

- [ ] Add more domains beyond Physical Sciences
- [ ] Time-series trend analysis with animated charts
- [ ] Export functionality for graphs and data
- [ ] Additional visualization types (heatmaps, network graphs)
- [ ] Multi-language support
- [ ] User authentication and saved queries
- [ ] Real-time data updates
- [ ] Advanced filtering and search

## 📚 Acknowledgments

- [OpenAlex](https://openalex.org/) for providing comprehensive scholarly data
- [Three.js](https://threejs.org/) for 3D graphics capabilities
- [Next.js](https://nextjs.org/) for the React framework
- [LangChain](https://www.langchain.com/) for AI/ML frameworks (future RAG implementation)
- The open science community for making research data accessible

## 📄 License

[Add your license information here]

---

**Note**: This project is actively developed. For the latest updates and features, please refer to the repository's commit history and issues.
