# ML-Based Document Tagging and Categorization System

This document outlines the machine learning-powered tagging and categorization system for the Agentic Documentation Management System, integrating with existing components.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Document Processing Pipeline                        │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  ML Tagging & Categorization System                  │
│                                                                     │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐        │
│  │ Semantic    │       │  Auto-      │       │ Taxonomy    │        │
│  │ Analysis    │──────▶│  Tagging    │──────▶│ Management  │        │
│  └─────────────┘       └─────────────┘       └─────────────┘        │
│         │                     │                    │                 │
│         │                     │                    │                 │
│         ▼                     ▼                    ▼                 │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐        │
│  │ Similarity  │       │  Tag        │       │ Category    │        │
│  │ Clustering  │◄─────▶│  Refinement │◄─────▶│ Prediction  │        │
│  └─────────────┘       └─────────────┘       └─────────────┘        │
└────────────────┬──────────────────┬───────────────────┬─────────────┘
                 │                  │                   │
                 ▼                  ▼                   ▼
┌────────────────────┐  ┌───────────────────┐  ┌────────────────────┐
│    Vector Store    │  │  Knowledge Graph   │  │  Tag Registry      │
└────────────────────┘  └───────────────────┘  └────────────────────┘
```

## Core Components

### 1. Tag Registry System

The tag registry manages the taxonomy of tags, categories, and their relationships:

```javascript
class TagRegistry {
  constructor(knowledgeGraph, redisClient) {
    this.kg = knowledgeGraph;
    this.redis = redisClient;
    this.tagCache = {};
    this.categoryCache = {};
  }
  
  async loadTagHierarchy() {
    // Load all tags from knowledge graph
    const tags = await this.kg.getAllTagNodes();
    
    // Organize into hierarchy
    const hierarchy = {};
    
    for (const tag of tags) {
      // Extract parent relationships
      const parents = await this.kg.getRelatedNodes(
        tag.id, 
        { relationship: "CHILD_OF", direction: "OUT" }
      );
      
      // Extract category relationships
      const categories = await this.kg.getRelatedNodes(
        tag.id, 
        { relationship: "BELONGS_TO", direction: "OUT" }
      );
      
      // Add to hierarchy
      hierarchy[tag.id] = {
        id: tag.id,
        name: tag.name,
        description: tag.description,
        parents: parents.map(p => p.id),
        categories: categories.map(c => c.id),
        usage: tag.usage || 0,
        created_at: tag.created_at,
        synonyms: tag.synonyms || []
      };
      
      // Cache for quick access
      this.tagCache[tag.id] = hierarchy[tag.id];
      this.tagCache[tag.name.toLowerCase()] = hierarchy[tag.id];
    }
    
    return hierarchy;
  }
  
  async findTag(nameOrId) {
    // Check cache first
    if (this.tagCache[nameOrId] || this.tagCache[nameOrId.toLowerCase()]) {
      return this.tagCache[nameOrId] || this.tagCache[nameOrId.toLowerCase()];
    }
    
    // Search in knowledge graph
    const tag = await this.kg.findTagByNameOrId(nameOrId);
    
    if (tag) {
      // Add to cache
      this.tagCache[tag.id] = tag;
      this.tagCache[tag.name.toLowerCase()] = tag;
      return tag;
    }
    
    return null;
  }
  
  async createTag(tagData) {
    // Check if tag already exists
    const existingTag = await this.findTag(tagData.name);
    if (existingTag) {
      return { tag: existingTag, created: false };
    }
    
    // Create new tag node
    const tagId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newTag = {
      id: tagId,
      name: tagData.name,
      description: tagData.description || '',
      usage: 0,
      created_at: new Date().toISOString(),
      synonyms: tagData.synonyms || []
    };
    
    // Create in knowledge graph
    await this.kg.createTagNode(
      tagId,
      newTag.name,
      {
        description: newTag.description,
        synonyms: newTag.synonyms,
        created_at: newTag.created_at
      }
    );
    
    // Connect to parent tags if specified
    if (tagData.parents && tagData.parents.length > 0) {
      for (const parentId of tagData.parents) {
        await this.kg.createRelationship(
          "tag", tagId,
          "tag", parentId,
          "CHILD_OF",
          { created_at: newTag.created_at }
        );
      }
    }
    
    // Connect to categories if specified
    if (tagData.categories && tagData.categories.length > 0) {
      for (const categoryId of tagData.categories) {
        await this.kg.createRelationship(
          "tag", tagId,
          "category", categoryId,
          "BELONGS_TO",
          { created_at: newTag.created_at }
        );
      }
    }
    
    // Add to cache
    this.tagCache[tagId] = newTag;
    this.tagCache[newTag.name.toLowerCase()] = newTag;
    
    // Index in Redis for fast text search
    await this.redis.sadd('tags:all', tagId);
    await this.redis.set(`tag:${tagId}`, JSON.stringify(newTag));
    await this.redis.set(`tag:name:${newTag.name.toLowerCase()}`, tagId);
    
    // Add synonyms to index
    for (const synonym of newTag.synonyms) {
      await this.redis.set(`tag:synonym:${synonym.toLowerCase()}`, tagId);
    }
    
    return { tag: newTag, created: true };
  }
  
  async incrementTagUsage(tagId) {
    // Increment usage counter in knowledge graph
    await this.kg.incrementTagUsage(tagId);
    
    // Update cache
    if (this.tagCache[tagId]) {
      this.tagCache[tagId].usage += 1;
    }
    
    // Update Redis
    await this.redis.hincrby(`tag:${tagId}:stats`, 'usage', 1);
  }
  
  async findSimilarTags(tagName, threshold = 0.7) {
    // Implementation using embedding similarity
    // If OpenAI embeddings are available:
    try {
      const tagEmbedding = await this.getEmbedding(tagName);
      
      // Find similar tags using vector search
      const similarTags = await this.kg.findSimilarTagsByEmbedding(
        tagEmbedding,
        threshold
      );
      
      return similarTags;
    } catch (error) {
      console.error('Error finding similar tags:', error);
      
      // Fallback to text-based similarity
      const allTags = await this.kg.getAllTagNodes();
      
      return allTags
        .map(tag => ({
          ...tag,
          similarity: this.calculateTextSimilarity(tagName, tag.name)
        }))
        .filter(tag => tag.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
    }
  }
  
  calculateTextSimilarity(text1, text2) {
    // Simple Jaccard similarity implementation
    const set1 = new Set(text1.toLowerCase().split(''));
    const set2 = new Set(text2.toLowerCase().split(''));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  async normalizeTag(inputTag) {
    // Check if exact tag exists
    const exactTag = await this.findTag(inputTag);
    if (exactTag) {
      return { id: exactTag.id, name: exactTag.name, confidence: 1.0 };
    }
    
    // Look for synonyms
    const tagIdBySynonym = await this.redis.get(`tag:synonym:${inputTag.toLowerCase()}`);
    if (tagIdBySynonym) {
      const tag = await this.findTag(tagIdBySynonym);
      return { id: tag.id, name: tag.name, confidence: 0.95 };
    }
    
    // Find similar tags
    const similarTags = await this.findSimilarTags(inputTag, 0.7);
    if (similarTags.length > 0) {
      const bestMatch = similarTags[0];
      return { 
        id: bestMatch.id, 
        name: bestMatch.name, 
        confidence: bestMatch.similarity 
      };
    }
    
    // No similar tag found, suggest creating a new one
    return { new: true, suggestedName: inputTag, confidence: 0 };
  }
}
```

### 2. Semantic Analysis Engine

The semantic analysis engine extracts concepts and relationships from document content:

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

class SemanticAnalysisEngine:
    def __init__(self, tag_registry, vector_store):
        self.tag_registry = tag_registry
        self.vector_store = vector_store
        self.embeddings = OpenAIEmbeddings()
        self.llm = ChatOpenAI(model_name="gpt-4o", temperature=0)
        
    async def analyze_document(self, document_id, content, metadata=None):
        """Extract key concepts and entities from document content"""
        # Split content into manageable chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_text(content)
        
        # Analyze each chunk
        all_concepts = []
        all_entities = []
        
        for i, chunk in enumerate(chunks):
            # For longer documents, limit the number of chunks we analyze deeply
            if i > 5:  # Only analyze first 5 chunks in detail
                break
                
            # Extract concepts and entities
            chunk_analysis = await self._analyze_chunk(chunk)
            all_concepts.extend(chunk_analysis["concepts"])
            all_entities.extend(chunk_analysis["entities"])
        
        # Deduplicate concepts and entities
        unique_concepts = self._deduplicate_by_name(all_concepts)
        unique_entities = self._deduplicate_by_name(all_entities)
        
        # Organize all findings
        analysis = {
            "document_id": document_id,
            "concepts": unique_concepts,
            "entities": unique_entities,
            "suggested_tags": await self._suggest_tags(unique_concepts, unique_entities),
            "suggested_categories": await self._suggest_categories(content, unique_concepts),
            "metadata": metadata or {}
        }
        
        return analysis
    
    async def _analyze_chunk(self, text):
        """Extract concepts and entities from a single chunk of text"""
        # Prepare prompt for concept extraction
        prompt = f"""
        Analyze the following document excerpt and extract:
        
        1. Key concepts and topics (technical terms, methodologies, frameworks, etc.)
        2. Named entities (people, organizations, technologies, products, etc.)
        
        Format your response as JSON with these keys:
        - concepts: array of objects with name, description, importance (0-1 scale)
        - entities: array of objects with name, type, description
        
        Document excerpt:
        {text}
        """
        
        # Call LLM for analysis
        response = await self.llm.generate([prompt])
        result = response.generations[0][0].text
        
        # Parse the result
        try:
            import json
            parsed = json.loads(result)
            return {
                "concepts": parsed.get("concepts", []),
                "entities": parsed.get("entities", [])
            }
        except Exception as e:
            print(f"Error parsing LLM response: {e}")
            return {"concepts": [], "entities": []}
    
    def _deduplicate_by_name(self, items):
        """Deduplicate items by name, keeping the highest quality version"""
        seen = {}
        for item in items:
            name = item["name"].lower()
            # If we haven't seen this item, or this one has a better description, keep it
            if name not in seen or len(item.get("description", "")) > len(seen[name].get("description", "")):
                seen[name] = item
        return list(seen.values())
    
    async def _suggest_tags(self, concepts, entities):
        """Suggest tags based on concepts and entities"""
        suggested_tags = []
        
        # Process concepts first (they're typically better tag candidates)
        for concept in concepts:
            # Skip low importance concepts
            if concept.get("importance", 0) < 0.4:
                continue
            
            # Normalize with tag registry
            normalized = await self.tag_registry.normalizeTag(concept["name"])
            
            # If it's a known tag or high-confidence match
            if not normalized.get("new") or normalized.get("confidence", 0) > 0.8:
                suggested_tags.append({
                    "id": normalized.get("id"),
                    "name": normalized.get("name", concept["name"]),
                    "source": "concept",
                    "confidence": normalized.get("confidence", 0) * concept.get("importance", 0.5),
                    "description": concept.get("description", "")
                })
            # If it's a new term but seems important, suggest as new tag
            elif concept.get("importance", 0) > 0.7:
                suggested_tags.append({
                    "name": concept["name"],
                    "source": "concept",
                    "confidence": concept.get("importance", 0.5),
                    "description": concept.get("description", ""),
                    "is_new": True
                })
        
        # Process relevant entities (products, technologies, etc.)
        relevant_entity_types = ["PRODUCT", "TECHNOLOGY", "FRAMEWORK", "LANGUAGE", "TOOL", "METHOD"]
        for entity in entities:
            if entity.get("type", "").upper() in relevant_entity_types:
                # Normalize with tag registry
                normalized = await self.tag_registry.normalizeTag(entity["name"])
                
                # If it's a known tag or reasonable match
                if not normalized.get("new") or normalized.get("confidence", 0) > 0.7:
                    suggested_tags.append({
                        "id": normalized.get("id"),
                        "name": normalized.get("name", entity["name"]),
                        "source": "entity",
                        "entity_type": entity.get("type", ""),
                        "confidence": normalized.get("confidence", 0) * 0.8,  # Slightly lower confidence than concepts
                        "description": entity.get("description", "")
                    })
        
        # Deduplicate tags (prefer concept-based over entity-based)
        unique_tags = {}
        for tag in suggested_tags:
            name = tag["name"].lower()
            if name not in unique_tags or (
                tag["source"] == "concept" and unique_tags[name]["source"] == "entity"
            ):
                unique_tags[name] = tag
        
        # Sort by confidence
        return sorted(
            list(unique_tags.values()),
            key=lambda x: x["confidence"],
            reverse=True
        )
    
    async def _suggest_categories(self, content, concepts):
        """Suggest document categories based on content and concepts"""
        # Get the top 5 concepts by importance
        top_concepts = sorted(
            concepts, 
            key=lambda x: x.get("importance", 0), 
            reverse=True
        )[:5]
        
        # Create a summary of the document for classification
        concept_summary = ", ".join([c["name"] for c in top_concepts])
        
        # Use LLM to classify
        prompt = f"""
        Classify this document into one or more categories based on its content.
        
        Document summary:
        {content[:500]}...
        
        Key concepts: {concept_summary}
        
        Available categories:
        - technical_reference (API docs, specifications, etc.)
        - tutorial (step-by-step guides)
        - conceptual_guide (explaining concepts)
        - how_to (specific task instructions)
        - troubleshooting (solving problems)
        - architecture (system design docs)
        - release_notes (version changes)
        - policy (guidelines and rules)
        
        Return your categorization as a JSON array with objects containing:
        - category: the category name
        - confidence: your confidence level (0-1)
        - reasoning: brief explanation
        """
        
        # Call LLM for categorization
        response = await self.llm.generate([prompt])
        result = response.generations[0][0].text
        
        # Parse the result
        try:
            import json
            categories = json.loads(result)
            return categories
        except Exception as e:
            print(f"Error parsing category results: {e}")
            return []
```

### 3. Document Clustering and Similarity System

The clustering system groups similar documents for better organization:

```python
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity

class DocumentClusteringSystem:
    def __init__(self, vector_store, knowledge_graph):
        self.vector_store = vector_store
        self.kg = knowledge_graph
        self.embeddings = {}  # Cache of document embeddings
        
    async def update_document_clusters(self):
        """Update document clusters based on semantic similarity"""
        # Get all document embeddings
        documents = await self.vector_store.get_all_document_embeddings()
        
        # Format for clustering
        doc_ids = []
        embedding_matrix = []
        
        for doc in documents:
            doc_ids.append(doc["id"])
            embedding_matrix.append(doc["embedding"])
            self.embeddings[doc["id"]] = doc["embedding"]
        
        # Convert to numpy array
        X = np.array(embedding_matrix)
        
        # Perform clustering using DBSCAN
        clustering = DBSCAN(eps=0.2, min_samples=3, metric='cosine').fit(X)
        
        # Get cluster labels
        labels = clustering.labels_
        
        # Organize documents by cluster
        clusters = {}
        for i, label in enumerate(labels):
            if label == -1:  # Noise points
                continue
                
            if label not in clusters:
                clusters[label] = []
                
            clusters[label].append(doc_ids[i])
        
        # Update clusters in knowledge graph
        for cluster_id, document_ids in clusters.items():
            # Create or update cluster node
            kg_cluster_id = f"cluster-{cluster_id}"
            
            await self.kg.createOrUpdateClusterNode(
                kg_cluster_id,
                {
                    "size": len(document_ids),
                    "updated_at": datetime.now().toISOString()
                }
            )
            
            # Connect documents to cluster
            for doc_id in document_ids:
                await self.kg.createOrUpdateRelationship(
                    "document", doc_id,
                    "cluster", kg_cluster_id,
                    "BELONGS_TO",
                    {
                        "updated_at": datetime.now().toISOString()
                    }
                )
        
        return {
            "total_documents": len(doc_ids),
            "clusters_found": len(clusters),
            "noise_documents": list(labels).count(-1)
        }
    
    async def find_similar_documents(self, document_id, threshold=0.7, limit=10):
        """Find documents similar to the given document"""
        # Get document embedding
        doc_embedding = self.embeddings.get(document_id)
        
        if not doc_embedding:
            doc_embedding = await self.vector_store.get_document_embedding(document_id)
            if not doc_embedding:
                raise ValueError(f"No embedding found for document {document_id}")
            self.embeddings[document_id] = doc_embedding
        
        # Search vector store for similar documents
        similar_docs = await self.vector_store.search_by_vector(
            doc_embedding,
            limit=limit+1,  # +1 because the document itself will be included
            threshold=threshold
        )
        
        # Remove the document itself from results
        similar_docs = [doc for doc in similar_docs if doc["id"] != document_id]
        
        # Limit to requested number
        return similar_docs[:limit]
    
    async def get_document_cluster(self, document_id):
        """Get the cluster containing this document"""
        # Query knowledge graph for cluster relationship
        cluster = await self.kg.getRelatedNodes(
            document_id,
            { relationship: "BELONGS_TO", target_type: "cluster" }
        )
        
        if not cluster or len(cluster) == 0:
            return None
            
        # Get other documents in the same cluster
        cluster_id = cluster[0].id
        
        cluster_documents = await self.kg.getRelatedNodes(
            cluster_id,
            { relationship: "BELONGS_TO", source_type: "document", direction: "IN" }
        )
        
        return {
            "cluster_id": cluster_id,
            "size": len(cluster_documents),
            "documents": cluster_documents
        }
```

### 4. Auto-Tagging Agent

The auto-tagging agent uses LLMs to automatically tag documents:

```python
from openai import AsyncOpenAI
from agents import Agent, function_tool, Runner

class AutoTaggingAgent:
    def __init__(self, tag_registry, semantic_engine, knowledge_graph):
        self.tag_registry = tag_registry
        self.semantic_engine = semantic_engine
        self.kg = knowledge_graph
        self.client = AsyncOpenAI()
        
        # Define tools for the agent
        @function_tool
        async def analyze_document_content(document_id: str, content: str) -> dict:
            """
            Analyze document content to extract concepts and suggest tags
            
            Args:
                document_id: ID of the document
                content: Text content of the document
                
            Returns:
                Analysis results with concepts, entities, and suggested tags
            """
            return await self.semantic_engine.analyze_document(document_id, content)
        
        @function_tool
        async def normalize_tag(tag_name: str) -> dict:
            """
            Normalize a tag name against the existing tag registry
            
            Args:
                tag_name: The tag name to normalize
                
            Returns:
                Normalized tag information
            """
            return await self.tag_registry.normalizeTag(tag_name)
        
        @function_tool
        async def create_new_tag(name: str, description: str = "", synonyms: list = None) -> dict:
            """
            Create a new tag in the registry
            
            Args:
                name: Tag name
                description: Optional description
                synonyms: Optional list of synonyms
                
            Returns:
                Created tag information
            """
            return await self.tag_registry.createTag({
                "name": name,
                "description": description,
                "synonyms": synonyms or []
            })
        
        @function_tool
        async def apply_tag_to_document(document_id: str, tag_id: str, confidence: float) -> bool:
            """
            Apply a tag to a document
            
            Args:
                document_id: ID of the document
                tag_id: ID of the tag
                confidence: Confidence score for this tag (0-1)
                
            Returns:
                Success status
            """
            # Create relationship in knowledge graph
            await self.kg.createRelationship(
                "document", document_id,
                "tag", tag_id,
                "HAS_TAG",
                {
                    "confidence": confidence,
                    "tagged_by": "auto_tagging_agent",
                    "tagged_at": datetime.now().toISOString()
                }
            )
            
            # Increment tag usage
            await self.tag_registry.incrementTagUsage(tag_id)
            
            return True
        
        # Create the auto-tagging agent
        self.agent = Agent(
            name="AutoTaggingAgent",
            instructions="""
            You are an expert document tagger. Your job is to:
            1. Analyze document content to identify key concepts and entities
            2. Determine the most appropriate tags for the document
            3. Create new tags if necessary
            4. Apply high-confidence tags to the document
            
            Follow these guidelines:
            - Only create new tags if you're very confident they're needed (>0.85 confidence)
            - Use existing tags whenever possible
            - Apply tags with confidence >0.7
            - Choose quality over quantity - only apply the most relevant tags
            """,
            tools=[
                analyze_document_content,
                normalize_tag,
                create_new_tag,
                apply_tag_to_document
            ]
        )
    
    async def tag_document(self, document_id, content, title=""):
        """Process and tag a document automatically"""
        # Create a message with document info
        message = {
            "role": "user",
            "content": f"""
            Please tag this document:
            
            ID: {document_id}
            Title: {title}
            
            Content preview: {content[:1000]}...
            
            First analyze the document, then apply appropriate tags.
            """
        }
        
        # Run the agent
        result = await Runner.run(
            self.agent,
            [message]
        )
        
        # Process the result
        applied_tags = []
        for msg in result.new_messages:
            if "tags have been applied" in msg.content.lower():
                # Extract tag information from message
                import re
                tag_matches = re.findall(r'tag "([^"]+)"', msg.content)
                applied_tags.extend(tag_matches)
        
        return {
            "document_id": document_id,
            "tags_applied": applied_tags,
            "status": "completed"
        }
```

### 5. Category Prediction Model

The category prediction model classifies documents into predefined categories:

```python
import tensorflow as tf
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

class CategoryPredictionModel:
    def __init__(self, vector_store, knowledge_graph):
        self.vector_store = vector_store
        self.kg = knowledge_graph
        self.model = None
        self.vectorizer = None
        self.categories = []
        
    async def train_model(self, training_data=None):
        """Train the category prediction model"""
        # If no training data provided, fetch from knowledge graph
        if not training_data:
            training_data = await self._fetch_training_data()
            
        # Check if we have enough data
        if len(training_data) < 20:
            print(f"Not enough training data: {len(training_data)} examples")
            return {"status": "insufficient_data", "data_points": len(training_data)}
        
        # Prepare data
        texts = [item["content"] for item in training_data]
        categories = [item["category"] for item in training_data]
        
        # Get unique categories
        self.categories = sorted(list(set(categories)))
        category_to_idx = {cat: i for i, cat in enumerate(self.categories)}
        
        # Convert categories to indices
        y = [category_to_idx[cat] for cat in categories]
        
        # Vectorize texts
        self.vectorizer = TfidfVectorizer(max_features=5000)
        X = self.vectorizer.fit_transform(texts).toarray()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Convert to one-hot encoding
        y_train_onehot = tf.keras.utils.to_categorical(y_train, num_classes=len(self.categories))
        y_test_onehot = tf.keras.utils.to_categorical(y_test, num_classes=len(self.categories))
        
        # Build model
        self.model = Sequential([
            Dense(128, activation='relu', input_shape=(X_train.shape[1],)),
            Dropout(0.2),
            Dense(64, activation='relu'),
            Dropout(0.2),
            Dense(len(self.categories), activation='softmax')
        ])
        
        # Compile model
        self.model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Train model
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=3,
            restore_best_weights=True
        )
        
        history = self.model.fit(
            X_train, y_train_onehot,
            epochs=20,
            batch_size=32,
            validation_data=(X_test, y_test_onehot),
            callbacks=[early_stopping]
        )
        
        # Evaluate model
        evaluation = self.model.evaluate(X_test, y_test_onehot)
        
        return {
            "status": "trained",
            "accuracy": evaluation[1],
            "categories": self.categories,
            "data_points": len(training_data),
            "epochs_completed": len(history.history['loss'])
        }
    
    async def predict_category(self, text):
        """Predict category for a document"""
        if not self.model or not self.vectorizer or not self.categories:
            raise ValueError("Model not trained")
        
        # Vectorize text
        X = self.vectorizer.transform([text]).toarray()
        
        # Predict
        predictions = self.model.predict(X)[0]
        
        # Get top categories with probabilities
        result = []
        for i, prob in enumerate(predictions):
            result.append({
                "category": self.categories[i],
                "probability": float(prob)
            })
        
        # Sort by probability
        result.sort(key=lambda x: x["probability"], reverse=True)
        
        return result
    
    async def _fetch_training_data(self):
        """Fetch training data from knowledge graph"""
        # Get all documents with manually assigned categories
        documents = await self.kg.getDocumentsWithCategories()
        
        training_data = []
        for doc in documents:
            # Get document content
            content = await self.kg.getDocumentContent(doc["id"])
            
            # Add to training data
            training_data.append({
                "id": doc["id"],
                "content": content,
                "category": doc["category"]
            })
        
        return training_data
    
    async def save_model(self, model_path):
        """Save model to disk"""
        if not self.model:
            raise ValueError("No model to save")
            
        # Save keras model
        self.model.save(model_path)
        
        # Save vectorizer and categories
        import pickle
        with open(f"{model_path}.vectorizer", "wb") as f:
            pickle.dump(self.vectorizer, f)
            
        with open(f"{model_path}.categories", "wb") as f:
            pickle.dump(self.categories, f)
    
    async def load_model(self, model_path):
        """Load model from disk"""
        # Load keras model
        self.model = tf.keras.models.load_model(model_path)
        
        # Load vectorizer and categories
        import pickle
        with open(f"{model_path}.vectorizer", "rb") as f:
            self.vectorizer = pickle.load(f)
            
        with open(f"{model_path}.categories", "rb") as f:
            self.categories = pickle.load(f)
```

### 6. Tag Refinement Systems

The tag refinement system improves tags and suggests related tags:

```javascript
class TagRefinementSystem {
  constructor(tagRegistry, knowledgeGraph, llmService) {
    this.tagRegistry = tagRegistry;
    this.kg = knowledgeGraph;
    this.llm = llmService;
  }
  
  async refineDocumentTags(documentId) {
    // Get current tags for document
    const currentTags = await this.kg.getDocumentTags(documentId);
    
    // Get document content (or summary)
    const document = await this.kg.getDocument(documentId);
    const content = document.content || document.summary;
    
    if (!content || currentTags.length === 0) {
      return { status: "skipped", reason: "No content or tags" };
    }
    
    // Analyze tag relevance and find missing tags
    const analysis = await this._analyzeTagRelevance(content, currentTags);
    
    // Apply changes
    let changesApplied = false;
    
    // Remove low-relevance tags
    for (const tagId of analysis.lowRelevanceTags) {
      await this.kg.removeRelationship(
        "document", documentId,
        "tag", tagId,
        "HAS_TAG"
      );
      changesApplied = true;
    }
    
    // Add suggested tags
    for (const suggestion of analysis.suggestedTags) {
      // Check if tag exists
      let tagId;
      
      if (suggestion.exists) {
        tagId = suggestion.id;
      } else {
        // Create new tag
        const result = await this.tagRegistry.createTag({
          name: suggestion.name,
          description: suggestion.description || "",
          synonyms: suggestion.synonyms || []
        });
        tagId = result.tag.id;
      }
      
      // Add relationship
      await this.kg.createRelationship(
        "document", documentId,
        "tag", tagId,
        "HAS_TAG",
        {
          confidence: suggestion.confidence,
          tagged_by: "tag_refinement_system",
          tagged_at: new Date().toISOString()
        }
      );
      
      changesApplied = true;
    }
    
    return {
      status: changesApplied ? "updated" : "unchanged",
      removed: analysis.lowRelevanceTags.length,
      added: analysis.suggestedTags.length
    };
  }
  
  async _analyzeTagRelevance(content, currentTags) {
    // Use LLM to assess tag relevance
    const prompt = `
    Analyze the relevance of these tags for the following document content.
    For each tag, determine if it's highly relevant, somewhat relevant, or not relevant.
    Also suggest any missing tags that would be important for this document.
    
    Document content:
    ${content.substring(0, 2000)}...
    
    Current tags:
    ${currentTags.map(tag => `- ${tag.name}`).join('\n')}
    
    Format your response as JSON:
    {
      "tagAssessment": [
        { "tagId": "tag-id", "name": "tag name", "relevance": "high|medium|low", "reasoning": "brief explanation" }
      ],
      "suggestedTags": [
        { "name": "tag name", "relevance": "high|medium|low", "reasoning": "why this tag is needed" }
      ]
    }
    `;
    
    const response = await this.llm.complete(prompt);
    
    try {
      const analysis = JSON.parse(response);
      
      // Extract low relevance tags
      const lowRelevanceTags = analysis.tagAssessment
        .filter(tag => tag.relevance === "low")
        .map(tag => tag.tagId);
      
      // Process suggested tags
      const suggestedTags = [];
      
      for (const suggestion of analysis.suggestedTags) {
        if (suggestion.relevance !== "high") {
          continue; // Only add highly relevant tags
        }
        
        // Check if tag already exists
        const normalized = await this.tagRegistry.normalizeTag(suggestion.name);
        
        if (!normalized.new) {
          // Existing tag
          suggestedTags.push({
            name: normalized.name,
            id: normalized.id,
            exists: true,
            confidence: 0.85,
            reasoning: suggestion.reasoning
          });
        } else {
          // New tag
          suggestedTags.push({
            name: suggestion.name,
            exists: false,
            description: suggestion.reasoning,
            confidence: 0.75,
            reasoning: suggestion.reasoning
          });
        }
      }
      
      return {
        lowRelevanceTags,
        suggestedTags
      };
    } catch (e) {
      console.error("Error parsing LLM response:", e);
      return {
        lowRelevanceTags: [],
        suggestedTags: []
      };
    }
  }
  
  async suggestRelatedTags(tagId) {
    // Get tag info
    const tag = await this.tagRegistry.findTag(tagId);
    
    if (!tag) {
      return { status: "error", message: "Tag not found" };
    }
    
    // Find documents with this tag
    const documents = await this.kg.getDocumentsWithTag(tagId);
    
    if (documents.length === 0) {
      return { status: "skipped", reason: "No documents with this tag" };
    }
    
    // Get all other tags used with this tag
    const cooccurringTags = {};
    
    for (const doc of documents) {
      const docTags = await this.kg.getDocumentTags(doc.id);
      
      for (const docTag of docTags) {
        if (docTag.id === tagId) {
          continue;
        }
        
        if (!cooccurringTags[docTag.id]) {
          cooccurringTags[docTag.id] = {
            id: docTag.id,
            name: docTag.name,
            count: 0,
            documents: []
          };
        }
        
        cooccurringTags[docTag.id].count++;
        cooccurringTags[docTag.id].documents.push(doc.id);
      }
    }
    
    // Sort by co-occurrence count
    const sortedTags = Object.values(cooccurringTags)
      .sort((a, b) => b.count - a.count);
    
    // Calculate relative frequency
    const totalDocs = documents.length;
    for (const related of sortedTags) {
      related.frequency = related.count / totalDocs;
    }
    
    return {
      status: "success",
      tag: {
        id: tag.id,
        name: tag.name
      },
      documentCount: totalDocs,
      relatedTags: sortedTags.slice(0, 10) // Top 10 related tags
    };
  }
}
```

### 7. Integration with Document Processing Pipeline

The tagging system integrates with the document processing pipeline:

```python
from agents import Agent, function_tool, Runner

class DocumentTaggingIntegration:
    def __init__(
        self, 
        knowledge_graph,
        tag_registry,
        auto_tagging_agent,
        semantic_engine,
        category_prediction_model
    ):
        self.kg = knowledge_graph
        self.tag_registry = tag_registry
        self.auto_tagging_agent = auto_tagging_agent
        self.semantic_engine = semantic_engine
        self.category_model = category_prediction_model
        
        # Create the document tagging orchestrator agent
        @function_tool
        async def get_document_content(document_id: str) -> dict:
            """
            Get document content and metadata
            
            Args:
                document_id: ID of the document
                
            Returns:
                Document content and metadata
            """
            return await self.kg.getDocumentWithContent(document_id)
        
        @function_tool
        async def analyze_and_tag_document(document_id: str, content: str, title: str = "") -> dict:
            """
            Analyze document content and apply tags
            
            Args:
                document_id: ID of the document
                content: Document content
                title: Document title
                
            Returns:
                Tagging results
            """
            return await self.auto_tagging_agent.tag_document(document_id, content, title)
        
        @function_tool
        async def predict_document_category(content: str) -> list:
            """
            Predict document category using ML model
            
            Args:
                content: Document content
                
            Returns:
                List of potential categories with probabilities
            """
            return await self.category_model.predict_category(content)
        
        @function_tool
        async def assign_document_category(document_id: str, category: str, confidence: float) -> bool:
            """
            Assign a category to a document
            
            Args:
                document_id: ID of the document
                category: Category name
                confidence: Confidence score
                
            Returns:
                Success status
            """
            await self.kg.setDocumentCategory(document_id, category, confidence)
            return True
        
        # Create the orchestrator agent
        self.orchestrator = Agent(
            name="TaggingOrchestrator",
            instructions="""
            You orchestrate the document tagging process. For each document:
            1. Get the document content
            2. Analyze and tag the document
            3. Predict its category
            4. Assign the category if confidence is high enough (>0.7)
            
            Handle the process step by step and report the results.
            """,
            tools=[
                get_document_content,
                analyze_and_tag_document,
                predict_document_category,
                assign_document_category
            ]
        )
    
    async def process_document(self, document_id):
        """Process a document through the tagging system"""
        # Create message for the orchestrator
        message = {
            "role": "user",
            "content": f"Process document {document_id} through the tagging system."
        }
        
        # Run the orchestrator
        result = await Runner.run(
            self.orchestrator,
            [message]
        )
        
        # Extract and return results
        for msg in result.new_messages:
            if msg.role == "assistant" and "processing complete" in msg.content.lower():
                # Extract results from message
                import re
                
                tags_match = re.search(r'applied (\d+) tags', msg.content)
                tags_count = int(tags_match.group(1)) if tags_match else 0
                
                category_match = re.search(r'Category: (\w+) \(confidence: ([\d\.]+)\)', msg.content)
                if category_match:
                    category = category_match.group(1)
                    confidence = float(category_match.group(2))
                else:
                    category = None
                    confidence = 0
                
                return {
                    "document_id": document_id,
                    "tags_applied": tags_count,
                    "category": category,
                    "category_confidence": confidence,
                    "status": "processed"
                }
        
        return {
            "document_id": document_id,
            "status": "processing_failed"
        }
```

## Knowledge Graph Schema Extensions for Tagging

Extensions to the Neo4j schema for the tagging system:

```cypher
// Tag node
CREATE (t:Tag {
  id: "tag-123",
  name: "Microservices",
  description: "Software development technique that structures an application as a collection of loosely coupled services",
  created_at: timestamp(),
  updated_at: timestamp(),
  usage_count: 42,
  synonyms: ["Micro-Services", "Microservice Architecture"]
})

// Tag hierarchy relationships
CREATE (t1:Tag {id: "tag-234", name: "Cloud Native"})
CREATE (t2:Tag {id: "tag-123", name: "Microservices"})
CREATE (t2)-[:CHILD_OF]->(t1)

// Category node
CREATE (c:Category {
  id: "category-456",
  name: "technical_reference",
  description: "Technical documentation that provides detailed information about APIs, frameworks, or technologies",
  created_at: timestamp()
})

// Tag-Category relationship
CREATE (t:Tag {id: "tag-123"})-[:BELONGS_TO]->(c:Category {id: "category-456"})

// Document-Tag relationship
CREATE (d:Document {id: "doc-789"})-[:HAS_TAG {
  confidence: 0.92,
  tagged_at: timestamp(),
  tagged_by: "auto_tagging_agent"
}]->(t:Tag {id: "tag-123"})

// Document-Category relationship
CREATE (d:Document {id: "doc-789"})-[:CATEGORIZED_AS {
  confidence: 0.85,
  categorized_at: timestamp(),
  categorized_by: "ml_categorization"
}]->(c:Category {id: "category-456"})

// Document Cluster node
CREATE (cl:Cluster {
  id: "cluster-42",
  name: "Kubernetes Documentation",
  size: 12,
  created_at: timestamp(),
  updated_at: timestamp()
})

// Document-Cluster relationship
CREATE (d:Document {id: "doc-789"})-[:BELONGS_TO]->(cl:Cluster {id: "cluster-42"})
```

## Tag API Integration

GraphQL API for interacting with the tagging system:

```graphql
type Tag {
  id: ID!
  name: String!
  description: String
  createdAt: DateTime!
  updatedAt: DateTime
  usageCount: Int!
  synonyms: [String!]
  parent: Tag @relationship(type: "CHILD_OF", direction: OUT)
  children: [Tag!] @relationship(type: "CHILD_OF", direction: IN)
  category: Category @relationship(type: "BELONGS_TO", direction: OUT)
  documents: [Document!] @relationship(type: "HAS_TAG", direction: IN)
}

type Category {
  id: ID!
  name: String!
  description: String
  createdAt: DateTime!
  tags: [Tag!] @relationship(type: "BELONGS_TO", direction: IN)
  documents: [Document!] @relationship(type: "CATEGORIZED_AS", direction: IN)
}

type Cluster {
  id: ID!
  name: String
  size: Int!
  createdAt: DateTime!
  updatedAt: DateTime
  documents: [Document!] @relationship(type: "BELONGS_TO", direction: IN)
}

extend type Document {
  tags: [TagConnection!] @relationship(type: "HAS_TAG", direction: OUT)
  category: CategoryConnection @relationship(type: "CATEGORIZED_AS", direction: OUT)
  cluster: Cluster @relationship(type: "BELONGS_TO", direction: OUT)
}

type TagConnection {
  tag: Tag!
  confidence: Float!
  taggedAt: DateTime!
  taggedBy: String!
}

type CategoryConnection {
  category: Category!
  confidence: Float!
  categorizedAt: DateTime!
  categorizedBy: String!
}

extend type Query {
  # Tag queries
  getTag(id: ID!): Tag
  findTagByName(name: String!): Tag
  searchTags(query: String!): [Tag!]
  getTagHierarchy(rootId: ID): [Tag!]
  
  # Category queries
  getCategory(id: ID!): Category
  getAllCategories: [Category!]
  
  # Cluster queries
  getCluster(id: ID!): Cluster
  getAllClusters: [Cluster!]
  
  # Tagging operations
  getDocumentTags(documentId: ID!): [TagConnection!]
  getDocumentCategory(documentId: ID!): CategoryConnection
  getSimilarDocumentsByTags(documentId: ID!, threshold: Float = 0.7): [Document!]
  getRelatedTags(tagId: ID!, limit: Int = 10): [Tag!]
}

extend type Mutation {
  # Tag operations
  createTag(name: String!, description: String, parentId: ID, categoryId: ID): Tag!
  updateTag(id: ID!, name: String, description: String, synonyms: [String!]): Tag!
  deleteTag(id: ID!): Boolean!
  mergeTag(sourceId: ID!, targetId: ID!): Boolean!
  
  # Tagging operations
  tagDocument(documentId: ID!, tagId: ID!, confidence: Float = 0.8): Boolean!
  removeDocumentTag(documentId: ID!, tagId: ID!): Boolean!
  categorizeDocument(documentId: ID!, categoryId: ID!, confidence: Float = 0.8): Boolean!
  
  # ML operations
  trainCategoryModel: Boolean!
  retrainTaggingSystem: Boolean!
  updateDocumentClusters: Boolean!
  processDocumentTagging(documentId: ID!): Boolean!
}
```

## Integration with Feature/Roadmap System

Integration with the feature and roadmap systems:

```python
class TagFeatureIntegration:
    def __init__(self, knowledge_graph, tag_registry, llm_service):
        self.kg = knowledge_graph
        self.tag_registry = tag_registry
        self.llm = llm_service
    
    async def analyze_feature_tags(self, feature_id):
        """Analyze and suggest tags for a feature"""
        # Get feature data
        feature = await self.kg.getFeature(feature_id)
        
        if not feature:
            return {"status": "error", "message": "Feature not found"}
        
        # Get related documents
        documents = await self.kg.getRelatedNodes(
            feature_id,
            { relationship: "DOCUMENTED_BY", source_type: "document" }
        )
        
        if not documents:
            return {"status": "no_documents", "feature_id": feature_id}
        
        # Get tags from related documents
        doc_tags = {}
        for doc in documents:
            tags = await self.kg.getDocumentTags(doc.id)
            
            for tag in tags:
                if tag.id not in doc_tags:
                    doc_tags[tag.id] = {
                        "id": tag.id,
                        "name": tag.name,
                        "description": tag.description,
                        "document_count": 0,
                        "avg_confidence": 0,
                        "documents": []
                    }
                
                doc_tags[tag.id].document_count += 1
                doc_tags[tag.id].avg_confidence += tag.confidence
                doc_tags[tag.id].documents.append(doc.id)
        
        # Calculate average confidence
        for tag_id in doc_tags:
            doc_tags[tag_id].avg_confidence /= doc_tags[tag_id].document_count
        
        # Sort by document count and confidence
        sorted_tags = sorted(
            list(doc_tags.values()),
            key=lambda t: (t.document_count, t.avg_confidence),
            reverse=True
        )
        
        # Analyze feature description with LLM
        suggested_tags = await self._suggest_tags_from_description(
            feature.name, 
            feature.description
        )
        
        # Merge document tags and suggested tags
        doc_tag_ids = set(doc_tags.keys())
        merged_suggestions = []
        
        for tag in suggested_tags:
            # If this is an existing tag
            if tag.get("id") and tag["id"] in doc_tag_ids:
                # Use the document tag info but boost confidence
                doc_tag = doc_tags[tag["id"]]
                merged_suggestions.append({
                    "id": doc_tag.id,
                    "name": doc_tag.name,
                    "confidence": max(doc_tag.avg_confidence, tag["confidence"]),
                    "source": "both",
                    "document_count": doc_tag.document_count,
                    "already_has_tag": await self._feature_has_tag(feature_id, tag["id"])
                })
            else:
                # This is a new tag suggestion
                merged_suggestions.append({
                    "name": tag["name"],
                    "description": tag.get("description", ""),
                    "confidence": tag["confidence"],
                    "source": "description",
                    "document_count": 0,
                    "is_new": not tag.get("id"),
                    "already_has_tag": False
                })
        
        # Add any document tags not already included
        for tag in sorted_tags:
            found = False
            for suggestion in merged_suggestions:
                if suggestion.get("id") == tag.id:
                    found = True
                    break
            
            if not found:
                merged_suggestions.append({
                    "id": tag.id,
                    "name": tag.name,
                    "confidence": tag.avg_confidence,
                    "source": "documents",
                    "document_count": tag.document_count,
                    "already_has_tag": await self._feature_has_tag(feature_id, tag.id)
                })
        
        # Sort by confidence
        merged_suggestions.sort(key=lambda t: t["confidence"], reverse=True)
        
        return {
            "feature_id": feature_id,
            "document_count": len(documents),
            "tag_suggestions": merged_suggestions
        }
    
    async def _suggest_tags_from_description(self, feature_name, feature_description):
        """Use LLM to suggest tags from feature description"""
        if not feature_description:
            return []
            
        prompt = f"""
        Suggest appropriate tags for this feature based on its name and description.
        
        Feature Name: {feature_name}
        
        Feature Description:
        {feature_description}
        
        Return your suggestions as a JSON array of objects, each with:
        - name: the tag name
        - description: a brief description of the tag
        - confidence: your confidence in this tag (0-1)
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            suggestions = json.loads(response)
            
            # Normalize tags
            normalized = []
            for suggestion in suggestions:
                if suggestion["confidence"] < 0.7:
                    continue  # Skip low confidence suggestions
                    
                tag_info = await self.tag_registry.normalizeTag(suggestion["name"])
                
                if tag_info.get("new"):
                    # This is a new tag
                    normalized.append({
                        "name": suggestion["name"],
                        "description": suggestion["description"],
                        "confidence": suggestion["confidence"],
                        "is_new": True
                    })
                else:
                    # This is an existing tag
                    normalized.append({
                        "id": tag_info["id"],
                        "name": tag_info["name"],
                        "confidence": suggestion["confidence"] * tag_info["confidence"],
                        "is_new": False
                    })
            
            return normalized
        except Exception as e:
            print(f"Error parsing tag suggestions: {e}")
            return []
    
    async def _feature_has_tag(self, feature_id, tag_id):
        """Check if feature already has this tag"""
        relationships = await self.kg.getRelationships(
            "feature", feature_id,
            "tag", tag_id,
            "HAS_TAG"
        )
        
        return len(relationships) > 0
    
    async def apply_tags_to_feature(self, feature_id, tag_ids, confidence=0.8):
        """Apply tags to a feature"""
        results = []
        
        for tag_id in tag_ids:
            try:
                # Apply tag to feature
                await self.kg.createRelationship(
                    "feature", feature_id,
                    "tag", tag_id,
                    "HAS_TAG",
                    {
                        "confidence": confidence,
                        "tagged_at": datetime.now().toISOString(),
                        "tagged_by": "tag_feature_integration"
                    }
                )
                
                # Increment tag usage
                await self.tag_registry.incrementTagUsage(tag_id)
                
                results.append({
                    "tag_id": tag_id,
                    "status": "applied"
                })
            except Exception as e:
                results.append({
                    "tag_id": tag_id,
                    "status": "error",
                    "message": str(e)
                })
        
        return results
```

## Tag Search and Discovery Interface

GraphQL API for tag search and discovery:

```graphql
type TagSearch {
  id: ID!
  name: String!
  description: String
  usageCount: Int!
  documentCount: Int!
  featureCount: Int!
  score: Float!
}

type TagSearchResults {
  tags: [TagSearch!]!
  total: Int!
  page: Int!
  pageSize: Int!
}

input TagFilter {
  categories: [ID!]
  minUsage: Int
  parent: ID
}

extend type Query {
  # Tag search endpoints
  searchTags(
    query: String!,
    filter: TagFilter,
    page: Int = 1,
    pageSize: Int = 20
  ): TagSearchResults!
  
  # Tag exploration
  getPopularTags(limit: Int = 20): [Tag!]!
  getRelatedTags(tagId: ID!, limit: Int = 10): [Tag!]!
  getTagHierarchy(rootId: ID): [Tag!]!
  
  # Tag usage statistics
  getTagUsageOverTime(
    tagId: ID!,
    startDate: DateTime,
    endDate: DateTime
  ): [TagUsagePoint!]!
}

type TagUsagePoint {
  date: DateTime!
  documentCount: Int!
  featureCount: Int!
}
```

## Conclusion

The ML-based document tagging and categorization system provides a sophisticated, intelligent approach to organizing and navigating documentation. Key benefits include:

1. **Automated Tagging**: Reduces manual tagging effort through LLM-powered analysis
2. **Consistent Taxonomy**: Maintains a structured taxonomy with hierarchical relationships
3. **Dynamic Categories**: Automatically classifies documents into appropriate categories
4. **Intelligent Suggestions**: Suggests related tags and categories based on content analysis
5. **Document Clustering**: Groups similar documents for better organization
6. **Integration with Features/Roadmap**: Creates relationships between documentation, features, and roadmap items

The system's machine learning capabilities continuously improve through feedback and usage patterns, creating an increasingly accurate and useful tagging system over time.