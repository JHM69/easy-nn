'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { Layer, LossType } from '@/types/neural-network'
// import TrainingVisualizer from './TrainingVisualizer'
// import FunctionInput from './FunctionInput'
// import DatasetGenerator from './DatasetGenerator'
// import NetworkArchitecture from './NetworkArchitecture'

// Use dynamic imports to avoid SSR issues
const FunctionInput = dynamic(() => import('./FunctionInput'), { ssr: false })
const NetworkArchitecture = dynamic(() => import('./NetworkArchitecture'), { ssr: false })
const TrainingVisualizer = dynamic(() => import('./TrainingVisualizer'), { ssr: false })
const DatasetGenerator = dynamic(() => import('./DatasetGenerator'), { ssr: false })

export default function NeuralNetworkVisualizer() {
  const [equation, setEquation] = useState<string>('')
  const [dataset, setDataset] = useState<{ x: number; y: number }[]>([])
  const [trainData, setTrainData] = useState<{ x: number; y: number }[]>([])
  const [testData, setTestData] = useState<{ x: number; y: number }[]>([])
  const [layers, setLayers] = useState<Layer[]>([
    { neurons: 1, activation: 'linear', type: 'input' },  // Changed from 2 to 1 to match input dimension
    { neurons: 4, activation: 'relu', type: 'hidden' }, 
    { neurons: 4, activation: 'sigmoid', type: 'hidden' }, 
    { neurons: 1, activation: 'linear', type: 'output' }
  ])
  const [lossFunction, setLossFunction] = useState<LossType>('mse')
  const [predictions, setPredictions] = useState<{ x: number; y: number; predicted: number }[]>([])
  const [loss, setLoss] = useState<number[]>([])
 
  // Debug logging
  useEffect(() => {
    console.log('Network configuration:', {
      equation,
      datasetSize: dataset.length,
      layers,
      lossFunction
    })
  }, [equation, dataset, layers, lossFunction])

  const handleDatasetChange = (
    newDataset: { x: number; y: number }[],
    newTrainData: { x: number; y: number }[],
    newTestData: { x: number; y: number }[]
  ) => {
    setDataset(newDataset)
    setTrainData(newTrainData)
    setTestData(newTestData)
  }
  
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <FunctionInput 
        equation={equation} 
        onEquationChange={setEquation} 
      />
      
      <DatasetGenerator 
        equation={equation}
        dataset={dataset}
        trainData={trainData}
        testData={testData}
        onDatasetChange={handleDatasetChange}
      />
      
      <NetworkArchitecture
        layers={layers}
        onLayersChange={setLayers}
        lossFunction={lossFunction}
        onLossFunctionChange={setLossFunction}
      />
      
      <TrainingVisualizer
        layers={layers}
        trainData={trainData}
        testData={testData}
        lossFunction={lossFunction}
        predictions={predictions}
        dataset={dataset}
        loss={loss}
      />
    </div>
  )
}
