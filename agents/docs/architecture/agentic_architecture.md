# Agentic Architecture Diagram

The following diagram illustrates the integrated agentic architecture for the DevLoop system, focusing on the Feature Creation Agent and Task Agent integration.

```mermaid
graph TD
    subgraph "User Interface"
        UI_FC[Feature Creator]
        UI_TL[Task List View]
        UI_TS[Tasks Tab]
        UI_RM[Roadmap View]
    end

    subgraph "UI Services Layer"
        SRV_FC[Feature Creation Service]
        SRV_TA[Task Agent Service]
        SRV_FA[Feature Agent Service]
        SRV_RM[Roadmap Service]
    end

    subgraph "API Layer"
        API_FC[Feature Creation API]
        API_TA[Task Agent API]
        API_KG[Knowledge Graph API]
    end

    subgraph "Agent Layer"
        AG_FC[Feature Creation Agent]
        AG_TA[Task Agent]
        AG_RA[Relationship Agent]
    end

    subgraph "Knowledge Graph"
        KG_MS[Milestones]
        KG_PH[Phases]
        KG_MD[Modules]
        KG_FT[Features]
        KG_TK[Tasks]
        KG_RL[Relationships]
    end

    %% UI to Services
    UI_FC --> SRV_FC
    UI_FC --> SRV_FA
    UI_TL --> SRV_TA
    UI_TS --> SRV_TA
    UI_RM --> SRV_RM
    
    %% Services to API
    SRV_FC --> API_FC
    SRV_TA --> API_TA
    SRV_FA --> API_FC
    SRV_FA --> API_TA
    SRV_RM --> API_KG
    SRV_RM --> API_TA
    
    %% Services direct to KG (fallback paths)
    SRV_FC -.-> API_KG
    SRV_TA -.-> API_KG
    
    %% API to Agents
    API_FC --> AG_FC
    API_TA --> AG_TA
    
    %% Agents to Knowledge Graph
    AG_FC --> API_KG
    AG_TA --> API_KG
    AG_RA --> API_KG
    
    %% Knowledge Graph Components
    KG_MS --- KG_PH
    KG_PH --- KG_MD
    KG_MD --- KG_FT
    KG_FT --- KG_TK
    KG_RL --- KG_FT
    KG_RL --- KG_TK
    
    %% Agent Communications
    AG_FC <--> AG_TA
    AG_TA <--> AG_RA

    %% Feature Agent Service Integration
    SRV_FA --> SRV_FC
    SRV_FA --> SRV_TA

    %% Styling
    classDef ui fill:#3b82f6,stroke:#1d4ed8,color:white
    classDef service fill:#6366f1,stroke:#4338ca,color:white
    classDef api fill:#8b5cf6,stroke:#6d28d9,color:white
    classDef agent fill:#ec4899,stroke:#be185d,color:white
    classDef kg fill:#10b981,stroke:#047857,color:white
    
    class UI_FC,UI_TL,UI_TS,UI_RM ui
    class SRV_FC,SRV_TA,SRV_FA,SRV_RM service
    class API_FC,API_TA,API_KG api
    class AG_FC,AG_TA,AG_RA agent
    class KG_MS,KG_PH,KG_MD,KG_FT,KG_TK,KG_RL kg
```

## Flow Diagram

The following diagram illustrates the typical workflow for feature creation and task generation:

```mermaid
sequenceDiagram
    actor User
    participant FC as Feature Creator
    participant FAS as Feature Agent Service
    participant FCA as Feature Creation Agent
    participant TA as Task Agent
    participant KG as Knowledge Graph
    
    User->>FC: Enter feature details
    FC->>FAS: createFeatureWithTasks()
    Note over FAS: Combined service coordinates agents
    
    FAS->>FCA: processFeature()
    FCA->>FCA: Analyze feature
    FCA->>FCA: Suggest placement
    FCA->>KG: Create feature node
    KG-->>FCA: Return feature ID
    FCA-->>FAS: Return feature
    
    FAS->>TA: processFeature()
    TA->>KG: Get feature details
    KG-->>TA: Return feature
    TA->>TA: Generate tasks
    TA->>TA: Analyze dependencies
    TA->>KG: Create task nodes
    TA->>KG: Create relationships
    TA-->>FAS: Return tasks
    
    FAS-->>FC: Return feature with tasks
    FC->>User: Display success with task count
    
    User->>FC: View tasks
    FC->>KG: Get tasks for feature
    KG-->>FC: Return tasks
    FC->>User: Display tasks
```

## Component Diagram

The following diagram shows the component structure of the Feature Agent Service integration:

```mermaid
classDiagram
    class FeatureAgentService {
        +createFeatureWithTasks(featureData, generateTasks)
        +analyzeFeatureWithTaskEstimate(name, description)
        +processFeaturesWithTasks(featuresData, generateTasks)
        +checkAgentsAvailability()
    }
    
    class FeatureCreationService {
        +processFeature(featureData)
        +analyzeFeature(name, description)
        +suggestPlacement(analysisResult)
        +generateFeatureId(featureName)
        +fetchFeatures(filters)
        +updateFeature(featureId, updateData)
    }
    
    class TaskAgentService {
        +processFeatureWithAgent(featureId, useLlm)
        +processBatchWithAgent(featureIds, useLlm)
        +getFeatureTasksWithAgent(featureId)
        +updateTaskWithAgent(taskId, status)
        +isTaskAgentAvailable()
    }
    
    class RoadmapService {
        +fetchMilestones()
        +fetchMilestoneStructure(milestoneId)
        +processMilestoneFeatures(milestoneId)
    }
    
    class FeatureCreator {
        -formData
        -generateTasks: boolean
        +handleSubmit()
        +createFeatureWithAI()
    }
    
    class TasksTab {
        -tasks
        -agentAvailable
        +handleGenerateTasks()
    }
    
    class Roadmap {
        -milestones
        -processingMilestones
        +handleGenerateTasks(milestoneId)
    }
    
    FeatureAgentService --> FeatureCreationService: uses
    FeatureAgentService --> TaskAgentService: uses
    FeatureCreator --> FeatureAgentService: uses
    TasksTab --> TaskAgentService: uses
    Roadmap --> RoadmapService: uses
    RoadmapService --> TaskAgentService: uses
```

These diagrams provide a visual representation of the agentic architecture, showing how the different components interact with each other in the DevLoop system.