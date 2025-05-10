import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Tab, Tabs, Dropdown, ListGroup } from 'react-bootstrap';
import { dispatchNotification } from '../../services/notificationService';
import { createToast } from '../ToastNotification';
import TasksTab from '../tasks/TasksTab';

// Add some custom styles for the modal
const modalStyles = `
  .custom-tabs .nav-link {
    color: rgba(255, 255, 255, 0.6);
    border: none;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border-radius: 0;
    transition: all 0.2s;
  }
  
  .custom-tabs .nav-link:hover {
    color: rgba(255, 255, 255, 0.9);
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .custom-tabs .nav-link.active {
    color: #fff;
    background-color: transparent;
    border-bottom: 2px solid #3b82f6;
  }
  
  /* Dropdown customization */
  .status-dropdown-container .dropdown-toggle::after {
    font-size: 8px;
    margin-left: 0.5rem;
    vertical-align: middle;
  }
  
  .status-dropdown-container .dropdown-menu {
    background-color: #1E293B !important;
    border: 1px solid #2D3B4E !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  }
  
  .status-dropdown-container .dropdown-item {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
  
  .status-dropdown-container .dropdown-item:hover,
  .status-dropdown-container .dropdown-item:focus {
    background-color: #2D3B4E !important;
  }
`;

const FeatureDetailsModal = ({ isOpen, onClose, feature, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [editableFeature, setEditableFeature] = useState(null);

  // Apply custom styles when component mounts
  useEffect(() => {
    // Add the styles to the document head
    const styleElement = document.createElement('style');
    styleElement.innerHTML = modalStyles;
    document.head.appendChild(styleElement);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Set editable feature when the modal opens or feature changes
  useEffect(() => {
    if (feature) {
      setEditableFeature({ ...feature });
      
      // Reset active tab when feature changes
      setActiveTab('overview');
    }
  }, [feature]);

  if (!isOpen || !feature || !editableFeature) return null;

  // Handle status change
  const handleStatusChange = (newStatus) => {
    // Update local state
    setEditableFeature({ ...editableFeature, status: newStatus });
    
    console.log(`Status changing from ${feature.status} to ${newStatus}`);
    
    // Notify parent component of the change
    if (onStatusChange) {
      onStatusChange(feature.id, newStatus);
    }
    
    // Dispatch a notification to the notification center (if available)
    if (typeof dispatchNotification === 'function') {
      dispatchNotification({
        type: 'feature',
        title: 'Feature Status Updated',
        description: `"${feature.name}" status changed from ${feature.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
        metadata: {
          featureId: feature.id,
          oldStatus: feature.status,
          newStatus: newStatus
        }
      });
      
      // Simulate an @ mention notification after a delay
      setTimeout(() => {
        dispatchNotification({
          type: 'update',
          title: 'New @mention in Feature',
          description: `@${['alex', 'taylor', 'dev', 'jamie'][Math.floor(Math.random() * 4)]} replied to your status change for "${feature.name}"`,
          metadata: {
            featureId: feature.id,
            hasReply: true
          }
        });
      }, 3000);
    } else {
      // Fallback if notification system is not available
      setTimeout(() => {
        alert(`Agent has detected a manual status change for "${feature.name}" and has updated related components.`);
      }, 1500);
    }
  };
  

  // Format the data for display
  const statusDisplay = editableFeature.status.charAt(0).toUpperCase() + editableFeature.status.slice(1).replace('_', ' ');
  const formattedDate = new Date().toLocaleDateString(); // Simulate last updated date

  const getStatusVariant = (status) => {
    switch(status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'blocked': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Semi-transparent overlay that doesn't darken the entire screen */}
      <div className="fixed inset-0 bg-black bg-opacity-25 pointer-events-auto" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl w-[90%] sm:w-[600px] md:w-[700px] lg:w-[800px] h-[500px] sm:h-[550px] md:h-[600px] flex flex-col overflow-hidden border border-gray-700 pointer-events-auto"
           style={{ backdropFilter: 'blur(3px)' }}>
        <div className="bg-gray-900 px-4 py-3 flex justify-between items-center rounded-t-lg">
          <div className="font-semibold text-xl text-white">{feature.name}</div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Feature Information Section */}
          <div className="mb-4">
            <div className="flex items-center mb-3">
              <Badge bg={getStatusVariant(feature.status)} className="me-2">
                {statusDisplay}
              </Badge>
              <div className="text-sm text-gray-400">
                Feature ID: <span className="font-mono">{feature.id}</span>
              </div>
            </div>
            
            <Card className="bg-gray-700 border-0 mb-4">
              <Card.Body>
                <h5 className="text-white font-semibold mb-2">Description</h5>
                <p className="text-gray-300">
                  {feature.description || "This feature provides essential functionality for the project."}
                </p>
              </Card.Body>
            </Card>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="bg-gray-700 border-0">
                <Card.Body className="p-3">
                  <div className="text-xs text-gray-400 mb-1">Type</div>
                  <div className="text-sm text-white">{feature.type || 'feature'}</div>
                </Card.Body>
              </Card>
              <Card className="bg-gray-700 border-0">
                <Card.Body className="p-3">
                  <div className="text-xs text-gray-400 mb-1">Module</div>
                  <div className="text-sm text-white">{feature.module}</div>
                </Card.Body>
              </Card>
              <Card className="bg-gray-700 border-0">
                <Card.Body className="p-3">
                  <div className="text-xs text-gray-400 mb-1">Last Updated</div>
                  <div className="text-sm text-white">{formattedDate}</div>
                </Card.Body>
              </Card>
              <Card className="bg-gray-700 border-0">
                <Card.Body className="p-3">
                  <div className="text-xs text-gray-400 mb-1">Priority</div>
                  <div className="text-sm text-white">
                    <Badge bg="info" pill>Medium</Badge>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3 roadmap-detail-tabs custom-tabs"
            fill
            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Tab eventKey="overview" title="Overview">
              <Card className="bg-gray-700 border-0">
                <Card.Body>
                  <h5 className="text-white font-semibold mb-3">Overview</h5>
                  <p className="text-gray-300 mb-3">
                    {feature.description || (
                      <>
                        {feature.id.includes('1001') && 'Database schema for the agent ecosystem featuring optimized tables for knowledge storage, retrieval, and cross-referencing. Implements advanced indexing strategies for real-time AI agent operations.'}
                        {feature.id.includes('1002') && 'Event-driven messaging system using Redis Pub/Sub for inter-agent communication. Enables real-time updates and asynchronous processing between agent components.'}
                        {feature.id.includes('1003') && 'Knowledge graph implementation for storing interconnected concepts, relationships, and metadata. Provides semantic understanding capabilities for AI agents.'}
                        {feature.id.includes('2001') && 'Interactive UI component for creating and configuring project milestones. Integrates with the planning system and AI recommendations.'}
                        {feature.id.includes('3001') && 'Agent that specializes in generating optimal API interfaces based on system requirements and usage patterns.'}
                        {feature.id.includes('3101') && 'Handles schema validation and relationship management between agent components.'}
                        {feature.id.includes('4001') && 'Comprehensive test suite for validating unit functionality across the system.'}
                        {feature.id === 'feature-5001' && 'Integration of the Workflow Engine with the Knowledge Graph system. Implements bidirectional data flow between workflow executions and the knowledge graph, with automatic entity extraction and relationship mapping. Supports context enrichment for workflow steps and persistent storage of execution outcomes in the graph database.'}
                        {feature.id === 'feature-5002' && 'High-throughput batch processing capabilities for workflow executions. Implements dynamic batching with adaptive sizing based on resource availability and priority queues. Supports parallel batch processing with work-stealing for optimal resource utilization.'}
                        {feature.id === 'feature-5003' && 'Implementation of the Circuit Breaker pattern to prevent cascading failures in workflow executions. Features configurable failure thresholds, half-open state detection with incremental recovery, and custom fallback strategies for each service dependency.'}
                        {feature.id === 'feature-5004' && 'Advanced caching system for workflow data with multi-level cache (memory, Redis, disk). Implements TTL-based invalidation strategies, cache warming for frequently accessed workflows, and write-through/write-behind policies for data consistency.'}
                        {feature.id === 'feature-5005' && 'Parallel execution engine for workflow steps using asyncio task groups. Implements dependency analysis with topological sorting to determine parallelization opportunities. Features adaptive concurrency control to optimize resource usage based on system load.'}
                        {feature.id === 'feature-5006' && 'Checkpointing mechanism for long-running workflows that allows pause/resume functionality. Creates serialized snapshots of execution state at configurable intervals, with support for manual checkpoints. Implements efficient storage backend with compression and encryption capabilities.'}
                        {feature.id === 'feature-5007' && 'Dynamic schema validation system for workflow definitions and step executions. Implements JSON Schema validation with custom validators and runtime schema registration. Provides detailed validation error reporting with suggested fixes and schema evolution support.'}
                        {feature.id === 'feature-5008' && 'Comprehensive activity logging system for workflow operations with structured event formatting. Integrates with distributed tracing for end-to-end visibility. Implements log enrichment with context data and searchable indexes for rapid troubleshooting.'}
                        {!feature.id.match(/1001|1002|1003|2001|3001|3101|4001|feature-500[1-8]/) && 'This component provides essential functionality within the agent architecture, enabling key operations and integration with other subsystems.'}
                      </>
                    )}
                  </p>
                  
                  <h6 className="text-white font-semibold mb-2">Key Benefits</h6>
                  <ul className="text-gray-300 mb-3 pl-5 list-disc">
                    {feature.dependencies ? (
                      <>
                        {feature.dependencies.map((dep, index) => (
                          <li key={index}>Integration with {dep}</li>
                        ))}
                      </>
                    ) : (
                      <>
                        {feature.id.includes('1001') && (
                          <>
                            <li>Enables high-performance data operations for AI agents</li>
                            <li>Provides robust schema versioning and migration</li>
                            <li>Implements advanced security and access control</li>
                            <li>Optimized for high-volume agent operations</li>
                          </>
                        )}
                        {feature.id.includes('1002') && (
                          <>
                            <li>Near real-time communication between distributed agents</li>
                            <li>Resilient message delivery with retry mechanisms</li>
                            <li>Scalable to thousands of concurrent agent instances</li>
                            <li>Low-latency event distribution (avg. 5ms)</li>
                          </>
                        )}
                        {feature.id.includes('1003') && (
                          <>
                            <li>Semantic relationship modeling between concepts</li>
                            <li>Vector embedding integration for similarity search</li>
                            <li>Enables contextual understanding for agent operations</li>
                            <li>Facilitates advanced reasoning and inference</li>
                          </>
                        )}
                        {feature.id === 'feature-5001' && (
                          <>
                            <li>Bidirectional data flow between workflows and knowledge</li>
                            <li>Automatic entity extraction and relationship mapping</li>
                            <li>Context enrichment for more intelligent step execution</li>
                            <li>Persistent storage of execution outcomes in graph database</li>
                          </>
                        )}
                        {feature.id === 'feature-5002' && (
                          <>
                            <li>10x throughput improvement for high-volume workflows</li>
                            <li>Adaptive batch sizing based on system resources</li>
                            <li>Priority-based scheduling for critical workflows</li>
                            <li>Optimized resource utilization with work-stealing algorithm</li>
                          </>
                        )}
                        {feature.id === 'feature-5003' && (
                          <>
                            <li>Prevents cascading failures across dependent services</li>
                            <li>Configurable failure thresholds per service</li>
                            <li>Graceful degradation with custom fallback strategies</li>
                            <li>Self-healing recovery with incremental request volumes</li>
                          </>
                        )}
                        {feature.id === 'feature-5004' && (
                          <>
                            <li>85% reduction in database load for common operations</li>
                            <li>Multi-level caching strategies (memory, Redis, disk)</li>
                            <li>Intelligent TTL invalidation based on data volatility</li>
                            <li>Cache warming for frequently accessed workflows</li>
                          </>
                        )}
                        {feature.id === 'feature-5005' && (
                          <>
                            <li>Up to 7x performance improvement for complex workflows</li>
                            <li>Automatic dependency analysis for parallel execution</li>
                            <li>Adaptive concurrency control based on system load</li>
                            <li>Real-time monitoring of execution throughput</li>
                          </>
                        )}
                        {feature.id === 'feature-5006' && (
                          <>
                            <li>Resume long-running workflows after interruptions</li>
                            <li>Configurable automatic checkpointing intervals</li>
                            <li>Efficient serialization with compression (avg. 75% reduction)</li>
                            <li>Encrypted checkpoint storage for sensitive workflows</li>
                          </>
                        )}
                        {feature.id === 'feature-5007' && (
                          <>
                            <li>Prevents execution of invalid workflow configurations</li>
                            <li>Runtime schema registration without service restart</li>
                            <li>Detailed validation errors with suggested fixes</li>
                            <li>Schema evolution support with backward compatibility</li>
                          </>
                        )}
                        {feature.id === 'feature-5008' && (
                          <>
                            <li>Structured event format for machine-readable logs</li>
                            <li>Integration with distributed tracing (OpenTelemetry)</li>
                            <li>Log enrichment with contextual execution data</li>
                            <li>Searchable indexes for rapid troubleshooting</li>
                          </>
                        )}
                        {feature.id === 'feature-5009' && (
                          <>
                            <li>Interactive D3.js visualizations of workflow execution</li>
                            <li>Real-time state tracking and path highlighting</li>
                            <li>Step dependency graph and execution timeline views</li>
                            <li>Resource utilization heat maps for optimization</li>
                          </>
                        )}
                        {feature.id === 'feature-5010' && (
                          <>
                            <li>Distributed tracing of step-level metrics with OpenTelemetry</li>
                            <li>Anomaly detection for performance regression identification</li>
                            <li>Predictive scaling based on historical execution patterns</li>
                            <li>Bottleneck identification with optimization suggestions</li>
                          </>
                        )}
                        {!feature.id.match(/1001|1002|1003|feature-50(0[1-9]|10)/) && (
                          <>
                            <li>Improves overall system capabilities</li>
                            <li>Reduces complexity and maintenance costs</li>
                            <li>Enhances integration between components</li>
                            <li>Provides foundation for future enhancements</li>
                          </>
                        )}
                      </>
                    )}
                  </ul>
                  
                  {/* Tasks Summary Section */}
                  <h6 className="text-white font-semibold mb-2 mt-4">Implementation Tasks</h6>
                  <div className="bg-gray-800 p-3 rounded mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-blue-400 mr-2">🔄</span>
                        <span className="text-gray-300">
                          View and manage tasks for this feature
                        </span>
                      </div>
                      <button 
                        onClick={() => setActiveTab('tasks')}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Manage Tasks
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      Tasks are managed through the Knowledge Graph and synchronized across all views.
                    </div>
                  </div>
                  
                  {/* New Attachments Section */}
                  <h6 className="text-white font-semibold mb-2 mt-4">Attachments & References</h6>
                  <div className="bg-gray-800 p-3 rounded mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-blue-400 mr-2">📎</span>
                        <span className="text-gray-300">Screenshot-{feature.id.slice(-4)}.png</span>
                      </div>
                      <button className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600">
                        View
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-green-400 mr-2">📄</span>
                        <span className="text-gray-300">Design-Spec-{feature.name.replace(/\s/g, '-')}.md</span>
                      </div>
                      <button className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600">
                        Open
                      </button>
                    </div>
                  </div>
                  
                  {/* Notes/Comments Section */}
                  <h6 className="text-white font-semibold mb-2">Notes</h6>
                  <div className="bg-gray-800 p-3 rounded text-gray-300 text-sm">
                    <p className="mb-2">
                      <span className="text-blue-400 font-medium">@DevTeam:</span> This component requires integration testing with the {feature.id.includes('100') ? 'agent ecosystem' : 'core infrastructure'}.
                    </p>
                    <p className="mb-2">
                      <span className="text-purple-400 font-medium">@AIAssistant:</span> Recommended approach is to implement with {feature.id.includes('100') ? 'transaction support' : 'incremental deployment'}. See linked design document for details.
                    </p>
                    <div className="border-t border-gray-700 mt-3 pt-2">
                      <div className="flex items-center mb-1">
                        <p className="text-xs text-gray-400 mr-2">Reply with @mention to notify team members</p>
                        <span className="bg-blue-600 text-xs text-white px-1.5 py-0.5 rounded">
                          Connected to Activity Center
                        </span>
                      </div>
                      <div className="flex mt-2">
                        <input 
                          type="text"
                          placeholder="Add a comment... (use @name to mention)"
                          className="flex-1 bg-gray-700 border border-gray-600 rounded-l px-3 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                          onChange={(e) => {
                            // This is just UI enhancement - no actual API call yet
                            // When user types @ show a small popup with user suggestions
                            if (e.target.value.includes('@') && !document.getElementById('mention-popup')) {
                              const popup = document.createElement('div');
                              popup.id = 'mention-popup';
                              popup.className = 'absolute bottom-full left-0 bg-gray-800 rounded shadow-lg border border-gray-700 z-50 mb-1';
                              popup.innerHTML = `
                                <div class="p-1 text-sm">
                                  <div class="px-2 py-1 hover:bg-gray-700 cursor-pointer">@alex</div>
                                  <div class="px-2 py-1 hover:bg-gray-700 cursor-pointer">@taylor</div>
                                  <div class="px-2 py-1 hover:bg-gray-700 cursor-pointer">@dev</div>
                                  <div class="px-2 py-1 hover:bg-gray-700 cursor-pointer">@jamie</div>
                                </div>
                              `;
                              e.target.parentNode.style.position = 'relative';
                              e.target.parentNode.appendChild(popup);
                              
                              // Auto-remove after 3 seconds if not used
                              setTimeout(() => {
                                if (document.getElementById('mention-popup')) {
                                  document.getElementById('mention-popup').remove();
                                }
                              }, 3000);
                            }
                          }}
                        />
                        <button 
                          className="bg-blue-600 text-white px-3 rounded-r border border-blue-600 text-sm hover:bg-blue-700"
                          onClick={() => {
                            if (typeof dispatchNotification === 'function') {
                              // Simulate adding a comment with notification
                              dispatchNotification({
                                type: 'feature',
                                title: 'New Comment Added',
                                description: `You added a comment to "${feature.name}"`,
                                metadata: {
                                  featureId: feature.id,
                                  hasComment: true
                                }
                              });
                            }
                          }}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="implementation" title="Implementation">
              <Card className="bg-gray-700 border-0">
                <Card.Body>
                  <h5 className="text-white font-semibold mb-3">Implementation Details</h5>
                  
                  {/* Implementation status */}
                  <div className="mb-4 bg-gray-800 p-3 rounded">
                    <div className="flex items-center mb-2">
                      <span className="font-medium text-gray-300 mr-2">Implementation Status:</span>
                      <Badge bg={getStatusVariant(editableFeature.status)} className="text-xs">
                        {statusDisplay}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-400">Implementation Type:</span>
                        <span className="text-gray-300 ml-2">{feature.type === 'agent' ? 'Agent Component' : 'Core Feature'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Complexity:</span>
                        <span className="text-gray-300 ml-2">{feature.id.includes('100') ? 'High' : feature.id.includes('200') ? 'Medium' : 'Standard'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Est. Effort:</span>
                        <span className="text-gray-300 ml-2">{feature.id.includes('100') ? '10-15 days' : feature.id.includes('200') ? '5-8 days' : '3-5 days'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Assigned:</span>
                        <span className="text-blue-300 ml-2">AI Agent System</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Implementation code */}
                  <div className="bg-gray-800 p-3 rounded font-mono text-sm text-gray-300 overflow-x-auto mb-4">
                    {feature.id.includes('1001') && (
                      <pre>
{`// Database Schema Implementation
import { Schema, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Agent Knowledge Base Schema
const KnowledgeNodeSchema = new Schema({
  nodeId: { type: String, default: () => uuidv4(), index: true },
  type: { type: String, enum: ['concept', 'entity', 'action', 'property'], required: true },
  name: { type: String, required: true, index: true },
  description: { type: String },
  metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  embeddings: [{ type: Number }], // Vector embeddings for semantic similarity
  status: { type: String, enum: ['active', 'archived', 'deprecated'], default: 'active' }
});

// Relationship between knowledge nodes
const RelationshipSchema = new Schema({
  sourceId: { type: String, required: true, index: true },
  targetId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  weight: { type: Number, default: 1.0 },
  metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

// Create compound index for quick relationship retrieval
RelationshipSchema.index({ sourceId: 1, targetId: 1 }, { unique: true });

export const KnowledgeNode = model('KnowledgeNode', KnowledgeNodeSchema);
export const Relationship = model('Relationship', RelationshipSchema);`}
                      </pre>
                    )}
                    {feature.id.includes('1002') && (
                      <pre>
{`// Redis Pub/Sub Implementation
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export class MessageBus extends EventEmitter {
  constructor(config) {
    super();
    this.publisher = new Redis(config.redisUrl);
    this.subscriber = new Redis(config.redisUrl);
    this.channels = new Set();
    this.clientId = config.clientId || uuidv4();
    this.initialize();
  }

  initialize() {
    this.subscriber.on('message', (channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        // Avoid processing own messages
        if (parsedMessage.senderId !== this.clientId) {
          this.emit(channel, parsedMessage);
          this.emit('message', channel, parsedMessage);
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    });
  }

  subscribe(channel) {
    if (!this.channels.has(channel)) {
      this.subscriber.subscribe(channel);
      this.channels.add(channel);
    }
    return this;
  }

  publish(channel, data) {
    const message = JSON.stringify({
      ...data,
      senderId: this.clientId,
      timestamp: Date.now()
    });
    return this.publisher.publish(channel, message);
  }

  close() {
    this.publisher.quit();
    this.subscriber.quit();
  }
}`}
                      </pre>
                    )}
                    {feature.id.includes('1003') && (
                      <pre>
{`// Knowledge Graph Implementation
import { KnowledgeNode, Relationship } from '../models/schema';
import { vectorize } from '../services/embedding';

class KnowledgeGraph {
  async addNode(nodeData) {
    if (nodeData.name) {
      // Generate embeddings for semantic search
      const embeddings = await vectorize(nodeData.name + ' ' + (nodeData.description || ''));
      nodeData.embeddings = embeddings;
    }
    
    const node = new KnowledgeNode(nodeData);
    await node.save();
    return node;
  }
  
  async addRelationship(sourceId, targetId, type, metadata = {}) {
    // Check if nodes exist
    const [sourceExists, targetExists] = await Promise.all([
      KnowledgeNode.exists({ nodeId: sourceId }),
      KnowledgeNode.exists({ nodeId: targetId })
    ]);
    
    if (!sourceExists || !targetExists) {
      throw new Error('Source or target node does not exist');
    }
    
    const relationship = new Relationship({
      sourceId,
      targetId,
      type,
      metadata
    });
    
    await relationship.save();
    return relationship;
  }
  
  async findRelated(nodeId, types = null, maxDepth = 1) {
    // Implementation of graph traversal logic
    // ...
  }
  
  async semanticSearch(query, limit = 10) {
    const queryEmbedding = await vectorize(query);
    
    // Find semantically similar nodes using vector similarity
    const results = await KnowledgeNode.aggregate([
      {
        $vectorSearch: {
          index: 'embedding_index',
          path: 'embeddings',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit
        }
      }
    ]);
    
    return results;
  }
}

export default new KnowledgeGraph();`}
                      </pre>
                    )}
                    {!feature.id.match(/1001|1002|1003/) && (
                      <pre>
{`// Implementation for ${feature.name}
import { AgentSystem } from '../core/agent-system';
import { Logger } from '../utils/logger';

class ${feature.name.replace(/\s/g, '')} {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('${feature.name}');
    this.status = 'initializing';
    this.agentSystem = AgentSystem.getInstance();
  }
  
  async initialize() {
    this.logger.info('Initializing ${feature.name}');
    
    try {
      // Register with agent system
      await this.agentSystem.registerComponent({
        id: '${feature.id}',
        name: '${feature.name}',
        type: '${feature.type || 'feature'}',
        capabilities: ['${feature.id.includes('400') ? 'testing' : 
                         feature.id.includes('300') ? 'api' : 
                         feature.id.includes('200') ? 'ui' : 'core'}']
      });
      
      // Initialize core functionality
      // ...
      
      this.status = 'ready';
      this.logger.info('${feature.name} initialized successfully');
      return true;
    } catch (error) {
      this.status = 'error';
      this.logger.error('Failed to initialize: ' + error.message);
      throw error;
    }
  }
  
  // Feature-specific methods
  // ...
}

export default ${feature.name.replace(/\s/g, '')};`}
                      </pre>
                    )}
                  </div>
                  
                  {/* Implementation notes */}
                  <div>
                    <h6 className="text-white font-semibold mb-2">Implementation Notes</h6>
                    <div className="bg-gray-800 p-3 rounded text-gray-300 text-sm">
                      <p className="mb-1">
                        {feature.id.includes('1001') && 'Implements MongoDB schema with optimized indexes for agent knowledge storage. Vector embeddings support semantic search capabilities.'}
                        {feature.id.includes('1002') && 'Uses Redis for high-performance pub/sub messaging with client ID tracking to prevent self-message processing.'}
                        {feature.id.includes('1003') && 'Knowledge graph implementation with semantic vector search and relationship traversal support.'}
                        {feature.id === 'feature-5001' && 'Implements bidirectional integration between the Workflow Engine and Knowledge Graph using a custom connector that synchronizes entities and relationships. Uses Neo4j Bolt driver with connection pooling for efficient graph operations.'}
                        {feature.id === 'feature-5002' && 'Implements batch processing using adaptive batching algorithm with dynamic sizing based on resource monitoring. Uses priority queues with Redis Sorted Sets for efficient batch management and work distribution.'}
                        {feature.id === 'feature-5003' && 'Implements circuit breaker pattern using a state machine with closed, open, and half-open states. Configurable thresholds and fallbacks are defined per service integration point with custom recovery strategies.'}
                        {feature.id === 'feature-5004' && 'Multi-tiered caching system using memory (LRU), Redis, and disk storage with consistent hashing for distributed cache implementation. Implements TTL-based invalidation with bloom filters for efficient cache miss detection.'}
                        {feature.id === 'feature-5005' && 'Parallel execution engine using asyncio task groups with dependency analysis. Built on a custom scheduler that performs topological sorting of the step dependency graph to maximize parallelization opportunities.'}
                        {feature.id === 'feature-5006' && 'Checkpointing system using serialized workflow state snapshots with optionally encrypted storage. Implements efficient delta-based checkpointing to minimize storage requirements for incremental state changes.'}
                        {feature.id === 'feature-5007' && 'JSON Schema validation system with pluggable validators and runtime schema registration. Implements a schema registry for workflow definitions with version tracking and backward compatibility verification.'}
                        {feature.id === 'feature-5008' && 'Comprehensive logging using structured event format (JSON) with OpenTelemetry integration. Implements context propagation across service boundaries for distributed tracing of workflow execution.'}
                        {feature.id === 'feature-5009' && 'D3.js visualization library with custom React components for workflow visualization. Implements real-time websocket updates for live execution tracking and interactive SVG-based workflow graphs.'}
                        {feature.id === 'feature-5010' && 'Performance analytics framework using OpenTelemetry for distributed tracing with custom exporters for Prometheus integration. Implements anomaly detection using statistical analysis of historical execution patterns.'}
                        {!feature.id.match(/1001|1002|1003|feature-50(0[1-9]|10)/) && 'Standard implementation following the agent architecture patterns. Registers with the agent system for discoverability.'}
                      </p>
                      <p className="italic text-gray-400 mt-2">
                        Last updated: {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="tasks" title="Tasks">
              <Card className="bg-gray-700 border-0">
                <Card.Body>
                  {/* Integrated TasksTab component from the Task Management system */}
                  <TasksTab feature={feature} />
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="dependencies" title="Dependencies">
              <Card className="bg-gray-700 border-0">
                <Card.Body>
                  <h5 className="text-white font-semibold mb-3">Dependencies</h5>
                  
                  {/* Dependency diagram/visualization */}
                  <div className="mb-4 bg-gray-800 p-4 rounded">
                    <div className="text-center mb-3">
                      <span className="text-gray-400 text-sm">Dependency Visualization</span>
                    </div>
                    
                    <div className="relative mx-auto" style={{ height: '180px', maxWidth: '500px' }}>
                      {/* Center node - this feature */}
                      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white rounded px-3 py-1 text-sm z-10 shadow-lg border border-blue-500">
                        {feature.name}
                      </div>
                      
                      {/* Dependencies - nodes that this feature depends on (positioned below) */}
                      <div className="absolute bottom-0 left-0 bg-gray-700 text-white rounded px-2 py-1 text-xs shadow border border-gray-600">
                        Core Infrastructure
                      </div>
                      <div className="absolute bottom-0 left-1/3 bg-gray-700 text-white rounded px-2 py-1 text-xs shadow border border-gray-600">
                        {feature.id.includes('100') ? 'Data Storage' : 
                          feature.id.includes('200') ? 'UI Framework' : 
                          feature.id.includes('300') ? 'API System' : 'Test Runner'}
                      </div>
                      <div className="absolute bottom-0 right-1/3 bg-gray-700 text-white rounded px-2 py-1 text-xs shadow border border-gray-600">
                        {feature.id.includes('100') ? 'Authentication' : 
                          feature.id.includes('200') ? 'Component System' : 
                          feature.id.includes('300') ? 'Schema Registry' : 'Test Fixtures'}
                      </div>
                      
                      {/* Connecting lines - dependencies */}
                      <div className="absolute bottom-[28px] left-[30px] w-[100px] h-[80px] border-l-2 border-b-2 border-gray-600 rounded-bl-lg"></div>
                      <div className="absolute bottom-[28px] left-1/3 translate-x-[20px] h-[60px] border-l-2 border-gray-600"></div>
                      <div className="absolute bottom-[28px] right-1/3 translate-x-[-20px] h-[60px] border-l-2 border-gray-600"></div>
                      
                      {/* Dependents - nodes that depend on this feature (positioned above) */}
                      <div className="absolute top-0 left-1/4 bg-purple-600 text-white rounded px-2 py-1 text-xs shadow border border-purple-500">
                        {feature.id.includes('100') ? 'Agent System' : 
                          feature.id.includes('200') ? 'UI Dashboard' : 
                          feature.id.includes('300') ? 'Integration Service' : 'System Validation'}
                      </div>
                      <div className="absolute top-0 right-1/4 bg-purple-600 text-white rounded px-2 py-1 text-xs shadow border border-purple-500">
                        {feature.id.includes('100') ? 'Knowledge Service' : 
                          feature.id.includes('200') ? 'Activity Monitor' : 
                          feature.id.includes('300') ? 'API Gateway' : 'CI Pipeline'}
                      </div>
                      
                      {/* Connecting lines - dependents */}
                      <div className="absolute top-[28px] left-1/4 translate-x-[20px] h-[60px] border-l-2 border-purple-600"></div>
                      <div className="absolute top-[28px] right-1/4 translate-x-[-20px] h-[60px] border-l-2 border-purple-600"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h6 className="text-white font-medium mb-2 pb-1 border-b border-gray-600">Required By</h6>
                      <div className="space-y-2">
                        <div className="bg-gray-800 p-2 rounded text-sm">
                          <div className="font-medium text-purple-400 mb-1">
                            {feature.id.includes('100') ? 'Agent System' : 
                              feature.id.includes('200') ? 'UI Dashboard' : 
                              feature.id.includes('300') ? 'Integration Service' : 'System Validation'}
                          </div>
                          <div className="text-gray-300">
                            {feature.id.includes('100') ? 'Core agent execution environment' : 
                              feature.id.includes('200') ? 'User interface for monitoring' : 
                              feature.id.includes('300') ? 'External system integration' : 'System test framework'}
                          </div>
                        </div>
                        
                        <div className="bg-gray-800 p-2 rounded text-sm">
                          <div className="font-medium text-purple-400 mb-1">
                            {feature.id.includes('100') ? 'Knowledge Service' : 
                              feature.id.includes('200') ? 'Activity Monitor' : 
                              feature.id.includes('300') ? 'API Gateway' : 'CI Pipeline'}
                          </div>
                          <div className="text-gray-300">
                            {feature.id.includes('100') ? 'Agent knowledge management' : 
                              feature.id.includes('200') ? 'Activity tracking system' : 
                              feature.id.includes('300') ? 'API routing and management' : 'Continuous integration system'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h6 className="text-white font-medium mb-2 pb-1 border-b border-gray-600">Depends On</h6>
                      <div className="space-y-2">
                        <div className="bg-gray-800 p-2 rounded text-sm">
                          <div className="font-medium text-blue-400 mb-1">Core Infrastructure</div>
                          <div className="text-gray-300">Foundation systems and utilities</div>
                          <div className="mt-1">
                            <Badge bg="secondary" className="text-xs me-1">Required</Badge>
                            <Badge bg="success" className="text-xs">Available</Badge>
                          </div>
                        </div>
                        
                        <div className="bg-gray-800 p-2 rounded text-sm">
                          <div className="font-medium text-blue-400 mb-1">
                            {feature.id.includes('100') ? 'Data Storage' : 
                              feature.id.includes('200') ? 'UI Framework' : 
                              feature.id.includes('300') ? 'API System' : 'Test Runner'}
                          </div>
                          <div className="text-gray-300">
                            {feature.id.includes('100') ? 'Persistent data storage services' : 
                              feature.id.includes('200') ? 'React component framework' : 
                              feature.id.includes('300') ? 'API definition system' : 'Test execution environment'}
                          </div>
                          <div className="mt-1">
                            <Badge bg="secondary" className="text-xs me-1">Required</Badge>
                            <Badge bg="success" className="text-xs">Available</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="testing" title="Testing">
              <Card className="bg-gray-700 border-0">
                <Card.Body>
                  <h5 className="text-white font-semibold mb-3">Testing & Quality</h5>
                  
                  {/* Test metrics dashboard */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-gray-400 text-xs mb-1">Test Coverage</div>
                      <div className="flex items-center">
                        <div className="text-xl font-bold text-white mr-2">
                          {feature.id.includes('1001') ? '82' : 
                           feature.id.includes('1002') ? '78' : 
                           feature.id.includes('1003') ? '75' : 
                           feature.id.includes('2001') ? '68' : 
                           feature.id.includes('3001') ? '72' : '70'}%
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ 
                              width: feature.id.includes('1001') ? '82%' : 
                                     feature.id.includes('1002') ? '78%' : 
                                     feature.id.includes('1003') ? '75%' : 
                                     feature.id.includes('2001') ? '68%' : 
                                     feature.id.includes('3001') ? '72%' : '70%' 
                            }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-gray-400 text-xs mb-1">Test Count</div>
                      <div className="text-xl font-bold text-white">
                        {feature.id.includes('100') ? '24' : 
                         feature.id.includes('200') ? '18' : 
                         feature.id.includes('300') ? '16' : '12'} tests
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-gray-400 text-xs mb-1">Last Run</div>
                      <div className="text-md font-bold text-white">
                        {new Date().toLocaleDateString()}
                      </div>
                      <div className="text-green-400 text-xs">
                        All tests passing
                      </div>
                    </div>
                  </div>
                  
                  {/* Test suite summary */}
                  <div className="mb-4">
                    <h6 className="text-white font-medium mb-2">Test Suites</h6>
                    <div className="bg-gray-800 rounded">
                      <div className="border-b border-gray-700 py-2 px-3 flex items-center">
                        <div className="w-8 flex-shrink-0">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="text-white">Unit Tests</span>
                            <span className="text-xs text-gray-400 ml-2">
                              ({feature.id.includes('100') ? '15' : 
                                feature.id.includes('200') ? '12' : 
                                feature.id.includes('300') ? '10' : '8'} tests)
                            </span>
                          </div>
                          <div className="text-green-400 text-sm">Passing</div>
                        </div>
                      </div>
                      
                      <div className="border-b border-gray-700 py-2 px-3 flex items-center">
                        <div className="w-8 flex-shrink-0">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="text-white">Integration Tests</span>
                            <span className="text-xs text-gray-400 ml-2">
                              ({feature.id.includes('100') ? '6' : 
                                feature.id.includes('200') ? '4' : 
                                feature.id.includes('300') ? '4' : '2'} tests)
                            </span>
                          </div>
                          <div className="text-green-400 text-sm">Passing</div>
                        </div>
                      </div>
                      
                      <div className="py-2 px-3 flex items-center">
                        <div className="w-8 flex-shrink-0">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="text-white">End-to-End Tests</span>
                            <span className="text-xs text-gray-400 ml-2">
                              ({feature.id.includes('100') ? '3' : 
                                feature.id.includes('200') ? '2' : 
                                feature.id.includes('300') ? '2' : '2'} tests)
                            </span>
                          </div>
                          <div className="text-green-400 text-sm">Passing</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sample test code */}
                  <div>
                    <h6 className="text-white font-medium mb-2">Test Example</h6>
                    <div className="bg-gray-800 p-3 rounded font-mono text-sm text-gray-300 overflow-x-auto">
                      {feature.id.includes('1001') && (
                        <pre>
{`// Schema validation tests
import { KnowledgeNode, Relationship } from '../models/schema';
import mongoose from 'mongoose';

describe('Database Schema', () => {
  beforeAll(async () => {
    // Use a hardcoded value for development
    await mongoose.connect('mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('should create knowledge node with required fields', async () => {
    const node = new KnowledgeNode({
      type: 'concept',
      name: 'TestConcept'
    });
    
    const savedNode = await node.save();
    expect(savedNode.nodeId).toBeDefined();
    expect(savedNode.name).toBe('TestConcept');
    expect(savedNode.createdAt instanceof Date).toBe(true);
  });
  
  test('should require name field', async () => {
    const node = new KnowledgeNode({
      type: 'concept'
    });
    
    await expect(node.save()).rejects.toThrow();
  });
  
  test('should enforce enum values for type field', async () => {
    const node = new KnowledgeNode({
      type: 'invalid-type',
      name: 'Test'
    });
    
    await expect(node.save()).rejects.toThrow();
  });
});`}
                        </pre>
                      )}
                      {feature.id.includes('1002') && (
                        <pre>
{`// Redis Pub/Sub tests
import { MessageBus } from '../services/message-bus';
import Redis from 'ioredis-mock';
jest.mock('ioredis', () => require('ioredis-mock'));

describe('MessageBus', () => {
  let messageBus;
  
  beforeEach(() => {
    messageBus = new MessageBus({
      redisUrl: 'redis://localhost:6379',
      clientId: 'test-client'
    });
  });
  
  afterEach(() => {
    messageBus.close();
  });
  
  test('should publish and receive messages', (done) => {
    const channel = 'test-channel';
    const testData = { message: 'test message' };
    
    messageBus.subscribe(channel);
    
    messageBus.on(channel, (data) => {
      expect(data.message).toBe(testData.message);
      expect(data.senderId).toBe('different-client');
      expect(data.timestamp).toBeDefined();
      done();
    });
    
    // Mock a message coming from a different client
    const message = JSON.stringify({
      ...testData,
      senderId: 'different-client',
      timestamp: Date.now()
    });
    
    // Simulate Redis publishing a message
    messageBus.subscriber.emit('message', channel, message);
  });
  
  test('should not process own messages', (done) => {
    const channel = 'test-channel';
    let messageReceived = false;
    
    messageBus.subscribe(channel);
    
    messageBus.on(channel, () => {
      messageReceived = true;
    });
    
    // Mock a message coming from the same client
    const message = JSON.stringify({
      message: 'own message',
      senderId: 'test-client',
      timestamp: Date.now()
    });
    
    // Simulate Redis publishing a message
    messageBus.subscriber.emit('message', channel, message);
    
    // Wait a bit to ensure the event handler would have been called
    setTimeout(() => {
      expect(messageReceived).toBe(false);
      done();
    }, 100);
  });
});`}
                        </pre>
                      )}
                      {!feature.id.match(/1001|1002/) && (
                        <pre>
{`// Test for ${feature.name}
import ${feature.name.replace(/\s/g, '')} from '../features/${feature.name.replace(/\s/g, '').toLowerCase()}';
import { AgentSystem } from '../core/agent-system';

// Mock the agent system
jest.mock('../core/agent-system', () => ({
  AgentSystem: {
    getInstance: jest.fn().mockReturnValue({
      registerComponent: jest.fn().mockResolvedValue(true)
    })
  }
}));

describe('${feature.name}', () => {
  let instance;
  const mockConfig = { 
    apiKey: 'test-key',
    environment: 'testing'
  };
  
  beforeEach(() => {
    instance = new ${feature.name.replace(/\s/g, '')}(mockConfig);
  });
  
  test('should initialize correctly', async () => {
    const result = await instance.initialize();
    
    expect(result).toBe(true);
    expect(instance.status).toBe('ready');
    expect(AgentSystem.getInstance().registerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '${feature.id}',
        name: '${feature.name}'
      })
    );
  });
  
  test('should handle initialization errors', async () => {
    // Mock error during registration
    AgentSystem.getInstance().registerComponent.mockRejectedValueOnce(
      new Error('Registration failed')
    );
    
    await expect(instance.initialize()).rejects.toThrow('Registration failed');
    expect(instance.status).toBe('error');
  });
});`}
                        </pre>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </div>
        
        <div className="bg-gray-900 p-3 flex justify-between items-center">
          <div className="space-x-2">
            <Button 
              variant="outline-light" 
              size="sm"
              className="border-0 text-gray-300 hover:text-white" 
              onClick={() => alert('Feature details copied to clipboard')}
            >
              <span className="me-1">📋</span> Copy
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="px-3" 
              onClick={() => alert('Feature operations menu would appear here')}
            >
              Actions
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status dropdown using Bootstrap Dropdown component */}
            <Dropdown className="status-dropdown-container" align="end">
              <Dropdown.Toggle 
                variant={getStatusVariant(editableFeature.status)}
                size="sm"
                id="status-dropdown"
                className="px-3 py-1"
              >
                Status: {statusDisplay}
              </Dropdown.Toggle>

              <Dropdown.Menu className="bg-gray-800 border-gray-700">
                <Dropdown.Item 
                  className={`text-white ${editableFeature.status === 'not_started' ? 'bg-gray-700' : 'bg-gray-800'} hover:bg-gray-700`}
                  onClick={() => handleStatusChange('not_started')}
                >
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-secondary me-2" style={{ width: '10px', height: '10px' }}></div>
                    Not Started
                  </div>
                </Dropdown.Item>
                
                <Dropdown.Item 
                  className={`text-white ${editableFeature.status === 'in_progress' ? 'bg-gray-700' : 'bg-gray-800'} hover:bg-gray-700`}
                  onClick={() => handleStatusChange('in_progress')}
                >
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-primary me-2" style={{ width: '10px', height: '10px' }}></div>
                    In Progress
                  </div>
                </Dropdown.Item>
                
                <Dropdown.Item 
                  className={`text-white ${editableFeature.status === 'blocked' ? 'bg-gray-700' : 'bg-gray-800'} hover:bg-gray-700`}
                  onClick={() => handleStatusChange('blocked')}
                >
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-warning me-2" style={{ width: '10px', height: '10px' }}></div>
                    Blocked
                  </div>
                </Dropdown.Item>
                
                <Dropdown.Item 
                  className={`text-white ${editableFeature.status === 'completed' ? 'bg-gray-700' : 'bg-gray-800'} hover:bg-gray-700`}
                  onClick={() => handleStatusChange('completed')}
                >
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-success me-2" style={{ width: '10px', height: '10px' }}></div>
                    Completed
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Button 
              variant="secondary" 
              size="sm"
              className="px-3 bg-gray-700" 
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureDetailsModal;