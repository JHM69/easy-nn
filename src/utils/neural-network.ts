import { Layer, ActivationType, LossType } from '@/types/neural-network'
import { AutoGradValue } from '@/types/neural-network'

export function activate(x: Value | number, type: ActivationType): number {
  const value = x instanceof Value ? x.data : x;
  switch (type) {
    case 'relu':
      return Math.max(0, value)
    case 'sigmoid':
      return 1 / (1 + Math.exp(-value))
    case 'tanh':
      return Math.tanh(value)
    default:
      return value
  }
}

export function activateDerivative(x: Value | number, type: ActivationType): number {
  const value = x instanceof Value ? x.data : x;
  switch (type) {
    case 'relu':
      return value > 0 ? 1 : 0
    case 'sigmoid':
      const s = activate(value, 'sigmoid')
      return s * (1 - s)
    case 'tanh':
      const t = Math.tanh(value)
      return 1 - t * t
    default:
      return 1
  }
}

export class Value implements AutoGradValue {
  data: number
  grad: number
  _prev: AutoGradValue[]
  _op: string
  _backward: () => void

  constructor(data: number, _children: AutoGradValue[] = [], _op: string = '') {
    this.data = data
    this.grad = 0
    this._prev = _children
    this._op = _op
    this._backward = () => {}
  }

  add(other: Value | number): Value {
    const otherValue = other instanceof Value ? other : new Value(other)
    const out = new Value(this.data + otherValue.data, [this, otherValue], '+')
    
    out._backward = () => {
      this.grad += 1.0 * out.grad
      otherValue.grad += 1.0 * out.grad
    }
    return out
  }

  sub(other: Value | number): Value {
    const otherValue = other instanceof Value ? other : new Value(other)
    const out = new Value(this.data - otherValue.data, [this, otherValue], '-')
    
    out._backward = () => {
      this.grad += 1.0 * out.grad
      otherValue.grad += -1.0 * out.grad
    }
    return out
  }

  div(other: Value | number): Value {
    const otherValue = other instanceof Value ? other : new Value(other)
    const out = new Value(this.data / otherValue.data, [this, otherValue], '/')
    
    out._backward = () => {
      this.grad += (1.0 / otherValue.data) * out.grad
      otherValue.grad += (-this.data / (otherValue.data * otherValue.data)) * out.grad
    }
    return out
  }

  pow(exponent: number): Value {
    const out = new Value(Math.pow(this.data, exponent), [this], `^${exponent}`)
    
    out._backward = () => {
      this.grad += (exponent * Math.pow(this.data, exponent - 1)) * out.grad
    }
    return out
  }

  log(): Value {
    if (this.data <= 0) {
      throw new Error('Cannot compute log of non-positive number')
    }
    const out = new Value(Math.log(this.data), [this], 'log')
    
    out._backward = () => {
      this.grad += (1.0 / this.data) * out.grad
    }
    return out
  }

  mul(other: Value | number): Value {
    const otherValue = other instanceof Value ? other : new Value(other)
    const out = new Value(this.data * otherValue.data, [this, otherValue], '*')
    
    out._backward = () => {
      this.grad += otherValue.data * out.grad
      otherValue.grad += this.data * out.grad
    }
    return out
  }

  relu(): Value {
    const out = new Value(Math.max(0, this.data), [this], 'ReLU')
    
    out._backward = () => {
      this.grad += (this.data > 0 ? 1 : 0) * out.grad
    }
    return out
  }

  sigmoid(): Value {
    const x = this.data
    const sig = 1 / (1 + Math.exp(-x))
    const out = new Value(sig, [this], 'sigmoid')
    
    out._backward = () => {
      this.grad += (sig * (1 - sig)) * out.grad
    }
    return out
  }

  tanh(): Value {
    const x = this.data
    const t = (Math.exp(2*x) - 1) / (Math.exp(2*x) + 1)
    const out = new Value(t, [this], 'tanh')
    
    out._backward = () => {
      this.grad += (1 - t * t) * out.grad
    }
    return out
  }

  exp(): Value {
    const out = new Value(Math.exp(this.data), [this], 'exp')
    
    out._backward = () => {
      this.grad += out.data * out.grad // derivative of exp(x) is exp(x)
    }
    return out
  }
  
  sin(): Value {
    const out = new Value(Math.sin(this.data), [this], 'sin')
    
    out._backward = () => {
      this.grad += Math.cos(this.data) * out.grad // derivative of sin(x) is cos(x)
    }
    return out
  }
  
  cos(): Value {
    const out = new Value(Math.cos(this.data), [this], 'cos')
    
    out._backward = () => {
      this.grad += -Math.sin(this.data) * out.grad // derivative of cos(x) is -sin(x)
    }
    return out
  }

  backward(): void {
    const topo: AutoGradValue[] = []
    const visited = new Set<AutoGradValue>()
    
    const buildTopo = (v: AutoGradValue) => {
      if (!visited.has(v)) {
        visited.add(v)
        for (const child of v._prev) {
          buildTopo(child)
        }
        topo.push(v)
      }
    }
    buildTopo(this)

    this.grad = 1.0
    for (const node of topo.reverse()) {
      node._backward()
    }
  }

  toString(): string {
    return `Value(data=${this.data.toFixed(4)}, grad=${this.grad.toFixed(4)})`
  }
}

export class Module {
  parameters(): Value[] {
    return [];
  }

  zeroGrad() {
    for (const p of this.parameters()) {
      p.grad = 0;
    }
  }
}

export class Neuron extends Module {
  w: Value[];
  b: Value;
  nonlin: boolean;
  activation: ActivationType;

  constructor(nin: number, activation: ActivationType = 'relu', nonlin = true) {
    super();
    // Initialize with small random weights and zero bias
    this.w = Array(nin).fill(0).map(() => new Value(Math.random() * 0.1 - 0.05));
    this.b = new Value(0);
    this.nonlin = nonlin;
    this.activation = activation;
  }

  forward(x: Value[]): Value {
    // Validate input length matches weights
    if (x.length !== this.w.length) {
      throw new Error(`Input size ${x.length} doesn't match weight size ${this.w.length}`);
    }

    // Sum(w_i * x_i) + b
    let act = this.b;
    for (let i = 0; i < this.w.length; i++) {
      act = act.add(this.w[i].mul(x[i]));
    }
    
    if (!this.nonlin) return act;
    
    switch (this.activation) {
      case 'relu':
        return act.relu();
      case 'sigmoid':
        return act.sigmoid();
      case 'tanh':
        return act.tanh();
      default:
        return act;
    }
  }

  parameters(): Value[] {
    return [...this.w, this.b];
  }
}

export class NeuronLayer extends Module {
  neurons: Neuron[];

  constructor(nin: number, nout: number, activation: ActivationType = 'relu', nonlin = true) {
    super();
    this.neurons = Array(nout).fill(0).map(() => new Neuron(nin, activation, nonlin));
  }

  forward(x: Value[]): Value[] {
    return this.neurons.map(n => n.forward(x));
  }

  parameters(): Value[] {
    return this.neurons.flatMap(n => n.parameters());
  }
}

export class MLP extends Module {
  layers: NeuronLayer[];
  inputLayer: Value[] | null;
  inputSize: number;
  layerSizes: number[];

  constructor(nin: number, nouts: number[], activations: ActivationType[] = []) {
    super();
    const sizes = [nin, ...nouts];
    this.layers = [];
    this.inputSize = nin;
    this.layerSizes = nouts;
    this.inputLayer = null;

    for (let i = 0; i < nouts.length; i++) {
      const activation = activations[i] || 'relu';
      const isLastLayer = i === nouts.length - 1;
      this.layers.push(new NeuronLayer(
        sizes[i],
        sizes[i + 1],
        activation,
        !isLastLayer // nonlin for all except last layer
      ));
    }
  }

  forward(x: Value[]): Value | Value[] {
    if (x.length !== this.inputSize) {
      throw new Error(`Input size ${x.length} doesn't match expected size ${this.inputSize}`);
    }

    this.inputLayer = x; // Store input for getActivations
    let current = x;
    
    try {
      for (const layer of this.layers) {
        current = layer.forward(current);
      }
      return current.length === 1 ? current[0] : current;
    } catch (error) {
      console.error('Forward pass error:', error);
      throw error;
    }
  }

  parameters(): Value[] {
    return this.layers.flatMap(l => l.parameters());
  }

  getActivations(): Value[][] {
    if (!this.inputLayer) {
      throw new Error('No input layer available. Call forward() first.');
    }

    const activations: Value[][] = [this.inputLayer];
    let current = this.inputLayer;

    for (const layer of this.layers) {
      current = layer.forward(current);
      activations.push(Array.isArray(current) ? current : [current]);
    }

    return activations;
  }

  clone(): MLP {
    const newMLP = new MLP(this.inputSize, this.layerSizes)
    const sourceParams = this.parameters()
    const targetParams = newMLP.parameters()
    
    for (let i = 0; i < sourceParams.length; i++) {
      targetParams[i].data = sourceParams[i].data
      targetParams[i].grad = sourceParams[i].grad
    }
    
    return newMLP
  }

  static forRegression(hiddenSizes: number[] = [16, 8]): MLP {
    // Network specifically designed for function approximation
    // Input size is 1 (x value)
    // Output size is 1 (y value)
    return new MLP(1, [...hiddenSizes, 1], [
      'relu',
      'relu',
      'linear' // last layer should be linear for regression
    ]);
  }
}

// Helper function to create network
export const createNetwork = (layers: Layer[]): MLP => {
  if (!layers || layers.length < 2) {
    throw new Error('Network must have at least input and output layers');
  }

  const nouts = layers.slice(1).map(l => l.neurons);
  const network = new MLP(layers[0].neurons, nouts);

  // Validate network creation
  const inputSize = layers[0].neurons;
  const testInput = Array(inputSize).fill(0).map(() => new Value(0));
  
  try {
    network.forward(testInput); // Test forward pass
  } catch (error) {
    console.error('Network validation failed:', error);
    throw new Error('Failed to create valid network');
  }

  return network;
};

// Update forwardPass to use MLP
export function forwardPass(
  input: number[],
  network: MLP,
): { activations: Value[][] } {
  const inputValues = input.map(x => new Value(x));
  const result = network.forward(inputValues);
  return {
    activations: Array.isArray(result) ? [result] : [[result]]
  };
}

// Update calculateLoss to use Value
export function calculateLoss(predicted: Value, target: number, type: LossType): Value {
  const targetValue = new Value(target);
  switch (type) {
    case 'mse':
      return predicted.add(targetValue.mul(-1)).mul(predicted.add(targetValue.mul(-1)));
    case 'mae':
      const diff = predicted.add(targetValue.mul(-1));
      // Approximation of abs using relu
      return diff.relu().add(diff.mul(-1).relu());
    default:
      return predicted.add(targetValue.mul(-1)).mul(predicted.add(targetValue.mul(-1)));
  }
}

// Remove old backpropagate function as it's handled by Value class now

// Add preset configurations for specific functions
export const functionPresets = {
  linear: {
    name: 'Linear (y = 2x + 1)',
    network: () => MLP.forRegression([4]),
    learningRate: 0.01,
    epochs: 100
  },
  quadratic: {
    name: 'Quadratic (y = x²)',
    network: () => MLP.forRegression([8, 4]),
    learningRate: 0.01,
    epochs: 200
  },
  sine: {
    name: 'Sine (y = sin(x))',
    network: () => MLP.forRegression([16, 8]),
    learningRate: 0.005,
    epochs: 300
  },
  sigmoid: {
    name: 'Sigmoid (y = 1/(1+e^(-x)))',
    network: () => MLP.forRegression([8, 4]),
    learningRate: 0.01,
    epochs: 200
  },
  cubic: {
    name: 'Cubic (y = x³ - 2x)',
    network: () => MLP.forRegression([16, 8]),
    learningRate: 0.001,
    epochs: 400
  }
};

// Helper function to generate training data for different functions
export function generateFunctionData(
  func: string,
  numPoints: number = 100,
  xMin: number = -5,
  xMax: number = 5
): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  const step = (xMax - xMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + step * i;
    let y: number;

    switch (func) {
      case 'linear':
        y = 2 * x + 1;
        break;
      case 'quadratic':
        y = x * x;
        break;
      case 'sine':
        y = Math.sin(x);
        break;
      case 'sigmoid':
        y = 1 / (1 + Math.exp(-x));
        break;
      case 'cubic':
        y = Math.pow(x, 3) - 2 * x;
        break;
      default:
        y = x; // Default to identity function
    }

    data.push({ x, y });
  }

  return data;
}
