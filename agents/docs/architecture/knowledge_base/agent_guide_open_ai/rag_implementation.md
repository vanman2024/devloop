# RAG Implementation with LangChain and OpenAI

This guide explains how to implement a Retrieval-Augmented Generation (RAG) system using LangChain with OpenAI and Pinecone for vector storage.

## Required Packages

For a complete RAG implementation, you'll need these packages:

```bash
# The project already has langchain and langchain-community installed
# Just need to add these:
pip install langchain-openai pinecone-client
```

Each package serves a specific purpose:
- `langchain`: Core LangChain functionality (already installed)
- `langchain-community`: Community integrations for LangChain (already installed)
- `langchain-openai`: OpenAI-specific integrations for LangChain
- `pinecone-client`: Client for Pinecone vector database

Note: The `langchain-openai` package is specifically needed for the OpenAI embeddings and LLM integration.

## Basic RAG Architecture

A RAG system consists of several components:

1. **Document Loading**: Ingesting and processing documents
2. **Text Splitting**: Chunking documents into manageable pieces
3. **Embedding**: Converting text chunks into vector embeddings
4. **Vector Storage**: Storing embeddings in a vector database
5. **Retrieval**: Finding relevant documents for a query
6. **Generation**: Using an LLM to generate responses based on retrieved context

## Implementation Example

### 1. Document Loading and Processing

```python
from langchain.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Load documents from a directory
loader = DirectoryLoader("./knowledge_base/", glob="**/*.md")
documents = loader.load()

# Split documents into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
chunks = text_splitter.split_documents(documents)

print(f"Loaded {len(documents)} documents and split into {len(chunks)} chunks")
```

### 2. Setting Up Embeddings and Vector Store

```python
import os
import pinecone
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore

# Initialize OpenAI embeddings
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",  # Or text-embedding-3-large for higher quality
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

# Initialize Pinecone
pinecone.init(
    api_key=os.getenv("PINECONE_API_KEY"),
    environment=os.getenv("PINECONE_ENVIRONMENT")
)

# Create or connect to an index
index_name = "agent-knowledge-base"
if index_name not in pinecone.list_indexes():
    pinecone.create_index(
        name=index_name,
        dimension=1536,  # Dimension for text-embedding-3-small
        metric="cosine"
    )

# Create vector store
vector_store = PineconeVectorStore(
    index_name=index_name,
    embedding=embeddings
)

# Add documents to the vector store
vector_store.add_documents(chunks)
```

### 3. Creating a Retrieval System

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor
from langchain_openai import ChatOpenAI

# Create a base retriever
retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

# Optionally, create a compressor to refine retrieved documents
llm = ChatOpenAI(temperature=0, model="gpt-4o")
compressor = LLMChainExtractor.from_llm(llm)

# Create a compression retriever
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)
```

### 4. Building a RAG Chain

```python
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# Create a custom prompt template
template = """
You are an AI assistant specializing in agent development with OpenAI's Agent SDK.
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

Context:
{context}

Question: {question}

Answer:
"""

PROMPT = PromptTemplate(
    template=template,
    input_variables=["context", "question"]
)

# Create a RetrievalQA chain
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=compression_retriever,
    chain_type_kwargs={"prompt": PROMPT},
    return_source_documents=True
)
```

### 5. Using the RAG System

```python
def ask_rag_system(question):
    """Ask a question to the RAG system"""
    result = qa_chain({"query": question})
    
    print(f"Question: {question}")
    print(f"Answer: {result['result']}")
    print("\nSources:")
    for i, doc in enumerate(result["source_documents"]):
        print(f"Source {i+1}: {doc.metadata.get('source', 'Unknown')}")
    
    return result

# Example usage
ask_rag_system("How does the manager pattern work in agent development?")
ask_rag_system("What are the best practices for implementing guardrails?")
```

## Integrating RAG with Agents

You can integrate your RAG system with the OpenAI Agents SDK to create knowledge-enhanced agents:

```python
from openai.agents import Agent, function_tool, Runner

# Create a function tool that uses the RAG system
@function_tool
def query_knowledge_base(query: str) -> str:
    """
    Query the knowledge base for information about agent development.
    
    Args:
        query: The question to ask about agent development
        
    Returns:
        str: Information from the knowledge base
    """
    result = qa_chain({"query": query})
    return result["result"]

# Create an agent with access to the knowledge base
agent = Agent(
    name="Agent Development Assistant",
    instructions="""
    You are an expert assistant for agent development using OpenAI's Agents SDK.
    You have access to a knowledge base with information about agent patterns,
    implementations, and best practices. When asked about agent development,
    use the query_knowledge_base tool to provide accurate information.
    """,
    tools=[query_knowledge_base]
)

# Run the agent
async def main():
    result = await Runner.run(
        agent=agent,
        messages=[{"role": "user", "content": "How should I implement handoffs in a decentralized agent system?"}]
    )
    
    # Process and display the result
    for message in result.new_messages:
        print(f"{message.role}: {message.content}")

# Run the agent
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

## Best Practices for RAG Systems

1. **Properly Chunk Your Documents**: Experiment with chunk sizes. Too large and context is lost; too small and semantic meaning is fragmented.

2. **Use Overlap Between Chunks**: An overlap of 10-20% ensures semantic continuity between chunks.

3. **Thoughtfully Design Prompts**: Make your prompts explicit about how to use the retrieved context.

4. **Consider Metadata Filtering**: Add metadata to your documents for more targeted retrieval.

5. **Implement Evaluation**: Regularly test your RAG system against a diverse set of queries to ensure quality.

6. **Multiple Retrieval Methods**: Consider combining different retrieval methods (similarity, MMR, etc.) for better results.

7. **Handle Source Attribution**: Always track and provide source attribution for transparency.

8. **Regularly Update Knowledge**: Implement a process to keep your vector store updated with new information.

## Advanced RAG Techniques

1. **Hybrid Search**: Combine semantic search with keyword-based search for better results.

2. **Recursive Retrieval**: For complex queries, break them down and recursively retrieve information.

3. **Query Transformation**: Use the LLM to transform user queries into more effective search queries.

4. **Contextual Compression**: Filter retrieved documents to only include the most relevant content.

5. **Multi-index Retrieval**: Maintain multiple indices for different types of knowledge.