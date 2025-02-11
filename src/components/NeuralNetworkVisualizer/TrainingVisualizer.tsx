'use client'

import { useState, useEffect } from 'react'
import { Layer, LossType } from '@/types/neural-network'
import { Value, MLP, createNetwork } from '@/utils/neural-network'
import TrainingChart from './TrainingChart'
import NetworkVisualizer from '../NeuralNetwork/NetworkVisualizer'
import {
  PlayIcon,
  PauseIcon,
  TrackPreviousIcon,
  TrackNextIcon,
  ResetIcon,
  TimerIcon
} from '@radix-ui/react-icons'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  testPredictions?: { x: number; y: number; predicted: number }[] // Add this to AnimationStep interface
  animationType: 'forward' | 'backward'  // Add this field
  gradients?: number[][]  // Add this to store gradients for backward pass
  gradientUpdates?: {
    weights: { from: number; to: number; value: number }[];
    biases: { neuron: number; value: number }[];
    parameterUpdates: { param: string; oldValue: number; newValue: number; delta: number }[];
  };
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

interface TrainingMetrics {
  epoch: number;
  trainLoss: number;
  validationLoss: number;
  accuracy: number;
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
  const [testPredictions, setTestPredictions] = useState<{ x: number; y: number; predicted: number }[]>([])
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics[]>([]);
  const [decisionBoundary, setDecisionBoundary] = useState<Array<{x: number; y: number; value: number}>>([]);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward')
  const [currentPhase, setCurrentPhase] = useState<'forward' | 'backward'>('forward')

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
        networkState: newNetwork,
        animationType: 'forward'
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
 
  // --------------------------------------------------------------------------
  //  Animation Controls
  // --------------------------------------------------------------------------
  const playAnimation = () => {
    setIsPlaying(true);
    if (currentStepIndex >= animationSteps.length - 1) {
      setCurrentStepIndex(0);
    }
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
      const nextStep = animationSteps[currentStepIndex + 1];
      if (nextStep.animationType === animationDirection) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        // Skip to next step with matching direction
        let newIndex = currentStepIndex + 1;
        while (newIndex < animationSteps.length && 
               animationSteps[newIndex].animationType !== animationDirection) {
          newIndex++;
        }
        if (newIndex < animationSteps.length) {
          setCurrentStepIndex(newIndex);
        }
      }
    }
  }

  const stepBackward = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const toggleDirection = () => {
    setAnimationDirection(prev => prev === 'forward' ? 'backward' : 'forward');
  };

  // Handle auto-play
  useEffect(() => {
    if (!isPlaying) return
    
    const timeoutId = setTimeout(() => {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex >= animationSteps.length) {
        setIsPlaying(false);
        return;
      }

      setCurrentStepIndex(nextIndex);
      
    }, playbackSpeed);

    return () => clearTimeout(timeoutId);
  }, [isPlaying, currentStepIndex, animationSteps.length, playbackSpeed])

  // Whenever currentStepIndex changes, redraw
  useEffect(() => {
    if (!animationSteps[currentStepIndex] || !trainData || trainData.length === 0) return;

    const stepData = animationSteps[currentStepIndex];
    if (!stepData) return;

    // Safely get current sample index
    const sampleIndex = stepData.sampleIndex % trainData.length;
    const currentSample = trainData[sampleIndex];
    
    if (!currentSample) {
      console.error('Invalid sample index:', sampleIndex);
      return;
    }

    try {
      // Create new input activation with current sample
      const inputActivations = stepData.activations.map((layerAct, layerIndex) => 
        layerIndex === 0 ? [new Value(currentSample.x)] : layerAct
      );

      setCurrentStep({
        type: stepData.animationType || 'forward',
        activations: inputActivations,
        loss: stepData.loss,
        sampleIndex: stepData.sampleIndex,
        networkState: stepData.networkState
      } as VisualizerTrainingStep);
      
      // Update current phase for visualization
      setCurrentPhase(stepData.animationType || 'forward');
    } catch (error) {
      console.error('Error updating visualization:', error);
    }
  }, [currentStepIndex, animationSteps, trainData])

  // --------------------------------------------------------------------------
  //  Full Training
  // --------------------------------------------------------------------------
  // Add function-specific training configuration
  const getFunctionConfig = (functionType: string) => {
    switch (functionType) {
      case 'linear':
        return { learningRate: 0.01, epochs: 100 };
      case 'quadratic':
        return { learningRate: 0.01, epochs: 200 };
      case 'sine':
        return { learningRate: 0.005, epochs: 300 };
      case 'sigmoid':
        return { learningRate: 0.01, epochs: 200 };
      case 'cubic':
        return { learningRate: 0.001, epochs: 400 };
      default:
        return { learningRate: 0.01, epochs: 200 };
    }
  };

  // Modify startTraining to use function-specific configurations
  const startTraining = async () => {
    if (!network || !trainData.length || isTraining) return;

    // Detect function type from data pattern
    const functionType = detectFunctionType(trainData);
    const config = getFunctionConfig(functionType);
    
    setLearningRate(config.learningRate);
    setEpochs(config.epochs);

    setIsTraining(true);
    setLossHistory([]);
    setTrainingMetrics([]);
    setAnimationSteps([]);  // Clear previous steps

    try {
      for (let epoch = 0; epoch < epochs; epoch++) {
        let epochLoss = 0;
        
        // Shuffle training data
        const shuffledData = [...trainData]
          .sort(() => Math.random() - 0.5);

        // Training loop
        for (let i = 0; i < shuffledData.length; i++) {
          const sample = shuffledData[i];

          // Forward pass with proper input wrapping
          const input = [new Value(sample.x)];
          const output = network.forward(input);
          const prediction = Array.isArray(output) ? output[0] : output;
          
          // Calculate loss
          const target = new Value(sample.y);
          const loss = prediction.add(target.mul(-1)).pow(2);
          epochLoss += loss.data;

          // Record forward pass state
          const forwardStep: AnimationStep = {
            activations: network.getActivations(),
            loss: loss.data,
            epoch,
            sampleIndex: i,
            predictions: getCurrentPredictions(network, trainData),
            networkState: network.clone(),
            animationType: 'forward',
            gradients: [] // Empty gradients for forward pass
          };
          setAnimationSteps(prev => [...prev, forwardStep]);

          // Backward pass
          network.zeroGrad();
          loss.backward();  // This needs to happen before creating the backwardStep

          // Ensure gradients are captured immediately after backward pass
          const gradients = network.getGradients();
          const backwardStep: AnimationStep = {
            activations: network.getActivations(),
            loss: loss.data,
            epoch,
            sampleIndex: i,
            predictions: getCurrentPredictions(network, trainData),
            networkState: network.clone(),
            animationType: 'backward',
            gradients, // Use captured gradients
            gradientUpdates: {
              weights: network.layers.flatMap((layer, layerIdx) => 
                layer.neurons.flatMap((neuron, neuronIdx) => 
                  neuron.w.map((w, inputIdx) => ({
                    from: inputIdx,
                    to: neuronIdx,
                    value: w.grad
                  }))
                )
              ),
              biases: network.layers.flatMap((layer, layerIdx) =>
                layer.neurons.map((neuron, neuronIdx) => ({
                  neuron: neuronIdx,
                  value: neuron.b.grad
                }))
              ),
              parameterUpdates: network.parameters().map(param => ({
                param: param._op,
                oldValue: param.data,
                newValue: param.data - learningRate * param.grad,
                delta: -learningRate * param.grad
              }))
            }
          };
          setAnimationSteps(prev => [...prev, backwardStep]);

          // Update parameters after recording the gradients
          for (const param of network.parameters()) {
            param.data -= learningRate * param.grad;
          }
        }

        // Update metrics and UI
        const avgLoss = epochLoss / trainData.length;
        const currentPreds = getCurrentPredictions(network, trainData);
        const validationLoss = calculateValidationLoss(network, testData);
        const accuracy = calculateAccuracy(currentPreds);

        // Update predictions state
        setCurrentPredictions(currentPreds);
        setInternalPredictions(currentPreds);

        // Update metrics
        const metric: TrainingMetrics = {
          epoch,
          trainLoss: avgLoss,
          validationLoss,
          accuracy
        };
        setTrainingMetrics(prev => [...prev, metric]);
        
        // Update animation steps with current network state
        const step: AnimationStep = {
          activations: network.getActivations(),
          loss: avgLoss,
          epoch,
          sampleIndex: trainData.length - 1,
          predictions: currentPreds,
          networkState: network.clone(),
          testPredictions: getTestPredictions(network, testData)
        };
        setAnimationSteps(prev => [...prev, step]);
        setCurrentEpoch(epoch);
        setTotalLoss(avgLoss);
        setLossHistory(prev => [...prev, avgLoss]);

        // Add small delay for visualization
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('Training error:', error);
    } finally {
      setIsTraining(false);
    }
  };

  // Helper function to detect function type from data
  const detectFunctionType = (data: Array<{x: number; y: number}>) => {
    // Simple heuristic based on data patterns
    // This could be made more sophisticated
    const samples = data.slice(0, 10);
    let isLinear = true;
    let isQuadratic = true;
    
    for (let i = 1; i < samples.length - 1; i++) {
      const dy1 = samples[i].y - samples[i-1].y;
      const dy2 = samples[i+1].y - samples[i].y;

      if (Math.abs(dy1 - dy2) > 0.1) isLinear = false;
      if (Math.abs(dy1/dy2 - 1) > 0.1) isQuadratic = false;
    }

    if (isLinear) return 'linear';
    if (isQuadratic) return 'quadratic';
    return 'complex'; // Default for other functions
  };

  // Helper functions for metrics
  const calculateValidationLoss = (network: MLP, testData: Array<{x: number; y: number}>) => {
    let validationLoss = 0;
    for (const sample of testData) {
      const input = [new Value(sample.x)];
      const output = network.forward(input);
      const prediction = Array.isArray(output) ? output[0] : output;
      const target = new Value(sample.y);
      const loss = prediction.add(target.mul(-1)).mul(prediction.add(target.mul(-1)));
      validationLoss += loss.data;
    }
    return validationLoss / testData.length;
  };

  const calculateAccuracy = (predictions: Array<{x: number; y: number; predicted: number}>) => {
    const threshold = 0.1; // Adjust based on your problem
    const correct = predictions.filter(p => Math.abs(p.predicted - p.y) < threshold).length;
    return correct / predictions.length;
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
    // Generate predictions for a range of x values to create a smooth curve
    const xMin = Math.min(...data.map(d => d.x));
    const xMax = Math.max(...data.map(d => d.x));
    const step = (xMax - xMin) / 50; // 50 points for smooth curve

    const predictions: Array<{x: number; y: number; predicted: number}> = [];
    
    // Add predictions for the actual data points
    for (let x = xMin; x <= xMax; x += step) {
      const input = new Value(x);
      const output = net.forward([input]);
      const predicted = Array.isArray(output) ? output[0].data : output.data;
      predictions.push({ x, y: 0, predicted });
    }

    return predictions;
  }

  // Helper function to get test predictions
  const getTestPredictions = (net: MLP, testData: { x: number; y: number }[]) => {
    return testData.map(point => {
      const input = new Value(point.x)
      const output = net.forward([input])
      const predicted = Array.isArray(output) ? output[0].data : output.data
      return { x: point.x, y: point.y, predicted }
    })
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
    <div className="space-y-4 bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
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
            className="w-full px-3 py-2 border dark:border-gray-950 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="block  text-sm font-medium">Epochs:</label>
          <input
            type="number"
            value={epochs}
            onChange={(e) => setEpochs(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            className="w-full px-3 py-2 border dark:border-gray-950 rounded-md"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={startTraining}
            disabled={isTraining || !trainData.length}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-600"
          >
            {isTraining ? 'Training...' : 'Start Training'}
          </button>
        </div>
      </div>

      {/* Training progress info */}
        {isTraining && (
          <div className="p-4 bg-blue-50/10 dark:bg-gray-800/50 border border-blue-200/20 dark:border-gray-700 rounded-lg shadow-sm">
            <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3">Training Progress</h4>
            <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 p-3 rounded-md shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">Epoch</div>
            <div className="text-xl font-medium dark:text-gray-200">{currentEpoch + 1}/{epochs}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-md shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">Average Loss</div>
            <div className="text-xl font-medium dark:text-gray-200">{totalLoss.toFixed(4)}</div>
          </div>
            </div>
          </div>
        )}

        {/* Animation controls */}
      {animationSteps.length > 0 && (
        <div className="px-6 py-4 rounded-xl border dark:border-gray-700 bg-card text-card-foreground shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Network Animation</h4>
            <div className="flex items-center gap-2">
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                animationDirection === 'forward'
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              )}>
                {animationDirection === 'forward' ? 'Forward Pass' : 'Backward Pass'}
              </div>
              <div className="text-xs text-muted-foreground">
                Sample {(currentStep?.sampleIndex || 0) + 1} / {trainData.length}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={stepBackward}
                disabled={currentStepIndex === 0}
                className="h-9 w-9 rounded-full transition-all hover:scale-110"
              >
                <TrackPreviousIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                onClick={isPlaying ? pauseAnimation : playAnimation}
                className={cn(
                  "h-12 w-12 rounded-full transition-all hover:scale-110",
                  isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
                )}
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={stepForward}
                disabled={currentStepIndex === animationSteps.length - 1}
                className="h-9 w-9 rounded-full transition-all hover:scale-110"
              >
                <TrackNextIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDirection}
                className="h-9 w-9 rounded-full transition-all hover:scale-110"
              >
                {animationDirection === 'forward' ? '→' : '←'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetAnimation}
                className="h-9 w-9 rounded-full transition-all hover:scale-110"
              >
                <ResetIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Network Visualizer */}
      <div className="gap-4">
        <div  >
          {network && (
            <NetworkVisualizer
              layers={layers}
              activations={currentStep?.activations || []}
              weights={currentStep?.networkState?.parameters() || []}
              biases={currentStep?.networkState?.parameters()
                .filter(p => p._op === 'bias')
                .map(p => p.data) || []}
              activeLayer={stepPhase === 'forward' ? currentLayerIndex : undefined}
              phase={currentStep?.type || 'forward'}
              animationType={currentStep?.type}
              gradients={animationSteps[currentStepIndex]?.gradients}
            />
          )}
        </div>
      </div>

      {/* Training Chart */}
      <TrainingChart
        predictions={displayPredictions.length > 0 ? displayPredictions : internalPredictions}
        testPredictions={testPredictions}
        dataset={dataset || []}
        loss={loss || []}
        trainingMetrics={trainingMetrics}
        decisionBoundary={decisionBoundary}
        isTraining={isTraining} lossFunction={'mse'}      />

    
    </div>
  )
}
