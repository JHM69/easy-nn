'use client'

import { useState } from 'react'
import { evaluate } from 'mathjs'

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
  const [error, setError] = useState<string>('')

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

      // Generate points
      for (let x = range.min; x <= range.max; x += step) {
        try {
          const y = evaluate(cleanEquation, { x })
          if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
            newDataset.push({ x, y })
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Generate Dataset</h3>
      
      <div className="flex gap-4 flex-wrap">
        <div className="space-y-2">
          <label className="block">Min X:</label>
          <input
            type="number"
            value={range.min}
            onChange={(e) => setRange({ ...range, min: Number(e.target.value) })}
            className="px-2 py-1 border rounded dark:bg-gray-800"
          />
        </div>

        <div className="space-y-2">
          <label className="block">Max X:</label>
          <input
            type="number"
            value={range.max}
            onChange={(e) => setRange({ ...range, max: Number(e.target.value) })}
            className="px-2 py-1 border rounded dark:bg-gray-800"
          />
        </div>

        <div className="space-y-2">
          <label className="block">Number of points:</label>
          <input
            type="number"
            value={range.points}
            onChange={(e) => setRange({ ...range, points: Math.max(2, Number(e.target.value)) })}
            min="2"
            className="px-2 py-1 border rounded dark:bg-gray-800"
          />
        </div>

        <div className="space-y-2">
          <label className="block">Train Split (%):</label>
          <input
            type="number"
            value={trainSplit * 100}
            onChange={(e) => setTrainSplit(Math.max(0.1, Math.min(0.9, Number(e.target.value) / 100)))}
            min="10"
            max="90"
            className="px-2 py-1 border rounded dark:bg-gray-800"
          />
        </div>
      </div>

      <button
        onClick={generateDataset}
        disabled={!equation}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
      >
        Generate Dataset
      </button>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {dataset.length > 0 && !error && (
        <div className="text-sm space-y-2">
          <p>Generated {dataset.length} total points</p>
          <p>Train set: {trainData.length} points</p>
          <p>Test set: {testData.length} points</p>
          <p className="text-gray-600">
            Sample train points: {trainData.slice(0, 3).map(d => `(${d.x.toFixed(2)}, ${d.y.toFixed(2)})`).join(', ')}...
          </p>
        </div>
      )}
    </div>
  )
}
