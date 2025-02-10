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
      <div className="space-y-4 bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg"> {/* reduced from space-y-6 */}
        <div className="flex justify-between items-center mb-4"> {/* reduced from mb-6 */}
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
              className="px-3 py-1.5 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700"
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

        <div className="relative w-full overflow-x-auto pb-4"> {/* reduced from pb-6 */}
          <div className="flex items-center gap-2 min-w-max px-2"> {/* reduced gap-4 to gap-2 and px-4 to px-2 */}
            {layers.map((layer, index) => (
              <div key={index} className="relative">
                {/* Connection lines */}
                {index < layers.length - 1 && (
                  <div className="absolute left-full top-1/2 w-2 h-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-y-1/2"></div>
                )}
                
                <div className={`w-48 p-3 border rounded-lg shadow-sm transition-all relative
                  ${layer.type === 'input' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30' : 
                    layer.type === 'output' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30' : 
                    'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
                `}>
                  <div className="space-y-2"> {/* reduced from space-y-3 */}
                    <div className="flex justify-between items-center">
                      <Tooltip content={getLayerTypeDescription(layer.type)}>
                        <p className="text-sm font-medium capitalize">
                          {layer.type} Layer {index + 1}
                        </p>
                      </Tooltip>
                      {layer.type === 'hidden' && layers.length > 3 && (
                        <button
                          onClick={() => removeLayer(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5"> {/* reduced from space-y-2 */}
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
                            className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            disabled={layer.type === 'input' || layer.type === 'output'}
                          />
                        </div>
                      </Tooltip>

                      {/* Neuron visualization */}
                      <div className="h-16 flex items-center justify-center"> {/* reduced from h-20 */}
                        <div className="flex flex-col gap-1">
                          {Array.from({ length: Math.min(layer.neurons, 5) }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${
                                layer.type === 'input' ? 'bg-green-400 dark:bg-green-500' :
                                layer.type === 'output' ? 'bg-blue-400 dark:bg-blue-500' :
                                'bg-gray-400 dark:bg-gray-500'
                              }`}
                            />
                          ))}
                          {layer.neurons > 5 && (
                            <div className="text-xs text-gray-500 text-center mt-1">+{layer.neurons - 5}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {layer.type === 'hidden' && (
                      <div className="space-y-1.5"> {/* reduced from space-y-2 */}
                        <label className="block text-xs text-gray-600 dark:text-gray-400">Activation</label>
                        <select
                          value={layer.activation || 'relu'}
                          onChange={(e) => updateLayer(index, { activation: e.target.value as ActivationType })}
                          className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
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
              </div>
            ))}
            
            {/* Loss Function Box */}
            <div className="relative">
              {/* Connection line to loss function */}
              <div className="absolute right-full top-1/2 w-2 h-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-y-1/2"></div>
              
              <div className="w-48 p-3 border rounded-lg shadow-sm bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30">
                <div className="space-y-2"> {/* reduced from space-y-3 */}
                  <Tooltip content="Loss function measures how well the network performs">
                    <p className="text-sm font-medium">Loss Function</p>
                  </Tooltip>
                  
                  <div className="space-y-1.5"> {/* reduced from space-y-2 */}
                    <select
                      value={lossFunction}
                      onChange={(e) => onLossFunctionChange(e.target.value as LossType)}
                      className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    >
                      {lossFunctions.map(loss => (
                        <Tooltip key={loss.value} content={loss.description}>
                          <option value={loss.value}>{loss.value.toUpperCase()}</option>
                        </Tooltip>
                      ))}
                    </select>

                    {/* Loss function visualization */}
                    <div className="h-16 flex items-center justify-center"> {/* reduced from h-20 */}
                      <div className="text-red-500 dark:text-red-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
