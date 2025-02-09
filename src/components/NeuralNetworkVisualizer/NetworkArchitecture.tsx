'use client'

import { Layer, ActivationType, LossType } from '@/types/neural-network'

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
  const activations: ActivationType[] = ['linear', 'relu', 'sigmoid', 'tanh']
  const lossFunctions: LossType[] = ['mse', 'mae']

  const addLayer = () => {
    onLayersChange([
      ...layers.slice(0, -1),
      { neurons: 4, type: 'hidden' },
      layers[layers.length - 1]
    ])
  }

  const updateLayer = (index: number, updates: Partial<Layer>) => {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Network Architecture</h3>
        <button
          onClick={addLayer}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
        >
          Add Layer
        </button>
      </div>
      
      <div className="flex flex-wrap gap-4">
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
            <p className="text-sm font-medium capitalize">{layer.type} Layer {index + 1}</p>
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
            <label className="block text-xs text-gray-600 dark:text-gray-400">Neurons</label>
            <input
              type="number"
              value={layer.neurons}
              onChange={(e) => updateLayer(index, { neurons: Math.max(1, parseInt(e.target.value) || 1) })}
              min="1"
              className="w-24 px-2 py-1 border rounded text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={layer.type === 'input' || layer.type === 'output'}
            />
              </div>

              {layer.type === 'hidden' && index === layers.length - 2 && (
            <div className="space-y-2">
              <label className="block text-xs text-gray-600 dark:text-gray-400">Network Activation</label>
              <select
                value={layer.activation || 'relu'}
                onChange={(e) => updateLayer(index, { activation: e.target.value as ActivationType })}
                className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {activations.map(act => (
                  <option key={act} value={act}>{act.toUpperCase()}</option>
                ))}
              </select>
            </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <h4 className="font-medium mb-2">Loss Function</h4>
        <select
          value={lossFunction}
          onChange={(e) => onLossFunctionChange(e.target.value as LossType)}
          className="px-2 py-1 border rounded text-sm dark:bg-gray-700"
        >
          {lossFunctions.map(loss => (
            <option key={loss} value={loss}>{loss.toUpperCase()}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
