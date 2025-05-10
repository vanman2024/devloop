# Knowledge Graph Design: Multi-Tier Memory Architecture

## Overview

The knowledge graph serves as the core memory system for our agent architecture. It provides a distributed, multi-tier system that efficiently stores, retrieves, and processes information across different timescales and access patterns. This document outlines the design and implementation of our enhanced knowledge graph architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE GRAPH SYSTEM                           │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐       │
│  │  SHORT-TERM   │    │  MEDIUM-TERM  │    │  LONG-TERM    │       │
│  │    MEMORY     │    │    MEMORY     │    │    MEMORY     │       │
│  │               │    │               │    │               │       │
│  │   (Redis)     │    │   (MongoDB)   │    │   (Neo4j)     │       │
│  │               │    │               │    │               │       │
│  │ - Agent state │    │ - Recent      │    │ - Persistent  │       │
│  │ - Context     │    │   facts       │    │   relationships│       │
│  │ - Cache       │    │ - Entity      │    │ - Knowledge   │       │
│  │               │    │   data        │    │   structure   │       │
│  └───────────────┘    └───────────────┘    └───────────────┘       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                VECTOR EMBEDDINGS LAYER                      │   │
│  │                                                             │   │
│  │                     (Pinecone)                              │   │
│  │                                                             │   │
│  │  - Semantic search                                          │   │
│  │  - Similarity matching                                      │   │
│  │  - Context retrieval                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  EVENT STREAM LAYER                         │   │
│  │                                                             │   │
│  │                  (Kafka / Redis Streams)                    │   │
│  │                                                             │   │
│  │  - Knowledge change events                                  │   │
│  │  - Temporal sequences                                       │   │
│  │  - Reactive updates                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               DISTRIBUTED CACHE LAYER                       │   │
│  │                                                             │   │
│  │                      (Redis)                                │   │
│  │                                                             │   │
│  │  - Query result caching                                     │   │
│  │  - Distributed locking                                      │   │
│  │  - Rate limiting                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Memory Tiers

### Short-Term Memory (Redis)

The short-term memory tier is designed for high-speed, ephemeral data with short lifespans:

- **Storage Engine**: Redis
- **Access Pattern**: In-memory key-value
- **Time Horizon**: Seconds to minutes (configurable TTL)
- **Use Cases**:
  - Active agent states
  - Conversation context
  - Short-lived cache
  - Coordination data

```python
class ShortTermMemory:
    def __init__(self, redis_client):
        self.redis = redis_client
        
    def store(self, key, value, ttl=60):
        """Store a value with an expiration time in seconds"""
        serialized = json.dumps(value)
        return self.redis.set(key, serialized, ex=ttl)
        
    def retrieve(self, key):
        """Retrieve a value from short-term memory"""
        result = self.redis.get(key)
        if result:
            return json.loads(result)
        return None
        
    def increment(self, key, amount=1):
        """Atomically increment a counter"""
        return self.redis.incrby(key, amount)
```

### Medium-Term Memory (MongoDB)

The medium-term memory tier handles structured data with longer lifespans:

- **Storage Engine**: MongoDB
- **Access Pattern**: Document-oriented
- **Time Horizon**: Hours to days
- **Use Cases**:
  - Entity attributes and state
  - Recent historical facts
  - Agent execution records
  - System health metrics

```python
class MediumTermMemory:
    def __init__(self, mongodb_client):
        self.db = mongodb_client.knowledge_db
        self.facts = self.db.facts
        self.entities = self.db.entities
        
    def store_fact(self, entity_id, attribute, value, ttl=86400):
        """Store a fact with an expiration time in seconds"""
        expires_at = datetime.now() + timedelta(seconds=ttl)
        
        return self.facts.update_one(
            {"entity_id": entity_id, "attribute": attribute},
            {"$set": {
                "value": value, 
                "expires_at": expires_at,
                "updated_at": datetime.now()
            }},
            upsert=True
        )
        
    def retrieve_fact(self, entity_id, attribute):
        """Retrieve a fact that hasn't expired"""
        fact = self.facts.find_one(
            {
                "entity_id": entity_id, 
                "attribute": attribute,
                "expires_at": {"$gt": datetime.now()}
            }
        )
        return fact["value"] if fact else None
        
    def store_entity(self, entity_id, properties, ttl=86400):
        """Store an entity with all its properties"""
        expires_at = datetime.now() + timedelta(seconds=ttl)
        
        return self.entities.update_one(
            {"_id": entity_id},
            {"$set": {
                "properties": properties,
                "expires_at": expires_at,
                "updated_at": datetime.now()
            }},
            upsert=True
        )
```

### Long-Term Memory (Neo4j)

The long-term memory tier manages persistent knowledge and relationships:

- **Storage Engine**: Neo4j
- **Access Pattern**: Graph database with relationships
- **Time Horizon**: Months to indefinite
- **Use Cases**:
  - Entity relationships
  - Domain knowledge
  - System topology
  - Historical patterns

```python
class LongTermMemory:
    def __init__(self, neo4j_driver):
        self.driver = neo4j_driver
        
    def create_entity(self, entity_id, labels, properties):
        """Create a new entity node"""
        labels_str = ':'.join(labels)
        
        with self.driver.session() as session:
            result = session.run(
                f"MERGE (e:{labels_str} {{id: $id}}) "
                "SET e += $properties "
                "RETURN e",
                id=entity_id, properties=properties
            )
            return result.single()["e"]
            
    def create_relationship(self, from_id, to_id, relation_type, properties=None):
        """Create a relationship between entities"""
        if properties is None:
            properties = {}
            
        with self.driver.session() as session:
            result = session.run(
                "MATCH (a {id: $from_id}), (b {id: $to_id}) "
                "MERGE (a)-[r:" + relation_type + "]->(b) "
                "SET r += $properties "
                "RETURN r",
                from_id=from_id, to_id=to_id, properties=properties
            )
            return result.single()["r"]
            
    def find_connected_entities(self, entity_id, relation_type=None, direction="OUTGOING"):
        """Find entities connected to the given entity"""
        relation_clause = "" if relation_type is None else f":{relation_type}"
        direction_arrow = "->" if direction == "OUTGOING" else "<-"
        
        with self.driver.session() as session:
            result = session.run(
                f"MATCH (a {{id: $entity_id}})-[r{relation_clause}]{direction_arrow}(b) "
                "RETURN b.id as connected_id, type(r) as relation, properties(r) as properties",
                entity_id=entity_id
            )
            return [dict(record) for record in result]
```

## Vector Embeddings Layer (Pinecone)

The vector embeddings layer enables semantic search and similarity matching:

- **Storage Engine**: Pinecone (or similar vector database)
- **Access Pattern**: Vector similarity search
- **Use Cases**:
  - Semantic search
  - Similar entity retrieval
  - RAG implementation
  - Knowledge retrieval

```python
class VectorEmbeddingsLayer:
    def __init__(self, pinecone_client, openai_client, index_name):
        self.pinecone = pinecone_client
        self.openai = openai_client
        self.index = self.pinecone.Index(index_name)
        
    def embed_text(self, text):
        """Generate embeddings for text using OpenAI"""
        response = self.openai.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
        
    def store_entity_embedding(self, entity_id, text, metadata=None):
        """Store entity with its text embedding"""
        if metadata is None:
            metadata = {}
            
        # Generate embedding
        embedding = self.embed_text(text)
        
        # Store in vector database
        self.index.upsert(
            vectors=[{
                "id": entity_id,
                "values": embedding,
                "metadata": {
                    "text": text[:1000],  # Truncate for metadata storage
                    **metadata
                }
            }]
        )
        
    def find_similar_entities(self, query_text, top_k=5, filter=None):
        """Find similar entities based on text similarity"""
        # Generate query embedding
        query_embedding = self.embed_text(query_text)
        
        # Query vector database
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter
        )
        
        return results.matches
```

## Event Stream Layer (Kafka / Redis Streams)

The event stream layer captures temporal sequences and enables reactive updates:

- **Storage Engine**: Kafka or Redis Streams
- **Access Pattern**: Append-only log, publish-subscribe
- **Use Cases**:
  - Knowledge change events
  - Temporal sequences
  - Activity history
  - Change notifications

```python
class EventStreamLayer:
    def __init__(self, redis_client):
        self.redis = redis_client
        
    def publish_event(self, stream, event_type, data):
        """Publish an event to a stream"""
        event = {
            "type": event_type,
            "timestamp": time.time(),
            "data": json.dumps(data)
        }
        
        # Add to stream with auto-generated ID
        return self.redis.xadd(stream, event)
        
    def get_recent_events(self, stream, count=10):
        """Get recent events from stream"""
        events = self.redis.xrevrange(stream, count=count)
        
        # Parse and return events
        results = []
        for event_id, event_data in events:
            parsed_data = json.loads(event_data[b"data"])
            results.append({
                "id": event_id.decode(),
                "type": event_data[b"type"].decode(),
                "timestamp": float(event_data[b"timestamp"]),
                "data": parsed_data
            })
            
        return results
        
    def create_consumer_group(self, stream, group_name):
        """Create a consumer group for the stream"""
        try:
            self.redis.xgroup_create(stream, group_name, id="0", mkstream=True)
        except Exception as e:
            # Group may already exist
            pass
            
    def consume_events(self, stream, group_name, consumer_name, count=10):
        """Consume events from a stream via a consumer group"""
        # Ensure group exists
        self.create_consumer_group(stream, group_name)
        
        # Read new messages
        events = self.redis.xreadgroup(
            group_name, consumer_name, {stream: ">"}, count=count
        )
        
        # Parse and return events
        results = []
        if events:
            for stream_name, stream_events in events:
                for event_id, event_data in stream_events:
                    parsed_data = json.loads(event_data[b"data"])
                    results.append({
                        "id": event_id.decode(),
                        "type": event_data[b"type"].decode(),
                        "timestamp": float(event_data[b"timestamp"]),
                        "data": parsed_data
                    })
                    
        return results
```

## Unified Knowledge Graph Interface

The knowledge graph interface unifies access to all memory tiers:

```python
class KnowledgeGraph:
    def __init__(self, config):
        # Initialize Redis client
        self.redis = Redis(
            host=config.redis_host, 
            port=config.redis_port, 
            password=config.redis_password
        )
        
        # Initialize MongoDB client
        self.mongodb_client = MongoClient(config.mongodb_uri)
        
        # Initialize Neo4j driver
        self.neo4j_driver = GraphDatabase.driver(
            config.neo4j_uri, 
            auth=(config.neo4j_user, config.neo4j_password)
        )
        
        # Initialize Pinecone client
        self.pinecone_client = Pinecone(api_key=config.pinecone_api_key)
        
        # Initialize OpenAI client
        self.openai_client = OpenAI(api_key=config.openai_api_key)
        
        # Initialize memory layers
        self.short_term = ShortTermMemory(self.redis)
        self.medium_term = MediumTermMemory(self.mongodb_client)
        self.long_term = LongTermMemory(self.neo4j_driver)
        self.vectors = VectorEmbeddingsLayer(
            self.pinecone_client, 
            self.openai_client,
            config.pinecone_index
        )
        self.events = EventStreamLayer(self.redis)
        
    def store_fact(self, entity_id, attribute, value, ttl=None):
        """Store a fact in the appropriate memory tier based on TTL"""
        # Determine storage tier based on TTL
        if ttl is None or ttl > 86400:  # > 1 day or permanent
            # Store in long-term memory
            properties = {attribute: value}
            self.long_term.create_entity(entity_id, ["Entity"], properties)
        elif ttl > 60:  # > 1 minute
            # Store in medium-term memory
            self.medium_term.store_fact(entity_id, attribute, value, ttl)
        else:  # Short-term or default
            # Store in short-term memory
            key = f"{entity_id}:{attribute}"
            self.short_term.store(key, value, ttl=ttl or 60)
            
        # Publish event about the fact change
        self.events.publish_event(
            "knowledge_changes",
            "fact_updated",
            {
                "entity_id": entity_id,
                "attribute": attribute,
                "value": str(value)[:100],  # Truncate for event
                "ttl": ttl
            }
        )
            
    def retrieve_fact(self, entity_id, attribute):
        """Retrieve a fact from the appropriate memory tier"""
        # Try short-term memory first (fastest)
        key = f"{entity_id}:{attribute}"
        value = self.short_term.retrieve(key)
        if value is not None:
            return value
            
        # Try medium-term memory next
        value = self.medium_term.retrieve_fact(entity_id, attribute)
        if value is not None:
            return value
            
        # Try long-term memory last
        with self.neo4j_driver.session() as session:
            result = session.run(
                "MATCH (e {id: $entity_id}) "
                "RETURN e[$attribute] as value",
                entity_id=entity_id, attribute=attribute
            )
            record = result.single()
            if record and record["value"] is not None:
                # Cache in short-term for faster subsequent access
                self.short_term.store(key, record["value"], ttl=60)
                return record["value"]
                
        # Not found in any tier
        return None
        
    def create_relationship(self, from_id, to_id, relation_type, properties=None):
        """Create a relationship between entities"""
        # Store in long-term memory (Neo4j)
        result = self.long_term.create_relationship(
            from_id, to_id, relation_type, properties
        )
        
        # Publish event about the relationship
        self.events.publish_event(
            "knowledge_changes",
            "relationship_created",
            {
                "from_id": from_id,
                "to_id": to_id,
                "relation_type": relation_type,
                "properties": properties
            }
        )
        
        return result
        
    def find_connected_entities(self, entity_id, relation_type=None, direction="OUTGOING"):
        """Find entities connected to the given entity"""
        return self.long_term.find_connected_entities(
            entity_id, relation_type, direction
        )
        
    def semantic_search(self, query_text, top_k=5, filter=None):
        """Find entities semantically similar to the query"""
        return self.vectors.find_similar_entities(query_text, top_k, filter)
        
    def store_entity_with_embedding(self, entity_id, text, properties=None, metadata=None):
        """Store an entity with its text embedding and properties"""
        if properties is None:
            properties = {}
            
        # Store properties in medium/long term
        self.medium_term.store_entity(entity_id, properties)
        self.long_term.create_entity(entity_id, ["Entity"], properties)
        
        # Store embedding
        self.vectors.store_entity_embedding(entity_id, text, metadata)
        
    def get_recent_changes(self, count=10):
        """Get recent knowledge graph changes"""
        return self.events.get_recent_events("knowledge_changes", count)
```

## Scaling and Resilience

### Horizontal Scaling

- **Redis**: Redis Cluster for short-term memory
- **MongoDB**: Sharded clusters with replica sets
- **Neo4j**: Causal clustering with read replicas
- **Pinecone**: Built-in horizontal scaling

### Data Resilience

- **Automatic Backup**: Regular snapshots of all tiers
- **Cross-Tier Redundancy**: Critical data duplicated across tiers
- **Eventual Consistency**: Reconciliation mechanisms for conflicts

### Failure Handling

- **Redis Sentinel**: Automatic failover for Redis
- **MongoDB Replica Sets**: Automatic primary election
- **Neo4j Clustering**: Causal consistency with leader election
- **Circuit Breakers**: Prevent cascading failures across tiers

## Memory Operations

### Knowledge Acquisition

1. **Direct Storage**:
   - Explicitly store facts and relationships
   - API-driven knowledge population

2. **Derived Knowledge**:
   - Inference from existing facts
   - Pattern detection
   - Historical analysis

3. **External Integration**:
   - Import from external systems
   - API-based knowledge synchronization
   - Document ingestion pipeline

### Memory Consolidation

1. **Tiered Promotion**:
   - Frequently accessed short-term memory promoted to medium-term
   - Important medium-term facts promoted to long-term
   - Importance scoring based on access patterns

2. **Knowledge Summarization**:
   - Periodic batch processing to identify patterns
   - Creation of higher-level abstractions
   - Compression of detailed facts into concepts

3. **Garbage Collection**:
   - Automatic expiration based on TTL
   - Importance-based retention policies
   - Data archiving for historical analysis

## Implementation Approach

### Phase 1: Core Memory Tiers

- Implement the three primary memory tiers
- Create the unified Knowledge Graph interface
- Develop basic CRUD operations across tiers

### Phase 2: Vector Embeddings

- Integrate Pinecone for vector storage
- Implement embedding generation
- Create semantic search capabilities

### Phase 3: Event System

- Implement the event stream layer
- Create knowledge change events
- Develop reactive update mechanisms

### Phase 4: Advanced Features

- Implement memory consolidation
- Develop knowledge inference capabilities
- Create data resilience mechanisms

### Phase 5: Scaling

- Implement horizontal scaling for all tiers
- Develop cross-tier redundancy
- Create failure handling mechanisms

## Conclusion

This multi-tier knowledge graph architecture provides a robust, scalable foundation for our agent memory system. By separating concerns across different storage tiers, we can optimize for different access patterns and time horizons while maintaining a unified interface for knowledge operations.

The combination of traditional databases with vector embeddings and event streams creates a powerful knowledge infrastructure capable of supporting sophisticated agent behaviors and learning capabilities.