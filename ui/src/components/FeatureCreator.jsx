import React, { useState, useEffect } from 'react';
import axios from 'axios';
import featureCreationService from '../services/featureCreationService';
import featureAgentService from '../services/featureAgentService';

/**
 * FeatureCreator component
 * 
 * A form component for creating new features with AI-powered metadata suggestions
 * and automatic organization. Includes an integrated AI assistant that can help
 * with feature creation.
 */
const FeatureCreator = ({ isOpen, onClose, onSuccess }) => {
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    milestone: '',
    phase: '',
    module: '',
    useAiStructure: true,
    useAiDescription: true,
    generateTasks: true, // New option to auto-generate tasks
    dryRun: false
  });
  
  // Available options for select fields
  const [milestones, setMilestones] = useState([]);
  const [phases, setPhases] = useState([]);
  const [modules, setModules] = useState([]);
  const [customModule, setCustomModule] = useState('');
  
  // Form state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState('waiting'); // waiting, analyzing, completed
  const [aiAssisted, setAiAssisted] = useState(true);
  const [showChatAssistant, setShowChatAssistant] = useState(true); // Default to showing chat assistant
  const [useChatAssistantToCreate, setUseChatAssistantToCreate] = useState(false); // Flag for full AI creation
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'system', content: 'I can help you create a well-structured feature. Ask me any questions about feature creation or implementation.' },
    { role: 'assistant', content: 'Welcome to the Feature Creator AI Assistant! I can help you create a well-structured feature with proper organization. You can either fill in the form manually or ask me to help generate parts of it. What kind of feature would you like to create today?' }
  ]);
  const [messageInput, setMessageInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Load milestones and other options
  useEffect(() => {
    async function loadOptions() {
      try {
        // In a real implementation, this would fetch from an API
        // For now, we'll use mock data
        setMilestones([
          { id: 'milestone-integrated-testing', name: 'Integrated Testing' },
          { id: 'milestone-core-foundation', name: 'Core Foundation' },
          { id: 'milestone-ui-dashboard', name: 'UI Dashboard' },
          { id: 'milestone-github-integration', name: 'Github Integration' },
        ]);
      } catch (error) {
        console.error('Failed to load milestones:', error);
      }
    }
    
    loadOptions();
  }, []);
  
  // Load phases based on selected milestone
  useEffect(() => {
    if (!formData.milestone) {
      setPhases([]);
      return;
    }
    
    // In a real implementation, this would fetch from an API
    // For now, we'll use mock data
    const mockPhases = {
      'milestone-integrated-testing': [
        { id: 'phase-01', name: 'Phase 1' },
        { id: 'phase-02', name: 'Phase 2' },
        { id: 'phase-03', name: 'Phase 3' },
        { id: 'phase-04', name: 'Phase 4' },
      ],
      'milestone-core-foundation': [
        { id: 'phase-01', name: 'Phase 1' },
        { id: 'phase-02', name: 'Phase 2' },
        { id: 'phase-03', name: 'Phase 3' },
      ],
      'milestone-ui-dashboard': [
        { id: 'phase-01', name: 'Phase 1' },
        { id: 'phase-02', name: 'Phase 2' },
        { id: 'phase-03', name: 'Phase 3' },
        { id: 'phase-04', name: 'Phase 4' },
        { id: 'phase-05', name: 'Phase 5' },
        { id: 'phase-06', name: 'Phase 6' },
      ],
      'milestone-github-integration': [
        { id: 'phase-01', name: 'Phase 1' },
        { id: 'phase-02', name: 'Phase 2' },
        { id: 'phase-03', name: 'Phase 3' },
        { id: 'phase-04', name: 'Phase 4' },
      ],
    };
    
    setPhases(mockPhases[formData.milestone] || []);
  }, [formData.milestone]);
  
  // Load modules based on selected phase
  useEffect(() => {
    if (!formData.milestone || !formData.phase) {
      setModules([]);
      return;
    }
    
    // In a real implementation, this would fetch from an API
    // For now, we'll use mock data
    const mockModules = {
      'milestone-integrated-testing': {
        'phase-01': [
          { id: 'test-core', name: 'Test Core' },
          { id: 'test-infrastructure', name: 'Test Infrastructure' },
        ],
        'phase-02': [
          { id: 'test-progression', name: 'Test Progression' },
          { id: 'test-automation', name: 'Test Automation' },
        ],
        'phase-04': [
          { id: 'test-scenarios', name: 'Test Scenarios' },
          { id: 'test-integration', name: 'Test Integration' },
        ],
      },
      'milestone-ui-dashboard': {
        'phase-04': [
          { id: 'feature-improvements', name: 'Feature Improvements' },
          { id: 'ui-enhancements', name: 'UI Enhancements' },
        ],
        'phase-05': [
          { id: 'status-display', name: 'Status Display' },
          { id: 'dashboard-metrics', name: 'Dashboard Metrics' },
        ],
      },
      'milestone-github-integration': {
        'phase-04': [
          { id: 'github-lifecycle', name: 'Github Lifecycle' },
          { id: 'github-sync', name: 'Github Sync' },
        ],
      },
    };
    
    setModules(
      mockModules[formData.milestone]?.[formData.phase] || []
    );
  }, [formData.milestone, formData.phase]);
  
  // Use AI to analyze and suggest metadata when details change
  useEffect(() => {
    const debouncedAnalyze = setTimeout(async () => {
      if (formData.name && (formData.name.length > 3 || formData.description.length > 10)) {
        await analyzeFeature();
      }
    }, 1000);
    
    return () => clearTimeout(debouncedAnalyze);
  }, [formData.name, formData.description]);
  
  // Automatically apply AI suggestions when they arrive
  useEffect(() => {
    if (suggestions && aiAssisted) {
      applyAiSuggestions();
    }
  }, [suggestions, aiAssisted]);
  
  // Load project structure data when needed
  const [projectStructure, setProjectStructure] = useState(null);
  useEffect(() => {
    // If we need project structure data and don't have it, fetch it
    if (aiAssisted && !projectStructure && formData.projectId) {
      const fetchProjectStructure = async () => {
        try {
          const response = await axios.get(`/api/v1/project-structure/get-structure/${formData.projectId}`);
          setProjectStructure(response.data);
        } catch (error) {
          console.error('Error fetching project structure:', error);
        }
      };
      
      fetchProjectStructure();
    }
  }, [aiAssisted, projectStructure, formData.projectId]);
  
  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    const chatEnd = document.getElementById('chatEnd');
    if (chatEnd) {
      chatEnd.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle tag input
  const handleAddTag = () => {
    if (tagInput.trim() === '') return;
    if (tags.includes(tagInput.trim())) return;
    
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };
  
  const handleRemoveTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  // Chat assistant functions
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
      
      // Check if this is a feature creation request
      const message = messageInput.toLowerCase();
      if (message.includes('create') && (message.includes('feature') || message.includes('new feature'))) {
        // This is a feature creation request - check if we have enough info or need to ask for more
        if (message.length > 25 && (message.includes('for') || message.includes('that') || message.includes('which'))) {
          // The request includes some description, likely enough to generate a feature
          // In a real implementation, this would integrate with the AI model
          // For now, we'll call our helper function to simulate
          await createFeatureWithAI();
          return;
        } else {
          // Not enough info, ask for more details
          assistantResponse = "I'd be happy to help you create a new feature. To get started, could you tell me more about:\n\n1. The purpose of this feature\n2. Which milestone it belongs to (if you know)\n3. Any specific functionality you want to implement\n\nThe more details you provide, the better I can help organize the feature properly.";
        }
      } 
      // Apply user form data if requested
      else if (message.includes('apply') && message.includes('suggestion')) {
        if (suggestions) {
          applyAiSuggestions();
          assistantResponse = "I've applied the AI-suggested values to the form. Feel free to adjust any fields that don't match your expectations. You can now:\n\n1. Review and modify the feature details\n2. Submit the form to create the feature\n3. Run a dry run first to verify everything looks correct";
        } else {
          assistantResponse = "I don't have any pending suggestions to apply. To get suggestions, please enter a name and description for your feature, and the AI will analyze it to recommend proper placement in the system.";
        }
      }
      // Handle field-specific questions
      else if (message.includes('module') || message.includes('modules')) {
        assistantResponse = "Modules group related features within a phase. They help organize features by functionality or purpose. When creating a feature, select the module that best matches its focus. For example, a UI feature might belong to the 'ui-components' module.\n\nThe system will suggest appropriate modules based on your feature description, but you can also create custom modules if needed.\n\nWould you like me to suggest a module for your feature?";
      } else if (message.includes('phase') || message.includes('phases')) {
        assistantResponse = "Phases represent distinct stages in a milestone. Each phase focuses on a specific aspect of development. When creating a feature, it should be placed in the phase that corresponds to its implementation timeline.\n\nFor example:\n- Phase 1: Core infrastructure\n- Phase 2: Feature implementation\n- Phase 3: Integration\n- Phase 4: Testing\n\nThe system will analyze your feature description and suggest the appropriate phase based on the context.";
      } else if (message.includes('naming') || message.includes('name')) {
        assistantResponse = "Feature naming convention: feature-XXXX-name\nWhere:\n- XXXX is a unique numeric ID (usually sequentially assigned)\n- name is a lowercase, hyphen-separated description of the feature\n\nExample: feature-1003-mini-loop-testing\n\nThe system can generate appropriate IDs automatically if you provide a descriptive name. Would you like me to suggest a proper feature ID based on the name you've entered?";
      } else if (message.includes('milestone') || message.includes('milestones')) {
        assistantResponse = "Milestones are high-level project components that group related phases and features. When creating a feature, select the milestone that aligns with its broader purpose and roadmap position.\n\nCurrent milestones include:\n- integrated-testing: Features related to the testing framework\n- ui-dashboard: UI components and visualization\n- github-integration: GitHub connectivity and workflow integration\n- core-foundation: Core system infrastructure\n\nBased on your feature description, the system can suggest the most appropriate milestone. Would you like me to recommend a placement for your feature?";
      } else if (message.includes('example') || message.includes('sample')) {
        // Check if we have feature data to use as example, otherwise use default
        const exampleID = formData.id || "feature-1103-mini-loop-tests";
        const exampleName = formData.name || "Mini Loop Tests";
        const exampleDesc = formData.description || "Provides a suite of standardized tests for the mini-loop testing infrastructure";
        const exampleMilestone = formData.milestone || "integrated-testing";
        const examplePhase = formData.phase || "phase-02";
        const exampleModule = formData.module || "test-progression";
        
        assistantResponse = `Example feature:\n\nID: ${exampleID}\nName: ${exampleName}\nDescription: ${exampleDesc}\nMilestone: ${exampleMilestone}\nPhase: ${examplePhase}\nModule: ${exampleModule}\n\nThis feature would provide functionality within the ${exampleModule} module of ${examplePhase} in the ${exampleMilestone} milestone.\n\nWould you like me to create a complete feature structure for you? Just say "create a feature for [your description]" and I'll generate a full feature.`;
      } else if (message.includes('best practice') || message.includes('recommend')) {
        assistantResponse = "Best practices for feature creation:\n\n1. Use clear, descriptive names that indicate functionality\n2. Follow naming conventions (feature-XXXX-name)\n3. Write detailed descriptions explaining purpose and scope\n4. Place in the appropriate milestone/phase/module\n5. Enable AI structure generation for optimal organization\n6. Include relevant tags for easier discovery\n7. Start with a dry run to verify configuration\n8. Ensure the feature fits within the system architecture\n9. Check for similar existing features to avoid duplication\n10. Consider dependencies on other features\n\nWould you like me to analyze your current feature for compliance with these best practices?";
      } else if (message.includes('structure') || message.includes('organization')) {
        assistantResponse = "A well-structured feature includes:\n\n1. Clear ID following naming convention (feature-XXXX-name)\n2. Descriptive name indicating functionality\n3. Comprehensive description explaining purpose and behavior\n4. Proper placement in milestone hierarchy\n5. Appropriate module assignment\n6. Relevant tags for discoverability\n7. Dependency tracking for related features\n8. Integration with the system roadmap\n\nThe AI can help establish this organization automatically by analyzing your feature description and suggesting optimal placement in the system. Would you like to use AI to generate the complete structure for your feature?";
      } else if (message.includes('dependency') || message.includes('dependencies')) {
        assistantResponse = "Dependencies track relationships between features to ensure proper implementation order. When creating a feature, you can specify which other features it depends on.\n\nThe system automatically updates the feature registry with these dependency relationships, which helps with:\n\n1. Execution ordering in test runs\n2. Status propagation (blocked features)\n3. Impact analysis for changes\n4. Documentation of feature relationships\n\nTo add dependencies, you'll need to know the IDs of the features your new feature depends on. Would you like me to search for potential dependencies based on your feature description?";
      } else if (message.includes('tag') || message.includes('tags')) {
        assistantResponse = "Tags help categorize and find features across different milestones and phases. Good tags describe:\n\n1. The feature's domain (ui, backend, testing, etc.)\n2. Its purpose (enhancement, security, performance, etc.)\n3. Related technologies (react, python, etc.)\n\nThe AI can suggest appropriate tags based on your feature description. These suggestions appear in the tags section of the form, where you can add or remove them as needed.\n\nWould you like me to suggest tags for your current feature?";
      } else if (message.includes('analyze') || message.includes('analysis')) {
        // Check if we have enough data to analyze
        if (formData.name || formData.description) {
          await analyzeFeature();
          assistantResponse = "I've analyzed your feature and generated suggestions based on the name and description you provided. You can see these suggestions in the AI Integration box on the form. Would you like me to apply these suggestions automatically?";
        } else {
          assistantResponse = "To analyze your feature, I need some basic information first. Please provide at least a name or description in the form, and I'll analyze it to suggest proper placement, tagging, and organization within the system.";
        }
      } else if (message.includes('help') || message.includes('assist') || message.includes('how')) {
        assistantResponse = "I can help you create a well-structured feature in several ways:\n\n1. **AI Feature Creation**: Click the \"AI Create Feature\" button and I'll generate a complete feature structure\n2. **Field-specific assistance**: Ask about any field (name, ID, milestone, etc.)\n3. **Best practices**: Ask for recommendations on feature organization\n4. **Examples**: Request sample features to use as templates\n5. **Analysis**: Enter a name/description and I'll suggest optimal placement\n\nYou can fill the form manually, or use the AI suggestions to automate parts of the process. What specific help do you need with your feature creation?";
      } else {
        assistantResponse = "I can help you create a well-structured feature. Here are some things you can ask me about:\n\n- Creating a complete feature with AI assistance\n- Naming conventions and ID formats\n- Milestone and phase selection\n- Module organization\n- Best practices for feature creation\n- Feature structure and organization\n- Dependencies between features\n- Tags and categorization\n- Analyzing your current feature\n\nOr simply say \"Create a feature for...\" followed by a description, and I'll generate a complete feature for you!";
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
    const chatEnd = document.getElementById('chatEnd');
    if (chatEnd) {
      chatEnd.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Analyze feature and suggest metadata using the Feature Creation Agent
  const analyzeFeature = async () => {
    if (!formData.name) return;
    
    try {
      setAnalyzing(true);
      setAiAnalysisStatus('analyzing');
      
      // Call the Feature Creation Agent service
      const featureRequest = {
        name: formData.name,
        description: formData.description || '',
        projectId: formData.projectId,
        milestone: formData.milestone,
        phase: formData.phase,
        module: formData.module,
        tags: tags
      };
      
      const result = await featureCreationService.processFeature(featureRequest);
      
      if (result.success && result.feature) {
        // Extract suggestions from the response
        const agentSuggestions = {
          suggestedId: result.feature.id,
          suggestedMilestone: result.feature.suggestedMilestone,
          suggestedPhase: result.feature.suggestedPhase,
          suggestedModule: result.feature.suggestedModule,
          suggestedTags: result.feature.suggestedTags || [],
          potentialDependencies: result.feature.potentialDependencies || []
        };
        
        setSuggestions(agentSuggestions);
        setAiAnalysisStatus('completed');
      } else {
        // Fallback to simple suggestions if the agent failed
        console.warn('Feature Creation Agent failed, using fallback suggestions');
        
        // Generate simple suggestions based on input
        const nameLower = formData.name.toLowerCase();
        const fallbackSuggestions = {
          suggestedId: `feature-${Math.floor(1000 + Math.random() * 9000)}-${nameLower.replace(/[^\w]+/g, '-')}`,
          suggestedMilestone: 
            nameLower.includes('test') ? 'milestone-integrated-testing' :
            nameLower.includes('ui') ? 'milestone-ui-dashboard' :
            nameLower.includes('git') ? 'milestone-github-integration' : 
            'milestone-core-foundation',
          suggestedPhase: 'phase-02',
          suggestedModule: 
            nameLower.includes('test') ? 'test-core' :
            nameLower.includes('ui') ? 'ui-enhancements' :
            nameLower.includes('git') ? 'github-lifecycle' :
            'feature-improvements',
          suggestedTags: [
            ...formData.name.toLowerCase().split(/[^\w]+/).filter(w => w.length > 3),
            ...(formData.description || '').toLowerCase().split(/[^\w]+/).filter(w => w.length > 4 && !['with', 'that', 'this', 'from', 'these', 'those', 'have'].includes(w))
          ].slice(0, 5)
        };
        
        setSuggestions(fallbackSuggestions);
        setAiAnalysisStatus('completed');
      }
    } catch (err) {
      console.error('Error analyzing feature:', err);
      setAiAnalysisStatus('waiting');
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Apply all AI suggestions at once
  const applyAiSuggestions = () => {
    if (!suggestions) return;
    
    // Apply ID suggestion
    if (suggestions.suggestedId && !formData.id) {
      setFormData(prev => ({ ...prev, id: suggestions.suggestedId }));
    }
    
    // Apply milestone suggestion
    if (suggestions.suggestedMilestone && !formData.milestone) {
      setFormData(prev => ({ ...prev, milestone: suggestions.suggestedMilestone }));
    }
    
    // Apply phase suggestion if milestone matches
    if (suggestions.suggestedPhase && 
        suggestions.suggestedMilestone === formData.milestone && 
        !formData.phase) {
      setFormData(prev => ({ ...prev, phase: suggestions.suggestedPhase }));
    }
    
    // Apply module suggestion if milestone and phase match
    if (suggestions.suggestedModule && 
        suggestions.suggestedMilestone === formData.milestone && 
        suggestions.suggestedPhase === formData.phase && 
        !formData.module) {
      
      // Check if the suggested module exists in our available modules
      const moduleExists = modules.some(m => m.id === suggestions.suggestedModule);
      
      if (moduleExists) {
        setFormData(prev => ({ ...prev, module: suggestions.suggestedModule }));
      } else {
        setFormData(prev => ({ ...prev, module: 'custom' }));
        setCustomModule(suggestions.suggestedModule);
      }
    }
    
    // Apply tag suggestions
    if (suggestions.suggestedTags && suggestions.suggestedTags.length > 0) {
      setTags(prev => {
        const newTags = [...prev];
        suggestions.suggestedTags.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
        return newTags;
      });
    }
  };
  
  // Reset form state
  const reset = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      milestone: '',
      phase: '',
      module: '',
      useAiStructure: true,
      useAiDescription: true,
      generateTasks: true, // Keep task generation enabled
      dryRun: false
    });
    setCustomModule('');
    setTags([]);
    setTagInput('');
    setSuggestions(null);
    setAiAnalysisStatus('waiting');
    setError(null);
    setResult(null);
    // Keep AI assistance setting between sessions
  };
  
  // Handle form close
  const handleClose = () => {
    reset();
    if (typeof onClose === 'function') {
      onClose();
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // Get final module value
      const finalModule = formData.module === 'custom' ? customModule : formData.module;

      // Prepare data for the API
      const apiData = {
        ...formData,
        module: finalModule,
        tags: tags
      };

      // If dry run mode is enabled, just simulate a response
      if (formData.dryRun) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simulate task generation estimate
        const taskEstimate = await featureAgentService.analyzeFeatureWithTaskEstimate(
          formData.name,
          formData.description
        );

        // Simulate dry run response
        const dryRunResponse = {
          success: true,
          message: `Feature would be created successfully with ${taskEstimate.taskEstimate?.estimatedTaskCount || 'several'} tasks`,
          feature_id: formData.id || 'feature-xxxx-' + formData.name.toLowerCase().replace(/[^\w]+/g, '-'),
          dryRun: true,
          taskEstimate: taskEstimate.taskEstimate,
          next_steps: "To create the feature for real, disable the 'Dry Run' option and submit again."
        };

        setResult(dryRunResponse);
      } else {
        // Real feature creation with or without tasks
        const response = await featureAgentService.createFeatureWithTasks(
          apiData,
          formData.generateTasks // Whether to auto-generate tasks
        );

        // Format the response for display
        const successResponse = {
          success: response.success,
          message: response.message,
          feature_id: response.feature?.id,
          feature: response.feature,
          taskCount: response.tasks?.length || 0,
          next_steps: `Feature created successfully${response.tasks?.length ? ` with ${response.tasks.length} tasks` : ''}. You can now:
1. View the feature details
2. Run the feature
3. ${response.tasks?.length ? 'View and manage tasks' : 'Generate tasks'}`
        };

        setResult(successResponse);

        // If successful, trigger the success callback
        if (response.success) {
          if (typeof onSuccess === 'function') {
            onSuccess(successResponse);
          }
        }
      }
    } catch (error) {
      console.error('Error creating feature:', error);
      setError(error.response?.data?.message || error.message || 'Failed to create feature');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  // Function for AI-assisted complete feature creation using the Feature Creation Agent
  const createFeatureWithAI = async () => {
    setIsChatLoading(true);
    setUseChatAssistantToCreate(true);
    
    try {
      // Create a feature request prompt
      const message = `Please create a complete feature based on my current inputs:
Name: ${formData.name || "[Not specified]"}
Description: ${formData.description || "[Not specified]"}
${formData.milestone ? `Milestone: ${formData.milestone}` : ""}
${formData.phase ? `Phase: ${formData.phase}` : ""}
${formData.module ? `Module: ${formData.module}` : ""}

Please analyze this information and suggest a complete feature with:
1. A proper feature ID following the convention feature-XXXX-name
2. Detailed description of functionality
3. Proper placement in the system
4. Appropriate tags
5. Integration with related components
6. Dependency relationships if any`;

      // Add user message to chat
      setChatMessages(prev => [...prev, { role: 'user', content: message }]);
      
      // Call the Feature Creation Agent API
      const featureRequest = {
        name: formData.name || "New Feature",
        description: formData.description || "",
        projectId: formData.projectId,
        milestone: formData.milestone,
        phase: formData.phase,
        module: formData.module,
        tags: tags
      };
      
      // Process the feature using the combined agent (feature + tasks)
      const result = await featureAgentService.createFeatureWithTasks(featureRequest, true);

      if (result.success && result.feature) {
        // Extract feature details from the response
        const feature = result.feature;
        const featureId = feature.id;
        const suggestedMilestone = feature.suggestedMilestone;
        const suggestedPhase = feature.suggestedPhase;
        const suggestedModule = feature.suggestedModule;
        const suggestedTags = feature.suggestedTags || [];
        const taskCount = result.tasks?.length || 0;
        
        // Format the AI response using the feature details
        const aiResponse = `I've analyzed your request and created a comprehensive feature:

## Feature Details
- **ID**: ${featureId}
- **Name**: ${formData.name || "New Feature"}
- **Milestone**: ${suggestedMilestone}
- **Phase**: ${suggestedPhase}
- **Module**: ${suggestedModule}

## Description
${formData.description || "This feature enhances the system by providing improved functionality and user experience. It integrates with existing components while maintaining system stability."} 

## Tags
${suggestedTags.map(tag => `- ${tag}`).join('\n')}

## System Placement
This feature fits in the ${suggestedMilestone.replace('milestone-', '')} milestone, specifically in ${suggestedPhase} focusing on ${suggestedModule}.

## Analysis Details
${feature.analysisDetails ? `- Domain: ${feature.analysisDetails.domain}
- Purpose: ${feature.analysisDetails.purpose}
- Confidence: ${Math.round(feature.analysisDetails.confidence * 100)}%` : ''}

${feature.potentialDependencies && feature.potentialDependencies.length > 0 ?
`## Potential Dependencies
${feature.potentialDependencies.map(dep => `- ${dep.name} (${dep.id})`).join('\n')}` : ''}

${taskCount > 0 ?
`## Generated Tasks
I've automatically generated ${taskCount} tasks for this feature, including design, implementation, testing, and documentation tasks.` :
'Note: No tasks were generated for this feature.'}

Would you like me to apply these recommendations to your form? Or would you like to modify any aspect of this feature?`;

        // Add AI response to chat
        setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        
        // Set the suggestions from the agent response
        setSuggestions({
          suggestedId: featureId,
          suggestedMilestone: suggestedMilestone,
          suggestedPhase: suggestedPhase,
          suggestedModule: suggestedModule,
          suggestedTags: suggestedTags,
          potentialDependencies: feature.potentialDependencies || []
        });
        
        setAiAnalysisStatus('completed');
      } else {
        // Fallback if the agent request failed
        const featureId = `feature-${Math.floor(1000 + Math.random() * 9000)}-${formData.name.toLowerCase().replace(/[^\w]+/g, '-') || 'new-feature'}`;
        
        const aiResponse = `I've analyzed your request and created a comprehensive feature:

## Feature Details
- **ID**: ${featureId}
- **Name**: ${formData.name || "New Feature"}
- **Milestone**: ${formData.milestone || "milestone-ui-dashboard"}
- **Phase**: ${formData.phase || "phase-02"}
- **Module**: ${formData.module || "feature-improvements"}

## Description
${formData.description || "This feature enhances the system by providing improved functionality and user experience. It integrates with existing components while maintaining system stability."} 

## Tags
- ${formData.name ? formData.name.toLowerCase().split(/[^\w]+/).filter(w => w.length > 3)[0] || "feature" : "feature"}
- ${formData.description ? formData.description.toLowerCase().split(/[^\w]+/).filter(w => w.length > 4)[0] || "enhancement" : "enhancement"}
- development
- ui-integration

## System Placement
This feature fits in the ${formData.milestone || "UI Dashboard"} milestone, specifically in ${formData.phase || "phase-02"} focusing on ${formData.module || "feature improvements"}.

Would you like me to apply these recommendations to your form? Or would you like to modify any aspect of this feature?`;

        // Add AI response to chat
        setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        
        // Generate suggestions based on AI response
        setSuggestions({
          suggestedId: featureId,
          suggestedMilestone: formData.milestone || "milestone-ui-dashboard",
          suggestedPhase: formData.phase || "phase-02",
          suggestedModule: formData.module || "feature-improvements",
          suggestedTags: [
            formData.name ? formData.name.toLowerCase().split(/[^\w]+/).filter(w => w.length > 3)[0] || "feature" : "feature",
            formData.description ? formData.description.toLowerCase().split(/[^\w]+/).filter(w => w.length > 4)[0] || "enhancement" : "enhancement",
            "development",
            "ui-integration"
          ]
        });
        
        setAiAnalysisStatus('completed');
      }
      
      // Ensure scroll to bottom after AI response
      setTimeout(scrollToBottom, 100);
      
    } catch (error) {
      console.error('Error in AI feature creation:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error creating the feature. Please try again or fill in the form manually." 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-lg shadow-lg w-[90%] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-700">
        <div className="bg-gray-700 px-4 py-3 flex justify-between items-center rounded-t-lg">
          <h2 className="font-semibold text-xl text-white">Create New Feature</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowChatAssistant(!showChatAssistant)}
              className={`text-sm px-3 py-1 rounded-md ${showChatAssistant ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
            >
              {showChatAssistant ? 'Hide Assistant' : 'Show Assistant'}
            </button>
            <button 
              onClick={handleClose}
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
                <h3 className="text-lg font-semibold mb-2">{result.success ? 'Feature Creation Successful' : 'Feature Creation Failed'}</h3>
                <p className="mb-3">{result.message}</p>
                
                {result.success && result.feature_id && (
                  <div>
                    <p className="mb-2">Feature ID: <span className="font-mono bg-gray-800/50 px-1 rounded">{result.feature_id}</span></p>

                    {/* Show task information */}
                    {result.dryRun && result.taskEstimate && (
                      <div className="mt-3 mb-3">
                        <h4 className="font-medium mb-2">Estimated Tasks:</h4>
                        <div className="bg-gray-900/50 p-3 rounded-md">
                          <p className="mb-1">Approximately {result.taskEstimate.estimatedTaskCount} tasks would be generated.</p>

                          {result.taskEstimate.taskTypes && result.taskEstimate.taskTypes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400 mb-1">Task types would include:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {result.taskEstimate.taskTypes.map((taskType, index) => (
                                  <span key={index} className="bg-gray-800 px-2 py-1 rounded-full text-xs">
                                    {taskType}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show task count for real creation */}
                    {!result.dryRun && result.taskCount !== undefined && (
                      <div className="mt-3 mb-3">
                        <h4 className="font-medium mb-2">Task Generation:</h4>
                        <div className="bg-gray-900/50 p-3 rounded-md">
                          {result.taskCount > 0 ? (
                            <p className="mb-1">Successfully generated {result.taskCount} tasks for this feature.</p>
                          ) : (
                            <p className="mb-1">No tasks were generated for this feature.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {result.next_steps && (
                      <div>
                        <h4 className="font-medium mt-3 mb-2">Next Steps:</h4>
                        <pre className="bg-gray-900 p-3 rounded-md overflow-auto text-xs whitespace-pre-wrap">{result.next_steps}</pre>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Feature ID */}
                  <div className="md:col-span-2">
                    <label htmlFor="id" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Feature ID:</label>
                    <input
                      type="text"
                      id="id"
                      name="id"
                      value={formData.id}
                      onChange={handleChange}
                      placeholder="feature-XXXX-name"
                      required
                      className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    />
                    <small className="block mt-1 text-xs text-gray-400">e.g., feature-1003-mini-loop-testing</small>
                  </div>
                  
                  {/* Feature Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Feature Name:</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Feature Name"
                      required
                      className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    />
                  </div>
                  
                  {/* Feature Description */}
                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Description:</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Feature description"
                      rows="3"
                      className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                    />
                  </div>
                  
                  {/* AI Options Box */}
                  <div className="md:col-span-2 mb-2">
                    <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center text-blue-300">
                          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          <h3 className="font-medium">AI Integration</h3>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="text-sm text-gray-400 mr-2">Enable AI</span>
                          <div 
                            className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer transition-colors duration-300 ${aiAssisted ? 'bg-blue-600' : 'bg-gray-600'}`}
                            onClick={() => setAiAssisted(!aiAssisted)}
                          >
                            <div 
                              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${aiAssisted ? 'translate-x-6' : 'translate-x-0'}`}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {aiAssisted ? (
                        <>
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
                                  setMessageInput("Tell me about AI structure generation for features");
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
                                  setMessageInput("How does AI description generation work for features?");
                                  setShowChatAssistant(true);
                                  handleSendMessage();
                                }}
                              >
                                Learn more
                              </button>
                            </div>
                          </div>
                          
                          {aiAnalysisStatus === 'analyzing' ? (
                            <div className="mt-3 text-sm text-blue-400 flex items-center">
                              <svg className="animate-spin h-4 w-4 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              AI is analyzing your feature...
                            </div>
                          ) : suggestions ? (
                            <div className="mt-3">
                              <div className="text-sm text-green-400 flex items-center mb-2">
                                <svg className="h-4 w-4 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                                Feature analyzed - AI suggestions available
                              </div>
                              
                              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Preview of AI decisions:</div>
                              <div className="space-y-1 text-xs">
                                {suggestions.suggestedId && (
                                  <div>
                                    <span className="text-gray-500">ID:</span>
                                    <span className="text-blue-300 ml-1">{suggestions.suggestedId}</span>
                                  </div>
                                )}
                                {suggestions.suggestedMilestone && (
                                  <div>
                                    <span className="text-gray-500">Milestone:</span>
                                    <span className="text-blue-300 ml-1">{suggestions.suggestedMilestone}</span>
                                  </div>
                                )}
                                {suggestions.suggestedPhase && (
                                  <div>
                                    <span className="text-gray-500">Phase:</span>
                                    <span className="text-blue-300 ml-1">{suggestions.suggestedPhase}</span>
                                  </div>
                                )}
                                {suggestions.suggestedModule && (
                                  <div>
                                    <span className="text-gray-500">Module:</span>
                                    <span className="text-blue-300 ml-1">{suggestions.suggestedModule}</span>
                                  </div>
                                )}
                                {suggestions.suggestedTags && suggestions.suggestedTags.length > 0 && (
                                  <div>
                                    <span className="text-gray-500">Tags:</span>
                                    <span className="text-blue-300 ml-1">{suggestions.suggestedTags.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                              
                              {!formData.id && suggestions.suggestedId && (
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, id: suggestions.suggestedId }))}
                                  className="mt-2 text-xs px-2 py-1 bg-blue-600/80 text-white rounded hover:bg-blue-600 transition"
                                >
                                  Use suggested ID
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="mt-3 text-sm text-gray-400">
                              Enter a feature name and description to activate AI analysis
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">
                          AI assistance is disabled. Enable AI to get automatic suggestions for feature structure and placement.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Milestone */}
                  <div>
                    <label htmlFor="milestone" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Milestone:</label>
                    <select
                      id="milestone"
                      name="milestone"
                      value={formData.milestone}
                      onChange={handleChange}
                      className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                      required
                    >
                      <option value="">Select a milestone</option>
                      {milestones.map(milestone => (
                        <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Phase */}
                  <div>
                    <label htmlFor="phase" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Phase:</label>
                    <select
                      id="phase"
                      name="phase"
                      value={formData.phase}
                      onChange={handleChange}
                      className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                      required
                      disabled={!formData.milestone}
                    >
                      <option value="">Select a phase</option>
                      {phases.map(phase => (
                        <option key={phase.id} value={phase.id}>{phase.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Module */}
                  <div className="md:col-span-2">
                    <label htmlFor="module" className="block mb-1 text-[rgba(255,255,255,0.7)] font-medium text-sm">Module:</label>
                    <select
                      id="module"
                      name="module"
                      value={formData.module}
                      onChange={handleChange}
                      className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                      required
                      disabled={!formData.phase}
                    >
                      <option value="">Select a module</option>
                      {modules.map(module => (
                        <option key={module.id} value={module.id}>{module.name}</option>
                      ))}
                      <option value="custom">Add custom module...</option>
                    </select>
                    
                    {formData.module === 'custom' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={customModule}
                          onChange={(e) => setCustomModule(e.target.value)}
                          className="bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                          placeholder="Enter custom module ID"
                          required
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Tags */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Tags
                      </label>
                      {analyzing ? (
                        <span className="text-xs text-blue-400 animate-pulse">AI analyzing...</span>
                      ) : suggestions?.suggestedTags?.length > 0 ? (
                        <span className="text-xs text-green-400">AI suggestions available</span>
                      ) : null}
                    </div>
                    <div className="flex">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagKeyPress}
                        className="flex-1 bg-transparent border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-l-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                        placeholder="Add tags..."
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="bg-blue-600 text-white px-3 py-2 rounded-r-md hover:bg-blue-700 transition"
                      >
                        Add
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map(tag => (
                        <span 
                          key={tag} 
                          className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs flex items-center"
                        >
                          {tag}
                          <button 
                            type="button"
                            className="ml-2 text-gray-400 hover:text-red-400"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    
                    {suggestions?.suggestedTags?.length > 0 && tags.length === 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-400">AI suggested tags:</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {suggestions.suggestedTags.map(tag => (
                            <button 
                              key={tag} 
                              type="button"
                              className="px-2 py-1 bg-gray-700/80 text-gray-300 text-xs rounded hover:bg-gray-700 transition"
                              onClick={() => setTags(prev => [...prev, tag])}
                            >
                              {tag}
                            </button>
                          ))}
                          <button 
                            type="button"
                            className="px-2 py-1 bg-blue-600/80 text-white text-xs rounded hover:bg-blue-600 transition"
                            onClick={() => setTags(suggestions.suggestedTags)}
                          >
                            Use all
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Generate Tasks Option */}
                  <div className="md:col-span-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="generateTasks"
                        checked={formData.generateTasks}
                        onChange={handleChange}
                        className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-0"
                      />
                      <span className="ml-2 text-white text-sm">Auto-generate tasks with AI (recommended)</span>
                    </label>
                  </div>

                  {/* Dry Run */}
                  <div className="md:col-span-2">
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
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : formData.dryRun ? 'Simulate Creation' : 'Create Feature'}
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
                  <h3 className="font-medium text-white">AI Feature Assistant</h3>
                  <p className="text-xs text-gray-400">Ask questions about feature creation and organization</p>
                </div>
                {!useChatAssistantToCreate && (
                  <button
                    onClick={createFeatureWithAI}
                    className="text-sm px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition"
                    disabled={isChatLoading}
                  >
                    AI Create Feature
                  </button>
                )}
              </div>
              
              <div id="chatContainer" className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-15rem)]">
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
                  <div id="chatEnd" ref={el => el && chatMessages.length > 0 && el.scrollIntoView({ behavior: 'smooth' })}></div>
                </div>
              </div>
              
              <div className="p-3 border-t border-gray-700">
                <div className="flex">
                  <textarea
                    className="flex-1 bg-[#1a2233] border border-gray-700 rounded-l-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
                    placeholder="Ask about feature creation..."
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
                        setMessageInput("What are best practices for feature creation?");
                        handleSendMessage();
                      }}
                    >
                      Best practices
                    </button>
                    <button 
                      className="text-xs text-blue-400 hover:text-blue-300"
                      onClick={() => {
                        setMessageInput("Show me an example feature structure");
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
                        { role: 'system', content: 'I can help you create a well-structured feature. Ask me any questions about feature creation or organization.' },
                        { role: 'assistant', content: 'Welcome to the Feature Creator AI Assistant! I can help you create a well-structured feature with proper organization. You can either fill in the form manually or ask me to help generate parts of it. What kind of feature would you like to create today?' }
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

export default FeatureCreator;