import React, { useState, useEffect } from 'react';

const StructureValidation = () => {
  const [loading, setLoading] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [validationResults, setValidationResults] = useState({
    brokenLinks: [],
    duplicateIds: [],
    invalidNesting: [],
    missingStatus: [],
    orphanedFeatures: []
  });
  const [scriptValidationResults, setScriptValidationResults] = useState({
    duplicateScripts: [],
    orphanedScripts: [],
    poorlyReferencedScripts: [],
    scriptOrganizationIssues: []
  });
  const [expanded, setExpanded] = useState({});
  const [actionInProgress, setActionInProgress] = useState({});
  const [activeSection, setActiveSection] = useState('features'); // 'features' or 'scripts'
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);

  const toggleExpand = (category) => {
    setExpanded({
      ...expanded,
      [category]: !expanded[category]
    });
  };

  // Mock data for demonstration - would be replaced with actual API calls
  const fetchValidationData = async () => {
    setLoading(true);
    try {
      // In real implementation, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setValidationResults({
        brokenLinks: [
          { id: 'feature-1023', module: 'module-user-auth', phase: 'phase-02', message: 'References non-existent module-api-integration' },
          { id: 'feature-1045', module: 'module-dashboard', phase: 'phase-03', message: 'References non-existent feature-1099' }
        ],
        duplicateIds: [
          { id: 'feature-2033', locations: ['milestone-ui-dashboard/phase-01', 'milestone-ui-dashboard/phase-03'] }
        ],
        invalidNesting: [
          { id: 'module-reports', phase: 'phase-05', message: 'Phase phase-05 does not exist in the parent milestone' },
          { id: 'feature-3042', module: 'module-unknown', phase: 'phase-02', message: 'Module module-unknown does not exist in phase-02' }
        ],
        missingStatus: [
          { id: 'feature-2099', module: 'module-api-bridge', phase: 'phase-01', milestone: 'milestone-api-working' },
          { id: 'feature-3019', module: 'module-integration', phase: 'phase-03', milestone: 'milestone-github-integration' }
        ],
        orphanedFeatures: [
          { id: 'feature-1078', path: 'milestones/milestone-core-foundation/phase-01/orphaned-feature' },
          { id: 'feature-2055', path: 'milestones/milestone-ui-dashboard/orphaned-feature' }
        ]
      });
    } catch (error) {
      console.error('Error fetching validation data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch script validation data - Mock implementation
  const fetchScriptValidationData = async () => {
    setScriptLoading(true);
    try {
      // In real implementation, this would call the File Organization Agent API
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Mock data for demonstration, with roadmap relationships included
      setScriptValidationResults({
        duplicateScripts: [
          { 
            id: 'script-1001', 
            name: 'start-server.sh',
            paths: [
              '/mnt/c/Users/angel/Devloop/scripts/start-server.sh',
              '/mnt/c/Users/angel/Devloop/system-core/ui-system/start-server.sh'
            ],
            similarity: 0.92,
            roadmapItems: [
              { type: 'feature', id: 'feature-3099', name: 'Server Launch System', milestone: 'milestone-api-working', phase: 'phase-01', module: 'module-server-management' },
              { type: 'feature', id: 'feature-4055', name: 'UI Server Launcher', milestone: 'milestone-ui-dashboard', phase: 'phase-02', module: 'module-ui-infrastructure' }
            ]
          },
          { 
            id: 'script-1004', 
            name: 'generate-report.js',
            paths: [
              '/mnt/c/Users/angel/Devloop/scripts/utils/generate-report.js',
              '/mnt/c/Users/angel/Devloop/system-core/scripts/generate-report.js'
            ],
            similarity: 0.86,
            roadmapItems: [
              { type: 'feature', id: 'feature-2077', name: 'System Reporting', milestone: 'milestone-system-enhancement', phase: 'phase-02', module: 'module-reporting' },
              { type: 'feature', id: 'feature-3145', name: 'Reporting Utilities', milestone: 'milestone-system-enhancement', phase: 'phase-03', module: 'module-utilities' }
            ]
          }
        ],
        orphanedScripts: [
          {
            id: 'script-2003',
            name: 'old-cleanup.sh',
            path: '/mnt/c/Users/angel/Devloop/scripts/archive/old-cleanup.sh',
            lastUsed: '2024-12-15T10:30:00Z',
            referenceCount: 0,
            previousRoadmapItems: [
              { type: 'feature', id: 'feature-1023', name: 'System Cleanup', milestone: 'milestone-core-foundation', phase: 'phase-01', module: 'module-maintenance', status: 'deprecated' }
            ]
          },
          {
            id: 'script-2008',
            name: 'temp-fix.py',
            path: '/mnt/c/Users/angel/Devloop/scripts/temp/temp-fix.py',
            lastUsed: null,
            referenceCount: 0,
            previousRoadmapItems: []
          }
        ],
        poorlyReferencedScripts: [
          {
            id: 'script-3002',
            name: 'build-features.sh',
            path: '/mnt/c/Users/angel/Devloop/scripts/build-features.sh',
            referenceIssue: 'Referenced using relative paths from multiple locations',
            references: [
              { file: '/mnt/c/Users/angel/Devloop/ui.sh', line: 23, path: '../scripts/build-features.sh' },
              { file: '/mnt/c/Users/angel/Devloop/start-ui.sh', line: 15, path: './scripts/build-features.sh' }
            ],
            roadmapItems: [
              { type: 'feature', id: 'feature-1034', name: 'Feature Build System', milestone: 'milestone-core-foundation', phase: 'phase-02', module: 'module-feature-management' }
            ]
          }
        ],
        scriptOrganizationIssues: [
          {
            id: 'script-4001',
            name: 'launch-integration-sync.sh',
            path: '/mnt/c/Users/angel/Devloop/launch-integration-sync.sh',
            type: 'location',
            message: 'Script should be in scripts/launcher/ directory based on its function',
            roadmapItems: [
              { type: 'feature', id: 'feature-5023', name: 'Integration Synchronization', milestone: 'milestone-ai-enhanced-development-experience', phase: 'phase-01', module: 'module-integration' }
            ],
            suggestedPath: '/mnt/c/Users/angel/Devloop/scripts/launcher/launch-integration-sync.sh'
          },
          {
            id: 'script-4005',
            name: 'test_api_key.py',
            path: '/mnt/c/Users/angel/Devloop/test_api_key.py',
            type: 'location',
            message: 'Test script should be in test/ directory',
            roadmapItems: [
              { type: 'feature', id: 'feature-4077', name: 'API Key Management', milestone: 'milestone-api-working', phase: 'phase-02', module: 'module-security' }
            ],
            suggestedPath: '/mnt/c/Users/angel/Devloop/test/test_api_key.py'
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching script validation data:', error);
    } finally {
      setScriptLoading(false);
    }
  };

  useEffect(() => {
    fetchValidationData();
    fetchScriptValidationData();
  }, []);

  const getIssueSeverity = (category, count) => {
    if (count === 0) return 'success';
    if (category === 'brokenLinks' || category === 'duplicateIds' || category === 'duplicateScripts') return 'danger';
    if (category === 'invalidNesting' || category === 'poorlyReferencedScripts') return 'warning';
    return 'warning';
  };

  // Function to open a modal with custom content
  const openModal = (title, content) => {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };
  
  // Function to close the modal
  const closeModal = () => {
    setModalOpen(false);
    setModalTitle('');
    setModalContent(null);
  };
  
  
  
  // View file details including scripts and features
  const viewFileDetails = (file) => {
    // Determine if this is a feature or script
    const isFeature = ['brokenLinks', 'duplicateIds', 'invalidNesting', 'missingStatus', 'orphanedFeatures'].includes(file.category);
    
    // Check if this is a specific section view
    const showSpecificSection = file.section === 'references' || file.section === 'comparison';
    
    // Get appropriate title based on view type
    let title = "";
    if (showSpecificSection) {
      if (file.section === 'references') {
        title = `References for ${isFeature ? file.id : file.name}`;
      } else if (file.section === 'comparison') {
        title = `Comparing ${file.name} Files`;
      }
    } else {
      title = isFeature ? `Feature Details: ${file.name || file.id}` : `Script Details: ${file.name}`;
    }
    
    // Determine appropriate message based on category
    let issueMessage = "";
    let issueType = "";
    
    switch(file.category) {
      case 'brokenLinks':
        issueMessage = file.message || "References non-existent component";
        issueType = "Broken References";
        break;
      case 'duplicateIds':
        issueMessage = "Duplicate ID found in multiple locations";
        issueType = "Duplicate ID";
        break;
      case 'invalidNesting':
        issueMessage = file.message || "Invalid nesting in file structure";
        issueType = "Invalid Nesting";
        break;
      case 'missingStatus':
        issueMessage = "Missing status or last_updated field";
        issueType = "Missing Metadata";
        break;
      case 'orphanedFeatures':
        issueMessage = "Feature exists but is not registered in system";
        issueType = "Orphaned File";
        break;
      case 'duplicateScripts':
        issueMessage = "Duplicate functionality found in multiple files";
        issueType = "Duplicate Script";
        break;
      case 'orphanedScripts':
        issueMessage = file.lastUsed 
          ? `Last used ${new Date(file.lastUsed).toLocaleDateString()}` 
          : 'No recent usage detected';
        issueType = "Orphaned Script";
        break;
      case 'poorlyReferencedScripts':
        issueMessage = file.referenceIssue || "Inconsistent references to this file";
        issueType = "Reference Problem";
        break;
      case 'scriptOrganizationIssues':
        issueMessage = file.message || "Improper organization in file structure";
        issueType = "Organization Issue";
        break;
      default:
        issueMessage = "File structure issue detected";
        issueType = "Structure Issue";
    }
    
    // Determine action based on category
    let actionButton = "Fix Issue";
    let actionHandler = '';
    
    switch(file.category) {
      case 'brokenLinks':
        actionButton = "Fix Link";
        actionHandler = 'fix-link';
        break;
      case 'duplicateIds':
        actionButton = "Rename Duplicate";
        actionHandler = 'rename-duplicate';
        break;
      case 'invalidNesting':
        actionButton = "Fix Nesting";
        actionHandler = 'fix-nesting';
        break;
      case 'missingStatus':
        actionButton = "Add Status";
        actionHandler = 'add-status';
        break;
      case 'orphanedFeatures':
        actionButton = "Register File";
        actionHandler = 'register-feature';
        break;
      case 'duplicateScripts':
        actionButton = "Consolidate Files";
        actionHandler = 'consolidate';
        break;
      case 'orphanedScripts':
        actionButton = "Archive File";
        actionHandler = 'archive';
        break;
      case 'poorlyReferencedScripts':
        actionButton = "Fix References";
        actionHandler = 'fix-references';
        break;
      case 'scriptOrganizationIssues':
        actionButton = "Fix Organization";
        actionHandler = 'reorganize';
        break;
      default:
        actionButton = "Fix Issue";
        actionHandler = 'fix';
    }
    
    // Different content based on section type
    let content = null;
    
    // Special view for file comparison
    if (file.section === 'comparison') {
      // In a real implementation, this would fetch the contents of both files
      const mockFirstFileContent = "#!/bin/bash\n\n# Start the server\ncd /mnt/c/Users/angel/Devloop\nnpm run start";
      const mockSecondFileContent = "#!/bin/bash\n\n# Start the UI server\ncd /mnt/c/Users/angel/Devloop/system-core/ui-system\nnpm run start:dev";
      
      const firstPath = file.paths ? file.paths[0] : 'Unknown';
      const secondPath = file.paths ? file.paths[1] : 'Unknown';
      
      content = (
        <div className="p-4">
          <h3 className="font-medium text-lg mb-3">File Comparison</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">{firstPath}</h4>
              <div className="bg-gray-700 p-2 rounded mb-4 font-mono text-sm whitespace-pre overflow-auto max-h-96">
                {mockFirstFileContent}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">{secondPath}</h4>
              <div className="bg-gray-700 p-2 rounded mb-4 font-mono text-sm whitespace-pre overflow-auto max-h-96">
                {mockSecondFileContent}
              </div>
            </div>
          </div>
          
          <h3 className="font-medium text-lg mt-4 mb-2">Similarity Analysis</h3>
          <div className="bg-gray-800 p-3 rounded">
            <p>Files are <span className="text-yellow-400 font-bold">{file.similarity * 100}%</span> similar with the following differences:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Different target directories</li>
              <li>Different npm run commands</li>
              <li>Different comment descriptions</li>
            </ul>
          </div>
          
          {/* Roadmap relationship for context */}
          {file.roadmapItems && file.roadmapItems.length > 0 && (
            <>
              <h3 className="font-medium text-lg mt-4 mb-2">Related Roadmap Items</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Feature ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {file.roadmapItems.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                      <td className="p-2">{item.id}</td>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.milestone}/{item.phase}/{item.module}</td>
                      <td className="p-2">
                        <button 
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                          onClick={() => {
                            // In a real implementation, this would navigate to the roadmap item detail view
                            alert(`This would open the feature: ${item.id} in detail view.`);
                          }}
                        >
                          View Item
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    
    // Special view for references
    else if (file.section === 'references') {
      content = (
        <div className="p-4">
          <h3 className="font-medium text-lg mb-3">File Path</h3>
          <div className="bg-gray-700 p-2 rounded mb-4 font-mono text-sm">
            {file.path}
          </div>
          
          {file.references && file.references.length > 0 && (
            <>
              <h3 className="font-medium text-lg mb-2">Referenced In</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-2">File</th>
                    <th className="text-left p-2">Line</th>
                    <th className="text-left p-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {file.references.map((ref, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                      <td className="p-2">{ref.file}</td>
                      <td className="p-2">{ref.line}</td>
                      <td className="p-2 font-mono">{ref.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          {file.roadmapItems && file.roadmapItems.length > 0 && (
            <>
              <h3 className="font-medium text-lg mt-4 mb-2">Roadmap Items</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Feature ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {file.roadmapItems.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                      <td className="p-2">{item.id}</td>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.milestone}/{item.phase}/{item.module}</td>
                      <td className="p-2">
                        <button 
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                          onClick={() => {
                            // In a real implementation, this would navigate to the roadmap item detail view
                            alert(`This would open the feature: ${item.id} in detail view.`);
                          }}
                        >
                          View Item
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    
    // Default comprehensive details view
    else {
      content = (
        <div className="p-4">
          <h3 className="font-medium text-lg mb-3">{isFeature ? "Feature Details" : "Script Details"}</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="font-medium">ID</h4>
              <p className="text-sm font-mono mt-1">{file.id || file.name}</p>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="font-medium">Current Path</h4>
              <p className="text-sm font-mono mt-1">{file.path}</p>
            </div>
            
            {file.suggestedPath && (
              <div className="bg-gray-800 p-3 rounded col-span-2">
                <h4 className="font-medium">Suggested Path</h4>
                <p className="text-sm font-mono mt-1 text-green-400">{file.suggestedPath}</p>
              </div>
            )}
          </div>
          
          <h3 className="font-medium text-lg mt-4 mb-2">{issueType}</h3>
          <div className="bg-gray-800 p-3 rounded">
            <p className="text-yellow-400">{issueMessage}</p>
            <p className="mt-2">
              {isFeature 
                ? "This feature has been identified as having structural issues within the file system. Fixing these issues will improve system organization and ensure proper integration with the roadmap."
                : "This script has been identified as being improperly organized due to its functionality and references. Moving it to the suggested location will improve system organization and maintainability."
              }
            </p>
          </div>
          
          {/* Location information for duplicates */}
          {(file.category === 'duplicateIds' || file.category === 'duplicateScripts') && file.locations && (
            <>
              <h3 className="font-medium text-lg mt-4 mb-2">Found In Locations</h3>
              <div className="bg-gray-800 p-3 rounded">
                <ul className="list-disc list-inside">
                  {(file.category === 'duplicateIds' ? file.locations : file.paths).map((loc, i) => (
                    <li key={i} className="mb-1 text-gray-300">{loc}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
          
          {/* References section */}
          {file.references && file.references.length > 0 && (
            <>
              <h3 className="font-medium text-lg mt-4 mb-2">Referenced In</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-2">File</th>
                    <th className="text-left p-2">Line</th>
                    <th className="text-left p-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {file.references.map((ref, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                      <td className="p-2">{ref.file}</td>
                      <td className="p-2">{ref.line}</td>
                      <td className="p-2 font-mono">{ref.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          {/* Roadmap Items Section */}
          {file.roadmapItems && file.roadmapItems.length > 0 && (
            <>
              <h3 className="font-medium text-lg mt-4 mb-2">
                {file.category === 'orphanedScripts' && file.previousRoadmapItems 
                  ? 'Previously Related Roadmap Items' 
                  : 'Related Roadmap Items'}
              </h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Feature ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {file.roadmapItems.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                      <td className="p-2">{item.id}</td>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.milestone}/{item.phase}/{item.module}</td>
                      <td className="p-2">
                        <button 
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                          onClick={() => {
                            // In a real implementation, this would navigate to the roadmap item detail view
                            alert(`This would open the feature: ${item.id} in detail view.`);
                          }}
                        >
                          View Item
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => {
                closeModal();
                handleFixScript(file.category, file.id || file.name, actionHandler);
              }}
            >
              {actionButton}
            </button>
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    
    openModal(title, content);
  };
  
  // Handle script fix action - Mock implementation
  const handleFixScript = async (category, scriptId, action) => {
    const actionKey = `${category}-${scriptId}`;
    setActionInProgress({ ...actionInProgress, [actionKey]: true });
    
    try {
      // In a real implementation, this would call the File Organization Agent API
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Update the script validation results to simulate fixing the issue
      setScriptValidationResults(prevResults => {
        const updatedResults = { ...prevResults };
        updatedResults[category] = prevResults[category].filter(item => item.id !== scriptId);
        return updatedResults;
      });
      
      console.log(`Fixed ${category} issue for script ${scriptId} with action ${action}`);
    } catch (error) {
      console.error(`Error fixing script issue:`, error);
    } finally {
      setActionInProgress({ ...actionInProgress, [actionKey]: false });
    }
  };

  const renderIssueList = (issues, category) => {
    if (!expanded[category]) return null;
    
    if (issues.length === 0) {
      return <p className="text-sm text-gray-400 p-2">No issues found.</p>;
    }
    
    return (
      <div className="mt-2 space-y-2">
        {issues.map((issue, index) => {
          // Determine if this is a feature-related item or script-related item
          const isFeatureType = ['brokenLinks', 'duplicateIds', 'invalidNesting', 'missingStatus', 'orphanedFeatures'].includes(category);
          
          // Default roadmap items (to be filled if exists)
          let roadmapItems = [];
          let filePath = '';
          
          // Extract roadmap items and file paths based on issue type
          if (isFeatureType) {
            // Mock data - in real implementation these would come from API
            roadmapItems = [{
              id: issue.id || "",
              name: issue.id ? `Feature ${issue.id.split('-')[1]}` : "",
              milestone: issue.milestone || (issue.path ? issue.path.split('/')[1] : ""),
              phase: issue.phase || "",
              module: issue.module || ""
            }];
            
            filePath = issue.path || `milestones/${issue.milestone || "unknown"}/${issue.phase || "unknown"}/${issue.module || "unknown"}/${issue.id || "unknown"}`;
          } else {
            // For script-based issues, use existing roadmapItems if available
            roadmapItems = issue.roadmapItems || issue.previousRoadmapItems || [];
            filePath = issue.path || (issue.paths ? issue.paths[0] : "");
          }
          
          return (
            <div key={index} className="bg-gray-700 p-3 rounded-md text-sm">
              {/* Common header section */}
              <div className="font-medium">
                {isFeatureType ? issue.id : issue.name}
              </div>
              
              <div className="text-gray-400">
                Path: {filePath}
              </div>
              
              {/* Issue specific message */}
              <div className={`mt-1 ${
                category === 'brokenLinks' || category === 'duplicateIds' || category === 'duplicateScripts' 
                  ? 'text-red-400' 
                  : 'text-yellow-400'
              }`}>
                {/* Display appropriate message based on category */}
                {category === 'brokenLinks' && issue.message}
                {category === 'duplicateIds' && "Duplicate ID found in multiple locations"}
                {category === 'invalidNesting' && issue.message}
                {category === 'missingStatus' && "Missing status or last_updated field"}
                {category === 'orphanedFeatures' && "File exists but is not registered in system"}
                {category === 'duplicateScripts' && "Duplicate functionality found in multiple files"}
                {category === 'orphanedScripts' && (
                  issue.lastUsed 
                    ? `Last used ${new Date(issue.lastUsed).toLocaleDateString()}` 
                    : 'No recent usage detected'
                )}
                {category === 'poorlyReferencedScripts' && issue.referenceIssue}
                {category === 'scriptOrganizationIssues' && issue.message}
              </div>
              
              {/* Location information for duplicates */}
              {(category === 'duplicateIds' || category === 'duplicateScripts') && (
                <div className="mt-1">
                  <div className="text-gray-400">Found in locations:</div>
                  <ul className="list-disc list-inside text-gray-400 mt-1">
                    {(category === 'duplicateIds' ? issue.locations : issue.paths).map((loc, i) => (
                      <li key={i}>{loc}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Reference information */}
              {issue.references && issue.references.length > 0 && (
                <div className="mt-1">
                  <div className="text-gray-400">Referenced in:</div>
                  <ul className="list-disc list-inside text-gray-500 mt-1">
                    {issue.references.map((ref, i) => (
                      <li key={i}>
                        {ref.file}:{ref.line} as <code className="text-xs bg-gray-700 px-1 rounded">{ref.path}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Suggested path if available */}
              {issue.suggestedPath && (
                <div className="mt-1">
                  <div className="text-green-400">Suggested path:</div>
                  <div className="text-gray-300 text-sm">{issue.suggestedPath}</div>
                </div>
              )}
              
              {/* Roadmap relationship section - consistent across all issue types */}
              {roadmapItems && roadmapItems.length > 0 && (
                <div className="mt-2">
                  <div className="text-blue-400">
                    {category === 'orphanedScripts' && issue.previousRoadmapItems 
                      ? 'Previously related to roadmap:' 
                      : 'Related to roadmap:'}
                  </div>
                  <ul className="list-disc list-inside text-gray-400 mt-1">
                    {roadmapItems.map((item, i) => (
                      <li key={i}>
                        <span className="text-gray-300 cursor-pointer hover:text-blue-400" 
                              onClick={() => alert(`This would open a detail view for ${item.id}`)}>
                          {item.id}
                        </span> - {item.name} 
                        <span className="text-gray-500"> ({item.milestone}/{item.phase}/{item.module})</span>
                        {item.status && <span className="text-orange-400 ml-1">({item.status})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Action buttons - unified style */}
              <div className="mt-2 flex gap-2">
                {/* Primary action button */}
                <button 
                  className={`px-2 py-1 ${actionInProgress[`${category}-${issue.id || issue.name}`] ? 'bg-gray-600' : 'bg-blue-600'} text-white text-xs rounded`}
                  onClick={() => {
                    const action = 
                      category === 'brokenLinks' ? 'fix-link' :
                      category === 'duplicateIds' ? 'rename-duplicate' :
                      category === 'invalidNesting' ? 'fix-nesting' :
                      category === 'missingStatus' ? 'add-status' :
                      category === 'orphanedFeatures' ? 'register-feature' :
                      category === 'duplicateScripts' ? 'consolidate' :
                      category === 'orphanedScripts' ? 'archive' :
                      category === 'poorlyReferencedScripts' ? 'fix-references' :
                      category === 'scriptOrganizationIssues' ? 'reorganize' : 'fix';
                      
                    // Use the script handler for now - would be expanded for feature fixes in real implementation
                    handleFixScript(category, issue.id || issue.name, action);
                  }}
                  disabled={actionInProgress[`${category}-${issue.id || issue.name}`]}
                >
                  {actionInProgress[`${category}-${issue.id || issue.name}`] 
                    ? 'Working...' 
                    : category === 'brokenLinks' ? 'Fix Link' :
                      category === 'duplicateIds' ? 'Rename Duplicate' :
                      category === 'invalidNesting' ? 'Fix Nesting' :
                      category === 'missingStatus' ? 'Add Status' :
                      category === 'orphanedFeatures' ? 'Register File' :
                      category === 'duplicateScripts' ? 'Consolidate Files' :
                      category === 'orphanedScripts' ? 'Archive File' :
                      category === 'poorlyReferencedScripts' ? 'Fix References' :
                      category === 'scriptOrganizationIssues' ? 'Fix Organization' : 'Fix Issue'
                  }
                </button>
                
                {/* Secondary buttons */}
                {category === 'duplicateScripts' && (
                  <button 
                    className="px-2 py-1 bg-gray-600 text-white text-xs rounded"
                    onClick={() => viewFileDetails({...issue, category, section: 'comparison'})}
                  >
                    Compare Files
                  </button>
                )}
                
                {category === 'orphanedScripts' && (
                  <button 
                    className={`px-2 py-1 ${actionInProgress[`${category}-${issue.id || issue.name}-delete`] ? 'bg-gray-600' : 'bg-red-600'} text-white text-xs rounded`}
                    onClick={() => handleFixScript(category, issue.id || issue.name, 'delete')}
                    disabled={actionInProgress[`${category}-${issue.id || issue.name}-delete`]}
                  >
                    {actionInProgress[`${category}-${issue.id || issue.name}-delete`] ? 'Working...' : 'Delete Safely'}
                  </button>
                )}
                
                {category === 'poorlyReferencedScripts' && (
                  <button 
                    className="px-2 py-1 bg-gray-600 text-white text-xs rounded"
                    onClick={() => viewFileDetails({...issue, category, section: 'references'})}
                  >
                    View References
                  </button>
                )}
                
                {/* View Details button for all issue types */}
                <button 
                  className="px-2 py-1 bg-gray-600 text-white text-xs rounded"
                  onClick={() => {
                    // Consistent approach across all issue types
                    const isScriptIssue = ['duplicateScripts', 'orphanedScripts', 'poorlyReferencedScripts', 'scriptOrganizationIssues'].includes(category);
                    
                    // Use unified file details view for all file types
                    viewFileDetails({
                      ...issue,
                      name: isScriptIssue ? issue.name : issue.id,
                      path: filePath,
                      category,
                      roadmapItems: roadmapItems
                    });
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const roadmapCategories = [
    { id: 'brokenLinks', name: 'Broken Links', icon: '🔗' },
    { id: 'duplicateIds', name: 'Duplicate IDs', icon: '🔄' },
    { id: 'invalidNesting', name: 'Invalid Nesting', icon: '📦' },
    { id: 'missingStatus', name: 'Missing Status', icon: '❓' },
    { id: 'orphanedFeatures', name: 'Orphaned Features', icon: '👻' }
  ];

  const scriptCategories = [
    { id: 'duplicateScripts', name: 'Duplicate Scripts', icon: '🔄' },
    { id: 'orphanedScripts', name: 'Orphaned Scripts', icon: '👻' },
    { id: 'poorlyReferencedScripts', name: 'Poorly Referenced', icon: '🔍' },
    { id: 'scriptOrganizationIssues', name: 'Organization Issues', icon: '📂' }
  ];

  const runFullValidation = () => {
    fetchValidationData();
    fetchScriptValidationData();
  };

  const handleFixAllScripts = async () => {
    setActionInProgress({});
    
    // Create a map to track in-progress actions
    const inProgressActions = {};
    
    // Create a sequence of actions to fix all issues
    const allIssues = Object.entries(scriptValidationResults).flatMap(
      ([category, issues]) => issues.map(issue => ({ category, issue }))
    );
    
    for (const { category, issue } of allIssues) {
      const actionKey = `${category}-${issue.id}`;
      inProgressActions[actionKey] = true;
      setActionInProgress(prev => ({ ...prev, [actionKey]: true }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Update state to simulate fixing the issue
      await handleFixScript(category, issue.id, 'auto-fix');
    }
  };

  // Calculate integrated system structure health score
  const calculateSystemHealthScore = () => {
    // Count all issues across both feature and script categories
    const totalIssues = [
      ...Object.values(validationResults).flat(),
      ...Object.values(scriptValidationResults).flat()
    ].length;
    
    // Health score calculation based on total issues
    if (totalIssues === 0) return { score: '100%', class: 'bg-green-500/20 text-green-400' };
    if (totalIssues < 5) return { score: '85%', class: 'bg-green-500/20 text-green-400' };
    if (totalIssues < 10) return { score: '70%', class: 'bg-yellow-500/20 text-yellow-400' };
    if (totalIssues < 15) return { score: '55%', class: 'bg-yellow-500/20 text-yellow-400' };
    if (totalIssues < 20) return { score: '40%', class: 'bg-orange-500/20 text-orange-400' };
    return { score: '25%', class: 'bg-red-500/20 text-red-400' };
  };

  const systemHealthScore = calculateSystemHealthScore();

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{modalTitle}</h3>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto flex-1">
              {modalContent}
            </div>
          </div>
        </div>
      )}
      
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">File System Structure Validation</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={runFullValidation}
          disabled={loading || scriptLoading}
        >
          {(loading || scriptLoading) ? 'Running...' : 'Run Validation'}
        </button>
      </div>
      
      <div className="p-4">
        <div className="grid gap-4">
          {/* System File Structure Categories */}
          <div>
            {/* Combined categories display */}
            {[...roadmapCategories, ...scriptCategories].map(category => {
              // Determine which result set to use based on the category
              const isRoadmapCategory = roadmapCategories.some(c => c.id === category.id);
              const resultSet = isRoadmapCategory ? validationResults : scriptValidationResults;
              const count = resultSet[category.id]?.length || 0;
              const severity = getIssueSeverity(category.id, count);
              
              return (
                <div key={category.id} className="bg-gray-900 rounded-lg overflow-hidden mb-2">
                  <div 
                    className="p-3 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleExpand(category.id)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2 text-xl">{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs mr-2 ${
                        severity === 'success' ? 'bg-green-500/20 text-green-400' : 
                        severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {count} {count === 1 ? 'issue' : 'issues'}
                      </span>
                      <span>{expanded[category.id] ? '▼' : '►'}</span>
                    </div>
                  </div>
                  
                  {isRoadmapCategory 
                    ? renderIssueList(validationResults[category.id] || [], category.id)
                    : renderIssueList(scriptValidationResults[category.id] || [], category.id)
                  }
                </div>
              );
            })}
          </div>
          
          {/* Health Score - Combined */}
          <div className="bg-gray-900 p-3 rounded-md mb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="mr-2">📊</span>
                <span>System Structure Health</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${systemHealthScore.class}`}>
                {systemHealthScore.score}
              </div>
            </div>
          </div>
          
          {/* Roadmap Impact */}
          <div className="bg-gray-900 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="mr-2">🛣️</span>
                <span>Roadmap Impact</span>
              </div>
              <button
                className="text-xs text-blue-400 hover:underline"
                onClick={() => {
                  // Generate a summary of script issues by roadmap item
                  const allRoadmapItems = [];
                  
                  // Collect all roadmap items from different issue categories
                  Object.entries(scriptValidationResults).forEach(([category, issues]) => {
                    issues.forEach(issue => {
                      if (issue.roadmapItems && issue.roadmapItems.length > 0) {
                        issue.roadmapItems.forEach(item => {
                          allRoadmapItems.push({
                            ...item,
                            scriptIssue: {
                              category,
                              scriptId: issue.id,
                              scriptName: issue.name
                            }
                          });
                        });
                      }
                      
                      if (issue.previousRoadmapItems && issue.previousRoadmapItems.length > 0) {
                        issue.previousRoadmapItems.forEach(item => {
                          allRoadmapItems.push({
                            ...item,
                            scriptIssue: {
                              category,
                              scriptId: issue.id,
                              scriptName: issue.name,
                              isPrevious: true
                            }
                          });
                        });
                      }
                    });
                  });
                  
                  // Group by milestone, phase, module
                  const byMilestone = {};
                  allRoadmapItems.forEach(item => {
                    if (!byMilestone[item.milestone]) {
                      byMilestone[item.milestone] = {};
                    }
                    
                    if (!byMilestone[item.milestone][item.phase]) {
                      byMilestone[item.milestone][item.phase] = {};
                    }
                    
                    if (!byMilestone[item.milestone][item.phase][item.module]) {
                      byMilestone[item.milestone][item.phase][item.module] = [];
                    }
                    
                    byMilestone[item.milestone][item.phase][item.module].push(item);
                  });
                  
                  alert(`Roadmap Impact Analysis\n\n${Object.keys(byMilestone).length} milestones affected\n${allRoadmapItems.length} feature-script relationships found\n\nThis would launch a detailed report view in the production app.`);
                }}
              >
                View Roadmap Impact Report
              </button>
            </div>
            <div className="mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-sm font-medium">Features Affected</div>
                  <div className="text-xl font-bold text-blue-400">
                    {new Set([
                      ...Array.from(scriptValidationResults.duplicateScripts || [])
                        .flatMap(i => (i.roadmapItems || []).map(r => r.id)),
                      ...Array.from(scriptValidationResults.poorlyReferencedScripts || [])
                        .flatMap(i => (i.roadmapItems || []).map(r => r.id)),
                      ...Array.from(scriptValidationResults.scriptOrganizationIssues || [])
                        .flatMap(i => (i.roadmapItems || []).map(r => r.id)),
                      ...Array.from(scriptValidationResults.orphanedScripts || [])
                        .flatMap(i => (i.previousRoadmapItems || []).map(r => r.id))
                    ]).size}
                  </div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-sm font-medium">Milestones Affected</div>
                  <div className="text-xl font-bold text-purple-400">
                    {new Set([
                      ...Array.from(scriptValidationResults.duplicateScripts || [])
                        .flatMap(i => (i.roadmapItems || []).map(r => r.milestone)),
                      ...Array.from(scriptValidationResults.poorlyReferencedScripts || [])
                        .flatMap(i => (i.roadmapItems || []).map(r => r.milestone)),
                      ...Array.from(scriptValidationResults.scriptOrganizationIssues || [])
                        .flatMap(i => (i.roadmapItems || []).map(r => r.milestone)),
                      ...Array.from(scriptValidationResults.orphanedScripts || [])
                        .flatMap(i => (i.previousRoadmapItems || []).map(r => r.milestone))
                    ]).size}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fix All Button */}
          {((!loading && Object.values(validationResults).flat().length > 0) || 
            (!scriptLoading && Object.values(scriptValidationResults).flat().length > 0)) && (
            <div className="mt-4">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded w-full"
                onClick={() => {
                  // Fix both feature and script issues
                  if (Object.values(scriptValidationResults).flat().length > 0) {
                    handleFixAllScripts();
                  }
                  // In a real implementation, would also fix feature issues here
                }}
                disabled={loading || scriptLoading || Object.values(actionInProgress).some(v => v)}
              >
                Fix All Issues Automatically
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StructureValidation;