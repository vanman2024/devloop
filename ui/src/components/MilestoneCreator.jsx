import React, { useState } from 'react';
import axios from 'axios';

/**
 * MilestoneCreator component
 * 
 * A form component for creating new milestones using the create_milestone.py script
 * with integrated chat functionality
 */
const MilestoneCreator = ({ onClose, onSuccess }) => {
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    phases: 4,
    useAiStructure: true,
    useAiDescription: true,
    dryRun: false,
    force: true,
    skipRegistry: false,
    skipDashboard: false,
    skipRoadmap: false,
    dependencies: {}
  });
  
  // Form state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showChatAssistant, setShowChatAssistant] = useState(true); // Default to showing chat assistant
  const [chatMessages, setChatMessages] = useState([
    { role: 'system', content: 'I can help you create a well-structured milestone. Ask me any questions about milestone creation or organization.' },
    { role: 'assistant', content: 'Welcome to the Milestone Creator AI Assistant! I can help you create a well-structured milestone with proper organization. You can either fill in the form manually or ask me to help generate parts of it. What kind of milestone would you like to create today?' }
  ]);
  const [messageInput, setMessageInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Function for AI-assisted complete milestone creation
  const createMilestoneWithAI = async () => {
    setIsChatLoading(true);
    
    try {
      // Create a milestone request prompt
      const message = `Please create a complete milestone based on my current inputs:
Name: ${formData.name || "[Not specified]"}
Description: ${formData.description || "[Not specified]"}
Phases: ${formData.phases}

Please analyze this information and suggest a complete milestone with:
1. A proper milestone ID following the convention milestone-name
2. Detailed description of purpose
3. Appropriate number of phases with recommended phase goals`;

      // Add user message to chat
      setChatMessages(prev => [...prev, { role: 'user', content: message }]);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock AI response (in a real implementation, this would call an actual API)
      const milestoneId = `milestone-${formData.name.toLowerCase().replace(/[^\w]+/g, '-') || 'new-milestone'}`;
      
      const aiResponse = `I've analyzed your request and created a comprehensive milestone:

## Milestone Details
- **ID**: ${milestoneId}
- **Name**: ${formData.name || "New Milestone"}
- **Phases**: ${formData.phases}

## Description
${formData.description || "This milestone encompasses a key area of system functionality, organized into logical phases with clear goals and deliverables."} 

## Recommended Phase Structure
${generatePhaseStructure(formData.phases)}

Would you like me to apply these recommendations to your form? Or would you like to modify any aspect of this milestone?`;

      // Add AI response to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      
      // Auto-fill the milestone ID if it's not already set
      if (!formData.id) {
        setFormData(prev => ({ ...prev, id: milestoneId }));
      }
      
      // Ensure scroll to bottom after AI response
      setTimeout(scrollToBottom, 100);
      
    } catch (error) {
      console.error('Error in AI milestone creation:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error creating the milestone. Please try again or fill in the form manually." 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  // Helper function to generate phase structure based on number of phases
  const generatePhaseStructure = (numPhases) => {
    const phaseTemplates = [
      "Phase 1: Core Infrastructure - Foundation components and basic architecture",
      "Phase 2: Feature Implementation - Main functionality and user-facing components",
      "Phase 3: Integration - Connection with other system components and data flow",
      "Phase 4: Testing & Validation - Comprehensive testing and quality assurance",
      "Phase 5: Deployment & Documentation - Release preparation and user documentation",
      "Phase 6: Maintenance & Optimization - Performance tuning and bug fixes"
    ];
    
    return phaseTemplates.slice(0, numPhases).join("\n");
  };
  
  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    const chatEnd = document.getElementById('milestoneChatEnd');
    if (chatEnd) {
      chatEnd.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Handle chat message submission
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: messageInput };
    setChatMessages(prev => [...prev, userMessage]);
    setMessageInput('');
    setIsChatLoading(true);
    
    try {
      // Call AI assistant API - this would typically be replaced with your actual API
      // For now, we'll simulate a response based on the message content
      let assistantResponse = "I'm analyzing your request...";
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if this is a milestone creation request
      const message = messageInput.toLowerCase();
      if (message.includes('create') && (message.includes('milestone') || message.includes('new milestone'))) {
        // This is a milestone creation request - check if we have enough info or need to ask for more
        if (message.length > 25 && (message.includes('for') || message.includes('that') || message.includes('which'))) {
          // The request includes some description, likely enough to generate a milestone
          await createMilestoneWithAI();
          return;
        } else {
          // Not enough info, ask for more details
          assistantResponse = "I'd be happy to help you create a new milestone. To get started, could you tell me more about:\n\n1. The purpose of this milestone\n2. What functionality it will include\n3. How many phases you think it should have\n\nThe more details you provide, the better I can help organize the milestone properly.";
        }
      } 
      // Handle field-specific questions
      else if (message.includes('phase') || message.includes('phases')) {
        assistantResponse = "Phases represent distinct stages of your milestone. Most milestones have 3-5 phases, with each phase focusing on a specific aspect of development.\n\nTypical phase structure:\n- Phase 1: Core infrastructure and foundation\n- Phase 2: Primary feature implementation\n- Phase 3: Integration with other components\n- Phase 4: Testing and validation\n- Phase 5: Deployment and documentation\n\nThe number of phases should reflect the complexity and scope of your milestone. What are you trying to accomplish with this milestone?";
      } else if (message.includes('dependency') || message.includes('dependencies')) {
        assistantResponse = "Dependencies track relationships between features. They ensure that features are built in the correct order. When creating a milestone, consider which features depend on others and organize them accordingly.\n\nThe system automatically tracks these dependencies in the feature registry, which helps with:\n\n1. Feature ordering in development\n2. Status propagation (blocked features)\n3. Impact analysis for changes\n4. Documentation of feature relationships\n\nWould you like to learn more about dependency management in the Devloop system?";
      } else if (message.includes('registry') || message.includes('roadmap')) {
        assistantResponse = "The feature registry and roadmap are automatically updated when you create a new milestone. This ensures your milestone is properly integrated with the project's planning tools.\n\nThese updates include:\n1. Adding the milestone to the registry\n2. Updating the roadmap visualization\n3. Creating proper relationships with features\n4. Setting up status tracking\n\nYou can disable these updates in the advanced options if needed, but it's generally recommended to keep them enabled for proper system integration.";
      } else if (message.includes('naming') || message.includes('name') || message.includes('id')) {
        assistantResponse = "Milestone naming convention: milestone-name\nWhere:\n- name is a lowercase, hyphen-separated description of the milestone\n\nExamples:\n- milestone-auth-system\n- milestone-ui-dashboard\n- milestone-api-integration\n\nChoose names that clearly describe the purpose of the milestone. Avoid generic names like \"milestone-m1\" as they don't provide useful information about the milestone's purpose or content.";
      } else if (message.includes('structure') || message.includes('organization')) {
        assistantResponse = "A well-structured milestone typically includes:\n\n1. Clear phases with focused goals\n2. Properly organized features within each phase\n3. Features grouped into logical modules\n4. Dependencies tracked between features\n5. Integration with the system roadmap\n\nThe AI structure generation can help you create this organization automatically by analyzing your milestone description and suggesting optimal organization.\n\nWould you like to use AI to generate a complete structure for your milestone?";
      } else if (message.includes('best practice') || message.includes('recommend')) {
        assistantResponse = "Best practices for milestone creation:\n\n1. Use descriptive milestone IDs (e.g., 'milestone-auth-system' not 'milestone-m1')\n2. Include comprehensive descriptions\n3. Enable AI structure generation for optimal organization\n4. Consider dependencies between features\n5. Use 3-5 phases for most milestones\n6. Ensure each phase has a clear, focused goal\n7. Check for similar existing milestones to avoid duplication\n8. Align with the overall project roadmap\n\nWould you like me to analyze your current milestone for compliance with these best practices?";
      } else if (message.includes('example')) {
        assistantResponse = "Example milestone structure:\n\nID: milestone-auth-system\nName: Authentication System\nDescription: Implements secure user authentication with multiple providers\nPhases: 4\n\nThis would create a milestone with:\n- Phase 1: Core infrastructure (auth database, user models)\n- Phase 2: Authentication providers (OAuth, email/password)\n- Phase 3: User management (profiles, permissions)\n- Phase 4: Integration and testing (API integration, security testing)\n\nWould you like me to help you create a similar structure for your milestone? Just say \"Create a milestone for [your description]\" and I'll generate a complete milestone.";
      } else if (message.includes('help') || message.includes('assist') || message.includes('how')) {
        assistantResponse = "I can help you create a well-structured milestone in several ways:\n\n1. **Complete milestone creation**: Tell me what you want to build, and I can generate the entire structure\n2. **Field-specific assistance**: Ask about any field (name, ID, phases, etc.)\n3. **Best practices**: Ask for recommendations on milestone organization\n4. **Examples**: Request sample milestones to use as templates\n\nYou can fill the form manually, or use the AI to automate parts of the process. What specific help do you need with your milestone creation?";
      } else {
        assistantResponse = "I can help you create a well-structured milestone. Here are some things you can ask me about:\n\n- Creating a complete milestone with AI assistance\n- Naming conventions and ID formats\n- Phase structure and organization\n- Best practices for milestone creation\n- Roadmap and registry integration\n- Dependencies between features\n- Example milestone structures\n\nOr simply say \"Create a milestone for...\" followed by a description, and I'll generate a complete milestone for you!";
      }
      
      // Add assistant response to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);
      
      // Ensure scroll to bottom after message is added
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error in chat:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error processing your request. Please try again." 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  // Handle chat message input keypress
  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    const chatEnd = document.getElementById('milestoneChatEnd');
    if (chatEnd) {
      chatEnd.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    
    try {
      // Prepare data for the API
      const apiData = {
        ...formData,
        phases: parseInt(formData.phases, 10)
      };
      
      // Call the milestone creation API
      const response = await axios.post('/api/milestones/create', apiData);
      
      // Handle the response
      setResult(response.data);
      
      // If not a dry run and successful, trigger the success callback
      if (!formData.dryRun && response.data.success) {
        if (typeof onSuccess === 'function') {
          onSuccess(response.data);
        }
      }
    } catch (error) {
      console.error('Error creating milestone:', error);
      setError(error.response?.data?.message || error.message || 'Failed to create milestone');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle cancellation
  const handleCancel = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCancel}></div>
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-lg shadow-lg w-[90%] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-700">
        <div className="bg-gray-700 px-4 py-3 flex justify-between items-center rounded-t-lg">
          <h2 className="font-semibold text-xl text-white">Create New Milestone</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowChatAssistant(!showChatAssistant)}
              className={`text-sm px-3 py-1 rounded-md ${showChatAssistant ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
            >
              {showChatAssistant ? 'Hide Assistant' : 'Show Assistant'}
            </button>
            <button 
              onClick={handleCancel}
              className="text-white hover:text-gray-200 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Main Form Area */}
          <div className={`${showChatAssistant ? 'w-1/2' : 'w-full'} overflow-y-auto bg-[#1a2233] p-4`}>
            {error && (
              <div className="p-3 mb-4 bg-red-900/50 border border-red-700 rounded-md text-red-200">
                {error}
              </div>
            )}
            
            {result && (
              <div className={`p-4 mb-4 rounded-md ${result.success ? 'bg-green-900/30 border border-green-700 text-green-200' : 'bg-red-900/50 border border-red-700 text-red-200'}`}>
                <h3 className="text-lg font-semibold mb-2">{result.success ? 'Milestone Creation Successful' : 'Milestone Creation Failed'}</h3>
                <p className="mb-3">{result.message}</p>
                
                {result.success && result.milestone_id && (
                  <div>
                    <p className="mb-2">Milestone ID: <span className="font-mono bg-gray-800/50 px-1 rounded">{result.milestone_id}</span></p>
                    {result.next_steps && (
                      <div>
                        <h4 className="font-medium mt-3 mb-2">Next Steps:</h4>
                        <pre className="bg-gray-900 p-3 rounded-md overflow-auto text-xs">{result.next_steps}</pre>
                      </div>
                    )}
                  </div>
                )}
                
                {formData.dryRun && result.success && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="mb-3">This was a dry run. No changes were made.</p>
                    <button 
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 transition-colors rounded-md text-white"
                      onClick={() => {
                        setFormData({...formData, dryRun: false});
                        setResult(null);
                      }}
                    >
                      Create For Real
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {!result && (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="id" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Milestone ID:</label>
                  <input
                    type="text"
                    id="id"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="milestone-name"
                    required
                    className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  />
                  <small className="block mt-1 text-xs text-gray-400">e.g., milestone-ui-feature, milestone-api-service</small>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="name" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Milestone Name:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Milestone Name"
                    required
                    className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="description" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Description:</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Milestone description (optional)"
                    rows="3"
                    className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="phases" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Number of Phases:</label>
                  <input
                    type="number"
                    id="phases"
                    name="phases"
                    value={formData.phases}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  />
                </div>
                
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800 mb-4">
                  <div className="flex items-center text-blue-300 mb-2">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-medium">AI Integration Options</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center text-sm text-white">
                        <input
                          type="checkbox"
                          name="useAiStructure"
                          checked={formData.useAiStructure}
                          onChange={handleChange}
                          className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-0"
                        />
                        <span className="ml-2">Use AI to generate structure</span>
                      </label>
                      <button 
                        type="button"
                        className="text-xs text-blue-400 underline hover:text-blue-300"
                        onClick={() => {
                          setMessageInput("Tell me about AI structure generation");
                          setShowChatAssistant(true);
                          handleSendMessage();
                        }}
                      >
                        Learn more
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center text-sm text-white">
                        <input
                          type="checkbox"
                          name="useAiDescription"
                          checked={formData.useAiDescription}
                          onChange={handleChange}
                          className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-0"
                        />
                        <span className="ml-2">Use AI to generate description (if not provided)</span>
                      </label>
                      <button 
                        type="button"
                        className="text-xs text-blue-400 underline hover:text-blue-300"
                        onClick={() => {
                          setMessageInput("How does AI description generation work?");
                          setShowChatAssistant(true);
                          handleSendMessage();
                        }}
                      >
                        Learn more
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="dryRun"
                      checked={formData.dryRun}
                      onChange={handleChange}
                      className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-0"
                    />
                    <span className="ml-2 text-white text-sm">Dry Run (simulate without changes)</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <button 
                    type="button" 
                    className="text-[rgba(255,255,255,0.6)] hover:text-white text-sm"
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  >
                    {isAdvancedOpen ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
                  </button>
                  
                  {isAdvancedOpen && (
                    <div className="mt-2 p-3 bg-[#121c2e] rounded-md">
                      <div className="mb-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            name="force"
                            checked={formData.force}
                            onChange={handleChange}
                            className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-0"
                          />
                          <span className="ml-2 text-white text-sm">Force overwrite if exists</span>
                        </label>
                      </div>
                      
                      <div className="mb-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            name="skipRegistry"
                            checked={formData.skipRegistry}
                            onChange={handleChange}
                            className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-0"
                          />
                          <span className="ml-2 text-white text-sm">Skip feature registry updates</span>
                        </label>
                      </div>
                      
                      <div className="mb-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            name="skipDashboard"
                            checked={formData.skipDashboard}
                            onChange={handleChange}
                            className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-0"
                          />
                          <span className="ml-2 text-white text-sm">Skip dashboard updates</span>
                        </label>
                      </div>
                      
                      <div className="mb-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            name="skipRoadmap"
                            checked={formData.skipRoadmap}
                            onChange={handleChange}
                            className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-0"
                          />
                          <span className="ml-2 text-white text-sm">Skip roadmap updates</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : formData.dryRun ? 'Simulate Creation' : 'Create Milestone'}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* Chat Assistant Area */}
          {showChatAssistant && (
            <div className="w-1/2 border-l border-gray-700 flex flex-col h-full bg-gray-800">
              <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-white">AI Milestone Assistant</h3>
                  <p className="text-xs text-gray-400">Ask questions about milestone creation and organization</p>
                </div>
                <button
                  onClick={createMilestoneWithAI}
                  className="text-sm px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition"
                  disabled={isChatLoading}
                >
                  AI Create Milestone
                </button>
              </div>
              
              <div id="milestoneChatContainer" className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-15rem)]">
                <div className="chat-messages min-h-full">
                  {chatMessages.map((message, index) => (
                    message.role !== 'system' && (
                      <div 
                        key={index} 
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-[#1e293b] text-gray-200'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                        </div>
                      </div>
                    )
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start mb-3">
                      <div className="max-w-[80%] rounded-lg p-3 bg-[#1e293b] text-gray-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-100"></div>
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div id="milestoneChatEnd" ref={el => el && chatMessages.length > 0 && el.scrollIntoView({ behavior: 'smooth' })}></div>
                </div>
              </div>
              
              <div className="p-3 border-t border-gray-700">
                <div className="flex">
                  <textarea
                    className="flex-1 bg-[#1a2233] border border-gray-700 rounded-l-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
                    placeholder="Ask about milestone creation..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleMessageKeyPress}
                    rows="2"
                  ></textarea>
                  <button
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-r-md transition disabled:opacity-50"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isChatLoading}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex justify-between">
                  <div className="flex space-x-2">
                    <button 
                      className="text-xs text-blue-400 hover:text-blue-300" 
                      onClick={() => {
                        setMessageInput("What are best practices for milestone creation?");
                        handleSendMessage();
                      }}
                    >
                      Best practices
                    </button>
                    <button 
                      className="text-xs text-blue-400 hover:text-blue-300"
                      onClick={() => {
                        setMessageInput("Show me an example milestone structure");
                        handleSendMessage();
                      }}
                    >
                      Example structure
                    </button>
                  </div>
                  <button 
                    className="text-xs text-gray-400 hover:text-gray-300"
                    onClick={() => {
                      setChatMessages([
                        { role: 'system', content: 'I can help you create a well-structured milestone. Ask me any questions about milestone creation or organization.' }
                      ]);
                    }}
                  >
                    Clear chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilestoneCreator;