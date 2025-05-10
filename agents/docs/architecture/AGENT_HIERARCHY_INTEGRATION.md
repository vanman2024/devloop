# Agentic Hierarchy and Architecture Integration

## Overview

This document provides a unified view of how Devloop's parent-child-micro agent hierarchy integrates with our hexagonal architecture, microservices architecture, and SDLC workflow. It serves as a companion to the [Comprehensive Agent Catalog](../../catalog/COMPREHENSIVE_AGENT_CATALOG.md) and the [Agentic SDLC Architecture](knowledge_base/AGENTIC_SDLC_ARCHITECTURE.md) documents.

## Multi-Layered Architecture Alignment

### The Four-Pillar Integration

Devloop's architecture is built on four key pillars that work harmoniously:

1. **Hexagonal Architecture (Ports & Adapters)**: Separates domain logic from external tools
2. **Microservices Architecture**: Distributes functionality across specialized services
3. **Parent-Child-Micro Agent Hierarchy**: Creates clear delegation and specialization
4. **SDLC Workflow Integration**: Maps directly to software development lifecycle stages

These four pillars combine to create a flexible yet structured system that can leverage modern AI frameworks while maintaining architectural integrity across distributed services.

## Combined Architectural Approach

### Hexagonal Principles Within Microservices

Each microservice in our system follows hexagonal architecture principles:

```
┌─────────────────────────────────────────────────────────────────┐
│              MICROSERVICES ARCHITECTURE LAYER                   │
│                                                                 │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐    │
│  │ UI Service    │    │ Main API      │    │ Knowledge     │    │
│  │ (Port 3000)   │───►│ (Port 8080)   │───►│ Graph API     │    │
│  └───────────────┘    └───────────────┘    │ (Port 8000)   │    │
│         ▲                     ▲            └───────────────┘    │
│         │                     │                    ▲            │
│         │                     │                    │            │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐    │
│  │ Document API  │    │ Activity API  │───►│ Memory API    │    │
│  │ (Port 3002)   │    │ (Port 8002)   │    │ (Port 8001)   │    │
│  └───────────────┘    └───────────────┘    └───────────────┘    │
└───────────────────────────────┬───────────────────────────────┬─┘
                                │                               │
┌───────────────────────────────▼───────────────────────────────▼─┐
│                     AGENT DOMAIN CORE                           │
│                                                                 │
│   ┌───────────┐      ┌────────────┐       ┌────────────────┐    │
│   │ Planning  │      │Development │       │ Deployment     │    │
│   │ Agents    │─────▶│ Agents     │──────▶│ & Monitoring   │    │
│   └───────────┘      └────────────┘       │ Agents         │    │
│        ▲                                  └────────────────┘    │
│        │                                          │             │
│        └──────────────────────────────────────────┘             │
│                         Feedback Loop                           │
└───────────────┬──────────────────────┬──────────────────────────┘
                │                      │
┌───────────────▼──────────┐  ┌────────▼────────┐  ┌──────────────────┐
│ SDLC INBOUND PORTS       │  │SDLC OUTBOUND PORTS│ │ TOOL OUTBOUND PORTS│
└─────────────┬────────────┘  └────────┬─────────┘ └──────────┬─────────┘
              │                        │                      │
┌─────────────▼────────────┐  ┌────────▼─────────┐  ┌─────────▼──────────┐
│   SDLC INBOUND ADAPTERS  │  │SDLC OUTBOUND ADAPT│  │TOOL OUTBOUND ADAPT │
└──────────────────────────┘  └───────────────────┘  └────────────────────┘
```

### Microservices as Domain Boundaries

Our microservices architecture provides clear boundaries for different domains within our system:

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE REGISTRY LAYER                   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │             /service-registry.json                 │     │
│  │  - Single source of truth for all services         │     │
│  │  - Defines ports, paths, and dependencies          │     │
│  │  - Provides health check endpoints                 │     │
│  └────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────┬─┘
                                                            │
┌────────────────────────────────────────────────────────────┼─┐
│                GATEWAY & ROUTING LAYER                     │ │
│                                                            │ │
│  ┌────────────────────────────┐  ┌────────────────────┐    │ │
│  │     Client Configuration    │  │   API Routes       │    │ │
│  │     /ui/src/config/        │  │   /api/routes/     │    │ │
│  └────────────────────────────┘  └────────────────────┘    │ │
└────────────────────────────────────────────────────────────┼─┘
                                                            │
┌────────────────────────────────────────────────────────────┼─┐
│                AGENT COMMUNICATION LAYER                   │ │
│                                                            │ │
│  ┌────────────────────────────┐  ┌────────────────────┐    │ │
│  │     Agent REST APIs         │  │   WebSocket APIs   │    │ │
│  │     /api/v1/agents/        │  │   /api/ws/         │    │ │
│  └────────────────────────────┘  └────────────────────┘    │ │
└────────────────────────────────────────────────────────────┼─┘
                                                            │
┌────────────────────────────────────────────────────────────┼─┐
│                PERSISTENT STORAGE LAYER                    │ │
│                                                            │ │
│  ┌────────────────────────────┐  ┌────────────────────┐    │ │
│  │     Knowledge Graph API     │  │   Memory API       │    │ │
│  │     /api/graph/            │  │   /api/memory/     │    │ │
│  └────────────────────────────┘  └────────────────────┘    │ │
└────────────────────────────────────────────────────────────┘
```

### Domain Core Integration Within Microservices

Each agent within our hierarchical structure exists within microservices, interacting with the outside world through both service interfaces and hexagonal ports:

1. **Parent Agents**:
   - Run within primary API services
   - Interface with inbound ports (requirements, planning)
   - Communicate via API endpoints (/api/v1/agents/{agent_id}/execute)

2. **Child Agents**:
   - Typically run within specialized services
   - Handle domain-specific processing
   - Communicate via internal APIs or direct invocation

3. **Micro Agents**:
   - Often embedded within child agent services
   - Focused interaction with outbound ports (tools, knowledge graph)
   - May run in ephemeral containers for resource isolation

### Service-to-Service Communication

Agents communicate across services using standardized protocols:

```javascript
// Example service-to-service communication
// From Main API to Knowledge Graph API
async function queryKnowledgeGraph(nodeType, properties) {
  try {
    const response = await fetch(`${API_ENDPOINTS.GRAPH.NODES}?type=${nodeType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.INTERNAL_API_KEY
      },
      body: JSON.stringify({ properties })
    });

    return await response.json();
  } catch (error) {
    console.error('Error querying knowledge graph:', error);
    throw error;
  }
}
```

## Parent-Child-Micro Hierarchy: Structural Clarity Within Microservices

### The Three-Tier Model

Our agent hierarchy follows a consistent pattern across all SDLC stages:

```
┌────────────────────────────────────────────────┐
│            PARENT AGENT (Orchestrator)         │
│  - High-level goals and coordination           │
│  - Cross-domain oversight                      │
│  - Strategic decision-making                   │
└─────────────────────┬──────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
│ CHILD      │  │ CHILD      │  │ CHILD      │
│ AGENT A    │  │ AGENT B    │  │ AGENT C    │
│ (Specialist)│  │ (Specialist)│  │ (Specialist)│
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │
┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
│ MICRO      │  │ MICRO      │  │ MICRO      │
│ AGENTS     │  │ AGENTS     │  │ AGENTS     │
│ (Executors) │  │ (Executors) │  │ (Executors) │
└────────────┘  └────────────┘  └────────────┘
```

### Hierarchy Benefits

1. **Clear Responsibility Boundaries**: Each agent has a well-defined scope
2. **Composability**: Agents can be reconfigured for different workflows
3. **Optimized Context Windows**: Information is filtered appropriately at each level
4. **Parallel Processing**: Child and micro agents can work simultaneously
5. **Independent Upgradeability**: Each agent can be improved without disrupting others

## SDLC Workflow Within Microservices

The agent hierarchy is mapped directly to SDLC stages, creating a coherent workflow that spans multiple microservices:

```
┌──────────────────────────────────────────────────────────────────┐
│ SERVICE: MAIN API (/api/v1) - PORT 8080                          │
├──────────────────────────────────────────────────────────────────┤
│                    PLANNING & REQUIREMENTS                       │
│  ┌───────────────┐   ┌─────────────────┐   ┌────────────────────┐│
│  │ Planner Agent │-->│ Architect Agent │-->│ Relationship Agent ││
│  │  (Parent)     │   │   (Child)       │   │     (Child)        ││
│  └───────────────┘   └─────────────────┘   └────────────────────┘│
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│ SERVICE: MAIN API (/api/v1/feature-creation) - PORT 8080         │
├──────────────────────────────────────────────────────────────────┤
│                    FEATURE & TASK DEFINITION                     │
│  ┌────────────────────┐   ┌───────────────┐   ┌────────────────┐ │
│  │ Feature Creation   │-->│ Task Agent    │-->│ Dependency     │ │
│  │ Agent (Parent)     │   │  (Parent)     │   │ Resolver (Child)│ │
│  └────────────────────┘   └───────────────┘   └────────────────┘ │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│ SERVICE: MAIN API (/api/v1/implementation) - PORT 8080           │
├──────────────────────────────────────────────────────────────────┤
│                    IMPLEMENTATION & TESTING                      │
│  ┌────────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │ Builder Agent  │-->│ QA Agent       │-->│ Documentation    │  │
│  │  (Parent)      │   │  (Parent)      │   │ Agent (Parent)   │  │
│  └────────────────┘   └────────────────┘   └──────────────────┘  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│ SERVICE: MAIN API (/api/v1/deployment) - PORT 8080               │
├──────────────────────────────────────────────────────────────────┤
│                   DEPLOYMENT & MONITORING                        │
│  ┌────────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │ Release Agent  │-->│ Deployment     │-->│ Observability    │  │
│  │  (Parent)      │   │ Agent (Parent) │   │ Agent (Parent)   │  │
│  └────────────────┘   └────────────────┘   └──────────────────┘  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│ SERVICE: SYSTEM HEALTH API (/api/v1/health) - PORT 8003          │
├──────────────────────────────────────────────────────────────────┤
│                        SYSTEM AGENTS                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │               SYSTEM HEALTH AGENT (PARENT)                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │  │
│  │  │Health Monitor│ │Log Analyzer│  │Health Resolution   │    │  │
│  │  │(Child)      │ │(Child)     │  │Agent (Child)       │    │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│ SERVICE: KNOWLEDGE GRAPH API (/api/graph) - PORT 8000            │
├──────────────────────────────────────────────────────────────────┤
│                     PERSISTENCE AGENTS                           │
│                                                                  │
│  ┌────────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │ Knowledge Graph│   │ Repository     │   │ Guardrail        │  │
│  │ Manager        │   │ Agent (Parent) │   │ Manager          │  │
│  └────────────────┘   └────────────────┘   └──────────────────┘  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────▼──────────────────────────────────┐
│ SERVICE: MEMORY API (/api/memory) - PORT 8001                    │
├──────────────────────────────────────────────────────────────────┤
│                       KNOWLEDGE GRAPH                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │          Historical Data → Feedback Loop → Planning          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Provider Integration: Architecture-Aligned Implementation

### Multi-Provider Implementation Matrix

Devloop's architecture can be implemented with various LLM providers while maintaining the core principles:

| Architecture Component | OpenAI Implementation | Anthropic Implementation | Google Vertex Implementation |
|------------------------|----------------------|--------------------------|------------------------------|
| **Parent Agents** | Assistant API with Function Calling | Claude with XML system message | Vertex AI Agent Builder |
| **Child Agents** | GPT-4o with Tool Use | Claude 3 Opus with XML tool use | Gemini Pro with structured output |
| **Micro Agents** | GPT-3.5 Turbo with functions | Claude Haiku with XML schema | Gemini Flash with tool calling |
| **Agent Communication** | JSON message passing | XML-wrapped exchanges | Protocol buffer serialization |
| **Knowledge Graph Integration** | Vector embeddings + metadata | Vector embeddings + metadata | Vector embeddings + metadata |

### Cross-Provider Interoperability

To ensure seamless operation across different providers, we implement:

1. **Message Translation Layer**: Converts between JSON, XML, and Protocol Buffers
2. **Unified Tool Schema**: Standardized schema for all tool definitions
3. **Capability Detection**: Dynamic adaptation to available models
4. **Fallback Mechanisms**: Graceful degradation when specific services unavailable

## System Health Agent: A Case Study in Multi-Layer Integration

The System Health Agent exemplifies our integrated architecture approach:

### Hexagonal Architecture Integration

```
┌───────────────────────────────────────────────────────────────┐
│                  SYSTEM HEALTH DOMAIN CORE                    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │               SYSTEM HEALTH AGENT (PARENT)             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │   │
│  │  │Health Monitor│ │Log Analyzer│  │Health Resolution│   │   │
│  │  │(Child)      │ │(Child)     │  │Agent (Child)   │    │   │
│  │  └────────────┘  └────────────┘  └────────────────┘    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
└────────────────┬───────────────────────┬─────────────────────┘
                 │                       │
┌────────────────▼───────────┐  ┌────────▼─────────────────────┐
│   MONITORING INBOUND PORT  │  │   RESOLUTION OUTBOUND PORT   │
│ ┌────────────────────────┐ │  │ ┌───────────────────────────┐│
│ │ System Metrics API     │ │  │ │ Process Management API    ││
│ └────────────────────────┘ │  │ └───────────────────────────┘│
│ ┌────────────────────────┐ │  │ ┌───────────────────────────┐│
│ │ Log Ingestion API      │ │  │ │ Config Management API     ││
│ └────────────────────────┘ │  │ └───────────────────────────┘│
└────────────────┬───────────┘  └────────────┬─────────────────┘
                 │                           │
┌────────────────▼───────────┐  ┌────────────▼─────────────────┐
│  MONITORING ADAPTERS       │  │  RESOLUTION ADAPTERS         │
│ ┌────────────────────────┐ │  │ ┌───────────────────────────┐│
│ │ Prometheus Adapter     │ │  │ │ Process Manager Adapter   ││
│ └────────────────────────┘ │  │ └───────────────────────────┘│
│ ┌────────────────────────┐ │  │ ┌───────────────────────────┐│
│ │ Log Collection Adapter │ │  │ │ Configuration Adapter     ││
│ └────────────────────────┘ │  │ └───────────────────────────┘│
└──────────────────────────┬─┘  └─────────────────────────────┬┘
                           │                                  │
                           ▼                                  ▼
                     System Metrics                   System Management
                       Collection                          Actions
```

### Knowledge Graph Integration

The System Health Agent both consumes and produces Knowledge Graph data:

```javascript
// System Health Knowledge Graph Entity
{
  "id": "system-health-20250510",
  "type": "system_health_record",
  "timestamp": "2025-05-10T15:24:32Z",
  "overall_health_score": 92,
  "component_health": {
    "api": { "score": 98, "status": "healthy" },
    "ui": { "score": 95, "status": "healthy" },
    "agents": { "score": 88, "status": "warning" },
    "database": { "score": 97, "status": "healthy" }
  },
  "related_entities": [
    {
      "id": "health-issue-274",
      "type": "health_issue",
      "relationship": "detected"
    },
    {
      "id": "health-action-159",
      "type": "health_action",
      "relationship": "recommended"
    },
    {
      "id": "feature-460100-model-initialization",
      "type": "feature",
      "relationship": "impacts"
    }
  ],
  "resolution_history": [
    {
      "action_id": "health-action-158",
      "timestamp": "2025-05-10T14:55:17Z",
      "action_type": "restart_service",
      "result": "success"
    }
  ]
}
```

### UI Integration

The System Health Agent provides data to the UI through a well-defined API:

```javascript
// System Health UI Component Integration
class OverviewDashboard extends React.Component {
  state = {
    healthData: null,
    loading: true,
    error: null
  };

  async componentDidMount() {
    try {
      // Fetch health data through the hexagonal architecture's ports
      const response = await fetch('/api/v1/agents/system-health-agent/status');
      const healthData = await response.json();
      
      this.setState({ 
        healthData,
        loading: false
      });
    } catch (error) {
      this.setState({ 
        error: "Could not fetch system health data",
        loading: false
      });
    }
  }

  render() {
    const { healthData, loading, error } = this.state;
    
    if (loading) return <LoadingIndicator />;
    if (error) return <ErrorDisplay message={error} />;
    
    return (
      <div className="dashboard">
        <DynamicHealthGauge score={healthData.overall_health_score} />
        <ComponentHealth components={healthData.component_health} />
        <ActionableInsights insights={healthData.insights} />
        <SystemMetricsPanel metrics={healthData.metrics} />
      </div>
    );
  }
}
```

## Provider-Specific Architectural Considerations

Each LLM provider has unique strengths and considerations when implementing our architecture:

### OpenAI-Optimized Architecture

With OpenAI's function calling and assistants API, our architecture emphasizes:

1. **Function Schema Standardization**: Consistent JSON schema across all agent levels
2. **Parallel Function Calling**: Optimizing for multiple tool use in a single call
3. **Context Window Management**: Efficient use of context for complex agent interactions
4. **Vision Model Integration**: Incorporating UI analysis in system health monitoring

### Anthropic-Optimized Architecture

With Claude's XML-based approach, our architecture emphasizes:

1. **Consistent XML Schemas**: Standardized XML formats across agent tiers
2. **Human Values Alignment**: Leveraging constitutional AI for system integrity
3. **Thinking Tag Utilization**: Structured reasoning in complex agent decisions
4. **Character Count Optimization**: Managing Claude's token limits effectively

### Google Vertex AI-Optimized Architecture

With Google's Vertex AI approach, our architecture emphasizes:

1. **Agent Builder Integration**: Utilizing Google's agent creation interfaces
2. **Graph Neural Networks**: Enhanced relationship modeling in the Knowledge Graph
3. **Multimodal Input Processing**: Leveraging Google's multimodal capabilities
4. **Platform-Native Integration**: Seamless integration with Google Cloud services

## Service Health Management

The System Health Agent plays a critical role in managing the health of all microservices:

```javascript
// Example health check endpoint implementation
app.get('/api/v1/health', async (req, res) => {
  try {
    // Check all services using service registry
    const serviceRegistry = require('../../../service-registry.json');
    const healthStatus = {};

    for (const service of serviceRegistry.services) {
      if (service.healthCheck) {
        const checkUrl = `${service.baseUrl}${service.healthCheck}`;
        try {
          const response = await fetch(checkUrl, {
            timeout: 5000,
            headers: {
              'X-API-Key': process.env.INTERNAL_API_KEY
            }
          });

          healthStatus[service.id] = {
            status: response.ok ? 'healthy' : 'degraded',
            statusCode: response.status,
            responseTime: response.headers.get('X-Response-Time')
          };
        } catch (error) {
          healthStatus[service.id] = {
            status: 'offline',
            error: error.message
          };
        }
      }
    }

    // Calculate overall health
    const healthyServices = Object.values(healthStatus).filter(s => s.status === 'healthy').length;
    const totalServices = Object.keys(healthStatus).length;
    const overallHealth = Math.floor((healthyServices / totalServices) * 100);

    res.json({
      status: overallHealth > 80 ? 'healthy' : overallHealth > 60 ? 'degraded' : 'critical',
      score: overallHealth,
      timestamp: new Date().toISOString(),
      services: healthStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Service Management Tools

The Devloop architecture includes scripts for managing services:

1. `/system-core/scripts/manage-services.sh`: Command line tool for starting, stopping, and checking services
2. `/system-core/scripts/generate-api-config.js`: Generates client configuration from service registry

```bash
# Example service management commands
./system-core/scripts/manage-services.sh status       # Check status of all services
./system-core/scripts/manage-services.sh start main-api  # Start the main API service
./system-core/scripts/manage-services.sh check        # Run health checks on all services
```

## Conclusion: A Unified Multi-Layered Architecture

Devloop's architecture successfully unifies:

1. **Microservices Architecture**: Through distributed, specialized services
2. **Hexagonal Architecture Principles**: Through the ports and adapters model
3. **Hierarchical Agent Structure**: Through the parent-child-micro pattern
4. **SDLC Integration**: Through agent mapping to development stages
5. **Multi-Provider Support**: Through adapter patterns and abstraction layers
6. **Knowledge Graph Connectivity**: Through standardized entity relationships
7. **Service Registry**: Through centralized service configuration

This unified approach creates a system that is:

- **Extensible**: New agents and services can be added without disrupting existing ones
- **Maintainable**: Clean separation of concerns enhances code quality
- **Scalable**: Microservices allow for independent scaling of components
- **Resilient**: Service health monitoring enables quick recovery from failures
- **Provider-Agnostic**: Core architecture remains stable regardless of LLM provider
- **SDLC-Aligned**: Development workflow matches modern software practices
- **Discovery-Enabled**: Service registry enables dynamic service discovery

As LLM technologies evolve, this architecture provides a stable foundation while allowing for continuous improvement through its modular design, microservices approach, and clear integration patterns.