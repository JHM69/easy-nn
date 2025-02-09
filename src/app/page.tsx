'use client'

import { ThemeSwitcher } from '@/components/ThemeSwitcher'  
import NeuralNetworkVisualizer from '@/components/NeuralNetworkVisualizer'

export default function Home() {
  

  return (
    <div className="grid grid-rows-[auto_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-white dark:bg-gray-950 text-black dark:text-white">
      <header className="w-full flex justify-between items-center">
        <h1 className="text-2xl font-bold"> Neural Network Playground </h1>
        <div className="flex items-center gap-4">
         
          <ThemeSwitcher />
        </div>
      </header>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-xl font-semibold"> Neural Network Visualizer </h2>
          <NeuralNetworkVisualizer />
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md text-center">
            Developed by @jhm69  
          </p>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        {/* Footer content */}
      </footer>
    </div>
  )
}
