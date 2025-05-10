#!/usr/bin/env python3
"""
rag_agent.py - Implementation of an agent with RAG (Retrieval Augmented Generation)

This implementation demonstrates how to integrate a RAG system with the
OpenAI Agents SDK to create an agent with access to a knowledge base.
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# LangChain imports
from langchain.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA

# Note: The below imports require langchain-openai to be installed
# If not installed, run: pip install langchain-openai
try:
    from langchain_openai import OpenAIEmbeddings, ChatOpenAI
except ImportError:
    # Fallback to stub class for documentation purposes
    class OpenAIEmbeddings:
        """Placeholder for OpenAIEmbeddings. Install langchain-openai for actual implementation."""
        def __init__(self, *args, **kwargs):
            raise ImportError("Please install langchain-openai to use this class")
            
    class ChatOpenAI:
        """Placeholder for ChatOpenAI. Install langchain-openai for actual implementation."""
        def __init__(self, *args, **kwargs):
            raise ImportError("Please install langchain-openai to use this class")

# Use an in-memory vector store for the example
# In production, you'd use Pinecone, Weaviate, or another persistent solution
from langchain_community.vectorstores import FAISS

# OpenAI Agents SDK imports
from agents import Agent, function_tool, Runner

class RAGSystem:
    """Retrieval Augmented Generation system implementation"""
    
    def __init__(self, knowledge_dir: str, openai_api_key: Optional[str] = None):
        """
        Initialize the RAG system
        
        Args:
            knowledge_dir: Directory containing knowledge base documents
            openai_api_key: OpenAI API key (defaults to environment variable)
        """
        # Set up API key
        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        # Initialize components
        self.docs_dir = knowledge_dir
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=self.api_key
        )
        self.llm = ChatOpenAI(
            temperature=0,
            model="gpt-4o",
            openai_api_key=self.api_key
        )
        
        # Load and prepare the knowledge base
        self.vector_store = self._prepare_knowledge_base()
        
        # Create the QA chain
        self.qa_chain = self._create_qa_chain()
    
    def _prepare_knowledge_base(self):
        """Load, split, and index documents from the knowledge base"""
        # Load documents
        loader = DirectoryLoader(self.docs_dir, glob="**/*.md")
        documents = loader.load()
        
        print(f"Loaded {len(documents)} documents from {self.docs_dir}")
        
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents(documents)
        
        print(f"Split into {len(chunks)} chunks")
        
        # Create vector store
        vector_store = FAISS.from_documents(chunks, self.embeddings)
        
        return vector_store
    
    def _create_qa_chain(self):
        """Create the retrieval QA chain"""
        # Create retriever
        retriever = self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}
        )
        
        # Create compressor for better context refinement
        compressor = LLMChainExtractor.from_llm(self.llm)
        compression_retriever = ContextualCompressionRetriever(
            base_compressor=compressor,
            base_retriever=retriever
        )
        
        # Create custom prompt
        template = """
        You are an AI assistant specializing in agent development with OpenAI's Agent SDK.
        Use the following pieces of context to answer the question at the end.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        Keep your answers technical, accurate, and concise.
        
        Context:
        {context}
        
        Question: {question}
        
        Answer:
        """
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
        
        # Create QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=compression_retriever,
            chain_type_kwargs={"prompt": prompt},
            return_source_documents=True
        )
        
        return qa_chain
    
    def query(self, question: str) -> Dict[str, Any]:
        """
        Query the RAG system
        
        Args:
            question: The question to ask
            
        Returns:
            Dict with the answer and source documents
        """
        return self.qa_chain({"query": question})

class RAGAgent:
    """Agent with RAG capabilities"""
    
    def __init__(self, knowledge_dir: str, agent_name: str, agent_instructions: str):
        """
        Initialize a RAG-enabled agent
        
        Args:
            knowledge_dir: Directory containing knowledge base documents
            agent_name: Name of the agent
            agent_instructions: Instructions for the agent
        """
        # Initialize RAG system
        self.rag_system = RAGSystem(knowledge_dir)
        
        # Create function tool for the RAG system
        @function_tool
        def query_knowledge_base(query: str) -> str:
            """
            Query the knowledge base for information about agent development.
            
            Args:
                query: The question to ask about agent development
                
            Returns:
                str: Information from the knowledge base
            """
            result = self.rag_system.query(query)
            sources = "\n\nSources:\n"
            for i, doc in enumerate(result["source_documents"]):
                sources += f"- {doc.metadata.get('source', 'Unknown')}\n"
            
            return result["result"] + sources
        
        # Create the agent
        self.agent = Agent(
            name=agent_name,
            instructions=agent_instructions,
            tools=[query_knowledge_base]
        )
    
    async def run(self, messages: List[Dict[str, str]]):
        """
        Run the agent
        
        Args:
            messages: List of messages to process
            
        Returns:
            Agent execution result
        """
        return await Runner.run(self.agent, messages)

async def main():
    """Main entry point for demonstration"""
    # Define paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    knowledge_dir = os.path.join(os.path.dirname(current_dir), "agent_guide")
    
    # Create RAG agent
    rag_agent = RAGAgent(
        knowledge_dir=knowledge_dir,
        agent_name="Agent Development Assistant",
        agent_instructions="""
        You are an expert assistant for agent development using OpenAI's Agents SDK.
        You have access to a knowledge base with information about agent patterns,
        implementations, and best practices.
        
        When asked about agent development, use the query_knowledge_base tool to
        provide accurate information.
        
        Always mention the sources of your information and provide technical,
        detailed responses.
        """
    )
    
    # Define test questions
    test_questions = [
        "How does the manager pattern work in agent development?",
        "What is the difference between manager and decentralized patterns?",
        "How should I implement guardrails for my agents?",
        "Can you explain how handoffs work in the decentralized pattern?"
    ]
    
    # Run the agent for each question
    for question in test_questions:
        print("\n" + "="*50)
        print(f"Question: {question}")
        print("="*50)
        
        result = await rag_agent.run([{"role": "user", "content": question}])
        
        # Display the result
        for message in result.new_messages:
            print(f"{message.role}: {message.content}")
        
        # Add a pause between questions
        print("\nProcessing next question...\n")
        await asyncio.sleep(1)

if __name__ == "__main__":
    # Run the main function
    asyncio.run(main())