'use client'

import { Layer } from '@/types/neural-network'
import { MLP, Value } from '@/utils/neural-network'
import Neuron from './Neuron'
import Connection from './Connection'
import { useRef, useEffect, useState } from 'react'

interface NetworkVisualizerProps {
  layers: Layer[]
  activations: (Value[][] | number[][])
  weights: Value[]
  biases: number[]
  activeLayer?: number
  phase?: 'forward' | 'backward'
}

export default function NetworkVisualizer({
  layers,
  activations: rawActivations,
  weights: rawWeights,
  biases: rawBiases,
  activeLayer, 
}: NetworkVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Update dimensions when container size changes
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 500 // Fixed height
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = -e.deltaY
      const zoomFactor = 1.1
      const newZoom = delta > 0 
        ? Math.min(zoom * zoomFactor, 3) 
        : Math.max(zoom / zoomFactor, 0.5)

      // Calculate mouse position relative to container
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Calculate new pan position to zoom towards mouse
      const newPan = {
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom)
      }

      setZoom(newZoom)
      setPan(newPan)
    }
  }

  // Update the layout parameters
  const padding = 50
  const baseLayerSpacing = (dimensions.width - 2 * padding) / (layers.length - 1)
  const layerSpacing = baseLayerSpacing * zoom
  const maxNeurons = Math.max(...layers.map(l => l.neurons))
  const baseNeuronSpacing = (dimensions.height - 2 * padding) / (maxNeurons + 1)
  const neuronSpacing = baseNeuronSpacing * zoom

  // Ensure activations are properly formatted
  const activations = Array.isArray(rawActivations) 
    ? rawActivations 
    : layers.map(l => Array(l.neurons).fill(0))

  // Ensure weights are properly formatted
  const weights = Array.isArray(rawWeights) 
    ? rawWeights 
    : []

  // Ensure biases are properly formatted
  const biases = Array.isArray(rawBiases) 
    ? rawBiases 
    : []

  // Helper to safely get activation value
  const getActivationValue = (layerIndex: number, neuronIndex: number): Value => {
    const layerActivations = activations[layerIndex]
    if (!layerActivations) return new Value(0)
    
    const value = layerActivations[neuronIndex]
    if (value instanceof Value) return value
    if (typeof value === 'number') return new Value(value)
    return new Value(0)
  }

  // Helper to safely get weight value
  const getWeightValue = (layerIndex: number, sourceNeuron: number, targetNeuron: number): Value => {
    const index = getWeightIndex(layerIndex, sourceNeuron, targetNeuron, layers)
    return weights[index] || new Value(0)
  }

  // Helper to safely get bias value
  const getBiasValue = (layerIndex: number, neuronIndex: number): Value => {
    // Skip bias for input layer
    if (layerIndex === 0) return new Value(0);
    
    // Calculate the index in the weights array where biases start for this layer
    let weightCount = 0;
    for (let i = 0; i < layerIndex; i++) {
      weightCount += layers[i].neurons * layers[i + 1].neurons;
    }
    
    // Calculate bias index
    const biasStartIndex = weightCount + (layers[layerIndex].neurons * layers[layerIndex + 1]?.neurons || 0);
    const biasIndex = biasStartIndex + neuronIndex;
    
    return weights[biasIndex] || new Value(0);
  }

  // Constants for neuron dimensions
  const NEURON_SIZE = 64; // 16 * 4 (w-16 h-16 in Neuron.tsx translates to 64px)
  const NEURON_RADIUS = NEURON_SIZE / 2;

  // Updated neuron position calculation to account for neuron size
  const getNeuronPosition = (layerIndex: number, neuronIndex: number) => ({
    x: padding + layerIndex * layerSpacing + NEURON_RADIUS,
    y: padding + (neuronIndex + 1) * neuronSpacing + NEURON_RADIUS
  });

  // Updated SVG container to use absolute positioning
  return (
    <div className="relative border border-gray-300 dark:border-gray-700 rounded-lg p-4">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="
            p-2 
            bg-gray-100 hover:bg-gray-200 
            dark:bg-gray-700 dark:hover:bg-gray-600 
            rounded 
            transition-colors duration-300
          "
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="
            p-2 
            bg-gray-100 hover:bg-gray-200 
            dark:bg-gray-700 dark:hover:bg-gray-600 
            rounded 
            transition-colors duration-300
          "
        >
          -
        </button>
        <button
          onClick={handleReset}
          className="
            p-2 
            bg-gray-100 hover:bg-gray-200 
            dark:bg-gray-700 dark:hover:bg-gray-600 
            rounded 
            transition-colors duration-300
          "
        >
          ↺
        </button>
      </div>

      <div 
        ref={containerRef} 
        className="relative overflow-hidden w-full h-[500px]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* SVG Layer for Connections */}
        <svg 
          className="absolute inset-0"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {layers.map((layer, layerIndex) => 
            layerIndex < layers.length - 1 && (
              <g key={`connections-${layerIndex}`}>
                {Array(layer.neurons).fill(0).map((_, sourceNeuron) =>
                  Array(layers[layerIndex + 1].neurons).fill(0).map((_, targetNeuron) => {
                    const weight = getWeightValue(layerIndex, sourceNeuron, targetNeuron);
                    const source = getNeuronPosition(layerIndex, sourceNeuron);
                    const target = getNeuronPosition(layerIndex + 1, targetNeuron);

                    return (
                      <Connection
                        key={`${layerIndex}-${sourceNeuron}-${targetNeuron}`}
                        source={source}
                        target={target}
                        weight={weight}
                        isActive={layerIndex === activeLayer}
                      />
                    );
                  })
                )}
              </g>
            )
          )}
        </svg>

        {/* Update the neuron container positioning */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            pointerEvents: 'none'
          }}
        >
          <div className="relative w-full h-full">
            {layers.map((layer, layerIndex) => (
              <div 
                key={layerIndex} 
                className="absolute"
                style={{
                  left: `${padding + layerIndex * layerSpacing}px`,
                  top: 0,
                  width: `${NEURON_SIZE}px`
                }}
              >
                <div className="text-sm font-medium mb-4 text-center">
                  Layer {layerIndex}
                  {layer.type !== 'input' && ` (${layer.activation})`}
                </div>
                {Array(layer.neurons).fill(0).map((_, neuronIndex) => {
                  const position = getNeuronPosition(layerIndex, neuronIndex);
                  const activation = getActivationValue(layerIndex, neuronIndex);
                  const bias = getBiasValue(layerIndex, neuronIndex);
                  
                  return (
                    <div
                      key={neuronIndex}
                      className="absolute"
                      style={{
                        left: 0,
                        top: `${padding + (neuronIndex + 1) * neuronSpacing}px`
                      }}
                    >
                      <Neuron
                        activation={activation}
                        bias={bias}
                        isActive={layerIndex === activeLayer}
                        layerIndex={layerIndex}
                        neuronIndex={neuronIndex}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions to calculate indices
function getWeightIndex(layerIndex: number, sourceNeuron: number, targetNeuron: number, layers: Layer[]): number {
  let index = 0
  for (let i = 0; i < layerIndex; i++) {
    index += layers[i].neurons * layers[i + 1].neurons
  }
  return index + sourceNeuron * layers[layerIndex + 1].neurons + targetNeuron
}

function getBiasIndex(layerIndex: number, neuronIndex: number, layers: Layer[]): number {
  let index = 0
  for (let i = 1; i < layerIndex; i++) {
    index += layers[i].neurons
  }
  return index + neuronIndex
}
