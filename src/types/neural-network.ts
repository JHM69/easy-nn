export type ActivationType = 'linear' | 'relu' | 'sigmoid' | 'tanh'
export type LossType = 'mse' | 'mae'
export type LayerType = 'input' | 'hidden' | 'output'

export interface Layer {
  neurons: number
  activation: ActivationType
  type: LayerType
}

export interface Weight {
  sourceNeuron: number
  targetNeuron: number
  value: number
  gradient?: number
}

export interface TrainingStep {
  weights: Weight[]
  biases: number[]
  loss: number
  gradients: {
    weights: Weight[]
    biases: number[]
  }
}
