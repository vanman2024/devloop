import React, { useEffect, useRef, useState } from 'react';
import { Card, Form, Button, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ZoomIn, ZoomOut, ArrowsFullscreen, ArrowsAngleContract, InfoCircle } from 'react-bootstrap-icons';
import * as d3 from 'd3';

/**
 * RelationshipGraph component that visualizes relationships between activities
 * Uses D3 force-directed graph visualization
 */
const RelationshipGraph = ({ activities = [], height = 500 }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [filters, setFilters] = useState({
    includeFeatureLinks: true,
    includeMilestoneLinks: true,
    includeUserLinks: true
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Prepare graph data from activities
  useEffect(() => {
    if (!activities || activities.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Create nodes from activities
      const nodes = activities.map(activity => ({
        id: activity.id,
        type: 'activity',
        data: activity,
        radius: 10, // Default radius
        color: getNodeColor(activity.type, activity.status)
      }));

      // Create a map for quick lookup
      const nodesMap = new Map(nodes.map(node => [node.id, node]));

      // Initialize links array
      let links = [];

      // Create linked entities (features, milestones, users)
      const featureNodes = new Map();
      const milestoneNodes = new Map();
      const userNodes = new Map();

      // Extract features, milestones, and users
      activities.forEach(activity => {
        // Add feature nodes
        if (activity.featureId && filters.includeFeatureLinks) {
          if (!featureNodes.has(activity.featureId)) {
            featureNodes.set(activity.featureId, {
              id: activity.featureId,
              type: 'feature',
              data: { id: activity.featureId },
              radius: 8,
              color: '#4a9eff'
            });
          }
        }

        // Add milestone nodes
        if (activity.milestoneId && filters.includeMilestoneLinks) {
          if (!milestoneNodes.has(activity.milestoneId)) {
            milestoneNodes.set(activity.milestoneId, {
              id: activity.milestoneId,
              type: 'milestone',
              data: { id: activity.milestoneId },
              radius: 12,
              color: '#8e44ad'
            });
          }
        }

        // Add user nodes
        if (activity.user && filters.includeUserLinks) {
          if (!userNodes.has(activity.user)) {
            userNodes.set(activity.user, {
              id: activity.user,
              type: 'user',
              data: { id: activity.user },
              radius: 9,
              color: '#e67e22'
            });
          }
        }
      });

      // Add all entity nodes to the nodes array
      const allNodes = [
        ...nodes,
        ...Array.from(featureNodes.values()),
        ...Array.from(milestoneNodes.values()),
        ...Array.from(userNodes.values())
      ];

      // Create links between activities and their related entities
      activities.forEach(activity => {
        // Link to feature
        if (activity.featureId && filters.includeFeatureLinks) {
          links.push({
            source: activity.id,
            target: activity.featureId,
            type: 'feature',
            value: 1
          });
        }

        // Link to milestone
        if (activity.milestoneId && filters.includeMilestoneLinks) {
          links.push({
            source: activity.id,
            target: activity.milestoneId,
            type: 'milestone',
            value: 2
          });
        }

        // Link to user
        if (activity.user && filters.includeUserLinks) {
          links.push({
            source: activity.id,
            target: activity.user,
            type: 'user',
            value: 1
          });
        }

        // Link activities if they are related (e.g., same feature, milestone, or timestamp within 1 hour)
        activities.forEach(otherActivity => {
          if (activity.id === otherActivity.id) return;

          // Check for relationships
          const sameFeature = activity.featureId && activity.featureId === otherActivity.featureId;
          const sameMilestone = activity.milestoneId && activity.milestoneId === otherActivity.milestoneId;

          // Check for temporal relationship (activities within 1 hour of each other)
          const activityTime = new Date(activity.timestamp).getTime();
          const otherActivityTime = new Date(otherActivity.timestamp).getTime();
          const timeDiff = Math.abs(activityTime - otherActivityTime);
          const isCloseInTime = timeDiff < 3600000; // 1 hour in milliseconds

          if ((sameFeature && filters.includeFeatureLinks) || 
              (sameMilestone && filters.includeMilestoneLinks) || 
              isCloseInTime) {
            // Avoid duplicate links
            const linkExists = links.some(link => 
              (link.source === activity.id && link.target === otherActivity.id) ||
              (link.source === otherActivity.id && link.target === activity.id)
            );

            if (!linkExists) {
              links.push({
                source: activity.id,
                target: otherActivity.id,
                type: 'related',
                value: 1,
                reason: isCloseInTime ? 'time' : (sameFeature ? 'feature' : 'milestone')
              });
            }
          }
        });
      });

      setGraphData({ nodes: allNodes, links });
      setLoading(false);
    } catch (err) {
      console.error('Error preparing graph data:', err);
      setError('Failed to prepare relationship data');
      setLoading(false);
    }
  }, [activities, filters]);

  // Create and update the force-directed graph
  useEffect(() => {
    if (loading || !svgRef.current || !graphData.nodes.length) return;

    // Clear any existing graph
    d3.select(svgRef.current).selectAll("*").remove();

    try {
      setSimulationRunning(true);
      
      const svg = d3.select(svgRef.current);
      const width = containerRef.current.clientWidth;
      const containerHeight = height;

      // Create a zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          setZoomLevel(event.transform.k);
        });

      // Apply zoom to svg
      svg.call(zoom);

      // Create the main group that will be transformed
      const g = svg.append("g");

      // Create a tooltip
      const tooltip = d3.select(containerRef.current)
        .append("div")
        .attr("class", "graph-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000");

      // Create links
      const link = g.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(graphData.links)
        .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value))
        .attr("stroke", getLinkColor);

      // Create nodes
      const node = g.append("g")
        .selectAll(".node")
        .data(graphData.nodes)
        .join("g")
        .attr("class", "node")
        .call(drag(simulation))
        .on("mouseover", function(event, d) {
          tooltip
            .style("visibility", "visible")
            .html(getNodeTooltip(d))
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");

          // Highlight this node and connections
          link.attr("stroke-opacity", l => isConnected(d, l) ? 1 : 0.1);
          node.attr("opacity", n => isConnected(d, n) ? 1 : 0.3);
          d3.select(this).attr("opacity", 1);
          
          // Bring connected links to front
          link.filter(l => isConnected(d, l))
            .each(function() { this.parentNode.appendChild(this); });
          
          // Bring this node to front
          this.parentNode.appendChild(this);
        })
        .on("mouseout", function() {
          tooltip.style("visibility", "hidden");
          link.attr("stroke-opacity", 0.6);
          node.attr("opacity", 1);
        })
        .on("click", (event, d) => {
          setSelectedNode(d);
          // Prevent event from propagating
          event.stopPropagation();
        });

      // Add circles to nodes
      node.append("circle")
        .attr("r", d => d.radius)
        .attr("fill", d => d.color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

      // Add icons or text based on node type
      node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .attr("fill", "#fff")
        .attr("font-size", "8px")
        .text(d => getNodeLabel(d));

      // Add node labels
      node.append("title")
        .text(d => getNodeTitle(d));

      // Create simulation
      const simulation = d3.forceSimulation(graphData.nodes)
        .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(80))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, containerHeight / 2))
        .force("collide", d3.forceCollide().radius(d => d.radius * 2));

      // Update positions on tick
      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node
          .attr("transform", d => `translate(${d.x},${d.y})`);
      });

      // When simulation ends
      simulation.on("end", () => {
        setSimulationRunning(false);
      });

      // Allow clicking on the background to deselect
      svg.on("click", () => {
        setSelectedNode(null);
      });

      // Cleanup function
      return () => {
        simulation.stop();
        if (tooltip) tooltip.remove();
      };
    } catch (err) {
      console.error('Error creating graph:', err);
      setError('Failed to render relationship graph');
      setSimulationRunning(false);
    }

    // Function to create drag behavior
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Function to check if a node is connected to a link
    function isConnected(node, link) {
      return link.source.id === node.id || link.target.id === node.id;
    }
  }, [graphData, loading, height]);

  // Handle filter changes
  const handleFilterChange = (filterKey) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom().scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom().scaleBy, 0.7);
  };

  const handleZoomReset = () => {
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom().transform, d3.zoomIdentity);
    setZoomLevel(1);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    const newState = !isFullscreen;
    setIsFullscreen(newState);
    
    if (newState) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.mozRequestFullScreen) {
        containerRef.current.mozRequestFullScreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Utility functions
  const getNodeColor = (type, status) => {
    // Colors for activity nodes based on type and status
    if (status === 'failed' || status === 'rejected') {
      return '#e74c3c'; // Red for failed/rejected
    } else if (status === 'pending' || status === 'in-progress') {
      return '#f39c12'; // Orange for pending/in-progress
    }
    
    // Colors based on activity type
    switch (type) {
      case 'feature': return '#3498db'; // Blue
      case 'build': return '#2ecc71';   // Green
      case 'test': return '#9b59b6';    // Purple
      case 'deploy': return '#16a085';  // Teal
      case 'error': return '#e74c3c';   // Red
      case 'update': return '#f1c40f';  // Yellow
      default: return '#7f8c8d';        // Gray for other types
    }
  };

  const getLinkColor = (link) => {
    switch (link.type) {
      case 'feature': return '#3498db';  // Blue
      case 'milestone': return '#8e44ad'; // Purple
      case 'user': return '#e67e22';     // Orange
      case 'related': 
        if (link.reason === 'time') return '#2ecc71';  // Green
        if (link.reason === 'feature') return '#3498db'; // Blue
        if (link.reason === 'milestone') return '#8e44ad'; // Purple
        return '#95a5a6'; // Gray
      default: return '#95a5a6';         // Gray
    }
  };

  const getNodeLabel = (node) => {
    // Simplified label based on node type
    switch (node.type) {
      case 'activity': return node.data.type ? node.data.type.charAt(0).toUpperCase() : 'A';
      case 'feature': return 'F';
      case 'milestone': return 'M';
      case 'user': return 'U';
      default: return '';
    }
  };

  const getNodeTitle = (node) => {
    // Title shown on hover
    switch (node.type) {
      case 'activity': return `${node.data.title || 'Activity'} (${node.data.type || 'unknown'})`;
      case 'feature': return `Feature: ${node.id}`;
      case 'milestone': return `Milestone: ${node.id}`;
      case 'user': return `User: ${node.id}`;
      default: return node.id;
    }
  };

  const getNodeTooltip = (node) => {
    // More detailed tooltip content
    switch (node.type) {
      case 'activity':
        return `
          <div><strong>${node.data.title || 'Activity'}</strong></div>
          <div>Type: ${node.data.type || 'unknown'}</div>
          <div>Status: ${node.data.status || 'unknown'}</div>
          ${node.data.timestamp ? `<div>Time: ${new Date(node.data.timestamp).toLocaleString()}</div>` : ''}
          ${node.data.user ? `<div>User: ${node.data.user}</div>` : ''}
        `;
      case 'feature':
        return `<div><strong>Feature: ${node.id}</strong></div>`;
      case 'milestone':
        return `<div><strong>Milestone: ${node.id}</strong></div>`;
      case 'user':
        return `<div><strong>User: ${node.id}</strong></div>`;
      default:
        return `<div>${node.id}</div>`;
    }
  };

  return (
    <Card className="relationship-graph mb-4 bg-gray-800 border-0 shadow">
      <Card.Header className="bg-gray-700 text-white d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Activity Relationships</h5>
          <p className="text-gray-300 mb-0 mt-1">
            Visualize connections between activities
          </p>
        </div>
        <OverlayTrigger
          placement="left"
          overlay={
            <Tooltip>
              <div className="text-start">
                <div><span style={{ color: '#3498db' }}>●</span> Feature</div>
                <div><span style={{ color: '#2ecc71' }}>●</span> Build</div>
                <div><span style={{ color: '#9b59b6' }}>●</span> Test</div>
                <div><span style={{ color: '#16a085' }}>●</span> Deploy</div>
                <div><span style={{ color: '#e74c3c' }}>●</span> Error</div>
                <div><span style={{ color: '#f1c40f' }}>●</span> Update</div>
                <hr className="my-1" />
                <div><strong>Letters:</strong> F=Feature, M=Milestone, U=User</div>
              </div>
            </Tooltip>
          }
        >
          <Button variant="outline-light" size="sm">
            <InfoCircle />
          </Button>
        </OverlayTrigger>
      </Card.Header>
      
      <Card.Body className="p-0">
        <div className="filters p-3 border-bottom border-secondary">
          <div className="d-flex justify-content-between">
            <div>
              <Form.Check
                type="switch"
                id="feature-links"
                label="Feature connections"
                checked={filters.includeFeatureLinks}
                onChange={() => handleFilterChange('includeFeatureLinks')}
                className="mb-2"
              />
              <Form.Check
                type="switch"
                id="milestone-links"
                label="Milestone connections"
                checked={filters.includeMilestoneLinks}
                onChange={() => handleFilterChange('includeMilestoneLinks')}
                className="mb-2"
              />
              <Form.Check
                type="switch"
                id="user-links"
                label="User connections"
                checked={filters.includeUserLinks}
                onChange={() => handleFilterChange('includeUserLinks')}
              />
            </div>
            <div className="d-flex align-items-start gap-1">
              <Button variant="outline-light" size="sm" onClick={handleZoomIn}>
                <ZoomIn />
              </Button>
              <Button variant="outline-light" size="sm" onClick={handleZoomOut}>
                <ZoomOut />
              </Button>
              <Button variant="outline-light" size="sm" onClick={handleZoomReset}>
                {Math.round(zoomLevel * 100)}%
              </Button>
              <Button variant="outline-light" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? <ArrowsAngleContract /> : <ArrowsFullscreen />}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="graph-container position-relative" ref={containerRef}>
          {error && (
            <Alert variant="danger" className="m-3">
              {error}
            </Alert>
          )}
          
          {loading || simulationRunning ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: `${height}px` }}>
              <div className="text-center">
                <Spinner animation="border" role="status" variant="primary" />
                <p className="mt-2">{loading ? 'Loading data...' : 'Calculating relationships...'}</p>
              </div>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: `${height}px` }}>
              <p className="text-muted">No relationship data available</p>
            </div>
          ) : (
            <svg 
              ref={svgRef} 
              width="100%" 
              height={height} 
              className="relationship-svg bg-gray-900"
            />
          )}
          
          {selectedNode && (
            <div className="node-details position-absolute bottom-0 start-0 end-0 bg-dark p-3">
              <h6 className="mb-2">{getNodeTitle(selectedNode)}</h6>
              {selectedNode.type === 'activity' && (
                <>
                  <p className="mb-1">{selectedNode.data.description}</p>
                  <div className="d-flex justify-content-end mt-2">
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => {
                        // Navigate to activity detail
                        window.location.href = `/activity-center?activity=${selectedNode.id}`;
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Card.Body>
      
      <style jsx>{`
        .graph-tooltip {
          max-width: 200px;
        }
        .relationship-svg {
          display: block;
        }
        .node-details {
          border-top: 1px solid #2c3e50;
          max-height: 40%;
          overflow-y: auto;
        }
      `}</style>
    </Card>
  );
};

export default RelationshipGraph;