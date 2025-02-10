'use client'

 
import { useTheme } from 'next-themes'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2'; 

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

// Theme-aware colors helper
const getThemeColors = (theme: string | undefined) => {
  const isDark = theme === 'dark';
  return {
    text: isDark ? '#e5e7eb' : '#374151',
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    training: {
      point: isDark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(54, 162, 235, 0.5)',
      border: isDark ? 'rgba(96, 165, 250, 1)' : 'rgba(54, 162, 235, 1)',
    },
    predictions: {
      line: isDark ? 'rgba(248, 113, 113, 1)' : 'rgba(255, 99, 132, 1)',
      background: isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(255, 99, 132, 0.1)',
    },
    boundary: {
      line: isDark ? 'rgba(52, 211, 153, 0.4)' : 'rgba(75, 192, 192, 0.4)',
      background: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(75, 192, 192, 0.1)',
    },
  };
};

interface TrainingMetrics {
  epoch: number;
  trainLoss: number;
  validationLoss: number;
  accuracy: number;
}

interface TrainingChartProps {
  predictions: Array<{x: number; y: number; predicted: number}>;
  testPredictions: Array<{x: number; y: number; predicted: number}>;
  dataset: Array<{x: number; y: number}>;
  loss: number[];
  trainingMetrics: TrainingMetrics[];
  decisionBoundary: Array<{x: number; y: number; value: number}>;
  isTraining: boolean;
  lossFunction: 'mse' | 'binaryCrossEntropy' | 'categoricalCrossEntropy' | 'mae'
}

export default function TrainingChart({
  predictions,
  testPredictions,
  dataset,
  loss,
  trainingMetrics,
  decisionBoundary,
  isTraining,
  lossFunction
}: TrainingChartProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const getLossLabel = () => {
    switch(lossFunction) {
      case 'binaryCrossEntropy':
        return 'Binary Cross-Entropy';
      case 'categoricalCrossEntropy':
        return 'Categorical Cross-Entropy';
      case 'mae':
        return 'Mean Absolute Error';
      default:
        return 'Mean Squared Error';
    }
  };
  
  // Format data for prediction chart
  const predictionData: ChartData = {
    datasets: [
      {
        label: 'Training Data',
        data: dataset.map(d => ({ x: d.x, y: d.y })),
        backgroundColor: colors.training.point,
        pointRadius: 4,
        pointStyle: 'circle',
        type: 'scatter',
        order: 1
      },
      {
        label: 'Model Predictions',
        data: predictions
          .sort((a, b) => a.x - b.x) // Sort by x value for proper line rendering
          .map(p => ({ x: p.x, y: p.predicted })),
        borderColor: colors.predictions.line,
        backgroundColor: colors.predictions.background,
        pointRadius: 0,
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        type: 'line',
        order: 2
      },
      {
        label: 'Decision Boundary',
        data: decisionBoundary,
        borderColor: colors.boundary.line,
        backgroundColor: colors.boundary.background,
        pointRadius: 0,
        borderWidth: 1,
        fill: true,
        tension: 0.4,
        order: 3
      }
    ]
  };

  // Update metrics data with dynamic loss label
  const metricsData = {
    labels: trainingMetrics.map(m => `Epoch ${m.epoch + 1}`),
    datasets: [
      {
        label: `Training ${getLossLabel()}`,
        data: trainingMetrics.map(m => m.trainLoss),
        borderColor: colors.predictions.line,
        backgroundColor: colors.predictions.background,
        borderWidth: 2,
        fill: true,
        tension: 0.4
      },
      {
        label: `Validation ${getLossLabel()}`,
        data: trainingMetrics.map(m => m.validationLoss),
        borderColor: colors.training.border,
        backgroundColor: colors.training.point,
        borderWidth: 2,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Accuracy',
        data: trainingMetrics.map(m => m.accuracy),
        borderColor: colors.boundary.line,
        backgroundColor: colors.boundary.background,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'accuracy'
      }
    ]
  };

  // Common chart options for dark mode support
  const commonOptions = {
    color: colors.text,
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    scales: {
      x: {
        grid: {
          color: colors.grid,
        },
        ticks: {
          color: colors.text,
        },
        title: {
          color: colors.text,
        },
      },
      y: {
        grid: {
          color: colors.grid,
        },
        ticks: {
          color: colors.text,
        },
        title: {
          color: colors.text,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: colors.text,
        },
      },
    },
  };

  // Chart options
  const predictionOptions: ChartOptions = {
    ...commonOptions,
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isTraining ? 0 : 300
    },
    plugins: {
      ...commonOptions.plugins,
      tooltip: {
        mode: 'nearest' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const point = context.raw;
            return `${context.dataset.label}: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
          }
        }
      }
    },
    scales: {
      ...commonOptions.scales,
      x: {
        ...commonOptions.scales.x,
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Input (x)',
        },
      },
      y: {
        ...commonOptions.scales.y,
        title: {
          display: true,
          text: 'Output (y)',
        },
        ticks: {
          ...commonOptions.scales.y.ticks,
          callback: (value: number) => value.toFixed(2)
        }
      }
    }
  };

  const metricsOptions = {
    ...commonOptions,
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isTraining ? 0 : 300
    },
    plugins: {
      ...commonOptions.plugins,
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      ...commonOptions.scales,
      accuracy: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Accuracy',
          color: colors.text,
        },
        ticks: {
          color: colors.text,
        },
        grid: {
          drawOnChartArea: false,
          color: colors.grid,
        },
        min: 0,
        max: 1,
      },
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
        <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Model Predictions</h4>
        <div className="h-[300px] bg-white dark:bg-gray-800">
          <Line
            data={predictionData}
            options={predictionOptions}
          />
        </div>
        {isTraining && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            Training in progress - Live updates
          </div>
        )}
      </div>
      
      <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
        <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Training Progress</h4>
        <div className="h-[300px] bg-white dark:bg-gray-800">
          <Line
            data={metricsData}
            options={metricsOptions}
          />
        </div>
        {trainingMetrics.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-red-500 dark:text-red-400">
                {trainingMetrics[trainingMetrics.length - 1].trainLoss.toFixed(4)}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Training {getLossLabel()}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-500 dark:text-blue-400">
                {trainingMetrics[trainingMetrics.length - 1].validationLoss.toFixed(4)}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Validation {getLossLabel()}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-500 dark:text-green-400">
                {(trainingMetrics[trainingMetrics.length - 1].accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-gray-500 dark:text-gray-400">Accuracy</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
