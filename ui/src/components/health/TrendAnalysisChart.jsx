import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TrendAnalysisChart = ({ initialData, timeRanges = ['7d', '30d', '90d'] }) => {
  const [timeRange, setTimeRange] = useState(timeRanges[1]); // Default to 30 days
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Default data if not provided
  const defaultData = {
    '7d': {
      labels: ['6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday', 'Today'],
      datasets: [
        {
          label: 'Health Score',
          data: [74, 75, 74, 78, 76, 78, 82],
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Issues',
          data: [24, 22, 24, 19, 20, 18, 16],
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.0)',
          borderDash: [5, 5],
          tension: 0.4
        }
      ]
    },
    '30d': {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'],
      datasets: [
        {
          label: 'Health Score',
          data: [68, 72, 75, 78, 82],
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Issues',
          data: [32, 28, 24, 20, 16],
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.0)',
          borderDash: [5, 5],
          tension: 0.4
        }
      ]
    },
    '90d': {
      labels: ['May', 'June', 'July', 'Current'],
      datasets: [
        {
          label: 'Health Score',
          data: [64, 68, 76, 82],
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Issues',
          data: [38, 32, 22, 16],
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.0)',
          borderDash: [5, 5],
          tension: 0.4
        }
      ]
    }
  };
  
  // Update chart data when time range changes
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate loading data from API
    setTimeout(() => {
      const data = initialData?.[timeRange] || defaultData[timeRange];
      setChartData(data);
      setIsLoading(false);
    }, 500);
  }, [timeRange, initialData]);
  
  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
          color: 'rgba(156, 163, 175, 1)',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(209, 213, 219, 1)',
        borderColor: 'rgba(75, 85, 99, 0.2)',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          title: (context) => {
            return context[0].label;
          }
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
      },
    },
  };
  
  // Analysis of the trend
  const getTrendAnalysis = () => {
    if (!chartData || !chartData.datasets || chartData.datasets.length === 0) return null;
    
    const scoreData = chartData.datasets[0].data;
    const firstScore = scoreData[0];
    const lastScore = scoreData[scoreData.length - 1];
    const change = lastScore - firstScore;
    const percentChange = ((change / firstScore) * 100).toFixed(1);
    
    if (change > 0) {
      return {
        text: `Improved by ${percentChange}% over this period`,
        color: 'text-green-400',
        icon: '↗'
      };
    } else if (change < 0) {
      return {
        text: `Declined by ${Math.abs(percentChange)}% over this period`,
        color: 'text-red-400',
        icon: '↘'
      };
    } else {
      return {
        text: 'Remained stable over this period',
        color: 'text-yellow-400',
        icon: '→'
      };
    }
  };
  
  const trendAnalysis = getTrendAnalysis();

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Health Trend Analysis</h3>
        
        <div className="flex rounded-md overflow-hidden border border-gray-700">
          {timeRanges.map((range) => (
            <button
              key={range}
              className={`py-1 px-3 text-xs ${
                timeRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-60 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-b-2 border-blue-500 rounded-full"></div>
          </div>
        ) : chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No data available
          </div>
        )}
      </div>
      
      {trendAnalysis && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="flex justify-between">
            <div className={`flex items-center ${trendAnalysis.color}`}>
              <span className="text-xl mr-2">{trendAnalysis.icon}</span>
              <span>{trendAnalysis.text}</span>
            </div>
            
            <div className="text-gray-400 text-sm">
              Current score: {chartData?.datasets[0].data.slice(-1)[0]}
            </div>
          </div>
          
          <div className="mt-2 text-sm text-gray-400">
            {timeRange === '7d' && 'Daily monitoring shows consistent improvement in the past week.'}
            {timeRange === '30d' && 'Weekly progress indicates steady health improvement over the past month.'}
            {timeRange === '90d' && 'Monthly tracking shows significant health improvements over the past quarter.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendAnalysisChart;