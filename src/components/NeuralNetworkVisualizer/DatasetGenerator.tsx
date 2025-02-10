'use client'

import { useState } from 'react'
import { evaluate } from 'mathjs'
import { ChevronDown, ChevronUp, Table, LineChart } from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
} from 'chart.js'

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
)

interface DatasetGeneratorProps {
  equation: string
  dataset: { x: number; y: number }[]
  trainData: { x: number; y: number }[]
  testData: { x: number; y: number }[]
  onDatasetChange: (dataset: { x: number; y: number }[], trainData: { x: number; y: number }[], testData: { x: number; y: number }[]) => void
}

export default function DatasetGenerator({
  equation,
  dataset,
  trainData,
  testData,
  onDatasetChange
}: DatasetGeneratorProps) {
  const [range, setRange] = useState({ min: -10, max: 10, points: 100 })
  const [trainSplit, setTrainSplit] = useState(0.8) // 80% train, 20% test
  const [noise, setNoise] = useState(0.001) // Add noise state
  const [error, setError] = useState<string>('')
  const [showDataTable, setShowDataTable] = useState(false)
  const [showVisualizer, setShowVisualizer] = useState(false)

  const generateDataset = () => {
    if (!equation) {
      setError('Please enter an equation first')
      return
    }

    try {
      const step = (range.max - range.min) / (range.points - 1)
      const newDataset = []
      
      // Clean up the equation
      const cleanEquation = equation
        .replace(/\s+/g, '')
        .replace(/^y=/, '')
        .replace(/^f\(x\)=/, '')

      // Generate points with noise
      for (let i = 0; i < range.points; i++) {
        const x = range.min + (i * step)
        try {
          const y = evaluate(cleanEquation, { x })
          if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
            // Add random noise
            const noiseValue = noise * (Math.random() * 2 - 1)
            newDataset.push({ x, y: y + noiseValue })
          }
        } catch (err) {
          console.error('Error evaluating at x =', x, err)
        }
      }

      if (newDataset.length === 0) {
        setError('Could not generate any valid data points')
        return
      }

      // Shuffle dataset
      const shuffled = [...newDataset].sort(() => Math.random() - 0.5)
      
      // Split into train and test
      const splitIndex = Math.floor(shuffled.length * trainSplit)
      const newTrainData = shuffled.slice(0, splitIndex)
      const newTestData = shuffled.slice(splitIndex)

      setError('')
      onDatasetChange(newDataset, newTrainData, newTestData)

    } catch (err) {
      console.error('Dataset generation error:', err)
      setError('Error generating dataset: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Sort dataset by x value for proper line plotting
  const sortedDataset = [...dataset].sort((a, b) => a.x - b.x)

  const chartData = {
    datasets: [
      {
        type: 'line' as const,
        label: 'Function Line',
        data: sortedDataset.map(point => ({ x: point.x, y: point.y })),
        borderColor: 'rgba(156, 163, 175, 0.5)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        fill: false,
        order: 3,
      },
      {
        type: 'scatter' as const,
        label: 'Training Data',
        data: trainData.map(point => ({ x: point.x, y: point.y })),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        order: 2,
      },
      {
        type: 'scatter' as const,
        label: 'Testing Data',
        data: testData.map(point => ({ x: point.x, y: point.y })),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        order: 1,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'nearest' as const,
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'X',
          color: '#9CA3AF',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
          callback: (value: number) => value.toFixed(1)
        }
      },
      y: {
        title: {
          display: true,
          text: 'Y',
          color: '#9CA3AF',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
          callback: (value: number) => value.toFixed(2)
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          color: '#9CA3AF',
          font: {
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: {
        display: true,
        text: equation || 'Dataset Visualization',
        color: '#9CA3AF',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `(${context.parsed.x.toFixed(3)}, ${context.parsed.y.toFixed(3)})`
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 rounded-xl p-8 shadow-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Dataset Generator</h3>
        {dataset.length > 0 && (
          <span className="px-4 py-1.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
            {dataset.length} points
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Min X:</label>
          <input
            type="number"
            value={range.min}
            onChange={(e) => setRange({ ...range, min: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded dark:bg-gray-800"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Max X:</label>
          <input
            type="number"
            value={range.max}
            onChange={(e) => setRange({ ...range, max: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded dark:bg-gray-800"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Number of points:</label>
          <input
            type="number"
            value={range.points}
            onChange={(e) => setRange({ ...range, points: Math.max(2, Number(e.target.value)) })}
            min="2"
            className="w-full px-3 py-2 rounded dark:bg-gray-800"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Train Split (%):</label>
          <input
            type="number"
            value={trainSplit * 100}
            onChange={(e) => setTrainSplit(Math.max(0.1, Math.min(0.9, Number(e.target.value) / 100)))}
            min="10"
            max="90"
            className="w-full px-3 py-2 rounded dark:bg-gray-800"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Noise Amount:</label>
          <input
            type="number"
            value={noise}
            onChange={(e) => setNoise(Math.max(0, Number(e.target.value)))}
            min="0"
            step="0.1"
            className="w-full px-3 py-2 rounded dark:bg-gray-800"
          />
        </div>
      </div>

      <button
        onClick={generateDataset}
        disabled={!equation}
        className="w-full px-4 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg
          hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500
          transition-all duration-200 flex items-center justify-center gap-3 text-base font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        Generate Dataset
      </button>

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}

      {dataset.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              <button
                onClick={() => setShowDataTable(!showDataTable)}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
              >
                <Table className="w-5 h-5" />
                <span className="font-medium">{showDataTable ? 'Hide' : 'Show'} Table</span>
                {showDataTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setShowVisualizer(!showVisualizer)}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
              >
                <LineChart className="w-5 h-5" />
                <span className="font-medium">{showVisualizer ? 'Hide' : 'Show'} Chart</span>
                {showVisualizer ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="flex gap-6 text-sm font-medium">
              <span className="text-green-500">Train: {trainData.length}</span>
              <span className="text-blue-500">Test: {testData.length}</span>
            </div>
          </div>

          {showVisualizer && (
            <div className="border dark:border-gray-700 rounded-lg p-6">
              <div className="h-[400px]">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {showDataTable && (
            <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Index
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      X
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Y
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Set
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {dataset.slice(0, 10).map((point, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {point.x.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {point.y.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1.5 rounded-full ${
                          trainData.includes(point)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {trainData.includes(point) ? 'Train' : 'Test'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dataset.length > 10 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  Showing 10 of {dataset.length} points
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
