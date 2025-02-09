export type ActivationFunction = 'relu' | 'tanh' | 'sigmoid' | 'linear';
export type LossFunction = 'mse' | 'mae';

export interface LayerConfig {
  neurons: number;
  activation: ActivationFunction;
}

export interface NetworkConfig {
  layers: LayerConfig[];
  loss: LossFunction;
}

export interface DataPoint {
  x: number;
  y: number;
}

export interface NeuronState {
  value: number;
  bias: number;
  gradient: number;
}

export interface LayerState {
  neurons: NeuronState[];
  weights: number[][];  // [fromNeuron][toNeuron]
  weightGradients: number[][];
}

export interface NetworkState {
  layers: LayerState[];
  loss?: number;
}
