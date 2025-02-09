'use client'

import { useEffect, useRef } from 'react'
import { Chart, ChartConfiguration } from 'chart.js/auto'

interface TrainingChartProps {
  predictions: { x: number; y: number; predicted: number }[]
  dataset: { x: number; y: number }[]
  loss: number[]
}

export default function TrainingChart({ predictions, dataset, loss }: TrainingChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    // Sort predictions by x for smooth line
    const sortedPredictions = [...predictions].sort((a, b) => a.x - b.x)

    const config: ChartConfiguration = {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Training Data',
            data: dataset.map(point => ({ x: point.x, y: point.y })),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            pointRadius: 4,
          },
          {
            label: 'Predictions',
            data: sortedPredictions.map(point => ({ x: point.x, y: point.predicted })),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            pointRadius: 4,
            showLine: true, // Connect points with a line
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
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    }

    chartInstance.current = new Chart(ctx, config)

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [predictions, dataset])

  return (
    <div className="w-full h-[300px]">
      <canvas ref={chartRef} />
    </div>
  )
}
