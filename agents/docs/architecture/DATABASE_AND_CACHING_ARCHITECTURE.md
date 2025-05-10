# Database and Caching Architecture for Agentic Documentation System

## Overview

This document outlines the database and caching architecture to support the Agentic Documentation Management System. Rather than using SQLite or other simplified solutions, we'll implement a robust, scalable database architecture with appropriate caching mechanisms to ensure optimal performance and reliability.

## Database Architecture

### Primary Database: PostgreSQL

PostgreSQL will serve as our primary relational database for structured data:

```
┌────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                      │
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Document Metadata│  │ User Management │  │ Access Control  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Audit Trails    │  │ Agent Activities│  │ System Config   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

#### Key PostgreSQL Schema Components:

1. **Document Metadata Table:**
```sql
CREATE TABLE document_metadata (
    document_id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    format VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),
    version VARCHAR(50),
    quality_score DECIMAL(3,2),
    word_count INTEGER,
    reading_time DECIMAL(5,2),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_document_metadata_status ON document_metadata(status);
CREATE INDEX idx_document_metadata_created_at ON document_metadata(created_at);
CREATE INDEX idx_document_metadata_updated_at ON document_metadata(updated_at);
```

2. **Document Tags Table:**
```sql
CREATE TABLE document_tags (
    document_id UUID REFERENCES document_metadata(document_id),
    tag_id UUID REFERENCES tags(tag_id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES users(user_id),
    PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX idx_document_tags_tag_id ON document_tags(tag_id);
```

3. **Document Relationships Table:**
```sql
CREATE TABLE document_relationships (
    source_document_id UUID REFERENCES document_metadata(document_id),
    target_document_id UUID REFERENCES document_metadata(document_id),
    relationship_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence_score DECIMAL(3,2),
    metadata JSONB,
    PRIMARY KEY (source_document_id, target_document_id, relationship_type)
);

CREATE INDEX idx_document_relationships_target ON document_relationships(target_document_id);
CREATE INDEX idx_document_relationships_type ON document_relationships(relationship_type);
```

4. **Feature-Document Relationships Table:**
```sql
CREATE TABLE feature_document_relationships (
    feature_id UUID REFERENCES features(feature_id),
    document_id UUID REFERENCES document_metadata(document_id),
    relationship_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    metadata JSONB,
    PRIMARY KEY (feature_id, document_id, relationship_type)
);

CREATE INDEX idx_feature_document_relationships_doc ON feature_document_relationships(document_id);
```

5. **Agent Activity Log Table:**
```sql
CREATE TABLE agent_activity_log (
    log_id UUID PRIMARY KEY,
    agent_id VARCHAR(100) NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    target_resource_type VARCHAR(100),
    target_resource_id UUID,
    details JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    error_message TEXT
);

CREATE INDEX idx_agent_activity_agent_id ON agent_activity_log(agent_id);
CREATE INDEX idx_agent_activity_target ON agent_activity_log(target_resource_type, target_resource_id);
CREATE INDEX idx_agent_activity_time ON agent_activity_log(started_at);
```

### Document Storage: MongoDB

MongoDB will store the actual document content and chunked text:

```
┌────────────────────────────────────────────────────────────────┐
│                      MongoDB Database                           │
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Document Content│  │ Document Chunks │  │ Document Versions│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ Document Analysis│  │ Staging Area    │                     │
│  └─────────────────┘  └─────────────────┘                      │
└────────────────────────────────────────────────────────────────┘
```

#### Key MongoDB Collections:

1. **Document Content Collection:**
```javascript
{
  "_id": ObjectId("..."),
  "document_id": "uuid-string",
  "title": "Document Title",
  "content": "Full document content...",
  "format": "markdown",
  "version": "1.0",
  "created_at": ISODate("2025-05-09T00:00:00Z"),
  "updated_at": ISODate("2025-05-09T00:00:00Z"),
  "binary_data": BinData(0, "..."), // For PDF or binary documents
  "checksum": "sha256-hash"
}
```

2. **Document Chunks Collection:**
```javascript
{
  "_id": ObjectId("..."),
  "document_id": "uuid-string",
  "chunk_index": 1,
  "content": "Chunk of text for embedding/retrieval...",
  "word_count": 120,
  "embedding_id": "vec-123", // Reference to vector in Pinecone
  "metadata": {
    "section": "Introduction",
    "heading_path": ["Section 1", "Subsection 1.2"],
    "page_number": 3, // For PDFs
    "is_code_block": false
  }
}
```

3. **Document Analysis Collection:**
```javascript
{
  "_id": ObjectId("..."),
  "document_id": "uuid-string",
  "analysis_type": "quality_assessment",
  "created_at": ISODate("2025-05-09T00:00:00Z"),
  "agent_id": "analysis-agent-1",
  "results": {
    "quality_score": 0.85,
    "readability_score": 0.78,
    "technical_accuracy": 0.92,
    "completeness": 0.80,
    "issues": [
      {
        "type": "missing_information",
        "description": "API parameters not fully documented",
        "location": "Section 3.2",
        "severity": "medium"
      }
    ],
    "strengths": ["Clear examples", "Well-structured"],
    "improvement_suggestions": [
      "Add parameter descriptions for the create_document API",
      "Include more code examples in the authentication section"
    ]
  }
}
```

### Vector Database: Pinecone

Pinecone will store the vector embeddings for semantic search:

```
┌────────────────────────────────────────────────────────────────┐
│                       Pinecone Vector DB                        │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Document Chunk Embeddings                 │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ Namespace:  │  │ Namespace:  │  │ Namespace:  │     │   │
│  │  │ Technical   │  │ API Docs    │  │ Tutorials   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

Pinecone Configuration:
- Index Type: Cosine Similarity
- Dimensions: 1536 (for OpenAI embeddings)
- Pods: Standard (S1), with appropriate scaling based on collection size
- Metadata: Include key metadata for filtering

### Graph Database: Neo4j

Neo4j will store and query the knowledge graph relationships:

```
┌────────────────────────────────────────────────────────────────┐
│                        Neo4j Graph DB                           │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Knowledge Graph                        │   │
│  │                                                         │   │
│  │     ┌──────────┐       describes      ┌─────────┐       │   │
│  │     │ Document │───────────────────▶│ Feature │       │   │
│  │     └──────────┘                     └─────────┘       │   │
│  │          │                               │             │   │
│  │          │                               │             │   │
│  │          ▼           related_to          ▼             │   │
│  │     ┌──────────┐       ◀───────▶     ┌─────────┐       │   │
│  │     │ Concept  │                     │ Roadmap │       │   │
│  │     └──────────┘                     └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

Neo4j Schema:
- Document Nodes with key metadata properties
- Feature Nodes linked to documents
- Concept Nodes extracted from documents
- Roadmap Nodes connected to documents and features
- Various relationship types with properties (confidence, relationship type, etc.)

## Caching Architecture

### Redis for Multi-Level Caching

Redis will serve as our primary caching system:

```
┌────────────────────────────────────────────────────────────────┐
│                        Redis Cache                              │
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Document Cache  │  │ Query Results   │  │ Vector Cache    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Session Cache   │  │ Rate Limiting   │  │ Agent State     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Redis Configuration and Cache Types:

1. **Document Cache:**
```
SET doc:{document_id} {serialized_document_json}
EXPIRE doc:{document_id} 3600  # 1 hour TTL
```

2. **Query Results Cache:**
```
SET query:{query_hash} {serialized_results_json}
EXPIRE query:{query_hash} 300  # 5 minute TTL
```

3. **Vector Cache for Frequent Queries:**
```
SET vec:{vector_id} {serialized_vector_data}
EXPIRE vec:{vector_id} 1800  # 30 minute TTL
```

4. **Agent State Cache:**
```
HSET agent:{agent_id} state {serialized_state_json}
HSET agent:{agent_id} last_activity {timestamp}
EXPIRE agent:{agent_id} 3600  # 1 hour TTL
```

5. **Rate Limiting:**
```
INCR ratelimit:{user_id}:{endpoint} 
EXPIRE ratelimit:{user_id}:{endpoint} 60  # 1 minute window
```

### Cache Invalidation Strategy:

1. **Document Updates:**
- When a document is updated, invalidate:
  ```
  DEL doc:{document_id}
  ```
- Also invalidate related query results (pattern-based deletion):
  ```
  SCAN 0 MATCH query:* PATTERN doc_id={document_id}
  ```

2. **Time-Based Expiration:**
- Use EXPIRE commands with appropriate TTLs based on data type
- Document data: 1 hour
- Query results: 5 minutes
- Agent state: 1 hour
- Vector cache: 30 minutes

3. **Pubsub for Cache Coordination:**
```
# When document is updated
PUBLISH document_updates {document_id}

# Listeners on application servers
SUBSCRIBE document_updates
```

## Database Connection and Management

### Connection Pooling with PgBouncer

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Application     │     │    PgBouncer    │     │   PostgreSQL    │
│ Servers         │────▶│  Connection Pool│────▶│   Database      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

PgBouncer Configuration:
- Pool Mode: Transaction pooling
- Default Pool Size: 20 connections
- Max Client Connections: 1000
- Reserve Pool Size: 5
- Reserve Pool Timeout: 3 seconds

### Database Migration Management

Use Flyway for database migration management:

```
/db/migrations/
  V1__initial_schema.sql
  V2__add_document_metadata_indexes.sql
  V3__add_agent_activity_log.sql
  V4__add_document_versions_table.sql
```

Execution through CI/CD pipeline with:
```bash
flyway migrate -url=jdbc:postgresql://localhost:5432/documentation_db -user=dbuser -password=dbpass
```

## Implementation Details

### Database Connection Module

```javascript
// db/connection.js
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const neo4j = require('neo4j-driver');
const { PineconeClient } = require('@pinecone-database/pinecone');

// Load connection environment variables
const {
  PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE,
  MONGO_URI, MONGO_DB,
  REDIS_HOST, REDIS_PORT, REDIS_PASSWORD,
  NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD,
  PINECONE_API_KEY, PINECONE_ENVIRONMENT
} = process.env;

// PostgreSQL connection pool
const pgPool = new Pool({
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// MongoDB connection
const mongoClient = new MongoClient(MONGO_URI);
let mongodb;

const connectMongo = async () => {
  if (!mongodb) {
    await mongoClient.connect();
    mongodb = mongoClient.db(MONGO_DB);
    console.log('Connected to MongoDB');
  }
  return mongodb;
};

// Redis client
const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

// Neo4j driver
const neo4jDriver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

// Pinecone client
const pineconeClient = new PineconeClient();
const initPinecone = async () => {
  await pineconeClient.init({
    apiKey: PINECONE_API_KEY,
    environment: PINECONE_ENVIRONMENT
  });
};

module.exports = {
  pgPool,
  connectMongo,
  redisClient,
  neo4jDriver,
  pineconeClient,
  initPinecone
};
```

### Database Repository Classes

These repository classes will provide a clean interface for database operations:

```javascript
// repositories/documentRepository.js
const { pgPool, connectMongo } = require('../db/connection');

class DocumentRepository {
  async getDocumentMetadata(documentId) {
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM document_metadata WHERE document_id = $1 AND is_deleted = FALSE',
        [documentId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getDocumentContent(documentId) {
    const mongodb = await connectMongo();
    const collection = mongodb.collection('document_content');
    return collection.findOne({ document_id: documentId });
  }

  async createDocument(metadata, content) {
    // Start PostgreSQL transaction
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert metadata
      const metadataResult = await client.query(
        `INSERT INTO document_metadata(
          document_id, title, description, format, status, created_by, version
        ) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING document_id`,
        [
          metadata.document_id,
          metadata.title,
          metadata.description,
          metadata.format,
          metadata.status,
          metadata.created_by,
          metadata.version
        ]
      );
      
      const documentId = metadataResult.rows[0].document_id;
      
      // Insert tags if provided
      if (metadata.tags && metadata.tags.length > 0) {
        const tagValues = metadata.tags.map(tagId => 
          `('${documentId}', '${tagId}', NOW(), '${metadata.created_by}')`
        ).join(', ');
        
        await client.query(
          `INSERT INTO document_tags(document_id, tag_id, added_at, added_by)
           VALUES ${tagValues}`
        );
      }
      
      await client.query('COMMIT');
      
      // Insert content into MongoDB
      const mongodb = await connectMongo();
      const contentCollection = mongodb.collection('document_content');
      await contentCollection.insertOne({
        document_id: documentId,
        title: metadata.title,
        content: content.content,
        format: metadata.format,
        version: metadata.version,
        created_at: new Date(),
        updated_at: new Date(),
        checksum: content.checksum
      });
      
      return documentId;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Additional methods for updating, deleting, listing documents...
}

module.exports = new DocumentRepository();
```

### Cache Service

```javascript
// services/cacheService.js
const { redisClient } = require('../db/connection');

class CacheService {
  // Document caching
  async cacheDocument(documentId, document, ttl = 3600) {
    return redisClient.set(
      `doc:${documentId}`,
      JSON.stringify(document),
      'EX',
      ttl
    );
  }

  async getCachedDocument(documentId) {
    const cached = await redisClient.get(`doc:${documentId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateDocumentCache(documentId) {
    return redisClient.del(`doc:${documentId}`);
  }

  // Query result caching
  async cacheQueryResult(queryHash, result, ttl = 300) {
    return redisClient.set(
      `query:${queryHash}`,
      JSON.stringify(result),
      'EX',
      ttl
    );
  }

  async getCachedQueryResult(queryHash) {
    const cached = await redisClient.get(`query:${queryHash}`);
    return cached ? JSON.parse(cached) : null;
  }

  // Agent state caching
  async cacheAgentState(agentId, state, ttl = 3600) {
    const pipeline = redisClient.pipeline();
    pipeline.hset(`agent:${agentId}`, 'state', JSON.stringify(state));
    pipeline.hset(`agent:${agentId}`, 'last_activity', Date.now());
    pipeline.expire(`agent:${agentId}`, ttl);
    return pipeline.exec();
  }

  async getCachedAgentState(agentId) {
    const state = await redisClient.hget(`agent:${agentId}`, 'state');
    return state ? JSON.parse(state) : null;
  }

  // Rate limiting
  async incrementRateLimit(userId, endpoint, limit = 100, window = 60) {
    const key = `ratelimit:${userId}:${endpoint}`;
    const count = await redisClient.incr(key);
    
    if (count === 1) {
      await redisClient.expire(key, window);
    }
    
    return {
      current: count,
      limit: limit,
      remaining: Math.max(0, limit - count),
      allowed: count <= limit
    };
  }
}

module.exports = new CacheService();
```

## Database Security

### Connection Security

1. **TLS/SSL for All Connections**
   - PostgreSQL: `ssl=true&sslmode=require`
   - MongoDB: `ssl=true&replicaSet=rs0&readPreference=secondaryPreferred`
   - Redis: `tls: { ca: fs.readFileSync('path/to/ca.crt') }`

2. **Database Role-Based Access Control**
   - Application user with limited permissions
   - Admin user for maintenance operations
   - Read-only user for reporting

### Data Security

1. **Encryption at Rest**
   - PostgreSQL: Transparent Data Encryption
   - MongoDB: WiredTiger storage engine encryption
   - Redis: Use Redis Enterprise with encryption

2. **Sensitive Data Handling**
   - Hash or encrypt API keys and credentials in the database
   - Implement data masking for sensitive fields

### Network Security

1. **Private Network Access**
   - Place database servers in private subnets
   - Use VPC peering or private links for cloud databases
   - Implement jump servers for administrative access

2. **Firewall Rules**
   - Restrict database access to application servers only
   - Use security groups to control traffic

## Monitoring and Maintenance

### Database Health Monitoring

```
┌────────────────────────┐     ┌────────────────────────┐
│    Prometheus         │────▶│     Grafana            │
│    Metrics Collection  │     │     Dashboards         │
└────────────────────────┘     └────────────────────────┘
         ▲                               ▲
         │                               │
┌────────┴───────────┐     ┌─────────────┴──────┐
│  Database Exporters│     │   Alert Manager    │
└────────────────────┘     └────────────────────┘
```

Key metrics to monitor:
- Connection pool utilization
- Query performance (slow queries)
- Cache hit ratios
- Database disk usage
- Replication lag

### Backup Strategy

1. **PostgreSQL Backups**
   - Daily full backups
   - Continuous WAL archiving for point-in-time recovery
   - Test restores monthly

2. **MongoDB Backups**
   - Daily backups with `mongodump`
   - Replica sets for high availability
   - Periodic testing of recovery procedures

3. **Neo4j Backups**
   - Daily full graph dumps
   - Transaction log backups

4. **Pinecone and Redis**
   - Regular snapshots
   - Redundant instances for high availability

## Scaling Strategy

### Horizontal Scaling

1. **Read Replicas**
   - PostgreSQL read replicas for reporting and analysis
   - MongoDB secondary nodes for read scaling

2. **Sharding**
   - MongoDB sharding for document content when volume grows
   - Pinecone partitioning for very large vector collections

3. **Connection Pooling**
   - Optimize connection pool sizes based on workload
   - Use dedicated connection pools for different query types

### Vertical Scaling

1. **Resource Allocation**
   - Allocate more RAM for Redis caching as document volume grows
   - Increase CPU for PostgreSQL as query complexity increases

2. **Instance Types**
   - Guidance on instance types for different scales:
     - Small: Standard instances (2-4 cores, 8-16GB RAM)
     - Medium: Memory-optimized instances (8 cores, 32GB RAM)
     - Large: Performance-optimized instances (16+ cores, 64GB+ RAM)

## Conclusion

This comprehensive database and caching architecture provides a solid foundation for the Agentic Documentation Management System. By leveraging specialized databases for different data types and implementing a robust caching strategy, we ensure:

1. **High Performance**: Fast document retrieval and agent operations
2. **Scalability**: Ability to handle growing document collections
3. **Reliability**: Redundancy and backup strategies for all data
4. **Security**: Protection of sensitive information
5. **Flexibility**: Easy integration with various components of the system

Implementation should follow a phased approach, starting with the core PostgreSQL and MongoDB components, followed by Neo4j and Pinecone integration, and finally enhancing with Redis caching.