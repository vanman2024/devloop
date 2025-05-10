/**
 * StructureValidation With Triggers
 * 
 * This component wraps the main StructureValidation component with the TriggerProvider
 * to ensure it has access to the trigger system, even when using the local fallback.
 */

import React from 'react';
import StructureValidation from './StructureValidation';
import { TriggerProvider } from './TriggerContext.jsx';

/**
 * Wrapped version of StructureValidation with TriggerProvider
 */
const StructureValidationWithTriggers = (props) => {
  return (
    <TriggerProvider>
      <StructureValidation {...props} />
    </TriggerProvider>
  );
};

export default StructureValidationWithTriggers;