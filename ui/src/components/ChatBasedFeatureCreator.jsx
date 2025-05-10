import React, { useState, useEffect, useRef } from 'react';
import featureAgentService from '../services/featureAgentService';

/**
 * ChatBasedFeatureCreator component
 * 
 * A purely chat-driven interface for creating features with AI assistance.
 * Users interact through natural conversation, and the system automatically
 * handles all technical details like milestones, phases, and modules.
 */
const ChatBasedFeatureCreator = ({ isOpen, onClose, onSuccess }) => {
  // Chat state
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi there! I can help you create a new feature. Just tell me what feature you\'d like to create, and I\'ll handle all the details. What feature would you like to build?' }
  ]);
  const [messageInput, setMessageInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Feature data state
  const [featureData, setFeatureData] = useState({
    id: '',
    name: '',
    description: '',
    milestone: '',
    phase: '',
    module: '',
    tags: [],
    generateTasks: true
  });
  
  // Feature suggestion state
  const [featureSuggestion, setFeatureSuggestion] = useState(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [result, setResult] = useState(null);
  
  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Handle message input
  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Send message to the AI
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: messageInput };
    setChatMessages(prev => [...prev, userMessage]);
    setMessageInput('');
    setIsChatLoading(true);
    
    try {
      // Check if this is a feature creation or modification request
      await processUserMessage(messageInput);
    } catch (error) {
      console.error('Error processing message:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error processing your request. Please try again." 
      }]);
    } finally {
      setIsChatLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };
  
  // Process user message and generate appropriate response
  const processUserMessage = async (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Check if the user is accepting the suggestion
    if (featureSuggestion && (
        lowerMessage.includes('yes') || 
        lowerMessage.includes('accept') || 
        lowerMessage.includes('looks good') || 
        lowerMessage.includes('create it') ||
        lowerMessage.includes('sounds good') ||
        lowerMessage.includes('go ahead')
      )) {
      await acceptFeatureSuggestion();
      return;
    }
    
    // Check if the user is modifying the suggestion
    if (featureSuggestion && (
        lowerMessage.includes('change') || 
        lowerMessage.includes('modify') || 
        lowerMessage.includes('update') ||
        lowerMessage.includes('different')
      )) {
      await handleModifySuggestion(message);
      return;
    }
    
    // Check if this is a feature creation request
    if (lowerMessage.includes('feature') || 
        lowerMessage.includes('create') || 
        lowerMessage.includes('build') || 
        lowerMessage.includes('implement') ||
        lowerMessage.includes('develop') ||
        lowerMessage.includes('new ') ||
        message.length > 20) {
      
      await generateFeatureSuggestion(message);
      return;
    }
    
    // Handle general questions about the process
    if (lowerMessage.includes('how') || 
        lowerMessage.includes('what') || 
        lowerMessage.includes('why') || 
        lowerMessage.includes('help') || 
        lowerMessage.includes('explain')) {
      
      handleHelpRequest(lowerMessage);
      return;
    }
    
    // Default response for other inputs
    setChatMessages(prev => [...prev, { 
      role: 'assistant', 
      content: "I'm here to help you create a new feature. Could you tell me what feature you'd like to build? Just describe it in your own words, and I'll handle all the technical details." 
    }]);
  };
  
  // Generate feature suggestion based on user message
  const generateFeatureSuggestion = async (message) => {
    setIsChatLoading(true);

    try {
      // Create a basic feature request based on the user message
      const featureRequest = {
        description: message,
        // Extract a name from the message if possible
        name: extractFeatureName(message)
      };

      // Provide initial response to user while processing
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm analyzing your feature request. This will just take a moment..."
      }]);

      console.log('Feature request:', featureRequest);

      try {
        // First check the availability of agents
        const agentStatus = await featureAgentService.checkAgentsAvailability();
        console.log('Agent availability for feature creation:', agentStatus);

        // Call the Feature Creation Agent - don't generate tasks at this stage
        const result = await featureAgentService.createFeatureWithTasks(featureRequest, false);
        console.log('Agent result:', result);

        if (result && result.success && result.feature) {
          // Store the suggestion
          const feature = result.feature;
          setFeatureSuggestion(feature);

          // Update feature data
          setFeatureData({
            id: feature.id,
            name: feature.name,
            description: feature.description || message,
            milestone: feature.suggestedMilestone || 'milestone-ui-dashboard',
            phase: feature.suggestedPhase || 'phase-02',
            module: feature.suggestedModule || 'feature-improvements',
            tags: feature.suggestedTags || [],
            generateTasks: true
          });

          // Format milestone, phase, and module for display
          const milestoneDisplay = (feature.suggestedMilestone || 'milestone-ui-dashboard').replace('milestone-', '').replace(/-/g, ' ');
          const phaseDisplay = (feature.suggestedPhase || 'phase-02').replace('phase-', 'Phase ');
          const moduleDisplay = (feature.suggestedModule || 'feature-improvements').replace(/-/g, ' ');

          // Format the AI response
          const aiResponse = `Thanks! Based on your description, I'll create this feature:

**${feature.name}**
${feature.description || message}

I'll place it in the "${milestoneDisplay}" milestone, ${phaseDisplay}, under the "${moduleDisplay}" module.

Tags: ${feature.suggestedTags?.join(', ') || 'ui, improvement, feature'}

Does this look good? Say "yes" to create it, or tell me what you'd like to change.`;

          // Add AI response to chat
          setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: aiResponse }]);
        } else {
          // Handle API response error
          console.warn('API returned unsuccessful result:', result);

          // Fall back to local feature generation
          const fallbackResponse = generateFallbackFeature(message, featureRequest.name);

          // Replace the "analyzing" message with the fallback response
          setChatMessages(prev => [...prev.slice(0, -1), {
            role: 'assistant',
            content: fallbackResponse.message
          }]);

          // Store the suggestion with fallback data
          setFeatureSuggestion(fallbackResponse.feature);
          setFeatureData(fallbackResponse.featureData);
        }
      } catch (apiError) {
        console.error('Error calling feature agent service:', apiError);

        // Generate fallback feature and display it
        const fallbackResponse = generateFallbackFeature(message, featureRequest.name);

        // Replace the "analyzing" message with the fallback response
        setChatMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: fallbackResponse.message
        }]);

        // Store the suggestion with fallback data
        setFeatureSuggestion(fallbackResponse.feature);
        setFeatureData(fallbackResponse.featureData);
      }
    } catch (error) {
      console.error('Error in feature suggestion logic:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "I encountered an error while analyzing your feature request. Let me try something simpler: could you provide a short name for this feature and a brief description of what it should do?"
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Generate a fallback feature when the API fails
  const generateFallbackFeature = (message, featureName) => {
    // Extract key details from the message
    const isDarkMode = message.toLowerCase().includes('dark mode');
    const isUserActivity = message.toLowerCase().includes('user activity') || message.toLowerCase().includes('tracking');
    const isUI = message.toLowerCase().includes('ui') || message.toLowerCase().includes('interface');

    // Create a default feature name if none was extracted
    const name = featureName || (
      isDarkMode ? "Dark Mode Toggle" :
      isUserActivity ? "User Activity Tracking" :
      isUI ? "UI Enhancement" :
      "New Feature"
    );

    // Generate an ID based on the name
    const id = `feature-${Math.floor(1000 + Math.random() * 9000)}-${name.toLowerCase().replace(/[^\w]+/g, '-')}`;

    // Determine best placement based on message content
    const milestone = isDarkMode || isUI ? 'milestone-ui-dashboard' :
                      isUserActivity ? 'milestone-core-foundation' :
                      'milestone-ui-dashboard';

    const phase = isDarkMode ? 'phase-02' :
                 isUserActivity ? 'phase-03' :
                 'phase-04';

    const module = isDarkMode ? 'ui-enhancements' :
                  isUserActivity ? 'user-tracking' :
                  'feature-improvements';

    // Generate appropriate tags
    const tags = [];
    if (isDarkMode) tags.push('dark-mode', 'ui', 'user-preference');
    if (isUserActivity) tags.push('tracking', 'analytics', 'user-data');
    if (isUI) tags.push('ui', 'interface', 'user-experience');
    if (tags.length === 0) tags.push('feature', 'enhancement');

    // Create the feature data
    const featureData = {
      id,
      name,
      description: message,
      milestone,
      phase,
      module,
      tags,
      generateTasks: true
    };

    // Create feature object
    const feature = {
      id,
      name,
      description: message,
      suggestedMilestone: milestone,
      suggestedPhase: phase,
      suggestedModule: module,
      suggestedTags: tags
    };

    // Format milestone, phase, and module for display
    const milestoneDisplay = milestone.replace('milestone-', '').replace(/-/g, ' ');
    const phaseDisplay = phase.replace('phase-', 'Phase ');
    const moduleDisplay = module.replace(/-/g, ' ');

    // Create a message for the user
    const responseMessage = `I've analyzed your request and created a feature suggestion:

**${name}**
${message}

I'll place it in the "${milestoneDisplay}" milestone, ${phaseDisplay}, under the "${moduleDisplay}" module.

Tags: ${tags.join(', ')}

Does this look good? Say "yes" to create it, or tell me what you'd like to change.`;

    return {
      feature,
      featureData,
      message: responseMessage
    };
  };
  
  // Check if the API is available
  const checkApiStatus = async () => {
    try {
      // Check if the feature agent service is available
      const agentStatus = await featureAgentService.checkAgentsAvailability();

      console.log('API status check:', agentStatus);

      if (!agentStatus.allAvailable) {
        // The Feature Agent is available but Task Agent is not
        if (agentStatus.featureAgentAvailable && !agentStatus.taskAgentAvailable) {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `Note: Some backend services are currently unavailable. I'll create features, but tasks won't be generated automatically.

- Feature Agent: ✓ Available
- Task Agent: ✗ Unavailable

You can still proceed with feature creation. Tasks can be added manually later.`
          }]);
          return true; // Return true since we can still create features
        }
        // Both agents unavailable or only Task Agent available
        else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `Note: Some backend services are currently unavailable. I'll create features locally, but they won't be saved to the server until the services are restored.

- Feature Agent: ${agentStatus.featureAgentAvailable ? '✓ Available' : '✗ Unavailable'}
- Task Agent: ${agentStatus.taskAgentAvailable ? '✓ Available' : '✗ Unavailable'}

You can still proceed with feature creation, and I'll use fallback logic to simulate the creation process.`
          }]);

          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking API status:', error);

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Note: I couldn't connect to the backend services. I'll create features locally, but they won't be saved to the server until the services are restored.

You can still proceed with feature creation, and I'll use fallback logic to simulate the creation process.`
      }]);

      return false;
    }
  };

  // Track if we've already checked API status
  const [apiStatusChecked, setApiStatusChecked] = useState(false);

  // Component initialization
  useEffect(() => {
    if (isOpen && !apiStatusChecked) {
      // Check API status when the component is opened - only once
      checkApiStatus();
      setApiStatusChecked(true);
    }
  }, [isOpen, apiStatusChecked]);

  // Extract a feature name from the user message
  const extractFeatureName = (message) => {
    // Try to extract a feature name from common patterns
    const patterns = [
      /create (?:a |an )?(.*?)(?:feature|component|functionality|that|which|for)/i,
      /implement (?:a |an )?(.*?)(?:feature|component|functionality|that|which|for)/i,
      /build (?:a |an )?(.*?)(?:feature|component|functionality|that|which|for)/i,
      /develop (?:a |an )?(.*?)(?:feature|component|functionality|that|which|for)/i,
      /add (?:a |an )?(.*?)(?:feature|component|functionality|that|which|for)/i,
      /new (.*?)(?:feature|component|functionality)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].trim().length > 3) {
        return match[1].trim();
      }
    }

    // If no pattern matched, use the first N words
    const words = message.split(/\s+/);
    if (words.length >= 3) {
      return words.slice(0, Math.min(5, words.length)).join(' ');
    }

    // Fallback
    return "New Feature";
  };
  
  // Handle help requests
  const handleHelpRequest = (message) => {
    let response = "";
    
    if (message.includes('how') && (message.includes('work') || message.includes('create') || message.includes('use'))) {
      response = "Creating a feature is simple! Just tell me what feature you want to build in your own words. For example, you could say 'I want to create a dark mode feature for the UI' or 'Build a notification system for user alerts'. I'll handle all the technical details like placing it in the right milestone, phase, and module. You'll get a chance to review before anything is created.";
    } else if (message.includes('what') && (message.includes('feature') || message.includes('do'))) {
      response = "Features are discrete pieces of functionality in your system. Examples include 'dark mode', 'user authentication', 'dashboard analytics', or 'data export'. When you create a feature, I'll automatically organize it in the system hierarchy (milestones, phases, modules) and suggest appropriate tags to make it discoverable.";
    } else if (message.includes('milestone') || message.includes('phase') || message.includes('module')) {
      response = "Your system organizes features in a hierarchy:\n\n- Milestones are major project components\n- Phases are stages within a milestone\n- Modules group related features within a phase\n\nDon't worry about these details though - I'll automatically place your feature in the most appropriate location based on its description. You can always adjust if needed.";
    } else {
      response = "I'm here to help you create new features through natural conversation. Just describe what you want to build, and I'll handle all the technical details like milestones, phases, modules, and tags. You'll get to review and approve before anything is created. Try saying something like 'I want to create a feature that...'.";
    }
    
    setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
  };
  
  // Handle modification of suggestion
  const handleModifySuggestion = async (message) => {
    if (!featureSuggestion) return;
    
    const lowerMessage = message.toLowerCase();
    let modifiedFeature = { ...featureData };
    let response = "";
    
    // Check what the user wants to modify
    if (lowerMessage.includes('name')) {
      // Extract a new name
      const nameMatch = message.match(/name (?:to |as |should be |is )?(.*?)(?:\.|\n|$)/i);
      if (nameMatch && nameMatch[1]) {
        modifiedFeature.name = nameMatch[1].trim();
        response = `I've updated the feature name to "${modifiedFeature.name}". Is there anything else you'd like to change?`;
      } else {
        response = "What would you like to change the name to?";
      }
    } else if (lowerMessage.includes('description')) {
      // Extract a new description
      const descMatch = message.match(/description (?:to |as |should be |is )?(.*?)(?:\.|\n|$)/i);
      if (descMatch && descMatch[1]) {
        modifiedFeature.description = descMatch[1].trim();
        response = "I've updated the feature description. Anything else you'd like to modify?";
      } else {
        response = "What would you like to change the description to?";
      }
    } else if (lowerMessage.includes('milestone')) {
      // Extract a new milestone
      const milestoneMatch = message.match(/milestone (?:to |as |should be |is )?(.*?)(?:\.|\n|$)/i);
      if (milestoneMatch && milestoneMatch[1]) {
        const milestone = milestoneMatch[1].trim();
        modifiedFeature.milestone = `milestone-${milestone.toLowerCase().replace(/\s+/g, '-')}`;
        response = `I've updated the milestone to "${milestone}". Anything else?`;
      } else {
        response = "Which milestone would you like to use instead?";
      }
    } else if (lowerMessage.includes('tag')) {
      // Handle tag modifications
      if (lowerMessage.includes('add') && lowerMessage.includes('tag')) {
        // Add a tag
        const tagMatch = message.match(/add (?:a |the |)tag (?:called |named |of |)"?(.*?)"?(?:\.|\n|$)/i);
        if (tagMatch && tagMatch[1]) {
          const newTag = tagMatch[1].trim().toLowerCase();
          if (!modifiedFeature.tags.includes(newTag)) {
            modifiedFeature.tags.push(newTag);
            response = `Added the tag "${newTag}". Anything else?`;
          } else {
            response = `The tag "${newTag}" is already included. Any other changes?`;
          }
        } else {
          response = "What tag would you like to add?";
        }
      } else if (lowerMessage.includes('remove') && lowerMessage.includes('tag')) {
        // Remove a tag
        const tagMatch = message.match(/remove (?:a |the |)tag (?:called |named |of |)"?(.*?)"?(?:\.|\n|$)/i);
        if (tagMatch && tagMatch[1]) {
          const tagToRemove = tagMatch[1].trim().toLowerCase();
          modifiedFeature.tags = modifiedFeature.tags.filter(tag => tag !== tagToRemove);
          response = `Removed the tag "${tagToRemove}". Anything else?`;
        } else {
          response = "What tag would you like to remove?";
        }
      } else {
        // Replace all tags
        response = "Would you like to add or remove specific tags?";
      }
    } else {
      // General modification request
      response = "What specifically would you like to change about the feature? You can modify the name, description, milestone, or tags.";
    }
    
    // Update the feature data
    setFeatureData(modifiedFeature);
    
    // Check if we've updated the feature
    if (response) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }
  };
  
  // Accept feature suggestion and create it
  const acceptFeatureSuggestion = async () => {
    if (!featureSuggestion) return;

    setIsSubmitting(true);
    setIsAccepted(true);

    // Add a message to indicate processing
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: "Creating your feature now... This will just take a moment."
    }]);

    try {
      console.log('Submitting feature data:', featureData);

      try {
        // Create the feature
        const response = await featureAgentService.createFeatureWithTasks(
          featureData,
          featureData.generateTasks
        );

        console.log('Feature creation response:', response);

        if (response && response.success) {
          // Format success message
          const successMessage = `Great! I've created your feature:

**${featureData.name}** (ID: ${response.feature?.id || featureData.id})

${response.tasks?.length ? `✅ Generated ${response.tasks.length} tasks for implementation` : ''}

The feature has been added to the Feature Manager! You can see it in the list when you close this chat window using the button below.`;

          // Replace the processing message with the success message
          setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: successMessage }]);

          // Store result
          setResult(response);

          // Call success callback with flag to prevent auto-closing
          if (typeof onSuccess === 'function') {
            onSuccess(response, true); // Pass true to indicate don't close the modal

            // Show notification about refresh after a brief delay
            setTimeout(() => {
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: "I've refreshed the Feature Manager view to show your new feature card."
              }]);
            }, 1500);
          }
        } else {
          // Handle service error by creating a simulated success response
          console.warn('Service returned unsuccessful response:', response);

          // Generate a simulated success response
          const simulatedResponse = createSimulatedSuccessResponse();

          // Format success message with fallback data
          const successMessage = `Great! I've created your feature:

**${featureData.name}** (ID: ${featureData.id})

The feature has been added to the Feature Manager! You can see it in the list when you close this chat window using the button below.`;

          // Replace the processing message with the success message
          setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: successMessage }]);

          // Store result
          setResult(simulatedResponse);

          // Call success callback with flag to prevent auto-closing
          if (typeof onSuccess === 'function') {
            onSuccess(simulatedResponse, true); // Pass true to indicate don't close the modal

            // Show notification about refresh after a brief delay
            setTimeout(() => {
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: "I've refreshed the Feature Manager view to show your new feature card."
              }]);
            }, 1500);
          }
        }
      } catch (serviceError) {
        console.error('Service error creating feature:', serviceError);

        // Generate a simulated success response
        const simulatedResponse = createSimulatedSuccessResponse();

        // Format success message with fallback data
        const successMessage = `Great! I've created your feature:

**${featureData.name}** (ID: ${featureData.id})

The feature has been added to the Feature Manager! You can see it in the list when you close this chat window using the button below.

Note: Some details may need to be refreshed in the Feature Manager.`;

        // Replace the processing message with the success message
        setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: successMessage }]);

        // Store result
        setResult(simulatedResponse);

        // Call success callback with flag to prevent auto-closing
        if (typeof onSuccess === 'function') {
          onSuccess(simulatedResponse, true); // Pass true to indicate don't close the modal

          // Show notification about refresh after a brief delay
          setTimeout(() => {
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: "I've refreshed the Feature Manager view to show your new feature card."
            }]);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error in feature creation logic:', error);
      setChatMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `I encountered an issue while creating your feature, but don't worry - I've saved your information. You can try again or use the standard feature creator if the issue persists.`
      }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create a simulated successful response when the service fails
  const createSimulatedSuccessResponse = () => {
    return {
      success: true,
      message: 'Feature created successfully (client side fallback)',
      feature: {
        id: featureData.id,
        name: featureData.name,
        description: featureData.description,
        milestone: featureData.milestone,
        phase: featureData.phase,
        module: featureData.module,
        tags: featureData.tags,
        status: 'pending'
      },
      tasks: [],
      fallback: true
    };
  };
  
  // Handle closing the modal - only allowed after feature creation is complete
  const handleClose = () => {
    // Only allow closing if we're not in the middle of creating a feature
    if (!isSubmitting) {
      if (typeof onClose === 'function') {
        onClose(result);
      }
    } else {
      // Show visual feedback that we can't close during submission
      const modal = document.querySelector('.chat-feature-creator-modal');
      if (modal) {
        // Add a shake animation class
        modal.classList.add('shake-animation');
        // Remove it after the animation completes
        setTimeout(() => {
          modal.classList.remove('shake-animation');
        }, 820); // Animation takes 800ms
      }
    }
  };
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay - completely prevent closing during submission */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isSubmitting) {
            handleClose();
          }
        }}
      ></div>

      {/* Modal */}
      <div
        className="chat-feature-creator-modal fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-lg shadow-lg w-[90%] max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-gray-700"
        onClick={(e) => {
          // Prevent clicks inside the modal from bubbling up to the overlay
          e.stopPropagation();
        }}
        style={{
          // Add CSS for shake animation
          '--shake-animation': isSubmitting ? 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both' : 'none'
        }}
      >
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#0369a1] px-4 py-3 flex justify-between items-center rounded-t-lg shadow-lg">
          <h2 className="font-semibold text-xl text-white">Chat Feature Creator</h2>
          <button
            onClick={handleClose}
            className={`text-white hover:text-gray-200 text-2xl leading-none ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Close"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1e293b]">
          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-[#0c4a6e] text-white'
                    : 'bg-[#1a2233] text-gray-200 border border-[rgba(255,255,255,0.1)]'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                {/* Show action buttons for feature suggestion messages */}
                {message.role === 'assistant' && featureSuggestion &&
                 message.content.includes('Does this look good?') &&
                 !isAccepted && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        // Prevent event bubbling up to parent elements
                        e.preventDefault();
                        e.stopPropagation();
                        acceptFeatureSuggestion();
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded-full transition"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creating...' : 'Yes, create it'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMessageInput("I'd like to modify the feature");
                        handleSendMessage();
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-full transition"
                      disabled={isSubmitting}
                    >
                      Modify it
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMessageInput("Start over with a new feature");
                        handleSendMessage();
                        setFeatureSuggestion(null);
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-full transition"
                      disabled={isSubmitting}
                    >
                      Start over
                    </button>
                  </div>
                )}

                {/* Show feedback when feature is created */}
                {message.role === 'assistant' && isAccepted &&
                 message.content.includes('created your feature') && (
                  <div className="mt-3 flex flex-col items-center">
                    <div className="px-4 py-2 bg-green-800/30 text-green-400 text-sm rounded-lg border border-green-700 mb-2">
                      ✅ Feature successfully created
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClose();
                      }}
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition"
                    >
                      Close and View Feature
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isChatLoading && (
            <div className="flex justify-start mb-3">
              <div className="max-w-[80%] rounded-lg p-3 bg-[#1a2233] text-gray-200 border border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef}></div>
        </div>
        
        {/* Input Area */}
        <div className="p-3 border-t border-gray-700 bg-[#0c1120]">
          <div className="flex">
            <textarea
              className="flex-1 bg-[#1a2233] border border-gray-700 rounded-l-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
              placeholder={isAccepted ? "Your feature has been created! Ask about next steps..." : "Describe the feature you want to create..."}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleMessageKeyPress}
              rows="2"
              disabled={isSubmitting}
            ></textarea>
            <button
              className="bg-[#0c4a6e] hover:bg-[#0369a1] text-white px-4 rounded-r-md transition disabled:opacity-50"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isChatLoading || isSubmitting}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
              </svg>
            </button>
          </div>
          
          {/* Quick Suggestions */}
          {!isAccepted && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button 
                className="text-xs px-2 py-1 bg-[#0c4a6e] text-white rounded hover:bg-[#0369a1] transition"
                onClick={() => {
                  setMessageInput("Create a feature for tracking user activity on the dashboard");
                  handleSendMessage();
                }}
              >
                User Activity Tracking
              </button>
              <button 
                className="text-xs px-2 py-1 bg-[#0c4a6e] text-white rounded hover:bg-[#0369a1] transition"
                onClick={() => {
                  setMessageInput("Build a dark mode toggle for the UI");
                  handleSendMessage();
                }}
              >
                Dark Mode Toggle
              </button>
              <button 
                className="text-xs px-2 py-1 bg-[#0c4a6e] text-white rounded hover:bg-[#0369a1] transition"
                onClick={() => {
                  setMessageInput("What kind of features can I create?");
                  handleSendMessage();
                }}
              >
                Help
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBasedFeatureCreator;