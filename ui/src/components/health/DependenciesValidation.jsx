import React, { useState, useEffect } from 'react';

const DependenciesValidation = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('packages');
  const [packageDependencies, setPackageDependencies] = useState({
    outdated: [],
    vulnerable: [],
    deprecated: []
  });
  const [featureDependencies, setFeatureDependencies] = useState({
    blocking: [],
    waiting: [],
    circular: []
  });
  const [expandedItem, setExpandedItem] = useState(null);

  // Mock data fetch - would be replaced with actual API call
  const fetchDependencyData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response data
      setPackageDependencies({
        outdated: [
          { name: 'react', current: '17.0.2', latest: '18.2.0', type: 'dependencies' },
          { name: 'tailwindcss', current: '2.2.19', latest: '3.3.2', type: 'devDependencies' },
          { name: '@babel/core', current: '7.16.0', latest: '7.21.4', type: 'devDependencies' }
        ],
        vulnerable: [
          { name: 'node-fetch', current: '2.6.0', severity: 'high', cve: 'CVE-2022-0235' },
          { name: 'postcss', current: '8.4.12', severity: 'medium', cve: 'CVE-2023-44270' }
        ],
        deprecated: [
          { name: 'request', current: '2.88.2', alternative: 'node-fetch, axios, or got' },
          { name: 'moment', current: '2.29.1', alternative: 'date-fns or luxon' }
        ]
      });
      
      setFeatureDependencies({
        blocking: [
          { 
            feature: 'feature-1023-auth-integration', 
            blocks: ['feature-1035-user-profile', 'feature-1042-admin-panel'],
            status: 'building',
            owner: 'Alex'
          },
          { 
            feature: 'feature-2009-api-gateway', 
            blocks: ['feature-2015-external-data-sync', 'feature-2018-mobile-api'],
            status: 'failing',
            owner: 'Taylor'
          }
        ],
        waiting: [
          { 
            feature: 'feature-3015-dashboard-charts', 
            waitingFor: 'feature-3008-data-layer',
            status: 'blocked',
            daysWaiting: 7
          },
          { 
            feature: 'feature-4023-notification-system', 
            waitingFor: 'feature-4010-user-preferences',
            status: 'blocked',
            daysWaiting: 12
          }
        ],
        circular: [
          { 
            features: ['feature-5001-config', 'feature-5008-plugin-system', 'feature-5012-config-validator'],
            description: 'Config depends on Plugin System, which depends on Config Validator, which depends on Config'
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching dependency data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencyData();
  }, []);

  const toggleExpand = (id) => {
    if (expandedItem === id) {
      setExpandedItem(null);
    } else {
      setExpandedItem(id);
    }
  };

  const renderPackageDependencies = () => {
    return (
      <div>
        {/* Outdated Packages */}
        <div className="mb-4">
          <h4 className="text-lg font-medium mb-2 flex items-center">
            <span className="mr-2">🔄</span>
            <span>Outdated Packages ({packageDependencies.outdated.length})</span>
          </h4>
          
          {packageDependencies.outdated.length === 0 ? (
            <div className="bg-gray-700 p-3 rounded-md text-sm text-gray-400">
              All packages are up to date.
            </div>
          ) : (
            <div className="bg-gray-900 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left p-3">Package</th>
                    <th className="text-left p-3">Current</th>
                    <th className="text-left p-3">Latest</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {packageDependencies.outdated.map((pkg, index) => (
                    <tr key={index} className="hover:bg-gray-800/50">
                      <td className="p-3 font-medium">{pkg.name}</td>
                      <td className="p-3 text-yellow-400">{pkg.current}</td>
                      <td className="p-3 text-green-400">{pkg.latest}</td>
                      <td className="p-3">{pkg.type}</td>
                      <td className="p-3">
                        <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Vulnerable Packages */}
        <div className="mb-4">
          <h4 className="text-lg font-medium mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            <span>Vulnerable Packages ({packageDependencies.vulnerable.length})</span>
          </h4>
          
          {packageDependencies.vulnerable.length === 0 ? (
            <div className="bg-gray-700 p-3 rounded-md text-sm text-gray-400">
              No vulnerabilities detected.
            </div>
          ) : (
            <div className="space-y-3">
              {packageDependencies.vulnerable.map((pkg, index) => (
                <div key={index} className="bg-gray-900 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{pkg.name} ({pkg.current})</div>
                      <div className={`text-sm mt-1 ${
                        pkg.severity === 'high' ? 'text-red-400' : 
                        pkg.severity === 'medium' ? 'text-yellow-400' : 
                        'text-blue-400'
                      }`}>
                        {pkg.severity.toUpperCase()} severity vulnerability: {pkg.cve}
                      </div>
                    </div>
                    <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                      Fix Vulnerability
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Deprecated Packages */}
        <div>
          <h4 className="text-lg font-medium mb-2 flex items-center">
            <span className="mr-2">🚫</span>
            <span>Deprecated Packages ({packageDependencies.deprecated.length})</span>
          </h4>
          
          {packageDependencies.deprecated.length === 0 ? (
            <div className="bg-gray-700 p-3 rounded-md text-sm text-gray-400">
              No deprecated packages in use.
            </div>
          ) : (
            <div className="space-y-3">
              {packageDependencies.deprecated.map((pkg, index) => (
                <div key={index} className="bg-gray-900 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{pkg.name} ({pkg.current})</div>
                      <div className="text-sm mt-1 text-gray-400">
                        Consider replacing with: {pkg.alternative}
                      </div>
                    </div>
                    <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                      Replace Package
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Update All Dependencies
          </button>
        </div>
      </div>
    );
  };

  const renderFeatureDependencies = () => {
    return (
      <div>
        {/* Blocking Features */}
        <div className="mb-4">
          <h4 className="text-lg font-medium mb-2 flex items-center">
            <span className="mr-2">🚧</span>
            <span>Blocking Features ({featureDependencies.blocking.length})</span>
          </h4>
          
          {featureDependencies.blocking.length === 0 ? (
            <div className="bg-gray-700 p-3 rounded-md text-sm text-gray-400">
              No features are blocking others.
            </div>
          ) : (
            <div className="space-y-3">
              {featureDependencies.blocking.map((item, index) => (
                <div 
                  key={index} 
                  className={`bg-gray-900 rounded-md overflow-hidden ${
                    item.status === 'failing' ? 'border-l-4 border-red-500' : 
                    'border-l-4 border-yellow-500'
                  }`}
                >
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => toggleExpand(`blocking-${index}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium">
                        {item.feature}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          item.status === 'failing' ? 'bg-red-500/20 text-red-400' : 
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-gray-400 text-sm">
                        Blocks {item.blocks.length} features
                      </div>
                    </div>
                  </div>
                  
                  {expandedItem === `blocking-${index}` && (
                    <div className="px-3 pb-3">
                      <div className="text-sm text-gray-400 mb-2">
                        Owner: {item.owner}
                      </div>
                      <div className="text-sm mb-2">Blocking:</div>
                      <ul className="list-disc list-inside text-sm text-gray-400 mb-3">
                        {item.blocks.map((blocked, i) => (
                          <li key={i}>{blocked}</li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          View Feature
                        </button>
                        {item.status === 'failing' && (
                          <button className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                            Fix Failing Tests
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Waiting Features */}
        <div className="mb-4">
          <h4 className="text-lg font-medium mb-2 flex items-center">
            <span className="mr-2">⏳</span>
            <span>Waiting Features ({featureDependencies.waiting.length})</span>
          </h4>
          
          {featureDependencies.waiting.length === 0 ? (
            <div className="bg-gray-700 p-3 rounded-md text-sm text-gray-400">
              No features are waiting on dependencies.
            </div>
          ) : (
            <div className="space-y-3">
              {featureDependencies.waiting.map((item, index) => (
                <div 
                  key={index} 
                  className={`bg-gray-900 rounded-md overflow-hidden ${
                    item.daysWaiting > 10 ? 'border-l-4 border-red-500' : 
                    'border-l-4 border-yellow-500'
                  }`}
                >
                  <div className="p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">
                        {item.feature}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full ${
                        item.daysWaiting > 10 ? 'bg-red-500/20 text-red-400' : 
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        Waiting {item.daysWaiting} days
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                      Waiting for: {item.waitingFor}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        View Dependency
                      </button>
                      <button className="px-2 py-1 bg-gray-600 text-white text-xs rounded">
                        Mark Priority
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Circular Dependencies */}
        <div>
          <h4 className="text-lg font-medium mb-2 flex items-center">
            <span className="mr-2">🔄</span>
            <span>Circular Dependencies ({featureDependencies.circular.length})</span>
          </h4>
          
          {featureDependencies.circular.length === 0 ? (
            <div className="bg-gray-700 p-3 rounded-md text-sm text-gray-400">
              No circular dependencies detected.
            </div>
          ) : (
            <div className="space-y-3">
              {featureDependencies.circular.map((item, index) => (
                <div key={index} className="bg-gray-900 p-3 rounded-md border-l-4 border-red-500">
                  <div className="mb-2">
                    <div className="text-red-400 font-medium">Circular Dependency Detected</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {item.description}
                    </div>
                  </div>
                  <div className="p-2 bg-gray-800 rounded-md mb-3">
                    <div className="text-xs font-mono text-gray-300">
                      {item.features.join(' → ')}{' → '}{item.features[0]}
                    </div>
                  </div>
                  <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    Break Circular Reference
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Dependency Validation</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={fetchDependencyData}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check Dependencies'}
        </button>
      </div>
      
      <div className="p-4">
        <div className="flex border-b border-gray-700 mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'packages' ? 'border-blue-500 text-blue-400' : 'border-transparent'
            }`}
            onClick={() => setActiveTab('packages')}
          >
            Package Dependencies
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'features' ? 'border-blue-500 text-blue-400' : 'border-transparent'
            }`}
            onClick={() => setActiveTab('features')}
          >
            Feature Dependencies
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Analyzing dependencies...</p>
          </div>
        ) : (
          <>
            {activeTab === 'packages' && renderPackageDependencies()}
            {activeTab === 'features' && renderFeatureDependencies()}
          </>
        )}
      </div>
    </div>
  );
};

export default DependenciesValidation;