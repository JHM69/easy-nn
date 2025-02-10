'use client'

import { useState, useEffect } from 'react'
import { Layer, LossType } from '@/types/neural-network'
import { Value, MLP, createNetwork } from '@/utils/neural-network'
import TrainingChart from './TrainingChart'
import NetworkVisualizer from '../NeuralNetwork/NetworkVisualizer'

/**
 * AnimationStep is used for the "playback" animation
 * that replays forward passes over time (epochs/samples).
 */
interface AnimationStep {
  activations: Value[][]
  loss: number
  epoch: number
  sampleIndex: number
  predictions: { x: number; y: number; predicted: number }[]
  networkState: MLP // Store entire network state
}

/**
 * TrainingStep is used specifically in step-by-step mode
 * to store both forward and backward details.
 */
interface VisualizerTrainingStep {
  type: 'forward' | 'backward'
  activations: Value[][]
  loss: number
  sampleIndex: number
  prediction?: number
  actual?: number
  networkState: MLP
}

interface PredictionPoint {
  x: number;
  y: number;
  predicted: number;
}

interface TrainingVisualizerProps {
  layers: Layer[]
  trainData: { x: number; y: number }[]
  testData: { x: number; y: number }[]
  lossFunction: LossType
  predictions: PredictionPoint[];
  dataset: { x: number; y: number }[];
  loss: number[];
}

// Add type guard
function isNumeric(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

export default function TrainingVisualizer({
  layers,
  trainData,
  testData,
  lossFunction,
  predictions,
  dataset,
  loss
}: TrainingVisualizerProps) {
  // Remove canvasRef since we're not using canvas anymore

  // Step-by-step training states
  const [currentStep, setCurrentStep] = useState<VisualizerTrainingStep | null>(null)
  const [trainingSteps, setTrainingSteps] = useState<VisualizerTrainingStep[]>([])
  const [stepMode, setStepMode] = useState<boolean>(false)
  const [sampleIndex, setSampleIndex] = useState<number>(0)
  const [stepPhase, setStepPhase] = useState<'forward' | 'backward'>('forward')
  const [currentLayerIndex, setCurrentLayerIndex] = useState<number>(0)

  // Full training states
  const [isTraining, setIsTraining] = useState(false)
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
  const [isLoading, setIsLoading] = useState(true)
  const [network, setNetwork] = useState<MLP | null>(null)

  // Initialize predictions state
  const [internalPredictions, setInternalPredictions] = useState<{ x: number; y: number; predicted: number }[]>([])

  // --------------------------------------------------------------------------
  //  Initialization
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!layers || layers.length === 0) return;
    
    try {
      // Create new network
      const newNetwork = createNetwork(layers)
      setNetwork(newNetwork)
      
      // Initialize predictions
      if (trainData && trainData.length > 0) {
        const initialPredictions = trainData.map(point => {
          const input = new Value(point.x)
          const output = newNetwork.forward([input])
          const predicted = Array.isArray(output) ? output[0].data : output.data
          return { x: point.x, y: point.y, predicted }
        })
        setCurrentPredictions(initialPredictions)
        setInternalPredictions(initialPredictions)
      }

      // Initialize animation steps
      setAnimationSteps([{
        activations: newNetwork.getActivations(),
        loss: 0,
        epoch: 0,
        sampleIndex: 0,
        predictions: [],
        networkState: newNetwork
      }])

      setIsLoading(false)
    } catch (error) {
      console.error('Error initializing network:', error)
      setIsLoading(false)
    }
  }, [layers, trainData])

  useEffect(() => {
    console.log('Current state:', {
      layers,
      trainData
    })
  }, [layers, trainData])

  // Remove canvas-related functions (drawNeuron, drawConnection, etc.)

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
    if (!animationSteps[currentStepIndex]) return

    const stepData = animationSteps[currentStepIndex]
    // We'll just show the forward pass view
    setCurrentStep({
      type: 'forward',
      activations: stepData.activations,
      loss: stepData.loss,
      sampleIndex: stepData.sampleIndex,
      networkState: stepData.networkState
    } as VisualizerTrainingStep)
  }, [currentStepIndex, animationSteps])

  // --------------------------------------------------------------------------
  //  Full Training
  // --------------------------------------------------------------------------
  const startTraining = async () => {
    if (!trainData.length || isTraining || !network) {
      console.log('Training prerequisites not met:', {
        hasTrainData: trainData.length > 0,
        isTraining,
        hasNetwork: !!network
      });
      return;
    }

    console.log('Network configuration:', {
      inputSize: layers[0].neurons,
      outputSize: layers[layers.length - 1].neurons
    });

    setIsTraining(true);
    setLossHistory([]);

    try {
      for (let epoch = 0; epoch < epochs; epoch++) {
        let epochLoss = 0;
        setCurrentEpoch(epoch);

        for (let i = 0; i < trainData.length; i++) {
          const sample = trainData[i];
          
          // Create input array with single value for x
          const input = [new Value(sample.x)]; // Changed from array destructuring to single-element array
          console.log('Forward pass:', { sampleIndex: i, inputSize: input.length });
          
          const output = network.forward(input);
          const prediction = Array.isArray(output) ? output[0] : output;
          
          // Calculate loss
          const target = new Value(sample.y);
          const loss = prediction.add(target.mul(-1)).mul(prediction.add(target.mul(-1)));
          epochLoss += loss.data;

          // Debug current state
          console.log('Sample results:', {
            input: sample.x,
            target: sample.y,
            predicted: prediction.data,
            loss: loss.data
          });

          // Backward pass
          network.zeroGrad();
          loss.backward();

          // Update parameters
          for (const param of network.parameters()) {
            param.data -= learningRate * param.grad;
          }

          // Update UI with current predictions
          const currentPredictions = getCurrentPredictions(network, trainData);
          setCurrentPredictions(currentPredictions);
          setInternalPredictions(currentPredictions);
          
          // Record step
          const step: AnimationStep = {
            activations: network.getActivations(),
            loss: loss.data,
            epoch,
            sampleIndex: i,
            predictions: currentPreds,
            networkState: network.clone()
          };
          
          setAnimationSteps(prev => [...prev, step]);
          setTotalLoss(epochLoss / (i + 1));

          // Add delay for visualization
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Update loss history after each epoch
        const avgEpochLoss = epochLoss / trainData.length;
        setLossHistory(prev => [...prev, avgEpochLoss]);
        console.log(`Epoch ${epoch + 1} completed. Average loss: ${avgEpochLoss}`);
      }
    } catch (error) {
      console.error('Training error:', error);
    } finally {
      setIsTraining(false);
    }
  };

  // --------------------------------------------------------------------------
  //  Step-by-Step Training
  // --------------------------------------------------------------------------
  const performSingleStep = async () => {
    if (!network || !trainData[sampleIndex]) return;

    const sample = trainData[sampleIndex];

    if (stepPhase === 'forward') {
      // Create input array with single value
      const input = [new Value(sample.x)]; // Changed to single-element array
      const output = network.forward(input);
      const prediction = Array.isArray(output) ? output[0] : output;

      // Update state and UI
      const currentPreds = getCurrentPredictions(network, trainData);
      setCurrentPredictions(currentPreds);
      setInternalPredictions(currentPreds);
      
      // Record step
      setCurrentStep({
        type: 'forward',
        activations: network.getActivations(),
        loss: 0,
        sampleIndex,
        prediction: prediction.data,
        actual: sample.y,
        networkState: network.clone()
      });

      setStepPhase('backward');
      console.log('Completed forward pass');

    } else {
      // Backward pass with debugging
      console.log('Starting backward pass');
      const input = new Value(sample.x);
      const output = network.forward([input]);
      const prediction = Array.isArray(output) ? output[0] : output;
      const target = new Value(sample.y);
      const loss = prediction.add(target.mul(-1)).mul(prediction.add(target.mul(-1)));
      
      network.zeroGrad();
      loss.backward();

      // Update parameters
      for (const param of network.parameters()) {
        param.data -= learningRate * param.grad;
      }

      // Update UI
      const currentPreds = getCurrentPredictions(network, trainData);
      setCurrentPredictions(currentPreds);
      setInternalPredictions(currentPreds);

      // Record step
      setCurrentStep({
        type: 'backward',
        activations: network.getActivations(),
        loss: loss.data,
        sampleIndex,
        prediction: prediction.data,
        actual: sample.y,
        networkState: network.clone()
      });

      // Move to next sample
      const nextIndex = sampleIndex >= trainData.length - 1 ? 0 : sampleIndex + 1;
      setSampleIndex(nextIndex);
      setStepPhase('forward');
      console.log('Completed backward pass, moving to next sample:', nextIndex);
    }

    // Update animation steps
    setAnimationSteps(prev => [...prev, {
      activations: network.getActivations(),
      loss: currentStep?.loss || 0,
      epoch: Math.floor(sampleIndex / trainData.length),
      sampleIndex,
      predictions: currentPredictions,
      networkState: network.clone()
    }]);
  };

  // Helper function to get current predictions
  const getCurrentPredictions = (net: MLP, data: { x: number; y: number }[]) => {
      const networkPredictions = data.map(point => {
      const input = new Value(point.x)
      const output = net.forward([input])
      const predicted = Array.isArray(output) ? output[0].data : output.data
      return { x: point.x, y: point.y, predicted }
    })
    setInternalPredictions(predictions)
    return predictions
  }

  // --------------------------------------------------------------------------
  //  Initial draw (once weights/biases are ready)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!network || !trainData || trainData.length === 0) return

    try {
      const input = new Value(trainData[0].x)
      const activations = network.getActivations()
      
      setCurrentStep({
        type: 'forward',
        activations,
        loss: 0,
        sampleIndex: 0,
        networkState: network
      })
    } catch (error) {
      console.error('Error setting up initial visualization:', error)
    }
  }, [network, trainData])

  if (isLoading) {
    return <div className="p-4">Initializing neural network...</div>
  }

  // Use either passed predictions or internal predictions
  const displayPredictions = predictions.length > 0 ? predictions : internalPredictions

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
            disabled={isTraining || !trainData.length}
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

      {/* Main Visualization + Chart */}
      <div className=" gap-4">
        <div className="border rounded-lg  p-4">
          {network && (
            <NetworkVisualizer
              layers={layers}
              activations={currentStep?.activations || []}
              weights={currentStep?.networkState?.parameters() || []}
              biases={currentStep?.networkState?.parameters()
                .filter(p => p._op === 'bias')
                .map(p => p.data) || []}
              activeLayer={stepPhase === 'forward' ? currentLayerIndex : undefined}
              phase={stepPhase}
            />
          )}
        </div>
       
      </div>

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

        {stepMode ? (
          <button
            onClick={performSingleStep}
            className="px-4 py-2 bg-blue-500 text-white rounded-md"
          >
            Next Step ({stepPhase === 'forward' ? 'Forward Pass' : 'Backward Pass'})
          </button>
        ) : (
          <button
            onClick={startTraining}
            disabled={isTraining}
            className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-400"
          >
            {isTraining ? 'Training...' : 'Start Training'}
          </button>
        )}
      </div>


      <TrainingChart
          predictions={displayPredictions.length > 0 ? displayPredictions : internalPredictions}
          dataset={dataset || []}
          loss={loss || []}
        />

      {/* Current step details */}
      {currentStep && (
        <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
          <h4 className="font-medium mb-2">Current Step Details</h4>
          <p>Type: {currentStep?.type === 'forward' ? 'Forward Pass' : 'Backward Pass'}</p>
          <p>Sample: {currentStep?.sampleIndex !== undefined ? currentStep.sampleIndex + 1 : 0}/{trainData.length}</p>
          <p>Loss: {isNumeric(currentStep?.loss) ? currentStep.loss.toFixed(4) : 'N/A'}</p>
          {currentStep?.prediction !== undefined && (
            <>
              <p>Prediction: {isNumeric(currentStep.prediction) ? currentStep.prediction.toFixed(4) : 'N/A'}</p>
              <p>Actual: {isNumeric(currentStep.actual) ? currentStep.actual.toFixed(4) : 'N/A'}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
