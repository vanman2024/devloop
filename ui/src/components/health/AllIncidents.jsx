import React, { useState, useEffect } from 'react';

const AllIncidents = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [filters, setFilters] = useState({
    severity: 'all',
    type: 'all',
    timeRange: '30days'
  });
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Fetch incidents data
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setIncidents([
        {
          id: 'incident-001',
          type: 'drift',
          subtype: 'feature-orphaning',
          severity: 'medium',
          date: '2025-04-24T15:30:00Z',
          affected: '2 features',
          status: 'fixed',
          description: 'Two features were not properly registered in the feature registry',
          details: 'Feature-1078 and Feature-2055 were found in the filesystem but not registered in the memory.json registry files.',
          resolution: 'Features were automatically registered in the appropriate registries.',
          fixCommand: 'python3 system-core/scripts/maintenance/register-orphaned-features.py --features=1078,2055'
        },
        {
          id: 'incident-002',
          type: 'drift',
          subtype: 'schema-change',
          severity: 'high',
          date: '2025-04-21T10:15:00Z',
          affected: '23 memory files',
          status: 'fixed',
          description: 'Memory file schema changed without updating existing files',
          details: 'Added required field "last_updated_by" was missing from 23 memory.json files across multiple features.',
          resolution: 'Schema migration script was run to add the missing field to all affected files.',
          fixCommand: 'python3 system-core/scripts/maintenance/migrate-memory-schema.py --add-field=last_updated_by --value="system"'
        },
        {
          id: 'incident-003',
          type: 'drift',
          subtype: 'dependency-version',
          severity: 'low',
          date: '2025-04-18T09:45:00Z',
          affected: '1 package',
          status: 'fixed',
          description: 'Package version mismatch between package.json and lock file',
          details: 'Package "lodash" was listed as version 4.17.20 in package.json but 4.17.15 in package-lock.json.',
          resolution: 'Package versions were synchronized and lock file was updated.',
          fixCommand: 'npm install lodash@4.17.20 --save-exact'
        },
        {
          id: 'incident-004',
          type: 'drift',
          subtype: 'structure-change',
          severity: 'medium',
          date: '2025-04-16T14:20:00Z',
          affected: '3 modules',
          status: 'fixed',
          description: 'Module structure changed without updating references',
          details: 'Three modules were moved to a new location, but references in 12 features still pointed to old locations.',
          resolution: 'All references were updated to point to the new module locations.',
          fixCommand: 'python3 system-core/scripts/maintenance/update-module-references.py --modules=module-user-auth,module-api-gateway,module-reporting'
        },
        {
          id: 'incident-005',
          type: 'test',
          subtype: 'test-failure',
          severity: 'high',
          date: '2025-04-14T11:10:00Z',
          affected: 'Authentication module',
          status: 'fixed',
          description: 'Authentication tests failing after API endpoint change',
          details: '3 out of 12 tests in the authentication test suite were failing due to an API endpoint format change.',
          resolution: 'Tests were updated to use the new endpoint format and all now pass.',
          fixCommand: 'python3 system-core/scripts/maintenance/update-test-endpoints.py --module=authentication'
        },
        {
          id: 'incident-006',
          type: 'memory',
          subtype: 'memory-bloat',
          severity: 'medium',
          date: '2025-04-12T16:45:00Z',
          affected: '4 memory files',
          status: 'fixed',
          description: 'Memory files exceeding size thresholds',
          details: 'Four memory files were larger than the 3MB recommended size, with the largest being 5.2MB.',
          resolution: 'Memory files were optimized by removing redundant data and switching to references.',
          fixCommand: 'python3 system-core/scripts/maintenance/optimize-memory-files.py --threshold=3MB'
        },
        {
          id: 'incident-007',
          type: 'security',
          subtype: 'vulnerability',
          severity: 'critical',
          date: '2025-04-10T08:30:00Z',
          affected: '2 packages',
          status: 'fixed',
          description: 'Security vulnerabilities in dependencies',
          details: 'Packages "node-fetch" and "postcss" had known security vulnerabilities (CVE-2022-0235, CVE-2023-44270).',
          resolution: 'Affected packages were updated to patched versions.',
          fixCommand: 'npm audit fix --force'
        },
        {
          id: 'incident-008',
          type: 'permissions',
          subtype: 'file-permissions',
          severity: 'low',
          date: '2025-04-08T13:20:00Z',
          affected: '17 script files',
          status: 'fixed',
          description: 'Script files missing executable permissions',
          details: 'Several shell scripts in the system-core/scripts directory were not executable.',
          resolution: 'Executable permission was added to all script files.',
          fixCommand: 'chmod +x system-core/scripts/**/*.sh'
        }
      ]);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Filter incidents based on current filters
  const filteredIncidents = incidents.filter(incident => {
    if (filters.severity !== 'all' && incident.severity !== filters.severity) return false;
    if (filters.type !== 'all' && incident.type !== filters.type) return false;
    
    // Filter by time range (simplified for mock data)
    if (filters.timeRange === '7days') {
      // Include only incidents in the last 7 days (simplified for demo)
      return ['incident-001', 'incident-002', 'incident-003', 'incident-004'].includes(incident.id);
    } else if (filters.timeRange === '30days') {
      // Include all incidents (for demo purposes)
      return true;
    }
    
    return true;
  });

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Get severity badge color
  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400';
      case 'high':
        return 'bg-orange-500/20 text-orange-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Get type badge color
  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'drift':
        return 'bg-purple-500/20 text-purple-400';
      case 'test':
        return 'bg-green-500/20 text-green-400';
      case 'memory':
        return 'bg-blue-500/20 text-blue-400';
      case 'security':
        return 'bg-red-500/20 text-red-400';
      case 'permissions':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'fixed':
        return 'bg-green-500/20 text-green-400';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'open':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">All Incidents</h3>
        <button 
          className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
          onClick={onClose}
        >
          Back to Overview
        </button>
      </div>
      
      <div className="p-4">
        {/* Filters */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-4">
            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Time Range</label>
              <select
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                value={filters.timeRange}
                onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Incident Type</label>
              <select
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="drift">Drift</option>
                <option value="test">Test</option>
                <option value="memory">Memory</option>
                <option value="security">Security</option>
                <option value="permissions">Permissions</option>
              </select>
            </div>
            
            {/* Refresh Button */}
            <div className="flex items-end">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm"
                onClick={fetchIncidents}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Incidents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Incidents List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-400">Loading incidents...</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="py-2 px-3 text-left">Date</th>
                        <th className="py-2 px-3 text-left">Type</th>
                        <th className="py-2 px-3 text-left">Severity</th>
                        <th className="py-2 px-3 text-left">Affected</th>
                        <th className="py-2 px-3 text-left">Status</th>
                        <th className="py-2 px-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredIncidents.length > 0 ? (
                        filteredIncidents.map((incident) => (
                          <tr 
                            key={incident.id}
                            className={`hover:bg-gray-800 cursor-pointer ${
                              selectedIncident?.id === incident.id ? 'bg-gray-800' : ''
                            }`}
                            onClick={() => setSelectedIncident(incident)}
                          >
                            <td className="py-2 px-3 whitespace-nowrap">{formatDate(incident.date)}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getTypeBadgeClass(incident.type)}`}>
                                {incident.type}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getSeverityBadgeClass(incident.severity)}`}>
                                {incident.severity}
                              </span>
                            </td>
                            <td className="py-2 px-3">{incident.affected}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(incident.status)}`}>
                                {incident.status}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <button 
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIncident(incident);
                                }}
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-4 text-center text-gray-400">
                            No incidents match the current filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* Incident Details */}
          <div className="lg:col-span-1">
            {selectedIncident ? (
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="mb-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-lg font-medium">{selectedIncident.description}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${getSeverityBadgeClass(selectedIncident.severity)}`}>
                      {selectedIncident.severity}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getTypeBadgeClass(selectedIncident.type)}`}>
                      {selectedIncident.type}
                    </span>
                    <span className="px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300">
                      {selectedIncident.subtype}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedIncident.status)}`}>
                      {selectedIncident.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-gray-400">Date/Time:</div>
                    <div className="mt-1">{formatDate(selectedIncident.date)}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Affected:</div>
                    <div className="mt-1">{selectedIncident.affected}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Details:</div>
                    <div className="mt-1 bg-gray-800 p-2 rounded">
                      {selectedIncident.details}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Resolution:</div>
                    <div className="mt-1 bg-gray-800 p-2 rounded">
                      {selectedIncident.resolution}
                    </div>
                  </div>
                  
                  {selectedIncident.fixCommand && (
                    <div>
                      <div className="text-gray-400">Fix Command:</div>
                      <div className="mt-1 bg-gray-800 p-2 rounded font-mono text-xs overflow-x-auto">
                        {selectedIncident.fixCommand}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex gap-2">
                  {selectedIncident.status !== 'fixed' && (
                    <button className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded text-sm flex-grow">
                      Fix Issue
                    </button>
                  )}
                  
                  <button className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm flex-grow">
                    View Full Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-gray-400">Select an incident to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllIncidents;