import { Value } from "@/utils/neural-network"

 
export type ActivationType = 'relu' | 'sigmoid' | 'tanh' | 'linear'
export type LossType = 'mse' | 'mae'
export type LayerType = 'input' | 'hidden' | 'output'

export interface Layer {
  neurons: number
  activation: ActivationType
  type: LayerType
}

export interface Node {
  data: number
  grad: number
  _prev: Node[]
  _op: string
  _backward: () => void
}

export interface Weight {
  sourceLayer: number
  targetLayer: number
  sourceNeuron: number
  targetNeuron: number
  value: Value;  // Changed to Value
  gradient?: number;
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

export interface AutoGradValue {
  data: number;
  grad: number;
  _prev: AutoGradValue[]
  _op: string
  _backward: () => void
  add(other: AutoGradValue | number): AutoGradValue
  mul(other: AutoGradValue | number): AutoGradValue
  relu(): AutoGradValue
  sigmoid(): AutoGradValue
  tanh(): AutoGradValue
  backward(): void
}
