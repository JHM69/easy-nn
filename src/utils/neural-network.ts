import { Layer, Weight, ActivationType, LossType } from '@/types/neural-network'

export function activate(x: number, type: ActivationType): number {
  switch (type) {
    case 'relu':
      return Math.max(0, x)
    case 'sigmoid':
      return 1 / (1 + Math.exp(-x))
    case 'tanh':
      return Math.tanh(x)
    default:
      return x
  }
}

export function activateDerivative(x: number, type: ActivationType): number {
  switch (type) {
    case 'relu':
      return x > 0 ? 1 : 0
    case 'sigmoid':
      const s = activate(x, 'sigmoid')
      return s * (1 - s)
    case 'tanh':
      const t = Math.tanh(x)
      return 1 - t * t
    default:
      return 1
  }
}

export const initializeWeights = (layers: Layer[]): Weight[] => {
  const weights: Weight[] = []
  
  for (let l = 1; l < layers.length; l++) {
    const prevLayer = layers[l - 1]
    const currentLayer = layers[l]
    
    for (let i = 0; i < prevLayer.neurons; i++) {
      for (let j = 0; j < currentLayer.neurons; j++) {
        // Xavier/Glorot initialization
        const limit = Math.sqrt(6 / (prevLayer.neurons + currentLayer.neurons))
        weights.push({
          sourceLayer: l - 1,
          targetLayer: l,
          sourceNeuron: i,
          targetNeuron: j,
          value: (Math.random() * 2 * limit) - limit,
          gradient: 0
        })
      }
    }
  }
  
  return weights
}

export function forwardPass(
  input: number[],
  layers: Layer[],
  weights: Weight[],
  biases: number[]
): { activations: number[][]; weightedSums: number[][] } {
  const activations: number[][] = [input]
  const weightedSums: number[][] = []
  let biasIndex = 0

  for (let l = 1; l < layers.length; l++) {
    const layerWeights = weights.filter(w => 
      w.sourceNeuron < layers[l-1].neurons && 
      w.targetNeuron < layers[l].neurons
    )
    
    const layerInputs = new Array(layers[l].neurons).fill(0)
    const layerActivations = new Array(layers[l].neurons).fill(0)

    for (const weight of layerWeights) {
      layerInputs[weight.targetNeuron] += 
        activations[l-1][weight.sourceNeuron] * weight.value
    }

    for (let n = 0; n < layers[l].neurons; n++) {
      layerInputs[n] += biases[biasIndex++]
      layerActivations[n] = activate(layerInputs[n], layers[l].activation)
    }

    weightedSums.push(layerInputs)
    activations.push(layerActivations)
  }

  return { activations, weightedSums }
}

export function calculateLoss(
  predicted: number,
  actual: number,
  type: LossType
): number {
  switch (type) {
    case 'mse':
      return Math.pow(predicted - actual, 2)
    case 'mae':
      return Math.abs(predicted - actual)
    default:
      return Math.pow(predicted - actual, 2)
  }
}

export function calculateLossGradient(
  predicted: number,
  actual: number,
  type: LossType
): number {
  switch (type) {
    case 'mse':
      return 2 * (predicted - actual)
    case 'mae':
      return predicted > actual ? 1 : -1
    default:
      return 2 * (predicted - actual)
  }
}

export function backpropagate(
  input: number[],
  target: number,
  layers: Layer[],
  weights: Weight[],
  biases: number[],
  lossType: LossType
): { weightGradients: Weight[], biasGradients: number[] } {
  const { activations, weightedSums } = forwardPass(input, layers, weights, biases)
  const predicted = activations[activations.length - 1][0]
  
  // Initialize gradients
  const weightGradients = weights.map(w => ({ ...w, gradient: 0 }))
  const biasGradients = new Array(biases.length).fill(0)
  
  // Output layer error
  const outputDelta = calculateLossGradient(predicted, target, lossType) *
    activateDerivative(weightedSums[weightedSums.length - 1][0], layers[layers.length - 1].activation)
  
  // Backpropagate the error
  let currentBiasIndex = biases.length - 1
  let deltas = [outputDelta]
  
  // Iterate through layers backwards
  for (let l = layers.length - 1; l > 0; l--) {
    const currentLayer = layers[l]
    const prevLayer = layers[l - 1]
    
    // Calculate weight gradients for current layer
    for (let i = 0; i < prevLayer.neurons; i++) {
      for (let j = 0; j < currentLayer.neurons; j++) {
        const weightIndex = weightGradients.findIndex(
          w => w.sourceNeuron === i && w.targetNeuron === j
        )
        if (weightIndex !== -1) {
          weightGradients[weightIndex].gradient = 
            deltas[0] * activations[l-1][i]
        }
      }
    }
    
    // Calculate bias gradients
    for (let j = 0; j < currentLayer.neurons; j++) {
      biasGradients[currentBiasIndex--] = deltas[0]
    }
    
    // Calculate deltas for previous layer
    if (l > 1) {
      const newDeltas = new Array(prevLayer.neurons).fill(0)
      for (let i = 0; i < prevLayer.neurons; i++) {
        let sum = 0
        for (let j = 0; j < currentLayer.neurons; j++) {
          const weight = weights.find(
            w => w.sourceNeuron === i && w.targetNeuron === j
          )
          if (weight) {
            sum += weight.value * deltas[0]
          }
        }
        newDeltas[i] = sum * activateDerivative(
          weightedSums[l-2][i],
          prevLayer.activation
        )
      }
      deltas = newDeltas
    }
  }
  
  return { weightGradients, biasGradients }
}
