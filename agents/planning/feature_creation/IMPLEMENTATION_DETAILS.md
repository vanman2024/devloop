# Implementation Details for Enhanced Feature Creation Agent

This document provides technical implementation details for the Enhanced Feature Creation Agent.

## Core Architecture

The Enhanced Feature Creation Agent is built using a modular architecture with the following key components:

### 1. Enhanced Core

The `EnhancedFeatureCreationAgent` class in `enhanced_core.py` serves as the central orchestrator for the entire system. It:

- Initializes and manages all sub-components
- Orchestrates the feature analysis workflow
- Handles API operations
- Manages the lifecycle of the agent

Key implementation features:
- Singleton patterns for component access
- Graceful degradation via component fallbacks
- Redis-based caching for performance
- LLM-based or rule-based analysis depending on availability

### 2. LLM Connector

The LLM connector in `llm_connector.py` provides a unified interface to OpenAI's models:

```python
class LLMConnector:
    """Connector for OpenAI LLM integration"""
    
    def __init__(self, model="gpt-4o", temperature=0.0, max_tokens=1500, api_key=None):
        """Initialize the LLM connector"""
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.llm_available = False
        
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=api_key)
            
            # Test connection
            self.client.models.list(limit=1)
            self.llm_available = True
        except Exception as e:
            logger.warning(f"OpenAI client initialization failed: {e}")
    
    def chat_completion(self, prompt, system_message=None):
        """Get chat completion from OpenAI"""
        if not self.llm_available:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message or "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI chat completion error: {e}")
            return None
    
    def json_completion(self, prompt, system_message=None):
        """Get JSON completion from OpenAI"""
        if not self.llm_available:
            return {}
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message or "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.error(f"OpenAI JSON completion error: {e}")
            return {}
    
    def create_embeddings(self, texts):
        """Create embeddings for texts"""
        if not self.llm_available:
            return None
        
        try:
            response = self.client.embeddings.create(
                model="text-embedding-3-large",
                input=texts
            )
            
            return [embedding.embedding for embedding in response.data]
        except Exception as e:
            logger.error(f"OpenAI embeddings error: {e}")
            return None
```

### 3. Knowledge Graph Connector

The knowledge graph connector in `knowledge_graph_connector.py` provides a specialized interface for interacting with the knowledge graph:

Key implementation features:
- Integration with the MemoryKnowledgeGraph system
- Mock implementation for standalone operation
- Methods for querying and updating the knowledge graph
- Specialized feature-related operations

### 4. Vector Store

The vector store in `vector_store.py` provides semantic search capabilities:

```python
class VectorStore:
    """Vector store for feature embeddings"""
    
    def __init__(self, embedding_dim=1536, similarity_threshold=0.75, storage_path=None):
        """Initialize the vector store"""
        self.embedding_dim = embedding_dim
        self.similarity_threshold = similarity_threshold
        self.storage_path = storage_path or os.path.expanduser("~/.devloop/sdk/storage/vector_store.db")
        
        # Initialize storage
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        
        # Check if file exists
        if os.path.exists(self.storage_path):
            # Load existing vector store
            with open(self.storage_path, 'rb') as f:
                try:
                    self.features = pickle.load(f)
                except Exception as e:
                    logger.error(f"Error loading vector store: {e}")
                    self.features = {}
        else:
            self.features = {}
        
        # Check if LLM is available for embeddings
        try:
            from llm_connector import get_llm_connector
            self.llm_connector = get_llm_connector()
            self.llm_available = self.llm_connector.llm_available
        except ImportError:
            logger.warning("LLM connector not available for embeddings")
            self.llm_available = False
            self.llm_connector = None
    
    def save(self):
        """Save the vector store to disk"""
        with open(self.storage_path, 'wb') as f:
            pickle.dump(self.features, f)
    
    def _compute_embedding(self, text):
        """Compute embedding for text"""
        if self.llm_available and self.llm_connector:
            embeddings = self.llm_connector.create_embeddings([text])
            if embeddings and len(embeddings) > 0:
                return embeddings[0]
        
        # Fallback: compute simple TF-IDF style embedding
        # This is a very simplistic embedding for demonstration
        words = text.lower().split()
        embedding = [0.0] * self.embedding_dim
        
        for i, word in enumerate(words):
            h = hash(word) % self.embedding_dim
            embedding[h] += 1.0 / len(words)
        
        # Normalize
        norm = math.sqrt(sum(x*x for x in embedding))
        if norm > 0:
            embedding = [x/norm for x in embedding]
        
        return embedding
    
    def _compute_similarity(self, embedding1, embedding2):
        """Compute cosine similarity between embeddings"""
        if not embedding1 or not embedding2:
            return 0.0
        
        dot_product = sum(a*b for a, b in zip(embedding1, embedding2))
        norm1 = math.sqrt(sum(x*x for x in embedding1))
        norm2 = math.sqrt(sum(x*x for x in embedding2))
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def add_feature(self, feature_id, feature_data):
        """Add a feature to the vector store"""
        try:
            # Extract text for embedding
            text_parts = []
            
            if 'name' in feature_data:
                text_parts.append(feature_data['name'])
                
            if 'description' in feature_data:
                text_parts.append(feature_data['description'])
                
            if 'tags' in feature_data:
                text_parts.append(' '.join(feature_data['tags']))
                
            if 'domain' in feature_data:
                text_parts.append(feature_data['domain'])
                
            if 'purpose' in feature_data:
                text_parts.append(feature_data['purpose'])
            
            # Compute embedding
            text = ' '.join(text_parts)
            embedding = self._compute_embedding(text)
            
            # Store feature with embedding
            self.features[feature_id] = {
                'data': feature_data,
                'embedding': embedding,
                'text': text
            }
            
            # Save to disk
            self.save()
            
            return True
        except Exception as e:
            logger.error(f"Error adding feature to vector store: {e}")
            return False
    
    def search_similar_features(self, query, top_k=5):
        """Search for similar features"""
        try:
            # Compute query embedding
            query_embedding = self._compute_embedding(query)
            
            # Compute similarities
            similarities = []
            
            for feature_id, feature in self.features.items():
                similarity = self._compute_similarity(query_embedding, feature['embedding'])
                similarities.append((feature_id, similarity))
            
            # Sort by similarity
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            # Return top-k results above threshold
            results = []
            
            for feature_id, similarity in similarities[:top_k]:
                if similarity >= self.similarity_threshold:
                    feature_data = self.features[feature_id]['data']
                    results.append({
                        'id': feature_id,
                        'name': feature_data.get('name', ''),
                        'similarity': similarity
                    })
            
            return results
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            return []
```

### 5. MongoDB Connector

The MongoDB connector in `mongo_connector.py` provides persistent storage:

```python
class MongoConnector:
    """MongoDB connector for persistent storage"""
    
    def __init__(self, uri=None, db=None, collection=None):
        """Initialize the MongoDB connector"""
        self.uri = uri or os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        self.db_name = db or os.getenv('MONGODB_DB', 'devloop')
        self.collection_name = collection or 'features'
        self.mongo_available = False
        
        # Storage for fallback
        self.storage_dir = os.path.expanduser("~/.devloop/sdk/storage")
        os.makedirs(self.storage_dir, exist_ok=True)
        
        try:
            from pymongo import MongoClient
            self.client = MongoClient(self.uri)
            
            # Test connection
            self.client.admin.command('ping')
            
            self.db = self.client[self.db_name]
            self.collection = self.db[self.collection_name]
            self.mongo_available = True
            
            logger.info(f"Connected to MongoDB: {self.uri}, db: {self.db_name}, collection: {self.collection_name}")
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}")
            logger.info("Using file-based storage fallback")
    
    def store_feature(self, feature_data):
        """Store a feature in MongoDB or fallback storage"""
        feature_id = feature_data.get('id')
        
        if not feature_id:
            logger.error("Feature ID is required")
            return False
        
        try:
            if self.mongo_available:
                # Store in MongoDB
                result = self.collection.update_one(
                    {'_id': feature_id},
                    {'$set': feature_data},
                    upsert=True
                )
                
                return result.acknowledged
            else:
                # Store in file
                feature_file = os.path.join(self.storage_dir, f"feature_{feature_id}.json")
                
                with open(feature_file, 'w') as f:
                    json.dump(feature_data, f, indent=2)
                
                return True
        except Exception as e:
            logger.error(f"Error storing feature: {e}")
            return False
    
    def get_feature(self, feature_id):
        """Get a feature from MongoDB or fallback storage"""
        try:
            if self.mongo_available:
                # Get from MongoDB
                feature = self.collection.find_one({'_id': feature_id})
                return feature
            else:
                # Get from file
                feature_file = os.path.join(self.storage_dir, f"feature_{feature_id}.json")
                
                if os.path.exists(feature_file):
                    with open(feature_file, 'r') as f:
                        return json.load(f)
                
                return None
        except Exception as e:
            logger.error(f"Error getting feature: {e}")
            return None
    
    def get_features(self, query=None, limit=100):
        """Get features from MongoDB or fallback storage"""
        try:
            if self.mongo_available:
                # Get from MongoDB
                features = list(self.collection.find(query or {}).limit(limit))
                return features
            else:
                # Get from files
                features = []
                
                for file_name in os.listdir(self.storage_dir):
                    if file_name.startswith('feature_') and file_name.endswith('.json'):
                        feature_file = os.path.join(self.storage_dir, file_name)
                        
                        with open(feature_file, 'r') as f:
                            feature = json.load(f)
                        
                        # Apply query if provided
                        if query:
                            match = True
                            for key, value in query.items():
                                if key not in feature or feature[key] != value:
                                    match = False
                                    break
                            
                            if not match:
                                continue
                        
                        features.append(feature)
                        
                        if len(features) >= limit:
                            break
                
                return features
        except Exception as e:
            logger.error(f"Error getting features: {e}")
            return []
    
    def get_project_structure(self, project_id=None):
        """Get project structure from MongoDB or fallback"""
        # For now, this returns a mock structure
        # In a real implementation, this would query the project structure from MongoDB
        
        return {
            "milestones": [
                {
                    "id": "milestone-core-foundation",
                    "name": "Core Foundation",
                    "phases": [
                        {
                            "id": "phase-01",
                            "name": "Phase 1",
                            "modules": [
                                {"id": "core-infrastructure", "name": "Core Infrastructure"}
                            ]
                        }
                    ]
                },
                {
                    "id": "milestone-ui-dashboard",
                    "name": "UI Dashboard",
                    "phases": [
                        {
                            "id": "phase-04",
                            "name": "Phase 4",
                            "modules": [
                                {"id": "feature-improvements", "name": "Feature Improvements"}
                            ]
                        }
                    ]
                },
                {
                    "id": "milestone-integrated-testing",
                    "name": "Integrated Testing",
                    "phases": [
                        {
                            "id": "phase-02",
                            "name": "Phase 2",
                            "modules": [
                                {"id": "test-progression", "name": "Test Progression"}
                            ]
                        }
                    ]
                },
                {
                    "id": "milestone-agent-ecosystem",
                    "name": "Agent Ecosystem",
                    "phases": [
                        {
                            "id": "phase-03",
                            "name": "Phase 3",
                            "modules": [
                                {"id": "knowledge-graph-agents", "name": "Knowledge Graph Agents"}
                            ]
                        }
                    ]
                }
            ]
        }
```

### 6. Redis Cache

The Redis cache in `redis_cache.py` provides caching for expensive operations:

```python
def cached(key_prefix, ttl=3600):
    """Decorator for Redis caching"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            # Check if self has redis_cache
            if not hasattr(self, 'use_cache') or not self.use_cache:
                return func(self, *args, **kwargs)
            
            # Try to get redis cache instance
            redis_cache = get_redis_cache()
            
            # Generate key
            key_parts = [key_prefix]
            for arg in args:
                if isinstance(arg, (str, int, float, bool)):
                    key_parts.append(str(arg))
                else:
                    key_parts.append(hashlib.md5(str(arg).encode()).hexdigest())
            
            for k, v in sorted(kwargs.items()):
                if isinstance(v, (str, int, float, bool)):
                    key_parts.append(f"{k}:{v}")
                else:
                    key_parts.append(f"{k}:{hashlib.md5(str(v).encode()).hexdigest()}")
            
            cache_key = ':'.join(key_parts)
            
            # Try to get from cache
            cached_value = redis_cache.get(cache_key)
            
            if cached_value is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_value
            
            # Call original function
            result = func(self, *args, **kwargs)
            
            # Store in cache
            redis_cache.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    
    return decorator
```

### 7. RAG Engine

The RAG engine in `rag_engine.py` implements Retrieval-Augmented Generation:

```python
class RAGEngine:
    """
    RAG (Retrieval-Augmented Generation) engine for feature creation
    
    This engine combines vector search, knowledge graph traversal, and LLM generation
    to provide more accurate feature analysis and placement suggestions.
    """
    
    def __init__(self, llm_model="gpt-4o", embedding_model="text-embedding-3-large", 
                 chunk_size=1000, chunk_overlap=100, temperature=0.0, use_streaming=False):
        """Initialize the RAG engine"""
        self.llm_model = llm_model
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.temperature = temperature
        self.use_streaming = use_streaming
        
        # Get required components
        self.llm_connector = get_llm_connector()
        self.vector_store = get_vector_store()
        self.kg_connector = get_knowledge_graph_connector()
        
        # Check if components are available
        self.llm_available = hasattr(self.llm_connector, 'llm_available') and self.llm_connector.llm_available
        
        if not self.llm_available:
            logger.warning("LLM is not available for RAG engine - using fallback mechanisms")
    
    def _get_relevant_context(self, feature_name, feature_description):
        """Get relevant context for the feature"""
        context = {}
        
        # Add project structure
        context['project_structure'] = self.kg_connector.get_project_structure()
        
        # Get similar features from vector store
        query = f"{feature_name} {feature_description}"
        similar_features = self.vector_store.search_similar_features(query, top_k=5)
        
        context['similar_features'] = similar_features
        
        # Extract concepts from description
        if self.llm_available:
            # Use LLM to extract concepts
            prompt = f"Extract key concepts from this feature description:\n{feature_description}\n\nReturn just a JSON array of concept strings."
            system_message = "You are an AI that extracts key concepts from feature descriptions."
            
            concepts_json = self.llm_connector.json_completion(prompt, system_message)
            if isinstance(concepts_json, list):
                concepts = concepts_json
            elif isinstance(concepts_json, dict) and 'concepts' in concepts_json:
                concepts = concepts_json['concepts']
            else:
                concepts = []
        else:
            # Fallback: extract nouns as concepts
            words = feature_description.lower().split()
            concepts = [word for word in words if len(word) > 3 and word.isalpha()]
            concepts = list(set(concepts))[:10]  # Limit to 10 unique concepts
        
        context['concepts'] = concepts
        
        # Query knowledge graph for concepts
        domain = self._infer_domain(feature_name, feature_description)
        purpose = self._infer_purpose(feature_name, feature_description)
        
        kg_results = self.kg_connector.query_by_concepts(concepts, domain, purpose)
        context['kg_results'] = kg_results
        
        return context
    
    def _infer_domain(self, feature_name, feature_description):
        """Infer the domain of the feature"""
        if self.llm_available:
            prompt = f"What is the primary domain of this feature? Choose exactly one from: ui, testing, data, api, agent.\n\nFeature name: {feature_name}\nFeature description: {feature_description}\n\nReturn just the domain name in lowercase."
            system_message = "You are an AI that categorizes features into domains."
            
            domain = self.llm_connector.chat_completion(prompt, system_message)
            domain = domain.strip().lower()
            
            # Validate domain
            valid_domains = {'ui', 'testing', 'data', 'api', 'agent'}
            if domain not in valid_domains:
                domain = 'unknown'
        else:
            # Fallback: infer domain from keywords
            text = f"{feature_name} {feature_description}".lower()
            
            if any(kw in text for kw in ['ui', 'user interface', 'front-end', 'frontend', 'dashboard', 'view']):
                domain = 'ui'
            elif any(kw in text for kw in ['test', 'testing', 'validate', 'verification', 'quality']):
                domain = 'testing'
            elif any(kw in text for kw in ['data', 'database', 'storage', 'persistence']):
                domain = 'data'
            elif any(kw in text for kw in ['api', 'endpoint', 'service', 'integration']):
                domain = 'api'
            elif any(kw in text for kw in ['agent', 'ai', 'ml', 'intelligence']):
                domain = 'agent'
            else:
                domain = 'unknown'
        
        return domain
    
    def _infer_purpose(self, feature_name, feature_description):
        """Infer the purpose of the feature"""
        if self.llm_available:
            prompt = f"What is the primary purpose of this feature? Choose exactly one from: bugfix, enhancement, new_feature, refactoring.\n\nFeature name: {feature_name}\nFeature description: {feature_description}\n\nReturn just the purpose name in lowercase."
            system_message = "You are an AI that categorizes features by purpose."
            
            purpose = self.llm_connector.chat_completion(prompt, system_message)
            purpose = purpose.strip().lower()
            
            # Validate purpose
            valid_purposes = {'bugfix', 'enhancement', 'new_feature', 'refactoring'}
            if purpose not in valid_purposes:
                purpose = 'enhancement'
        else:
            # Fallback: infer purpose from keywords
            text = f"{feature_name} {feature_description}".lower()
            
            if any(kw in text for kw in ['bug', 'fix', 'issue', 'problem', 'defect']):
                purpose = 'bugfix'
            elif any(kw in text for kw in ['new', 'add', 'create']):
                purpose = 'new_feature'
            elif any(kw in text for kw in ['refactor', 'clean', 'improve', 'simplify']):
                purpose = 'refactoring'
            else:
                purpose = 'enhancement'
        
        return purpose
    
    def suggest_placement(self, feature_name, feature_description):
        """
        Suggest optimal placement for a feature using RAG
        
        Args:
            feature_name: Name of the feature
            feature_description: Description of the feature
            
        Returns:
            Dictionary with suggested milestone, phase, module, and confidence
        """
        # Get relevant context
        context = self._get_relevant_context(feature_name, feature_description)
        
        # Extract info from context
        domain = self._infer_domain(feature_name, feature_description)
        purpose = self._infer_purpose(feature_name, feature_description)
        concepts = context.get('concepts', [])
        similar_features = context.get('similar_features', [])
        kg_results = context.get('kg_results', {})
        
        # Use LLM to suggest placement
        if self.llm_available:
            # Prepare context for LLM
            context_str = f"Project structure:\n{json.dumps(context['project_structure'], indent=2)}\n\n"
            
            if similar_features:
                context_str += "Similar features:\n"
                for feature in similar_features:
                    context_str += f"- {feature['name']} (ID: {feature['id']})\n"
                context_str += "\n"
            
            if kg_results.get('suggested_milestone'):
                context_str += f"Knowledge graph suggests:\n"
                context_str += f"- Milestone: {kg_results.get('suggested_milestone')}\n"
                context_str += f"- Phase: {kg_results.get('suggested_phase')}\n"
                context_str += f"- Module: {kg_results.get('suggested_module')}\n"
                context_str += "\n"
            
            # Prepare prompt
            prompt = f"""
            Feature name: {feature_name}
            Feature description: {feature_description}
            Domain: {domain}
            Purpose: {purpose}
            Concepts: {', '.join(concepts)}
            
            Based on the feature description and the context provided, suggest the optimal placement 
            (milestone, phase, module) for this feature within the project structure.
            
            Context:
            {context_str}
            
            Return your response as a JSON object with these fields:
            - suggested_milestone: The suggested milestone ID
            - suggested_phase: The suggested phase ID
            - suggested_module: The suggested module ID
            - confidence: A number between 0 and 1 indicating your confidence in this suggestion
            - analysis: An object with concepts, domain, and purpose fields
            - suggested_tags: An array of suggested tags for this feature
            - potential_dependencies: An array of potential dependencies (objects with id, name, and type fields)
            """
            
            system_message = "You are an AI assistant that suggests optimal placement for features within a project structure. Your responses should be in JSON format."
            
            # Get placement suggestion from LLM
            suggestion = self.llm_connector.json_completion(prompt, system_message)
            
            # Apply defaults for missing fields
            if 'suggested_milestone' not in suggestion:
                suggestion['suggested_milestone'] = kg_results.get('suggested_milestone')
            
            if 'suggested_phase' not in suggestion:
                suggestion['suggested_phase'] = kg_results.get('suggested_phase')
            
            if 'suggested_module' not in suggestion:
                suggestion['suggested_module'] = kg_results.get('suggested_module')
            
            if 'confidence' not in suggestion:
                suggestion['confidence'] = 0.7
            
            if 'analysis' not in suggestion:
                suggestion['analysis'] = {
                    'concepts': concepts,
                    'domain': domain,
                    'purpose': purpose
                }
            
            if 'suggested_tags' not in suggestion:
                suggestion['suggested_tags'] = kg_results.get('suggested_tags', concepts)
            
            if 'potential_dependencies' not in suggestion:
                suggestion['potential_dependencies'] = kg_results.get('potential_dependencies', [])
            
            return suggestion
        else:
            # Fallback: use knowledge graph suggestions
            suggested_milestone = kg_results.get('suggested_milestone')
            suggested_phase = kg_results.get('suggested_phase')
            suggested_module = kg_results.get('suggested_module')
            
            return {
                'suggested_milestone': suggested_milestone,
                'suggested_phase': suggested_phase,
                'suggested_module': suggested_module,
                'confidence': 0.6,
                'analysis': {
                    'concepts': concepts,
                    'domain': domain,
                    'purpose': purpose
                },
                'suggested_tags': kg_results.get('suggested_tags', concepts),
                'potential_dependencies': kg_results.get('potential_dependencies', [])
            }
    
    def update_knowledge_base(self, feature_id, feature_data):
        """
        Update the knowledge base with a feature
        
        Args:
            feature_id: ID of the feature
            feature_data: Feature data
            
        Returns:
            True if successful, False otherwise
        """
        # Update vector store
        vector_success = self.vector_store.add_feature(feature_id, feature_data)
        
        # No need to update knowledge graph here since it's called separately
        
        return vector_success
```

### 8. LangChain Integration

The LangChain integration in `langchain_integration.py` provides LangChain-based components:

```python
class LangChainFeatureAnalyzer:
    """LangChain-based feature analyzer"""
    
    def __init__(self, llm_model="gpt-4o", temperature=0.0):
        """Initialize the LangChain feature analyzer"""
        self.llm_model = llm_model
        self.temperature = temperature
        
        # Check if LangChain is available
        try:
            from langchain.prompts import ChatPromptTemplate
            from langchain.output_parsers import JsonOutputParser
            from langchain_openai import ChatOpenAI
            
            self.langchain_available = True
            
            # Get API key from config
            config = get_config()
            api_key = config.get('openai', {}).get('api_key')
            
            # Create LLM
            self.llm = ChatOpenAI(
                model=self.llm_model,
                temperature=self.temperature,
                openai_api_key=api_key
            )
            
            # Create parser
            self.parser = JsonOutputParser()
            
            # Create prompt template
            self.prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an AI that analyzes feature descriptions to extract key information."),
                ("user", "Analyze the following feature:\n\nName: {name}\nDescription: {description}\n\nExtract the following information:\n- Key concepts (nouns and technical terms)\n- Domain (ui, testing, data, api, or agent)\n- Purpose (bugfix, enhancement, new_feature, or refactoring)\n\nReturn the results as a JSON object with concepts (array of strings), domain (string), and purpose (string) fields.")
            ])
            
            # Create chain
            self.chain = self.prompt | self.llm | self.parser
            
        except ImportError:
            logger.warning("LangChain not available - using fallback")
            self.langchain_available = False
    
    def analyze_feature(self, feature_name, feature_description):
        """Analyze a feature using LangChain"""
        if not self.langchain_available:
            logger.warning("LangChain not available - using fallback")
            
            # Fallback to LLM connector
            try:
                from llm_connector import get_llm_connector
                llm_connector = get_llm_connector()
                
                if llm_connector.llm_available:
                    prompt = f"Analyze the following feature:\n\nName: {feature_name}\nDescription: {feature_description}\n\nExtract the following information:\n- Key concepts (nouns and technical terms)\n- Domain (ui, testing, data, api, or agent)\n- Purpose (bugfix, enhancement, new_feature, or refactoring)\n\nReturn the results as a JSON object with concepts (array of strings), domain (string), and purpose (string) fields."
                    
                    system_message = "You are an AI that analyzes feature descriptions to extract key information."
                    
                    result = llm_connector.json_completion(prompt, system_message)
                    return result
                
            except ImportError:
                pass
            
            # Ultimate fallback to rule-based analysis
            from core import FeatureAnalyzer
            analyzer = FeatureAnalyzer()
            return analyzer.analyze(feature_name, feature_description)
        
        try:
            # Run LangChain chain
            result = self.chain.invoke({
                "name": feature_name,
                "description": feature_description
            })
            
            return result
        except Exception as e:
            logger.error(f"Error running LangChain chain: {e}")
            
            # Fallback to rule-based analysis
            from core import FeatureAnalyzer
            analyzer = FeatureAnalyzer()
            return analyzer.analyze(feature_name, feature_description)
```

## Workflow Implementation

### Feature Creation Workflow

The feature creation workflow is implemented as follows:

```
User Request
    │
    ▼
┌──────────────────┐
│ Process Feature  │
└──────────────────┘
    │
    ├──────────────┬─────────────┬─────────────────┐
    │              │             │                 │
    ▼              ▼             ▼                 ▼
┌──────────┐  ┌─────────┐  ┌───────────┐  ┌───────────────┐
│ Analyze  │  │ Query   │  │ Query     │  │ Determine     │
│ Feature  │  │ Know-   │  │ Structure │  │ Optimal       │
└──────────┘  │ ledge   │  └───────────┘  │ Placement     │
    │         └─────────┘        │        └───────────────┘
    │              │             │                 │
    └──────────────┴─────────────┴─────────────────┘
    │
    ▼
┌──────────────────┐
│ Generate Feature │
│ ID               │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Create Feature   │
│ Result           │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Update Knowledge │
│ Base (if         │
│ confirmed)       │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Return Result    │
└──────────────────┘
```

The key stages in the workflow are:

1. **Process Feature Request**: Entry point for feature creation
2. **Analyze Feature**: Extract concepts, domain, and purpose
3. **Query Knowledge**: Find related concepts in knowledge graph
4. **Query Structure**: Get project structure
5. **Determine Optimal Placement**: Suggest milestone, phase, and module
6. **Generate Feature ID**: Create unique ID for the feature
7. **Create Feature Result**: Compile comprehensive feature definition
8. **Update Knowledge Base**: Store feature in MongoDB, vector store, and knowledge graph
9. **Return Result**: Send feature information back to the user

### RAG Workflow

The RAG-based workflow (used when RAG is enabled) is implemented as follows:

```
User Request
    │
    ▼
┌──────────────────┐
│ Process Feature  │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ RAG Engine       │
└──────────────────┘
    │
    ├──────────────┬─────────────┬─────────────────┐
    │              │             │                 │
    ▼              ▼             ▼                 ▼
┌──────────┐  ┌─────────┐  ┌───────────┐  ┌───────────────┐
│ Get      │  │ Vector  │  │ Knowledge │  │ LLM-based     │
│ Context  │  │ Search  │  │ Graph     │  │ Suggestion    │
└──────────┘  └─────────┘  │ Query     │  └───────────────┘
                           └───────────┘
    │
    ▼
┌──────────────────┐
│ Generate Feature │
│ ID               │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Create Feature   │
│ Result           │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Update Knowledge │
│ Base (if         │
│ confirmed)       │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Return Result    │
└──────────────────┘
```

The RAG-based workflow differs by using a single RAG engine to perform most of the analysis and suggestion tasks.

## Knowledge Graph Implementation

### Node Structure

Knowledge graph nodes have the following structure:

```json
{
  "id": "feature-1234",
  "type": "feature",
  "properties": {
    "name": "Task Management Dashboard",
    "description": "A dashboard for managing tasks with filtering and sorting",
    "status": "not-started",
    "tags": ["ui", "dashboard", "tasks"],
    "domain": "ui",
    "purpose": "enhancement",
    "created_at": "2025-05-07T12:34:56.789Z",
    "updated_at": "2025-05-07T12:34:56.789Z"
  },
  "metadata": {
    "created_by": "feature_creation_agent",
    "milestone": "milestone-ui-dashboard",
    "phase": "phase-04",
    "module": "feature-improvements"
  }
}
```

### Edge Structure

Knowledge graph edges have the following structure:

```json
{
  "type": "module_contains_feature",
  "source": "feature-improvements",
  "target": "feature-1234",
  "properties": {},
  "metadata": {
    "created_by": "feature_creation_agent",
    "created_at": "2025-05-07T12:34:56.789Z"
  }
}
```

### Knowledge Graph Updates

When adding a feature to the knowledge graph, the system:

1. Checks if the feature already exists
2. Checks if milestone/phase/module exist and creates them if needed
3. Creates the feature node with properties and metadata
4. Connects the feature to its containing module/phase/milestone
5. Adds dependencies with relationship attributes
6. Creates concept nodes from tags and links them to the feature
7. Links the feature to domain and purpose taxonomies

## API Implementation

The agent's API operations are implemented as adapter functions in the `execute_operation` method of the `EnhancedFeatureCreationAgent` class:

```python
def execute_operation(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a specific operation
    
    Args:
        operation: Name of the operation to execute
        params: Parameters for the operation
    
    Returns:
        Result of the operation
    """
    # Define operation adapters
    def analyze_feature_adapter(params):
        # ...
    
    def suggest_placement_adapter(params):
        # ...
    
    def generate_id_adapter(params):
        # ...
    
    def query_knowledge_adapter(params):
        # ...
    
    def query_structure_adapter(params):
        # ...
    
    def vector_search_adapter(params):
        # ...
    
    def update_knowledge_base_adapter(params):
        # ...
    
    def get_related_features_adapter(params):
        # ...
        
    def query_features_adapter(params):
        # ...
    
    # Map operations to adapters
    operations = {
        'process_feature': self.process_feature_request,
        'analyze_feature': analyze_feature_adapter,
        'suggest_placement': suggest_placement_adapter,
        'generate_id': generate_id_adapter,
        'query_knowledge': query_knowledge_adapter,
        'query_structure': query_structure_adapter,
        'vector_search': vector_search_adapter,
        'update_knowledge_base': update_knowledge_base_adapter,
        'get_related_features': get_related_features_adapter,
        'query_features': query_features_adapter
    }
    
    # Execute operation
    if operation not in operations:
        return {
            'success': False,
            'error': f"Unknown operation: {operation}"
        }
    
    try:
        result = operations[operation](params)
        return {
            'success': True,
            'result': result
        }
    except Exception as e:
        logger.error(f"Error executing operation {operation}: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }
```

## Command-line Interface

The command-line interface is implemented in the `main` function of `enhanced_core.py`:

```python
def main():
    """Main entry point for the Enhanced Feature Creation Agent"""
    parser = argparse.ArgumentParser(description='Enhanced Feature Creation Agent')
    
    # Core command line arguments
    parser.add_argument('--spawn', action='store_true', help='Spawn the agent')
    parser.add_argument('--retire', action='store_true', help='Retire the agent')
    parser.add_argument('--status', action='store_true', help='Get agent status')
    parser.add_argument('--operation', type=str, help='Operation to execute')
    parser.add_argument('--context', type=str, help='Path to context file')
    parser.add_argument('--params', type=str, help='Path to params file')
    parser.add_argument('--reason', type=str, default='API request', help='Reason for retirement')
    
    # Enhanced agent options
    parser.add_argument('--use-rag', action='store_true', default=True, help='Use RAG engine')
    parser.add_argument('--use-langchain', action='store_true', default=True, help='Use LangChain components')
    parser.add_argument('--use-cache', action='store_true', default=True, help='Use Redis caching')
    parser.add_argument('--no-rag', action='store_true', help='Disable RAG engine')
    parser.add_argument('--no-langchain', action='store_true', help='Disable LangChain components')
    parser.add_argument('--no-cache', action='store_true', help='Disable Redis caching')
    
    args = parser.parse_args()
    
    # Process enhanced options
    use_rag = args.use_rag and not args.no_rag
    use_langchain = args.use_langchain and not args.no_langchain
    use_cache = args.use_cache and not args.no_cache
    
    # Create agent instance
    agent = EnhancedFeatureCreationAgent(
        use_rag=use_rag,
        use_langchain=use_langchain,
        use_cache=use_cache
    )
    
    # Process command
    result = None
    
    if args.spawn:
        context = {}
        if args.context and os.path.exists(args.context):
            with open(args.context, 'r') as f:
                context = json.load(f)
        result = agent.spawn(context)
    
    elif args.retire:
        result = agent.retire(args.reason)
    
    elif args.status:
        result = agent.status()
    
    elif args.operation:
        params = {}
        if args.params and os.path.exists(args.params):
            with open(args.params, 'r') as f:
                params = json.load(f)
        result = agent.execute_operation(args.operation, params)
    
    else:
        result = {
            'success': False,
            'error': 'No valid command specified. Use --spawn, --retire, --status, or --operation'
        }
    
    # Print result as JSON
    print(json.dumps(result, indent=2))
    
    # Return success/failure
    return 0 if result.get('success', False) else 1
```

## Configuration Implementation

The configuration system is implemented in `config.py`:

```python
def get_config():
    """
    Get configuration from environment variables, .env file, or config file
    
    Returns:
        Dictionary containing configuration
    """
    config = {
        'openai': {
            'api_key': None,
            'model': 'gpt-4o',
            'temperature': 0.0,
            'max_tokens': 1500
        },
        'redis': {
            'url': 'redis://localhost:6379/0',
            'ttl': 3600
        },
        'mongodb': {
            'uri': 'mongodb://localhost:27017',
            'db': 'devloop',
            'collection': 'features'
        },
        'knowledge_graph': {
            'path': None
        },
        'vector_store': {
            'embedding_dim': 1536,
            'similarity_threshold': 0.75
        },
        'rag': {
            'enabled': True,
            'use_streaming': False,
            'chunk_size': 1000,
            'chunk_overlap': 100
        },
        'feature_creation': {
            'default_domain': 'unknown',
            'default_purpose': 'enhancement',
            'min_confidence': 0.5
        }
    }
    
    # Try to load .env file
    env_vars = {}
    env_path = os.path.join(PROJECT_ROOT, '.env')
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"\'')
    
    # Apply .env file values
    # For OpenAI, check RAG_OPENAI_API_KEY first, then OPENAI_API_KEY
    if 'RAG_OPENAI_API_KEY' in env_vars:
        config['openai']['api_key'] = env_vars['RAG_OPENAI_API_KEY']
    elif 'OPENAI_API_KEY' in env_vars:
        config['openai']['api_key'] = env_vars['OPENAI_API_KEY']
    
    if 'OPENAI_MODEL' in env_vars:
        config['openai']['model'] = env_vars['OPENAI_MODEL']
    
    if 'REDIS_URL' in env_vars:
        config['redis']['url'] = env_vars['REDIS_URL']
    
    if 'MONGODB_URI' in env_vars:
        config['mongodb']['uri'] = env_vars['MONGODB_URI']
    
    if 'MONGODB_DB' in env_vars:
        config['mongodb']['db'] = env_vars['MONGODB_DB']
    
    if 'KNOWLEDGE_GRAPH_PATH' in env_vars:
        config['knowledge_graph']['path'] = env_vars['KNOWLEDGE_GRAPH_PATH']
    
    # Try to load config file
    config_dir = os.path.expanduser("~/.devloop")
    config_path = os.path.join(config_dir, 'config.json')
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                file_config = json.load(f)
            
            # Deep merge
            deep_merge(config, file_config)
        except Exception as e:
            logger.warning(f"Error loading config file: {e}")
    
    # Apply environment variables (higher priority than file)
    # For OpenAI, check RAG_OPENAI_API_KEY first, then OPENAI_API_KEY
    if os.getenv('RAG_OPENAI_API_KEY'):
        config['openai']['api_key'] = os.getenv('RAG_OPENAI_API_KEY')
    elif os.getenv('OPENAI_API_KEY'):
        config['openai']['api_key'] = os.getenv('OPENAI_API_KEY')
    
    if os.getenv('OPENAI_MODEL'):
        config['openai']['model'] = os.getenv('OPENAI_MODEL')
    
    if os.getenv('REDIS_URL'):
        config['redis']['url'] = os.getenv('REDIS_URL')
    
    if os.getenv('MONGODB_URI'):
        config['mongodb']['uri'] = os.getenv('MONGODB_URI')
    
    if os.getenv('MONGODB_DB'):
        config['mongodb']['db'] = os.getenv('MONGODB_DB')
    
    if os.getenv('KNOWLEDGE_GRAPH_PATH'):
        config['knowledge_graph']['path'] = os.getenv('KNOWLEDGE_GRAPH_PATH')
    
    return config

def is_llm_available():
    """
    Check if LLM is available
    
    Returns:
        True if LLM is available, False otherwise
    """
    config = get_config()
    
    # Check if OpenAI API key is set
    if not config['openai']['api_key']:
        return False
    
    # Try to import openai
    try:
        from openai import OpenAI
        client = OpenAI(api_key=config['openai']['api_key'])
        
        # Test connection by listing models
        client.models.list(limit=1)
        
        return True
    except Exception as e:
        logger.warning(f"OpenAI client initialization failed: {e}")
        return False
```

## Performance Optimizations

### Caching

The system uses Redis caching to optimize expensive operations:

```python
@cached("analyze_feature", ttl=3600)
def _analyze_feature(self, feature_name: str, feature_description: str) -> Dict[str, Any]:
    """
    Analyze a feature description using the appropriate analyzer
    
    Args:
        feature_name: Name of the feature
        feature_description: Description of the feature
        
    Returns:
        Analysis results
    """
    # Implementation...
```

### Parallel Processing

The system uses parallel processing for independent operations:

```python
# Parallel processing example
import asyncio

async def process_feature_async(self, request: Dict[str, Any]) -> Dict[str, Any]:
    """Process a feature request asynchronously"""
    # Create tasks for independent operations
    analyze_task = asyncio.create_task(self._analyze_feature_async(
        feature_name=request.get('name', ''),
        feature_description=request.get('description', '')
    ))
    
    structure_task = asyncio.create_task(self._query_structure_async(
        project_id=request.get('projectId')
    ))
    
    # Wait for both tasks to complete
    analysis_result, structure_result = await asyncio.gather(
        analyze_task,
        structure_task
    )
    
    # Use results for dependent operations
    # ...
```

### Vector Indexing

The vector store uses efficient indexing for similarity search:

```python
def _compute_similarity(self, embedding1, embedding2):
    """Compute cosine similarity between embeddings"""
    if not embedding1 or not embedding2:
        return 0.0
    
    # Dot product optimized for sparse vectors
    dot_product = 0.0
    for i, v1 in enumerate(embedding1):
        if v1 != 0:
            v2 = embedding2[i]
            if v2 != 0:
                dot_product += v1 * v2
    
    norm1 = math.sqrt(sum(x*x for x in embedding1))
    norm2 = math.sqrt(sum(x*x for x in embedding2))
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)
```

## Error Handling

The system includes comprehensive error handling:

```python
try:
    # Operation that might fail
    result = self.llm_connector.chat_completion(prompt, system_message)
    return result
except Exception as e:
    logger.error(f"Error in LLM completion: {str(e)}")
    
    # Fallback to rule-based approach
    from core import FeatureAnalyzer
    analyzer = FeatureAnalyzer()
    return analyzer.analyze(feature_name, feature_description)
```

## Fallback Mechanisms

The system includes multiple fallback mechanisms:

1. **LLM Fallback**: Falls back to rule-based analysis when LLM is unavailable
2. **Knowledge Graph Fallback**: Uses mock implementation when real knowledge graph is unavailable
3. **Redis Fallback**: Uses in-memory cache when Redis is unavailable
4. **MongoDB Fallback**: Uses file-based storage when MongoDB is unavailable
5. **LangChain Fallback**: Uses direct LLM calls when LangChain is unavailable

## Testing Infrastructure

The system includes comprehensive testing infrastructure:

```python
def test_feature_creation():
    """Test feature creation"""
    agent = EnhancedFeatureCreationAgent()
    
    result = agent.process_feature_request({
        'name': 'Test Feature',
        'description': 'A test feature'
    })
    
    assert result['success'], "Process feature request should succeed"
    assert 'feature' in result, "Result should contain feature"
    assert 'id' in result['feature'], "Feature should have ID"
    assert 'suggestedMilestone' in result['feature'], "Feature should have suggested milestone"
    
    return result
```