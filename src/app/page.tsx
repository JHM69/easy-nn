'use client'

import { ThemeSwitcher } from '@/components/ThemeSwitcher'  
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import LoadingSpinner from '@/components/LoadingSpinner'

// Import the visualizer with no SSR
const NeuralNetworkVisualizer = dynamic(
  () => import('@/components/NeuralNetworkVisualizer'),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />
  }
)

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-white dark:bg-gray-950 text-black dark:text-white">
      <header className="w-full flex justify-between items-center">
        <h1 className="text-2xl font-bold">Neural Network Visualizer</h1>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
        </div>
      </header>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-xl font-semibold">Neural Network Playground </h2>
          <ErrorBoundary>
            <NeuralNetworkVisualizer />
          </ErrorBoundary>
         
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md text-center">
          Developed by <a 
            href="https://github.com/JHM69" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
          >@jhm69</a>
        </p>
        <div className="flex gap-4">
          <a 
            href="https://github.com/JHM69/easy-nn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
          >
            GitHub Repository
          </a>
          <a 
            href="https://github.com/JHM69/easy-nn/issues/new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
          >
            Issue
          </a>
        </div>
      </footer>
    </div>
  )
}
