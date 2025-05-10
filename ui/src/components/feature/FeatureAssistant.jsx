import React, { useState } from 'react';
import EnhancedChatModal from '../EnhancedChatModal';
import { Button, Card, CardContent, Typography, Box, Chip, Tooltip } from '@mui/material';
import { LightbulbOutlined, AutoFixHigh, FormatListBulleted } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/**
 * FeatureAssistant component provides an AI-powered assistant for feature creation 
 * and management using the agent orchestration system.
 */
const FeatureAssistant = ({ featureId = null, featureName = null }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const navigate = useNavigate();
  
  const workflowOptions = [
    {
      id: 'feature_creation',
      name: 'Create New Feature',
      description: 'Design a new feature with requirements analysis',
      icon: <LightbulbOutlined />,
      initialPrompt: "I'd like to create a new feature. Please help me design it with clear requirements.",
      context: { 
        workflow: 'feature_task_workflow',
        initialStep: 'feature_creation' 
      }
    },
    {
      id: 'feature_enhancement',
      name: 'Enhance Existing Feature',
      description: 'Add capabilities to an existing feature',
      icon: <AutoFixHigh />,
      initialPrompt: `I'd like to enhance the feature${featureName ? ` "${featureName}"` : ''}. What improvements can we make?`,
      context: { 
        workflow: 'feature_enhancement_workflow',
        initialStep: 'analyze_current_feature',
        featureId,
        featureName
      }
    },
    {
      id: 'task_breakdown',
      name: 'Break Down Into Tasks',
      description: 'Split a feature into implementable tasks',
      icon: <FormatListBulleted />,
      initialPrompt: `Please break down the feature${featureName ? ` "${featureName}"` : ''} into implementable tasks.`,
      context: { 
        workflow: 'feature_task_workflow',
        initialStep: 'task_breakdown',
        skipSteps: ['feature_creation'],
        featureId,
        featureName
      }
    }
  ];
  
  const handleStartWorkflow = (workflow) => {
    setActiveWorkflow(workflow);
    setIsChatOpen(true);
  };
  
  const handleChatClose = (results) => {
    setIsChatOpen(false);
    setActiveWorkflow(null);
    
    // If we have results and they contain a featureId, navigate to the feature page
    if (results?.featureId) {
      navigate(`/features/${results.featureId}`);
    }
  };
  
  return (
    <>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Feature Assistant
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Get help designing features, enhancing existing ones, or breaking them down into tasks 
            using our AI-powered orchestration system.
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {workflowOptions.map((workflow) => (
              <Button
                key={workflow.id}
                variant="outlined"
                startIcon={workflow.icon}
                onClick={() => handleStartWorkflow(workflow)}
                disabled={workflow.id !== 'feature_creation' && !featureId}
                fullWidth
                sx={{ justifyContent: 'flex-start', py: 1 }}
              >
                <Box sx={{ textAlign: 'left', flex: 1 }}>
                  <Typography variant="subtitle2">{workflow.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {workflow.description}
                  </Typography>
                </Box>
                
                {workflow.id !== 'feature_creation' && !featureId && (
                  <Tooltip title="Select a feature first">
                    <Chip size="small" label="Select feature" />
                  </Tooltip>
                )}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>
      
      {isChatOpen && activeWorkflow && (
        <EnhancedChatModal
          isOpen={isChatOpen}
          onClose={handleChatClose}
          featureId={featureId}
          featureName={featureName}
          initialPrompt={activeWorkflow.initialPrompt}
          initialContext={activeWorkflow.context}
        />
      )}
    </>
  );
};

export default FeatureAssistant;