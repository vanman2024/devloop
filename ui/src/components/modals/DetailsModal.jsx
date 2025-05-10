import React, { useState, useEffect } from 'react';
import TasksTab from '../tasks/TasksTab';

const DetailsModal = ({ isOpen, onClose, feature, initialTab = 'implementation' }) => {
  // Debug log for details modal render
  console.log('DetailsModal rendering with feature:', feature, 'initialTab:', initialTab);
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Update active tab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      console.log('Updating active tab to:', initialTab);
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  if (!isOpen || !feature) return null;

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  // Format the data for display
  const statusDisplay = feature.status.charAt(0).toUpperCase() + feature.status.slice(1).replace('-', ' ');
  const formattedDate = new Date(feature.lastUpdated).toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-lg w-[800px] h-[600px] flex flex-col overflow-hidden border border-gray-700">
        <div className="bg-gray-700 px-4 py-3 flex justify-between items-center rounded-t-lg">
          <div className="font-semibold text-xl text-white">Feature Details: {feature.name}</div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Feature Information Section */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 rounded-sm bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
                📋
              </div>
              <h3 className="text-lg font-semibold">Feature Information</h3>
            </div>
            
            <div className="bg-gray-900 p-4 rounded-md mb-4">
              <p className="text-gray-300">{feature.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 p-3 rounded-md">
                <div className="text-xs text-gray-400 mb-1">ID</div>
                <div className="text-sm text-white">{feature.id}</div>
              </div>
              <div className="bg-gray-900 p-3 rounded-md">
                <div className="text-xs text-gray-400 mb-1">Status</div>
                <div className="text-sm text-white">{statusDisplay}</div>
              </div>
              <div className="bg-gray-900 p-3 rounded-md">
                <div className="text-xs text-gray-400 mb-1">Module</div>
                <div className="text-sm text-white">{feature.module}</div>
              </div>
              <div className="bg-gray-900 p-3 rounded-md">
                <div className="text-xs text-gray-400 mb-1">Phase</div>
                <div className="text-sm text-white">{feature.phase}</div>
              </div>
              <div className="bg-gray-900 p-3 rounded-md">
                <div className="text-xs text-gray-400 mb-1">Milestone</div>
                <div className="text-sm text-white">{feature.milestone}</div>
              </div>
              <div className="bg-gray-900 p-3 rounded-md">
                <div className="text-xs text-gray-400 mb-1">Last Updated</div>
                <div className="text-sm text-white">{formattedDate}</div>
              </div>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-700 mb-4">
            <button 
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'implementation' 
                  ? 'text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => handleTabClick('implementation')}
            >
              Implementation
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'dependencies' 
                  ? 'text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => handleTabClick('dependencies')}
            >
              Dependencies
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'tasks' 
                  ? 'text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => handleTabClick('tasks')}
            >
              Tasks
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'tests' 
                  ? 'text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => handleTabClick('tests')}
            >
              Tests
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'documentation' 
                  ? 'text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => handleTabClick('documentation')}
            >
              Documentation
            </button>
          </div>
          
          {/* Tab Content */}
          {activeTab === 'implementation' && (
            <div>
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 rounded-sm bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
                  💻
                </div>
                <h3 className="text-lg font-semibold">Implementation Details</h3>
              </div>
              <pre className="bg-gray-900 p-4 rounded-md font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre">
{`# Example implementation code for ${feature.name}
def initialize_model(config_path):
    """Initialize AI model with configuration."""
    try:
        config = load_config(config_path)
        validate_config(config)
        
        # Initialize model components
        tokenizer = initialize_tokenizer(config)
        engine = initialize_engine(config)
        pipeline = create_pipeline(tokenizer, engine)
        
        return ModelInstance(pipeline, config)
    except ConfigError as e:
        log_error(f"Configuration error: {e}")
        raise`}
              </pre>
            </div>
          )}
          
          {activeTab === 'dependencies' && (
            <div>
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 rounded-sm bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
                  🔗
                </div>
                <h3 className="text-lg font-semibold">Dependencies</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full">
                  feature-4501-config-validation
                </div>
                <div className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full">
                  feature-4502-tokenizer-setup
                </div>
                <div className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full">
                  feature-4503-model-engine
                </div>
                <div className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full">
                  module-core
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'tests' && (
            <div>
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 rounded-sm bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
                  ✓
                </div>
                <h3 className="text-lg font-semibold">Test Coverage</h3>
              </div>
              <pre className="bg-gray-900 p-4 rounded-md font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre">
{`# Test cases for ${feature.name}
def test_initialize_model_with_valid_config():
    config_path = "test_configs/valid_config.json"
    model = initialize_model(config_path)
    assert model is not None
    assert model.pipeline is not None
    assert model.config["version"] == "1.0"

def test_initialize_model_with_invalid_config():
    config_path = "test_configs/invalid_config.json"
    with pytest.raises(ConfigError):
        initialize_model(config_path)`}
              </pre>
            </div>
          )}
          
          {activeTab === 'tasks' && (
            <TasksTab feature={feature} />
          )}
          
          {activeTab === 'documentation' && (
            <div>
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 rounded-sm bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
                  📚
                </div>
                <h3 className="text-lg font-semibold">Documentation</h3>
              </div>
              <div className="bg-gray-900 p-4 rounded-md text-gray-300">
                <h3 className="text-lg font-medium mb-2">{feature.name}</h3>
                <p className="mb-3">{feature.description}</p>
                
                <h4 className="text-md font-medium mb-2">Key Capabilities</h4>
                <ul className="list-disc pl-5 mb-3 space-y-1">
                  <li>Configuration loading from various sources (JSON, YAML)</li>
                  <li>Parameter validation with comprehensive error messages</li>
                  <li>Support for model versioning and backward compatibility</li>
                  <li>Memory-efficient initialization with lazy loading</li>
                </ul>
                
                <h4 className="text-md font-medium mb-2">Usage</h4>
                <p>Models can be initialized programmatically or through the command line interface.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;