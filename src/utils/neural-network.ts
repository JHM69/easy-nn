import { Layer, ActivationType, LossType } from '@/types/neural-network'
import { AutoGradValue } from '@/types/neural-network'

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

  constructor(nin: number, nonlin = true) {
    super();
    // Initialize with small random weights and zero bias
    this.w = Array(nin).fill(0).map(() => new Value(Math.random() * 0.1 - 0.05));
    this.b = new Value(0);
    this.nonlin = nonlin;
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
    return this.nonlin ? act.relu() : act;
  }

  parameters(): Value[] {
    return [...this.w, this.b];
  }
}

export class NeuronLayer extends Module {
  neurons: Neuron[];

  constructor(nin: number, nout: number, nonlin = true) {
    super();
    this.neurons = Array(nout).fill(0).map(() => new Neuron(nin, nonlin));
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

  constructor(nin: number, nouts: number[]) {
    super();
    const sizes = [nin, ...nouts];
    this.layers = [];
    this.inputSize = nin;
    this.layerSizes = nouts;
    this.inputLayer = null;

    for (let i = 0; i < nouts.length; i++) {
      this.layers.push(new NeuronLayer(
        sizes[i],
        sizes[i + 1],
        i !== nouts.length - 1 // nonlin for all except last layer
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
    // Copy parameters
    const sourceParams = this.parameters()
    const targetParams = newMLP.parameters()
    
    for (let i = 0; i < sourceParams.length; i++) {
      targetParams[i].data = sourceParams[i].data
      targetParams[i].grad = sourceParams[i].grad
    }
    
    return newMLP
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
