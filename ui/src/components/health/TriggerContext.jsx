/**
 * Fallback Trigger Context
 * 
 * This is a fallback implementation of the TriggerContext from the system-health-agent,
 * used when the main trigger context is not available. It provides a mock implementation
 * that allows the StructureValidation component to function even when the agent's
 * trigger system is not available.
 */

import React, { createContext, useContext, useState } from 'react';

// Create context with default mock implementation
const TriggerContext = createContext({
  executeTrigger: null,
  registerTrigger: () => {},
  isTriggerRegistered: () => false,
  getTriggerDetails: () => null
});

/**
 * TriggerProvider component that provides the trigger context
 */
export const TriggerProvider = ({ children }) => {
  const [triggers, setTriggers] = useState({});

  // Mock implementation of executeTrigger
  const executeTrigger = async (triggerId, params = {}) => {
    console.warn('Using mock trigger execution for:', triggerId, params);
    
    // Return a mock successful result
    return {
      success: true,
      result: {
        message: `Mock execution of trigger ${triggerId}`,
        timestamp: new Date().toISOString(),
        issues: {} // Mock empty issues object
      }
    };
  };

  // Register a new trigger
  const registerTrigger = (triggerId, triggerDetails) => {
    setTriggers(prev => ({
      ...prev,
      [triggerId]: triggerDetails
    }));
    return true;
  };

  // Check if a trigger is registered
  const isTriggerRegistered = (triggerId) => {
    return !!triggers[triggerId];
  };

  // Get details for a specific trigger
  const getTriggerDetails = (triggerId) => {
    return triggers[triggerId] || null;
  };

  // Context value
  const contextValue = {
    executeTrigger,
    registerTrigger,
    isTriggerRegistered,
    getTriggerDetails
  };

  return (
    <TriggerContext.Provider value={contextValue}>
      {children}
    </TriggerContext.Provider>
  );
};

/**
 * Custom hook to use the trigger context
 */
export const useTrigger = () => {
  const context = useContext(TriggerContext);
  return context;
};

export default TriggerContext;