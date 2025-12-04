#!/usr/bin/env python3
"""
Flask API for RAG Chatbot

This module provides a basic REST API endpoint for the conversational RAG chatbot.
Code is based on conversational.py
"""

import os
import sys
import shutil
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.documents import Document
from langchain_groq import ChatGroq

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import vector store creation functions
from chatbot.create_vectorstore import create_vectorstore, check_if_rebuild_needed
from chatbot.country_mapping import get_country_code_from_query

# Load environment variables from .env
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for web interface

# Define the persistent directory (must match Milestone 2)
db_dir = os.path.join(current_dir, "db")
persistent_directory = os.path.join(db_dir, "chroma_db_research")

# Global variables for RAG components
rag_chain = None
chat_history = []  # Simple global conversation history for basic implementation
vector_db = None  # Global reference to vector database


def initialize_rag_chain():
    """Initialize the RAG chain, vector store, and LLM."""
    global rag_chain

    # Check if vector store exists or needs to be rebuilt
    if not os.path.exists(persistent_directory):
        print(f"Vector store not found at {persistent_directory}")
        print("Creating vector store...")
        create_vectorstore()
    else:
        # Check if rebuild is needed
        needs_rebuild, reason = check_if_rebuild_needed()
        if needs_rebuild:
            print("=" * 80)
            print("⚠ Vector Store Update Needed")
            print("=" * 80)
            print(f"Reason: {reason}")
            print("\nRebuilding vector store...")
            # Remove existing vector store
            if os.path.exists(persistent_directory):
                shutil.rmtree(persistent_directory)
                print("✓ Removed old vector store")
            # Rebuild
            create_vectorstore()
        else:
            print("✓ Vector store is up to date.")

    # Define the embedding model (must match the one used in Milestone 2)
    print("Loading embedding model...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    # Load the existing vector store with the embedding function
    print("Loading vector store...")
    db = Chroma(persist_directory=persistent_directory, embedding_function=embeddings)
    print("✓ Vector store loaded successfully\n")

    # Store db reference globally for direct access
    global vector_db
    vector_db = db

    # Create a retriever for querying the vector store
    # Increased k to 100 to ensure all documents can be retrieved
    retriever = db.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 50},
        filter={"category": "Physical Sciences"}
    )

    # Create a ChatGroq model
    # Check if GROQ_API_KEY is set
    if not os.getenv("GROQ_API_KEY"):
        raise ValueError("GROQ_API_KEY not found in environment variables. Please set GROQ_API_KEY in your .env file or environment.")

    print("Initializing GROQ LLM...")
    llm = ChatGroq(
        model="llama-3.1-8b-instant",  # Fast and efficient model
        temperature=0,
        groq_api_key=os.getenv("GROQ_API_KEY")
    )
    print("✓ GROQ LLM initialized\n")

    # Create QA system prompt generator
    def create_qa_system_prompt(is_list_query=False, is_top_query=False):
        base_prompt = (
            "You are an assistant for question-answering tasks about Physical Sciences "
            "research data. Use the following pieces of retrieved context to answer the question.\n\n"
            "CRITICAL RULES:\n"
            "- NEVER include raw internal IDs in your responses.\n"
            "- Only mention names and relevant numbers (like work counts, topic counts, etc.).\n"
        )

        if is_top_query:
            # For top queries we explicitly instruct the LLM to trust the provided context
            top_prompt = (
                "- The provided context contains the definitive answer for this 'top' query.\n"
                "- Answer concisely based ONLY on the provided context. Do NOT speculate or say the context is missing.\n"
                "- Return a single short answer (1-2 sentences) describing the top item and its key numbers.\n"
            )
            return base_prompt + top_prompt + "\nContext:\n{context}"

        if is_list_query:
            list_format = (
                "- Format your response as a CLEAR LIST, with each item on a new line.\n"
                "- Use a simple format like: '1. Item Name — extra info' or '- Item Name — extra info'.\n"
                "- Do NOT use markdown formatting like **, #, or ```.\n"
                "- List ALL items from the context. Do not omit or summarize.\n"
            )
            return base_prompt + list_format + "\nContext:\n{context}"

        sentence_format = (
            "- Write responses in natural, conversational sentences.\n"
            "- Do NOT use markdown formatting.\n"
            "- Be concise and avoid hedging language like 'I think' or 'Unfortunately'.\n"
        )
        return base_prompt + sentence_format + "\nContext:\n{context}"

    # Format documents function (keeps page_content only)
    def format_docs(docs):
        """Format retrieved documents into a single string, removing IDs."""
        formatted_docs = []
        for doc in docs:
            content = getattr(doc, "page_content", "") or str(doc)
            # Remove patterns like "(ID: 1234)" or "ID: 1234" or "ID:1234"
            content = re.sub(r'\s*\(?ID:\s*\d+\)?\s*', ' ', content, flags=re.IGNORECASE)
            # Clean up extra spaces
            content = re.sub(r'\s+', ' ', content).strip()
            formatted_docs.append(content)
        return "\n\n".join(formatted_docs)


    # Create a history-aware retriever function
    def get_contextualized_retrieval(input_data):
        """
        Retrieve documents, using raw user query (no LLM-based reformulation).
        Returns a context string ready for the QA prompt and sets flags on input_data:
          - _is_list_query
          - _is_top_query
          - _top_query_type (field/subfield/topic/funder) when applicable
        """
        query = input_data["input"].strip()
        query_lower = query.lower()
        history = input_data.get("chat_history", [])

        # debug
        print("Incoming query:", query)

        # Check for explicit country code first (from UI selector), then detect from query
        country_code = input_data.get("_explicit_country")
        if not country_code:
            country_code = get_country_code_from_query(query)
        if country_code:
            print(f"Using country code: {country_code} (explicit: {input_data.get('_explicit_country') is not None})")

        # Detect list queries - be more inclusive
        is_list_all_query = any(phrase in query_lower for phrase in [
            "list all", "all fields", "all subfields", "all topics",
            "all funders", "show all", "what are all", "every field",
            "every subfield", "every topic", "count of", "how many",
            "list fields", "list subfields", "list topics", "list funders",
            "subfields of", "fields of", "topics of", "funders of"
        ])

        # Helper to detect top-* phrase robustly
        def is_top_query_for(word):
            return (word in query_lower) and any(term in query_lower for term in ["top", "highest", "most", "biggest", "largest"])

        is_top_field_query = is_top_query_for("field") and ("subfield" not in query_lower)
        is_top_subfield_query = is_top_query_for("subfield")
        is_top_topic_query = is_top_query_for("topic")
        is_top_funder_query = is_top_query_for("funder")

        # prioritize subfield over field when both appear
        if is_top_subfield_query:
            top_type = "subfield"
            is_top_any = True
        elif is_top_field_query:
            top_type = "field"
            is_top_any = True
        elif is_top_topic_query:
            top_type = "topic"
            is_top_any = True
        elif is_top_funder_query:
            top_type = "funder"
            is_top_any = True
        else:
            top_type = None
            is_top_any = False

        # Save flags for use by caller
        input_data["_is_list_query"] = is_list_all_query
        input_data["_is_top_query"] = is_top_any
        input_data["_top_query_type"] = top_type  # may be None

        # Now decide doc_type for retrieval (for list queries, determine from query)
        doc_type = None
        if top_type:
            doc_type = top_type
        elif is_list_all_query:
            # Check for subfield first (before field) to avoid false matches
            if "subfield" in query_lower:
                doc_type = "subfield"
            elif "field" in query_lower:
                doc_type = "field"
            elif "topic" in query_lower:
                doc_type = "topic"
            elif "funder" in query_lower:
                doc_type = "funder"
            else:
                doc_type = None

        # Debug logging
        print(f"Query analysis - is_list_all_query: {is_list_all_query}, doc_type: {doc_type}, country_code: {country_code}")

        # Build filter conditions
        filter_conditions = [{"category": "Physical Sciences"}]
        if doc_type:
            filter_conditions.append({"type": doc_type})

        # Add country filter if country was detected in query
        if country_code:
            filter_conditions.append({"country_code": country_code.upper()})

        filter_metadata = {"$and": filter_conditions} if filter_conditions else {}

        # Retrieve documents using get() when we want all items of a type (list or top), otherwise similarity
        retrieved_docs = []
        final_context_override = None

        # If this is a top query, we must NOT fallback to similarity search — use the filtered get() result and compute top
        if is_top_any and doc_type:
            all_docs = vector_db.get(where=filter_metadata)
            if all_docs and "documents" in all_docs and "metadatas" in all_docs:
                # Choose metric based on type
                # Choose metric based on type and country
                if country_code and doc_type == "subfield":
                    # For country-specific subfields, use works_count instead of us_works_count
                    metric_key = "works_count"
                else:
                    metric_key = {
                        "field": "topics_count",
                        "subfield": "us_works_count",
                        "topic": "us_works_count",
                        "funder": "total_works_count"
                    }.get(doc_type, None)

                top_doc = None
                max_value = -1
                for i, content in enumerate(all_docs["documents"]):
                    meta = all_docs["metadatas"][i] if i < len(all_docs["metadatas"]) else {}
                    try:
                        val = int(meta.get(metric_key, 0)) if metric_key else 0
                    except Exception:
                        # if value is not integer-like, try to parse digits
                        try:
                            val = int(re.sub(r"[^\d]", "", str(meta.get(metric_key, "") or "0")))
                        except Exception:
                            val = 0
                    if val > max_value:
                        max_value = val
                        top_doc = Document(page_content=content, metadata=meta)
                if top_doc:
                    retrieved_docs = [top_doc]
                    # Build an explicit context that includes metadata so the LLM doesn't hedge
                    name = top_doc.metadata.get("name", "Unknown")
                    if doc_type == "field":
                        extra = f"Topics count: {top_doc.metadata.get('topics_count', 'N/A')}"
                        final_context_override = f"Top field in Physical Sciences: {name}\n{extra}\n\n{top_doc.page_content}"
                    elif doc_type == "subfield":
                        if country_code:
                            works_count = top_doc.metadata.get('works_count', 'N/A')
                            extra = f"Works count in {country_code}: {works_count}"
                            final_context_override = f"Top subfield in Physical Sciences for {country_code}: {name}\n{extra}\n\n{top_doc.page_content}"
                        else:
                            extra = f"US works count: {top_doc.metadata.get('us_works_count', 'N/A')}"
                            final_context_override = f"Top subfield in Physical Sciences: {name}\n{extra}\n\n{top_doc.page_content}"
                    elif doc_type == "topic":
                        extra = f"US works count: {top_doc.metadata.get('us_works_count', 'N/A')}"
                        final_context_override = f"Top topic in Physical Sciences: {name}\n{extra}\n\n{top_doc.page_content}"
                    elif doc_type == "funder":
                        extra = f"Total works count: {top_doc.metadata.get('total_works_count', 'N/A')}"
                        final_context_override = f"Top funder in Physical Sciences: {name}\n{extra}\n\n{top_doc.page_content}"
                    print(f"Selected top {doc_type}: {name} ({max_value})")
                else:
                    # No top doc found (empty get result) — set retrieved_docs empty
                    retrieved_docs = []
            else:
                # no docs from get, do not fallback to similarity for top queries
                retrieved_docs = []
        elif doc_type and is_list_all_query:
            # list all documents of doc_type matching optional filters
            print(f"Using document-based retrieval for list query: doc_type={doc_type}, country_code={country_code}")
            print(f"Filter metadata: {filter_metadata}")
            all_docs = vector_db.get(where=filter_metadata)
            if all_docs and "documents" in all_docs and len(all_docs["documents"]) > 0:
                for i, content in enumerate(all_docs["documents"]):
                    meta = all_docs["metadatas"][i] if i < len(all_docs.get("metadatas", [])) else {}
                    retrieved_docs.append(Document(page_content=content, metadata=meta))
                print(f"Retrieved {len(retrieved_docs)} documents for list-all {doc_type} (country: {country_code})")
            else:
                print(f"No documents found with filter: {filter_metadata}")
                # If country filter returned no results, try without country filter to see if country data exists
                if country_code:
                    print(f"Trying without country filter to check if country data exists...")
                    no_country_filter = {"$and": [{"category": "Physical Sciences"}, {"type": doc_type}]}
                    test_docs = vector_db.get(where=no_country_filter)
                    if test_docs and "documents" in test_docs and len(test_docs["documents"]) > 0:
                        print(f"Found {len(test_docs['documents'])} {doc_type} documents without country filter, but none for {country_code}")
                        print(f"This suggests country-specific data for {country_code} may not be loaded in the vector store.")
                        print(f"Please rebuild the vector store to include country-specific data.")
                retrieved_docs = []
        else:
            # Regular similarity search (fallback)
            # If country is specified, we should still try to filter by country
            if country_code:
                # Try to get documents with country filter first
                country_filter = {
                    "$and": [
                        {"category": "Physical Sciences"},
                        {"country_code": country_code.upper()}
                    ]
                }
                country_docs = vector_db.get(where=country_filter)
                if country_docs and "documents" in country_docs and country_docs["documents"]:
                    # Use similarity search but filter results by country
                    all_retrieved = retriever.invoke(query)
                    # Filter to only include documents with matching country_code
                    retrieved_docs = [
                        doc for doc in all_retrieved
                        if doc.metadata.get("country_code", "").upper() == country_code.upper()
                    ]
                    if not retrieved_docs:
                        # If no matches, fall back to country-filtered get()
                        for i, content in enumerate(country_docs["documents"]):
                            meta = country_docs["metadatas"][i] if i < len(country_docs.get("metadatas", [])) else {}
                            retrieved_docs.append(Document(page_content=content, metadata=meta))
                    print(f"Similarity retrieved {len(retrieved_docs)} docs (filtered by country {country_code})")
                else:
                    retrieved_docs = retriever.invoke(query)
                    print(f"Similarity retrieved {len(retrieved_docs)} docs")
            else:
                retrieved_docs = retriever.invoke(query)
                print(f"Similarity retrieved {len(retrieved_docs)} docs")

        # Decide final context to pass to LLM
        if final_context_override:
            context_str = final_context_override
            input_data["_is_top_query"] = True
            input_data["_top_query_type"] = doc_type
        else:
            # Use formatted docs (may be empty string)
            context_str = format_docs(retrieved_docs)

        # Save the retrieved_docs count for debugging if useful
        input_data["_retrieved_count"] = len(retrieved_docs)

        return context_str

    # Create the RAG chain
    def process_query(input_data):
        """Process query through retrieval and LLM with appropriate formatting."""
        # Get context (this also sets flags on input_data)
        context = get_contextualized_retrieval(input_data)
        is_list_query = input_data.get("_is_list_query", False)
        is_top_query = input_data.get("_is_top_query", False)

        # Build QA system prompt according to flags
        qa_system_prompt = create_qa_system_prompt(
            is_list_query=is_list_query,
            is_top_query=is_top_query
        )
        qa_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", qa_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )

        # If it's a top query and we already built an explicit context override,
        # we still let the LLM generate the final polished answer but it will be
        # forced to rely on the explicit context.
        chain = qa_prompt | llm | StrOutputParser()
        result = chain.invoke({
            "context": context,
            "input": input_data["input"],
            "chat_history": input_data.get("chat_history", [])
        })

        return result

    rag_chain = process_query

    print("✓ RAG chain initialized successfully")
    return rag_chain


@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages and return AI responses."""
    global chat_history

    try:
        # Get JSON data from request
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No JSON data provided"
            }), 400

        # Get message from request
        message = data.get('message')

        if message is None:
            return jsonify({
                "error": "Missing required field: 'message'"
            }), 400

        # Validate message is not empty
        message = str(message).strip()
        if not message:
            return jsonify({
                "error": "Message cannot be empty"
            }), 400

        # Get optional country code from request
        country_code = data.get('country')
        if country_code:
            country_code = str(country_code).strip().upper()
            # Validate country code is 2 letters
            if len(country_code) != 2:
                country_code = None

        # Check if RAG chain is initialized
        if rag_chain is None:
            return jsonify({
                "error": "RAG chain not initialized. Please check server logs."
            }), 503

        # Process the user's query through the retrieval chain with chat history
        # Pass explicit country code to the retrieval function
        result = rag_chain({
            "input": message,
            "chat_history": chat_history,
            "_explicit_country": country_code  # Pass explicit country for retrieval
        })

        # Update the chat history
        chat_history.append(HumanMessage(content=message))
        chat_history.append(AIMessage(content=result))

        # Return response
        return jsonify({
            "response": result
        }), 200

    except Exception as e:
        print(f"Error processing chat message: {e}")
        return jsonify({
            "error": "An error occurred while processing your message",
            "details": str(e) if app.debug else None
        }), 500


if __name__ == '__main__':
    # Initialize RAG chain before starting server
    print("Initializing RAG chain...")
    rag_chain = initialize_rag_chain()

    if rag_chain is None:
        print("Failed to initialize RAG chain. Exiting.")
        sys.exit(1)

    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5050))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

    print(f"\nStarting Flask API server on port {port}")
    print(f"Debug mode: {debug}")
    print("API endpoint: POST /api/chat")
    print("\nExample request:")
    print('  curl -X POST http://localhost:5000/api/chat \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"message": "What is the top subfield in Physical Sciences?"}\'\n')

    app.run(host='0.0.0.0', port=port, debug=debug)
