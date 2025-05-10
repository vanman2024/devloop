# Implementing RAG with OpenAI Agents SDK

This guide explains how to implement Retrieval Augmented Generation (RAG) using the OpenAI Agents SDK and LangChain.

## Prerequisites

1. Install the required packages:

```bash
# From the project root directory
./scripts/package_management/install_rag_packages.sh
```

This will install:
- `langchain-openai`: Integration between LangChain and OpenAI
- `langchain-community`: Community components for LangChain
- `langchain-chroma`: Vector store integration for document embeddings

2. Set up your OpenAI API key in the `.env` file or as an environment variable.

## Implementation Steps

### 1. Load and Process Documents

```python
from langchain_community.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Load documents from a directory
loader = DirectoryLoader("path/to/documents", glob="**/*.md")
docs = loader.load()

# Split documents into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, 
    chunk_overlap=200
)
splits = text_splitter.split_documents(docs)
```

### 2. Create Embeddings and Vector Store

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

# Create embeddings
embedding = OpenAIEmbeddings()

# Create vector store
vectorstore = Chroma.from_documents(
    documents=splits,
    embedding=embedding
)

# Create retriever
retriever = vectorstore.as_retriever()
```

### 3. Create RAG Chain

```python
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

# Create language model
model = ChatOpenAI()

# Create prompt template
prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context:

{context}

Question: {input}
""")

# Create document chain
document_chain = create_stuff_documents_chain(model, prompt)

# Create retrieval chain
retrieval_chain = create_retrieval_chain(retriever, document_chain)
```

### 4. Query the RAG System

```python
# Ask a question
question = "What is the manager pattern in agent orchestration?"
response = retrieval_chain.invoke({"input": question})

# Get the answer
answer = response["answer"]
print(answer)
```

## Integration with Agents SDK

To integrate the RAG system with the OpenAI Agents SDK, you can create a custom tool that uses the RAG system to answer questions.

```python
from openai_agents import Tool

# Define the RAG tool
class RAGTool(Tool):
    name = "knowledge_base_search"
    description = "Search the knowledge base for information about agent patterns and implementations."
    
    def __init__(self, retrieval_chain):
        super().__init__()
        self.retrieval_chain = retrieval_chain
    
    async def invoke(self, request):
        # Extract the question from the request
        question = request["question"]
        
        # Query the RAG system
        response = self.retrieval_chain.invoke({"input": question})
        
        # Return the answer
        return {"answer": response["answer"]}

# Create the RAG tool
retrieval_chain = create_rag_chain()  # Function from the previous section
rag_tool = RAGTool(retrieval_chain)

# Add the tool to your agent
# ... rest of agent setup code ...
```

## Testing the RAG Implementation

You can test the RAG implementation using the provided script:

```bash
# From the knowledge_base directory
./test_rag.py "What is the manager pattern in agent orchestration?"
```

## Best Practices

1. **Document Quality**: Ensure your knowledge base documents are well-structured and contain relevant information.

2. **Chunk Size**: Experiment with different chunk sizes and overlaps to find the optimal balance for your content.

3. **Prompt Engineering**: Fine-tune the prompt template to get better answers for your specific use case.

4. **Error Handling**: Implement robust error handling, especially for API errors and token limits.

5. **Caching**: Consider implementing caching for embeddings and results to improve performance and reduce API costs.

## Troubleshooting

- **Missing Packages**: If you encounter import errors, run the installation script to ensure all required packages are installed.

- **API Key Issues**: Make sure your OpenAI API key is correctly set up in the environment.

- **Token Limits**: If you're processing large documents, you might hit token limits. Consider reducing chunk sizes or implementing pagination.

- **Performance Issues**: If the RAG system is slow, consider implementing batch processing or caching mechanisms.