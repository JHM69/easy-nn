'use client'

import { useRef, useEffect, useState } from 'react'
import { Layer, LossType, Weight } from '@/types/neural-network'
import { initializeWeights, forwardPass, calculateLoss, backpropagate } from '@/utils/neural-network'
import TrainingChart from './TrainingChart'

/**
 * AnimationStep is used for the "playback" animation
 * that replays forward passes over time (epochs/samples).
 */
interface AnimationStep {
  activations: number[][]
  weights: Weight[]
  biases: number[]
  loss: number
  epoch: number
  sampleIndex: number
  predictions: { x: number; y: number; predicted: number }[]
}

/**
 * TrainingStep is used specifically in step-by-step mode
 * to store both forward and backward details.
 */
interface VisualizerTrainingStep {
  type: 'forward' | 'backward'
  activations: number[][]
  weights: Weight[]
  biases: number[]
  loss: number
  gradients?: {
    weights: { sourceLayer: number; sourceNeuron: number; targetNeuron: number; gradient: number }[]
    biases: number[]
  }
  sampleIndex: number
  prediction?: number
  actual?: number
}

interface TrainingVisualizerProps {
  layers: Layer[]
  dataset: { x: number; y: number }[]
  lossFunction: LossType
}

export default function TrainingVisualizer({
  layers,
  dataset,
  lossFunction
}: TrainingVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Step-by-step training states
  const [currentStep, setCurrentStep] = useState<VisualizerTrainingStep | null>(null)
  const [trainingSteps, setTrainingSteps] = useState<VisualizerTrainingStep[]>([])
  const [stepMode, setStepMode] = useState<boolean>(false)
  const [sampleIndex, setSampleIndex] = useState<number>(0)
  const [stepPhase, setStepPhase] = useState<'forward' | 'backward'>('forward')

  // Full training states
  const [isTraining, setIsTraining] = useState(false)
  const [weights, setWeights] = useState<Weight[]>([])
  const [biases, setBiases] = useState<number[]>([])
  const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1000) // ms between steps
  const [learningRate, setLearningRate] = useState<number>(0.01)
  const [epochs, setEpochs] = useState<number>(100)
  const [currentEpoch, setCurrentEpoch] = useState<number>(0)
  const [totalLoss, setTotalLoss] = useState<number>(0)
  const [lossHistory, setLossHistory] = useState<number[]>([])
  const [currentPredictions, setCurrentPredictions] = useState<{ x: number; y: number; predicted: number }[]>([])

  // --------------------------------------------------------------------------
  //  Initialization
  // --------------------------------------------------------------------------
  useEffect(() => {
    const initialWeights = initializeWeights(layers)
    // If you really want biases in a single array, you can keep this approach,
    // but confirm the rest of your forwardPass/backprop logic expects it.
    const totalBiases = layers.reduce((sum, layer, i) =>
      i > 0 ? sum + layer.neurons : sum,
      0
    )
    const initialBiases = Array(totalBiases).fill(0)

    setWeights(initialWeights)
    setBiases(initialBiases)
  }, [layers])

  useEffect(() => {
    console.log('Current state:', {
      layers,
      dataset,
      weights,
      biases
    })
  }, [layers, dataset, weights, biases])

  // --------------------------------------------------------------------------
  //  Drawing / Visualization Helpers
  // --------------------------------------------------------------------------
  const getTextColor = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#000'

  const drawNeuron = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    value: number,
    radius: number = 20,
    bias?: number,
    isHighlighted: boolean = false
  ) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = isHighlighted
      ? `rgba(59, 130, 246, ${Math.abs(value)})`
      : `rgba(156, 163, 175, ${Math.abs(value)})`
    ctx.fill()
    ctx.strokeStyle = isHighlighted ? '#1e40af' : '#4b5563'
    ctx.stroke()

    // Activation text
    ctx.fillStyle = getTextColor()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '12px Arial'
    ctx.fillText(`a: ${value.toFixed(2)}`, x, y - 5)

    // Bias text
    if (bias !== undefined) {
      ctx.fillStyle = getTextColor()
      ctx.font = '11px Arial'
      ctx.fillText(`b: ${bias.toFixed(2)}`, x, y + 10)
    }
  }

  const drawConnection = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    weight: number,
    gradient?: number,
    isActive: boolean = false
  ) => {
    const normalizedWeight = Math.tanh(weight)

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.strokeStyle = isActive
      ? (normalizedWeight > 0
        ? `rgba(59, 130, 246, ${Math.abs(normalizedWeight)})`
        : `rgba(239, 68, 68, ${Math.abs(normalizedWeight)})`)
      : `rgba(156, 163, 175, ${Math.abs(normalizedWeight) * 0.5})`

    ctx.lineWidth = Math.abs(normalizedWeight) * 3
    ctx.stroke()

    // Weight text
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    ctx.fillStyle = getTextColor()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '11px Arial'
    ctx.fillText(`w: ${weight.toFixed(2)}`, midX, midY - 8)

    // Gradient text
    if (gradient !== undefined && isActive) {
      ctx.fillStyle = '#d97706' // Amber color for gradients
      ctx.font = '11px Arial'
      ctx.fillText(`∇: ${gradient.toFixed(3)}`, midX, midY + 8)
    }
  }

  const drawInformationOverlay = (
    ctx: CanvasRenderingContext2D,
    step: VisualizerTrainingStep
  ) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    // If backward pass is displayed, we have a bit more text
    const boxHeight = step.type === 'backward' ? 120 : 80
    ctx.fillRect(10, 10, 200, boxHeight)

    ctx.fillStyle = getTextColor()
    ctx.font = '14px Arial'

    ctx.fillText(`Sample: ${step.sampleIndex + 1}/${dataset.length}`, 20, 30)
    ctx.fillText(`Loss: ${step.loss.toFixed(4)}`, 20, 50)

    if (step.prediction !== undefined) {
      ctx.fillText(`Prediction: ${step.prediction.toFixed(4)}`, 20, 70)
      ctx.fillText(`Actual: ${step.actual?.toFixed(4)}`, 20, 90)
    }

    if (step.type === 'backward') {
      ctx.fillText('Updating weights...', 20, 110)
    }
  }

  const drawNetwork = (ctx: CanvasRenderingContext2D, step: VisualizerTrainingStep) => {
    const canvas = ctx.canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const layerSpacing = canvas.width / (layers.length + 1)
    const maxNeurons = Math.max(...layers.map(l => l.neurons))
    const neuronSpacing = canvas.height / (maxNeurons + 1)

    // Title
    ctx.fillStyle = getTextColor()
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      step.type === 'forward' ? 'Forward Pass' : 'Backward Pass',
      canvas.width / 2,
      30
    )

    // Draw connections
    layers.forEach((layer, l) => {
      if (l === 0) return
      const prevLayer = layers[l - 1]
      const layerX = layerSpacing * (l + 1)
      const prevLayerX = layerSpacing * l

      Array(layer.neurons).fill(0).forEach((_, n) => {
        const neuronY = neuronSpacing * (n + 1)
        Array(prevLayer.neurons).fill(0).forEach((_, pn) => {
          const prevNeuronY = neuronSpacing * (pn + 1)
          const weightObj = step.weights.find(w =>
            w.sourceLayer === l - 1 &&
            w.sourceNeuron === pn &&
            w.targetNeuron === n
          )
          if (weightObj) {
            const gradient = step.type === 'backward'
              ? step.gradients?.weights.find(g =>
                  g.sourceLayer === l - 1 &&
                  g.sourceNeuron === pn &&
                  g.targetNeuron === n
                )?.gradient
              : undefined

            drawConnection(
              ctx,
              prevLayerX,
              prevNeuronY,
              layerX,
              neuronY,
              weightObj.value,
              gradient,
              step.type === 'backward'
            )
          }
        })
      })
    })

    // Draw neurons
    layers.forEach((layer, l) => {
      const layerX = layerSpacing * (l + 1)

      // Label
      ctx.fillStyle = getTextColor()
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`Layer ${l + 1} (${layer.type})`, layerX, neuronSpacing / 2)

      Array(layer.neurons).fill(0).forEach((_, n) => {
        const neuronY = neuronSpacing * (n + 1)
        const activation = step.activations[l][n]
        // If your biases are in a 1D array, you need an index offset
        // For now, we check step.biases[l][n] if your logic truly stores them as 2D
        let biasVal: number | undefined
        if (step.biases && Array.isArray(step.biases[l])) {
          // @ts-ignore – depends on how you store biases
          biasVal = step.biases[l][n]
        }
        const isHighlighted = step.type === 'backward'

        drawNeuron(ctx, layerX, neuronY, activation, 20, biasVal, isHighlighted)
      })
    })

    // Info overlay
    drawInformationOverlay(ctx, step)
  }

  // --------------------------------------------------------------------------
  //  Animation Controls
  // --------------------------------------------------------------------------
  const playAnimation = () => {
    if (currentStepIndex >= animationSteps.length - 1) {
      setCurrentStepIndex(0)
    }
    setIsPlaying(true)
  }

  const pauseAnimation = () => {
    setIsPlaying(false)
  }

  const resetAnimation = () => {
    setIsPlaying(false)
    setCurrentStepIndex(0)
  }

  const stepForward = () => {
    if (currentStepIndex < animationSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const stepBackward = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  // Handle auto-play
  useEffect(() => {
    if (!isPlaying) return
    if (currentStepIndex >= animationSteps.length - 1) {
      setIsPlaying(false)
      return
    }

    const timeoutId = setTimeout(() => {
      setCurrentStepIndex(prev => prev + 1)
    }, playbackSpeed)

    return () => clearTimeout(timeoutId)
  }, [isPlaying, currentStepIndex, animationSteps, playbackSpeed])

  // Whenever currentStepIndex changes, redraw
  useEffect(() => {
    if (!animationSteps[currentStepIndex] || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const stepData = animationSteps[currentStepIndex]
    // We'll just show the forward pass view
    drawNetwork(ctx, {
      type: 'forward',
      activations: stepData.activations,
      weights: stepData.weights,
      biases: stepData.biases,
      loss: stepData.loss,
      sampleIndex: stepData.sampleIndex
    } as VisualizerTrainingStep)
  }, [currentStepIndex, animationSteps])

  // --------------------------------------------------------------------------
  //  Full Training
  // --------------------------------------------------------------------------
  const startTraining = async () => {
    if (!dataset.length || isTraining) return
    if (!canvasRef.current) return

    console.log('Starting training with params:', {
      learningRate,
      epochs,
      datasetSize: dataset.length
    })

    setIsTraining(true)
    setAnimationSteps([])
    setCurrentStepIndex(0)
    setCurrentEpoch(0)
    setTotalLoss(0)

    // Re-init weights/biases
    const initialWeights = initializeWeights(layers)
    const totalBiases = layers.reduce((sum, layer, i) =>
      i > 0 ? sum + layer.neurons : sum,
      0
    )
    const initialBiases = Array(totalBiases).fill(0)

    let currentWeights = [...initialWeights]
    let currentBiases = [...initialBiases]
    const steps: AnimationStep[] = []
    const losses: number[] = []

    try {
      for (let epoch = 0; epoch < epochs; epoch++) {
        if (!isTraining) break // user clicked stop?

        let epochLoss = 0
        setCurrentEpoch(epoch)

        for (let sampleIndex = 0; sampleIndex < dataset.length; sampleIndex++) {
          const sample = dataset[sampleIndex]

          // Forward pass
          const { activations } = forwardPass([sample.x], layers, currentWeights, currentBiases)
          const prediction = activations[activations.length - 1][0]
          if (isNaN(prediction)) {
            console.error('Invalid prediction', { activations, sample })
            continue
          }

          const loss = calculateLoss(prediction, sample.y, lossFunction)
          epochLoss += loss

          // Record an animation step
          steps.push({
            activations,
            weights: currentWeights.map(w => ({ ...w })),
            biases: [...currentBiases],
            loss,
            epoch,
            sampleIndex,
            predictions: []
          })

          // Backprop
          const { weightGradients, biasGradients } = backpropagate(
            [sample.x],
            sample.y,
            layers,
            currentWeights,
            currentBiases,
            lossFunction
          )

          // Update weights with gradient clipping
          currentWeights = currentWeights.map((w, i) => ({
            ...w,
            value: w.value - learningRate * Math.max(Math.min(weightGradients[i].gradient, 1), -1)
          }))

          // Update biases with gradient clipping
          currentBiases = currentBiases.map((b, i) =>
            b - learningRate * Math.max(Math.min(biasGradients[i], 1), -1)
          )

          // Update predictions for the entire dataset occasionally
          if (sampleIndex % 5 === 0) {
            const currentPreds: { x: number; y: number; predicted: number }[] = []
            dataset.forEach(s => {
              const { activations: ap } = forwardPass([s.x], layers, currentWeights, currentBiases)
              currentPreds.push({ x: s.x, y: s.y, predicted: ap[ap.length - 1][0] })
            })
            setCurrentPredictions(currentPreds)
            setLossHistory(losses)
            setAnimationSteps([...steps])
            setTotalLoss(epochLoss / (sampleIndex + 1))

            // A short pause just so UI can update
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }

        const avgEpochLoss = epochLoss / dataset.length
        losses.push(avgEpochLoss)
        setTotalLoss(avgEpochLoss)
        console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${avgEpochLoss.toFixed(4)}`)

        // Early stopping
        if (avgEpochLoss < 0.0001) {
          console.log('Reached convergence, stopping early')
          break
        }
      }
    } catch (error) {
      console.error('Training error:', error)
    } finally {
      setIsTraining(false)
      setAnimationSteps(steps)
      setCurrentStepIndex(0)
      setWeights(currentWeights)
      setBiases(currentBiases)
    }
  }

  // --------------------------------------------------------------------------
  //  Step-by-Step Training
  // --------------------------------------------------------------------------
  const performSingleStep = async () => {
    if (!dataset.length || sampleIndex >= dataset.length) return
    const sample = dataset[sampleIndex]

    if (stepPhase === 'forward') {
      // Forward pass
      const { activations } = forwardPass([sample.x], layers, weights, biases)
      const prediction = activations[activations.length - 1][0]
      const loss = calculateLoss(prediction, sample.y, lossFunction)

      // Make predictions for all data
      const allPredictions = dataset.map(point => {
        const { activations: pointActs } = forwardPass([point.x], layers, weights, biases)
        return {
          x: point.x,
          y: point.y,
          predicted: pointActs[pointActs.length - 1][0]
        }
      })
      setCurrentPredictions(allPredictions)

      const forwardStep: VisualizerTrainingStep = {
        type: 'forward',
        activations,
        weights: [...weights],
        biases: [...biases],
        loss,
        sampleIndex,
        prediction,
        actual: sample.y
      }
      setTrainingSteps(prev => [...prev, forwardStep])
      setCurrentStep(forwardStep)
      setCurrentStepIndex(prev => prev + 1)
      setStepPhase('backward')
    } else {
      // Backward pass
      const { weightGradients, biasGradients } = backpropagate(
        [sample.x],
        sample.y,
        layers,
        weights,
        biases,
        lossFunction
      )

      const newWeights = weights.map((w, i) => ({
        ...w,
        value: w.value - learningRate * weightGradients[i].gradient
      }))
      const newBiases = biases.map((b, i) =>
        b - learningRate * biasGradients[i]
      )

      const backwardStep: VisualizerTrainingStep = {
        type: 'backward',
        activations: trainingSteps[trainingSteps.length - 1].activations,
        weights: newWeights,
        biases: newBiases,
        loss: trainingSteps[trainingSteps.length - 1].loss,
        gradients: {
          weights: weightGradients,
          biases: biasGradients
        },
        sampleIndex
      }
      setTrainingSteps(prev => [...prev, backwardStep])
      setCurrentStep(backwardStep)
      setCurrentStepIndex(prev => prev + 1)

      // Update the network
      setWeights(newWeights)
      setBiases(newBiases)

      // Move to next sample
      if (sampleIndex < dataset.length - 1) {
        setSampleIndex(prev => prev + 1)
      }
      setStepPhase('forward')
    }
  }

  // --------------------------------------------------------------------------
  //  Initial draw (once weights/biases are ready)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !weights.length || !dataset.length) return

    const { activations } = forwardPass([dataset[0].x], layers, weights, biases)
    drawNetwork(ctx, {
      type: 'forward',
      activations,
      weights,
      biases,
      loss: 0,
      sampleIndex: 0
    } as VisualizerTrainingStep)
  }, [weights, biases, dataset, layers])

  // --------------------------------------------------------------------------
  //  UI
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Training Visualization</h3>

      {/* Training parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Learning Rate:</label>
          <input
            type="number"
            value={learningRate}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            min="0.0001"
            max="1"
            step="0.001"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Epochs:</label>
          <input
            type="number"
            value={epochs}
            onChange={(e) => setEpochs(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={startTraining}
            disabled={isTraining || !dataset.length}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
          >
            {isTraining ? 'Training...' : 'Start Training'}
          </button>
        </div>
      </div>

      {/* Training progress info */}
      {isTraining && (
        <div className="space-y-2 p-4 bg-blue-50 rounded-md">
          <p>Training Progress:</p>
          <p>Epoch: {currentEpoch + 1}/{epochs}</p>
          <p>Average Loss: {totalLoss.toFixed(4)}</p>
        </div>
      )}

      {/* Animation controls (only show if we have steps) */}
      {animationSteps.length > 0 && (
        <div className="flex gap-2 items-center">
          <button onClick={stepBackward} className="px-3 py-1 bg-gray-200 rounded">
            ⏮️
          </button>
          <button onClick={isPlaying ? pauseAnimation : playAnimation} className="px-3 py-1 bg-gray-200 rounded">
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button onClick={stepForward} className="px-3 py-1 bg-gray-200 rounded">
            ⏭️
          </button>
          <button onClick={resetAnimation} className="px-3 py-1 bg-gray-200 rounded">
            🔄
          </button>
          <input
            type="range"
            min="100"
            max="2000"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm">Speed: {playbackSpeed}ms</span>
        </div>
      )}

      {/* Main Canvas + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border rounded-lg bg-white dark:bg-gray-800"
        />
        <TrainingChart
          predictions={currentPredictions}
          dataset={dataset}
          loss={lossHistory}
        />
      </div>

      {/* Animation step info */}
      {animationSteps[currentStepIndex] && (
        <div className="space-y-2">
          <p>Epoch: {animationSteps[currentStepIndex].epoch + 1}</p>
          <p>Sample: {animationSteps[currentStepIndex].sampleIndex + 1}/{dataset.length}</p>
          <p>Loss: {animationSteps[currentStepIndex].loss.toFixed(4)}</p>
        </div>
      )}

      {/* Step Mode Controls */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setStepMode(!stepMode)}
          className={`px-4 py-2 rounded-md ${
            stepMode ? 'bg-green-500' : 'bg-gray-500'
          } text-white`}
        >
          {stepMode ? 'Step Mode Active' : 'Enable Step Mode'}
        </button>

        {stepMode && (
          <button
            onClick={performSingleStep}
            disabled={sampleIndex >= dataset.length}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            Next Step ({stepPhase === 'forward' ? 'Forward Pass' : 'Backward Pass'})
          </button>
        )}
      </div>

      {/* Current step details */}
      {currentStep && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Current Step Details</h4>
          <p>Type: {currentStep.type === 'forward' ? 'Forward Pass' : 'Backward Pass'}</p>
          <p>Sample: {currentStep.sampleIndex + 1}/{dataset.length}</p>
          <p>Loss: {currentStep.loss.toFixed(4)}</p>
          {currentStep.prediction !== undefined && (
            <>
              <p>Prediction: {currentStep.prediction.toFixed(4)}</p>
              <p>Actual: {currentStep.actual?.toFixed(4)}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
