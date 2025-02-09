'use client'

import { useState, useEffect } from 'react'
import FunctionInput from './FunctionInput'
import NetworkArchitecture from './NetworkArchitecture'
import TrainingVisualizer from './TrainingVisualizer'
import DatasetGenerator from './DatasetGenerator'
import { Layer, ActivationType, LossType } from '@/types/neural-network'

export default function NeuralNetworkVisualizer() {
  const [equation, setEquation] = useState<string>('')
  const [dataset, setDataset] = useState<{ x: number; y: number }[]>([])
  const [layers, setLayers] = useState<Layer[]>([
    { neurons: 1, activation: 'linear', type: 'input' },
    { neurons: 8, activation: 'relu', type: 'hidden' },
    { neurons: 8, activation: 'relu', type: 'hidden' },
    { neurons: 1, activation: 'linear', type: 'output' }
  ])
  const [lossFunction, setLossFunction] = useState<LossType>('mse')

  // Debug logging
  useEffect(() => {
    console.log('Network configuration:', {
      equation,
      datasetSize: dataset.length,
      layers,
      lossFunction
    })
  }, [equation, dataset, layers, lossFunction])
  
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <FunctionInput 
        equation={equation} 
        onEquationChange={setEquation} 
      />
      
      <DatasetGenerator 
        equation={equation}
        dataset={dataset}
        onDatasetChange={setDataset}
      />
      
      <NetworkArchitecture
        layers={layers}
        onLayersChange={setLayers}
        lossFunction={lossFunction}
        onLossFunctionChange={setLossFunction}
      />
      
      <TrainingVisualizer
        layers={layers}
        dataset={dataset}
        lossFunction={lossFunction}
      />
    </div>
  )
}
