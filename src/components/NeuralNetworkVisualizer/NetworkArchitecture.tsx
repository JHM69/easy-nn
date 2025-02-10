'use client'

import { Layer, ActivationType, LossType } from '@/types/neural-network'
import { Tooltip, TooltipProvider } from '../ui/tooltip/tooltip'
 
interface NetworkArchitectureProps {
  layers: Layer[]
  onLayersChange: (layers: Layer[]) => void
  lossFunction: LossType
  onLossFunctionChange: (loss: LossType) => void
}

export default function NetworkArchitecture({
  layers,
  onLayersChange,
  lossFunction,
  onLossFunctionChange
}: NetworkArchitectureProps) {
  const activations: { value: ActivationType; description: string }[] = [
    { value: 'relu', description: 'ReLU - Good default for hidden layers, helps with vanishing gradients' },
    { value: 'sigmoid', description: 'Sigmoid - Best for binary classification output (0-1)' },
    { value: 'tanh', description: 'Tanh - Similar to sigmoid but output range (-1 to 1)' },
    { value: 'linear', description: 'Linear - Good for regression problems' }
  ]

  const lossFunctions: { value: LossType; description: string }[] = [
    { value: 'mse', description: 'Mean Squared Error - Best for regression tasks' },
    { value: 'mae', description: 'Mean Absolute Error - Less sensitive to outliers' }
  ]

  const presets = [
    {
      name: 'Simple Classification',
      layers: [
        { type: 'input', neurons: 2 },
        { type: 'hidden', neurons: 4, activation: 'relu' },
        { type: 'output', neurons: 1 }
      ]
    },
    {
      name: 'Deep Network',
      layers: [
        { type: 'input', neurons: 2 },
        { type: 'hidden', neurons: 8, activation: 'relu' },
        { type: 'hidden', neurons: 4, activation: 'relu' },
        { type: 'output', neurons: 1 }
      ]
    }
  ]

  const addLayer = () => {
    const newLayer = {
      neurons: Math.min(
        Math.max(
          Math.floor((layers[layers.length - 2].neurons + layers[layers.length - 1].neurons) / 2),
          2
        ),
        8
      ),
      type: 'hidden' as const,
      activation: 'relu' as ActivationType  // Default to ReLU for better training
    }
    onLayersChange([...layers.slice(0, -1), newLayer, layers[layers.length - 1]])
  }

  const updateLayer = (index: number, updates: Partial<Layer>) => {
    // Ensure input/output layers maintain correct activation
    if (index === 0) {
      updates.activation = 'linear'  // Input layer should be linear
    } else if (index === layers.length - 1) {
      updates.activation = 'linear'  // Output layer for regression should be linear
    }

    const newLayers = layers.map((layer, i) =>
      i === index ? { ...layer, ...updates } : layer
    )
    onLayersChange(newLayers)
  }

  const removeLayer = (index: number) => {
    if (index === 0 || index === layers.length - 1) return // Don't remove input or output layers
    // Ensure at least one hidden layer remains
    if (layers.filter(l => l.type === 'hidden').length > 1) {
      onLayersChange([...layers.slice(0, index), ...layers.slice(index + 1)])
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Network Architecture</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure your neural network layers</p>
          </div>
          <div className="flex gap-2">
            <select
              onChange={(e) => {
                const preset = presets[parseInt(e.target.value)]
                onLayersChange(preset.layers)
              }}
              className="px-3 py-1.5 border rounded-md text-sm dark:bg-gray-800"
            >
              <option value="">Load Preset</option>
              {presets.map((preset, i) => (
                <option key={i} value={i}>{preset.name}</option>
              ))}
            </select>
            <Tooltip content="Add a new hidden layer">
              <button
                onClick={addLayer}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              >
                Add Layer
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {layers.map((layer, index) => (
            <div 
              key={index} 
              className={`p-4 border rounded-lg shadow-sm transition-all relative
                ${layer.type === 'input' ? 'bg-green-50 dark:bg-green-900/20' : 
                  layer.type === 'output' ? 'bg-blue-50 dark:bg-blue-900/20' : 
                  'bg-white dark:bg-gray-800'}`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Tooltip content={getLayerTypeDescription(layer.type)}>
                    <p className="text-sm font-medium capitalize">
                      {layer.type} Layer {index + 1}
                    </p>
                  </Tooltip>
                  {layer.type === 'hidden' && layers.length > 3 && (
                    <button
                      onClick={() => removeLayer(index)}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove Layer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <Tooltip content={getNeuronsHint(layer.type, index, layers.length)}>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400">Neurons</label>
                      <input
                        type="number"
                        value={layer.neurons}
                        onChange={(e) => {
                          const value = Math.max(1, Math.min(32, parseInt(e.target.value) || 1))
                          updateLayer(index, { neurons: value })
                        }}
                        min="1"
                        max="32"
                        className="w-24 px-2 py-1 border rounded text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                        disabled={layer.type === 'input' || layer.type === 'output'}
                      />
                    </div>
                  </Tooltip>
                </div>

                {layer.type === 'hidden' && (
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-600 dark:text-gray-400">Activation</label>
                    <select
                      value={layer.activation || 'relu'}
                      onChange={(e) => updateLayer(index, { activation: e.target.value as ActivationType })}
                      className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700"
                    >
                      {activations.map(act => (
                        <Tooltip key={act.value} content={act.description}>
                          <option value={act.value}>{act.value.toUpperCase()}</option>
                        </Tooltip>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h4 className="font-medium mb-2">Loss Function</h4>
            <select
              value={lossFunction}
              onChange={(e) => onLossFunctionChange(e.target.value as LossType)}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700"
            >
              {lossFunctions.map(loss => (
                <Tooltip key={loss.value} content={loss.description}>
                  <option value={loss.value}>{loss.value.toUpperCase()}</option>
                </Tooltip>
              ))}
            </select>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

function getLayerTypeDescription(type: string): string {
  switch (type) {
    case 'input':
      return 'Input layer - Receives the raw input features'
    case 'hidden':
      return 'Hidden layer - Performs intermediate computations'
    case 'output':
      return 'Output layer - Produces the final prediction'
    default:
      return ''
  }
}

function getNeuronsHint(type: string, index: number, totalLayers: number): string {
  switch (type) {
    case 'input':
      return 'Number of input features in your data'
    case 'hidden':
      return 'Try using powers of 2 (2, 4, 8, 16) and decrease sizes towards output'
    case 'output':
      return 'Number of outputs (1 for regression, N for N-class classification)'
    default:
      return ''
  }
}
