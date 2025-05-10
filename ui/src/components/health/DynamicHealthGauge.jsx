import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const DynamicHealthGauge = ({ score, previousScore, lastUpdated }) => {
  // Calculate trend
  const scoreDifference = score - previousScore;
  const trendDirection = scoreDifference > 0 ? 'up' : scoreDifference < 0 ? 'down' : 'stable';
  
  // Define color based on score
  const getScoreColor = (score) => {
    if (score >= 90) return ['#10B981', '#059669'];
    if (score >= 70) return ['#F59E0B', '#D97706'];
    return ['#EF4444', '#DC2626'];
  };
  
  const colors = getScoreColor(score);
  
  // Chart data
  const data = {
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: [colors[0], '#1F2937'],
        borderColor: [colors[1], '#111827'],
        borderWidth: 1,
        cutout: '80%',
        circumference: 270,
        rotation: 225,
      },
    ],
  };
  
  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    events: [],
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };
  
  // Define trend icon and color
  const getTrendIcon = () => {
    if (trendDirection === 'up') return '↗';
    if (trendDirection === 'down') return '↘';
    return '→';
  };
  
  const getTrendColor = () => {
    if (trendDirection === 'up') return 'text-green-500';
    if (trendDirection === 'down') return 'text-red-500';
    return 'text-yellow-500';
  };
  
  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Attention';
    return 'Critical';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 relative">
      <h3 className="text-lg font-medium mb-4 text-center">System Health</h3>
      
      <div className="h-48 relative">
        <Doughnut data={data} options={options} />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold">{score}</div>
          <div className="text-sm mt-1">{getScoreLabel(score)}</div>
          <div className={`text-sm mt-2 flex items-center ${getTrendColor()}`}>
            <span className="mr-1">{getTrendIcon()}</span>
            <span>{Math.abs(scoreDifference)}% {trendDirection === 'up' ? 'increase' : trendDirection === 'down' ? 'decrease' : 'no change'}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-center text-xs text-gray-400">
        Last updated: {formatDate(lastUpdated)}
      </div>
      
      {/* Health score guidelines */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-center mb-2">Health Score Legend</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span>90-100: Excellent</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span>70-89: Fair</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span>&lt;70: Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicHealthGauge;