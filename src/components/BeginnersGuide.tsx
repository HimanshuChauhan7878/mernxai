import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Metric {
  name: string;
  value: string; // Keep value as string for display consistency
  explanation: string;
  numericValue?: number; // Add optional numeric value for charting
  unit?: string; // Add optional unit for chart labels
}

interface BeginnerStats {
  title: string;
  introduction: string;
  metrics: Metric[];
  conclusion: string;
}

// Helper function to extract numeric value and unit
const parseMetricValue = (valueString: string): { numericValue: number | undefined, unit: string | undefined } => {
  const match = valueString.match(/^([\d.]+)\s*(\S*)$/);
  if (match && match[1]) {
    return {
      numericValue: parseFloat(match[1]),
      unit: match[2] || undefined // Return undefined if no unit
    };
  }
  return { numericValue: undefined, unit: undefined }; // Return undefined if no number
};

const BeginnersGuide: React.FC = () => {
  const [stats, setStats] = useState<BeginnerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await axios.get<BeginnerStats>('http://localhost:8003/beginners-guide');
        // Process metrics to add numericValue and unit
        const processedMetrics = response.data.metrics.map(metric => {
          const { numericValue, unit } = parseMetricValue(metric.value);
          return { ...metric, numericValue, unit };
        });
        setStats({ ...response.data, metrics: processedMetrics });
        setError(null);
      } catch (err) {
        setError("Failed to load beginner's guide. Please ensure the backend is running.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Chart Configuration (moved outside conditional rendering for clarity)
  const chartMetrics = stats?.metrics.filter(m => m.numericValue !== undefined && m.name !== 'Accuracy') || []; // Exclude Accuracy for scale
  const chartLabels = chartMetrics.map(m => `${m.name} (${m.unit || ''})`);
  const chartDataValues = chartMetrics.map(m => m.numericValue);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Example Model Performance',
        data: chartDataValues,
        backgroundColor: [
          'rgba(20, 184, 166, 0.6)', // Teal 500 (primary)
          'rgba(168, 85, 247, 0.6)', // Purple 500
          'rgba(234, 179, 8, 0.6)',  // Yellow 500
          'rgba(236, 72, 153, 0.6)', // Pink 500
          'rgba(59, 130, 246, 0.6)'  // Blue 500
        ],
        borderColor: [
          '#0d9488',
          '#9333ea',
          '#ca8a04',
          '#db2777',
          '#2563eb'
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Visual Comparison of Metrics',
        color: '#e5e7eb', // dark:text-gray-200
        font: {
          size: 18,
        }
      },
      tooltip: {
        backgroundColor: '#262626', // dark:bg-gray-800
        titleColor: '#e5e7eb', // dark:text-gray-200
        bodyColor: '#d1d5db', // dark:text-gray-300
        borderColor: '#404040', // dark:border-gray-700
        borderWidth: 1,
        callbacks: {
            label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += context.parsed.y + (chartMetrics[context.dataIndex].unit ? ` ${chartMetrics[context.dataIndex].unit}` : '');
                }
                return label;
            }
        }
      }
    },
    scales: {
      x: {
          ticks: { color: '#9ca3af' }, // dark:text-gray-400
          grid: { color: '#404040' } // dark:border-gray-700
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#9ca3af' }, // dark:text-gray-400
        grid: { color: '#404040' } // dark:border-gray-700
      }
    }
  };

  // --- Render Logic ---
  if (loading) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading guide...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500 dark:text-red-400">{error}</div>;
  }

  if (!stats) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">No data available.</div>;
  }

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-950/30 border border-transparent dark:border-gray-700 animate-fade-in-up">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-gray-900 dark:text-white">{stats.title}</h1>
      <p className="mb-8 text-lg text-gray-600 dark:text-gray-300 text-center max-w-3xl mx-auto">{stats.introduction}</p>

      {/* Chart Section */}
      {chartDataValues.length > 0 && (
        <div className="mb-10 p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-inner border border-gray-200 dark:border-gray-700">
           <div className="h-64 sm:h-80"> {/* Give chart a fixed height */}
             <Bar options={chartOptions} data={chartData} />
           </div>
        </div>
      )}

      {/* Metrics Explanation Section */}
      <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-gray-800 dark:text-gray-100">Metric Explanations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.metrics.map((metric, index) => (
          <div 
             key={index} 
             className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-950/30 border border-gray-200 dark:border-gray-700 transform transition duration-300 hover:scale-[1.03] hover:shadow-xl"
             style={{ animationDelay: `${index * 0.1}s` }} // Stagger animation
          >
            <h3 className="text-xl font-semibold text-primary dark:text-primary-400 mb-2">
                {metric.name}: <span className="font-bold text-gray-900 dark:text-gray-100">{metric.value}</span>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{metric.explanation}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-lg text-gray-600 dark:text-gray-300 text-center italic max-w-3xl mx-auto">{stats.conclusion}</p>
    </div>
  );
};

export default BeginnersGuide; 