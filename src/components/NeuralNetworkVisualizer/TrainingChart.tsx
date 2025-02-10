'use client'

import { useEffect, useRef } from 'react'

interface TrainingChartProps {
  predictions: { x: number; y: number; predicted: number }[]
  dataset: { x: number; y: number }[]
  loss: number[]
}

export default function TrainingChart({ predictions = [], dataset = [], loss = [] }: TrainingChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)

  useEffect(() => {
    const initChart = async () => {
      if (!chartRef.current) return

      try {
        const Chart = (await import('chart.js/auto')).default

        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy()
        }

        const ctx = chartRef.current.getContext('2d')
        if (!ctx) return

        // Ensure predictions and dataset are valid arrays
        const validPredictions = Array.isArray(predictions) ? predictions : []
        const validDataset = Array.isArray(dataset) ? dataset : []

        // Filter and sort data
        const sortedPredictions = [...validPredictions]
          .filter(p => p && typeof p.x === 'number' && typeof p.predicted === 'number')
          .sort((a, b) => a.x - b.x)

        const validDataPoints = validDataset
          .filter(point => point && typeof point.x === 'number' && typeof point.y === 'number')

        chartInstanceRef.current = new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [
              {
                label: 'Training Data',
                data: validDataPoints.map(point => ({ x: point.x, y: point.y })),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                pointRadius: 4,
              },
              {
                label: 'Predictions',
                data: sortedPredictions.map(point => ({ x: point.x, y: point.predicted })),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                pointRadius: 4,
                showLine: true,
                borderColor: 'rgba(255, 99, 132, 0.5)',
                borderWidth: 2,
              }
            ]
          },
          options: {
            responsive: true,
            animation: false,
            scales: {
              x: {
                type: 'linear',
                position: 'bottom',
                title: {
                  display: true,
                  text: 'Input (x)'
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Output (y)'
                }
              }
            }
          }
        })
      } catch (error) {
        console.error('Error initializing chart:', error)
      }
    }

    initChart()

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [predictions, dataset])

  return (
    <div className="w-full h-[300px]">
      <canvas ref={chartRef} />
    </div>
  )
}
