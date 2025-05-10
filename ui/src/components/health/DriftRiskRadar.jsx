import React, { useState, useEffect } from 'react';

const DriftRiskRadar = () => {
  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState({
    orphanRisk: 65,
    memoryBloat: 42,
    featureChurn: 58,
    dependencyFragility: 73,
    untestedFeatures: 38
  });
  const [showDetails, setShowDetails] = useState(null);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      // This would be an API call in a real application
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // No changes to the mock data for demo purposes
    } catch (error) {
      console.error('Error fetching risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  // Detail data for each risk category
  const riskDetails = {
    orphanRisk: {
      title: "Orphan Risk",
      description: "Measures how many features exist without proper registry entries or connections.",
      impact: "High orphan risk means parts of your system may be 'invisible' to management tools.",
      examples: [
        "Features not registered in memory.json",
        "Files without proper parent references",
        "Components that can't be found by navigation"
      ],
      tips: [
        "Run the orphan detection script regularly",
        "Always register new features in the proper registry",
        "Remove old features using the system tools, not manual deletion"
      ]
    },
    memoryBloat: {
      title: "Memory Bloat",
      description: "Tracks the growth of memory files and storage efficiency.",
      impact: "Excessive memory bloat slows down operations and makes tracking harder.",
      examples: [
        "Memory files growing beyond 5MB",
        "Duplicate data stored in multiple locations",
        "Unused fields taking up space"
      ],
      tips: [
        "Clean up memory files regularly",
        "Don't store temporary data in memory files",
        "Use the memory optimization script"
      ]
    },
    featureChurn: {
      title: "Feature Churn",
      description: "Measures how frequently features change status or are modified.",
      impact: "High churn indicates instability or unclear requirements.",
      examples: [
        "Features changing status multiple times per week",
        "Repeatedly updating the same files",
        "Frequent reverting of changes"
      ],
      tips: [
        "Finalize requirements before implementation",
        "Test thoroughly before marking as complete",
        "Review feature design with stakeholders early"
      ]
    },
    dependencyFragility: {
      title: "Dependency Fragility",
      description: "Assesses the complexity and stability of feature dependencies.",
      impact: "Fragile dependencies create cascading failures when one component breaks.",
      examples: [
        "Features with many upstream dependencies",
        "Circular dependencies between modules",
        "Outdated package versions"
      ],
      tips: [
        "Keep dependency chains as short as possible",
        "Avoid circular dependencies",
        "Keep external packages updated"
      ]
    },
    untestedFeatures: {
      title: "Untested Features",
      description: "Tracks the percentage of features without proper test coverage.",
      impact: "Untested features are more likely to contain bugs or break during updates.",
      examples: [
        "Features with no test files",
        "Tests that don't assert important functionality",
        "Skipped or disabled tests"
      ],
      tips: [
        "Write tests before or while implementing features",
        "Aim for at least 80% test coverage",
        "Include edge cases in your tests"
      ]
    }
  };

  // Calculate risk level color
  const getRiskLevelColor = (value) => {
    if (value < 40) return 'text-green-500';
    if (value < 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Calculate background for risk level
  const getRiskLevelBackground = (value) => {
    if (value < 40) return 'bg-green-500/20';
    if (value < 70) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  // Calculate shape points for radar chart
  const calculateRadarPoints = () => {
    // Center point
    const centerX = 50;
    const centerY = 50;
    const radius = 40; // Max radius
    
    // Calculate points
    const orphanPoint = {
      x: centerX,
      y: centerY - (radius * riskData.orphanRisk / 100)
    };
    
    const memoryPoint = {
      x: centerX + (radius * riskData.memoryBloat / 100) * Math.cos(Math.PI / 2.5),
      y: centerY - (radius * riskData.memoryBloat / 100) * Math.sin(Math.PI / 2.5)
    };
    
    const churnPoint = {
      x: centerX + (radius * riskData.featureChurn / 100) * Math.cos(2 * Math.PI / 2.5),
      y: centerY - (radius * riskData.featureChurn / 100) * Math.sin(2 * Math.PI / 2.5)
    };
    
    const dependencyPoint = {
      x: centerX + (radius * riskData.dependencyFragility / 100) * Math.cos(3 * Math.PI / 2.5),
      y: centerY - (radius * riskData.dependencyFragility / 100) * Math.sin(3 * Math.PI / 2.5)
    };
    
    const untestedPoint = {
      x: centerX + (radius * riskData.untestedFeatures / 100) * Math.cos(4 * Math.PI / 2.5),
      y: centerY - (radius * riskData.untestedFeatures / 100) * Math.sin(4 * Math.PI / 2.5)
    };
    
    return `${orphanPoint.x},${orphanPoint.y} ${memoryPoint.x},${memoryPoint.y} ${churnPoint.x},${churnPoint.y} ${dependencyPoint.x},${dependencyPoint.y} ${untestedPoint.x},${untestedPoint.y}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">System Drift Risk Radar</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={fetchRiskData}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Risk Analysis'}
        </button>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Calculating system risks...</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 p-4 rounded-lg mb-6">
              <h4 className="text-lg font-medium mb-2">Risk Overview</h4>
              <p className="text-gray-400 text-sm mb-4">
                This radar chart visualizes five key risk areas in your system. 
                The further a point extends from the center, the higher the risk.
                Click on any category for detailed information.
              </p>
              
              {/* The Radar Chart */}
              <div className="flex justify-center py-4">
                <div className="relative h-80 w-80">
                  {/* Radar Chart Rings */}
                  <div className="absolute inset-0 rounded-full border border-gray-700 opacity-20"></div>
                  <div className="absolute inset-5 rounded-full border border-gray-700 opacity-40"></div>
                  <div className="absolute inset-10 rounded-full border border-gray-700 opacity-60"></div>
                  <div className="absolute inset-20 rounded-full border border-gray-700 opacity-80"></div>
                  
                  {/* Chart Lines */}
                  <div className="absolute inset-0 flex justify-center">
                    <div className="h-full w-px bg-gray-700 opacity-40"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-gray-700 opacity-40"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
                    <div className="w-full h-px bg-gray-700 opacity-40"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'rotate(-45deg)' }}>
                    <div className="w-full h-px bg-gray-700 opacity-40"></div>
                  </div>
                  
                  {/* Data Points */}
                  <svg className="absolute inset-0" viewBox="0 0 100 100">
                    <polygon
                      points={calculateRadarPoints()}
                      fill="rgba(59, 130, 246, 0.2)"
                      stroke="#3b82f6"
                      strokeWidth="1"
                    />
                  </svg>
                  
                  {/* Labels */}
                  <button 
                    className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-center cursor-pointer hover:opacity-80"
                    onClick={() => setShowDetails('orphanRisk')}
                  >
                    <div className="text-blue-400 font-medium">Orphan Risk</div>
                    <div className={`text-sm font-bold ${getRiskLevelColor(riskData.orphanRisk)}`}>
                      {riskData.orphanRisk}%
                    </div>
                  </button>
                  
                  <button 
                    className="absolute top-1/4 right-0 transform translate-x-2 text-center cursor-pointer hover:opacity-80"
                    onClick={() => setShowDetails('memoryBloat')}
                  >
                    <div className="text-yellow-400 font-medium">Memory Bloat</div>
                    <div className={`text-sm font-bold ${getRiskLevelColor(riskData.memoryBloat)}`}>
                      {riskData.memoryBloat}%
                    </div>
                  </button>
                  
                  <button 
                    className="absolute bottom-1/4 right-0 transform translate-x-2 text-center cursor-pointer hover:opacity-80"
                    onClick={() => setShowDetails('featureChurn')}
                  >
                    <div className="text-green-400 font-medium">Feature Churn</div>
                    <div className={`text-sm font-bold ${getRiskLevelColor(riskData.featureChurn)}`}>
                      {riskData.featureChurn}%
                    </div>
                  </button>
                  
                  <button 
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-center cursor-pointer hover:opacity-80"
                    onClick={() => setShowDetails('dependencyFragility')}
                  >
                    <div className="text-red-400 font-medium">Dependency Fragility</div>
                    <div className={`text-sm font-bold ${getRiskLevelColor(riskData.dependencyFragility)}`}>
                      {riskData.dependencyFragility}%
                    </div>
                  </button>
                  
                  <button 
                    className="absolute bottom-1/4 left-0 transform -translate-x-2 text-center cursor-pointer hover:opacity-80"
                    onClick={() => setShowDetails('untestedFeatures')}
                  >
                    <div className="text-purple-400 font-medium">Untested Features</div>
                    <div className={`text-sm font-bold ${getRiskLevelColor(riskData.untestedFeatures)}`}>
                      {riskData.untestedFeatures}%
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <div className="px-4 py-2 bg-gray-800 rounded-md text-sm">
                  <span className="text-gray-400">Overall System Risk: </span>
                  <span className={`font-bold ${getRiskLevelColor(
                    (riskData.orphanRisk + riskData.memoryBloat + riskData.featureChurn + 
                    riskData.dependencyFragility + riskData.untestedFeatures) / 5
                  )}`}>
                    {Math.round(
                      (riskData.orphanRisk + riskData.memoryBloat + riskData.featureChurn + 
                      riskData.dependencyFragility + riskData.untestedFeatures) / 5
                    )}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Risk Details Section */}
            {showDetails && (
              <div className="bg-gray-900 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-medium flex items-center">
                    <div 
                      className={`w-4 h-4 rounded-full mr-2 ${
                        showDetails === 'orphanRisk' ? 'bg-blue-500' :
                        showDetails === 'memoryBloat' ? 'bg-yellow-500' :
                        showDetails === 'featureChurn' ? 'bg-green-500' :
                        showDetails === 'dependencyFragility' ? 'bg-red-500' :
                        'bg-purple-500'
                      }`}
                    ></div>
                    {riskDetails[showDetails].title}
                  </h4>
                  <button 
                    className="text-gray-400 hover:text-white"
                    onClick={() => setShowDetails(null)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center mb-2">
                    <span className="text-gray-400 mr-2">Current Risk Level:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelBackground(riskData[showDetails])} ${getRiskLevelColor(riskData[showDetails])}`}>
                      {riskData[showDetails]}% - {
                        riskData[showDetails] < 40 ? 'Low Risk' :
                        riskData[showDetails] < 70 ? 'Medium Risk' :
                        'High Risk'
                      }
                    </span>
                  </div>
                  
                  <p className="text-gray-300 mt-3">
                    {riskDetails[showDetails].description}
                  </p>
                  
                  <p className="text-gray-300 mt-2">
                    <strong className="text-white">Impact:</strong> {riskDetails[showDetails].impact}
                  </p>
                  
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Common Examples:</h5>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                      {riskDetails[showDetails].examples.map((example, index) => (
                        <li key={index}>{example}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Improvement Tips:</h5>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                      {riskDetails[showDetails].tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-6 flex justify-between">
                    <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm">
                      View Detailed Report
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">
                      Run Automated Fix
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Risk Categories Explanation */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h4 className="text-lg font-medium mb-3">Risk Categories Explained</h4>
              <p className="text-sm text-gray-400 mb-4">
                Each risk category represents a different way your system can drift from its expected state.
                Keeping all risk levels below 50% is recommended for a healthy system.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-blue-500 h-4 w-4 rounded-full mt-1 mr-2"></div>
                  <div>
                    <h5 className="font-medium">Orphan Risk</h5>
                    <p className="text-sm text-gray-400">
                      Features not properly tracked in the registry or with broken dependencies.
                      Think of these as "lost" components that aren't connected to the main system.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-yellow-500 h-4 w-4 rounded-full mt-1 mr-2"></div>
                  <div>
                    <h5 className="font-medium">Memory Bloat</h5>
                    <p className="text-sm text-gray-400">
                      Oversized memory files or inefficient storage patterns. 
                      This is like having an overstuffed file cabinet where it becomes hard to find things.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-green-500 h-4 w-4 rounded-full mt-1 mr-2"></div>
                  <div>
                    <h5 className="font-medium">Feature Churn</h5>
                    <p className="text-sm text-gray-400">
                      Rapid changes to features or frequent status changes.
                      High churn usually indicates unstable requirements or implementation issues.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-red-500 h-4 w-4 rounded-full mt-1 mr-2"></div>
                  <div>
                    <h5 className="font-medium">Dependency Fragility</h5>
                    <p className="text-sm text-gray-400">
                      Complex dependency chains or outdated package dependencies.
                      Like a house of cards, when one piece fails, everything dependent on it can break.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-purple-500 h-4 w-4 rounded-full mt-1 mr-2"></div>
                  <div>
                    <h5 className="font-medium">Untested Features</h5>
                    <p className="text-sm text-gray-400">
                      Features without tests or with failing test suites.
                      Without proper testing, you can't be confident your system works as expected.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-800 rounded-md">
                <p className="text-sm text-gray-300">
                  <strong>Pro Tip:</strong> Run the system health check weekly to catch drift early.
                  Small issues are much easier to fix before they compound into larger problems.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DriftRiskRadar;