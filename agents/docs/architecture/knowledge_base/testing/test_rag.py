#!/usr/bin/env python3
"""
test_rag.py - Test the RAG implementation with the OpenAI Agents SDK

This script tests the RAG implementation by querying the knowledge base using 
the LangChain and OpenAI integration.
"""

import os
import sys
from pathlib import Path

# Try to import required packages
try:
    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate
    from langchain_community.document_loaders import DirectoryLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter 
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain.chains import create_retrieval_chain
    from langchain.chains.combine_documents import create_stuff_documents_chain
except ImportError as e:
    print(f"Error: Missing required packages. {e}")
    print("Please install the required packages with:")
    print("  ./scripts/package_management/install_rag_packages.sh")
    sys.exit(1)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not found. Assuming environment variables are set.")

def load_knowledge_base(kb_dir=None):
    """
    Load the knowledge base documents and create a vector store.
    
    Args:
        kb_dir (str, optional): The directory containing the knowledge base files.
    
    Returns:
        Chroma: A vector store with the documents.
    """
    if kb_dir is None:
        # Default to the directory where this script is located
        kb_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    print(f"Loading knowledge base from: {kb_dir}")
    
    # Load markdown files from the agent_guide directory
    loader = DirectoryLoader(
        str(kb_dir / "agent_guide"), 
        glob="**/*.md", 
        show_progress=True
    )
    docs = loader.load()
    print(f"Loaded {len(docs)} documents")
    
    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200
    )
    splits = text_splitter.split_documents(docs)
    print(f"Split into {len(splits)} chunks")
    
    # Create embeddings and vector store
    embedding = OpenAIEmbeddings()
    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embedding
    )
    
    return vectorstore

def create_rag_chain():
    """
    Create a RAG chain using LangChain and OpenAI.
    
    Returns:
        Chain: A retrieval chain that can answer questions.
    """
    # Create the vector store
    vectorstore = load_knowledge_base()
    retriever = vectorstore.as_retriever()
    
    # Create the language model
    model = ChatOpenAI()
    
    # Create the prompt template
    prompt = ChatPromptTemplate.from_template("""
    Answer the question based only on the following context:
    
    {context}
    
    Question: {input}
    """)
    
    # Create the document chain
    document_chain = create_stuff_documents_chain(model, prompt)
    
    # Create the retrieval chain
    retrieval_chain = create_retrieval_chain(retriever, document_chain)
    
    return retrieval_chain

def answer_question(question):
    """
    Answer a question using the RAG implementation.
    
    Args:
        question (str): The question to answer.
    
    Returns:
        str: The answer to the question.
    """
    chain = create_rag_chain()
    response = chain.invoke({"input": question})
    return response["answer"]

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_rag.py <question>")
        print("Example: python test_rag.py 'What is the manager pattern?'")
        return
    
    question = " ".join(sys.argv[1:])
    print(f"Question: {question}")
    print("\nSearching knowledge base...")
    
    try:
        answer = answer_question(question)
        print("\nAnswer:")
        print(answer)
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure you have installed the required packages and set up your OpenAI API key.")
        print("Install packages with: ./scripts/package_management/install_rag_packages.sh")

if __name__ == "__main__":
    main()