const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-lg font-medium text-gray-600 dark:text-gray-400 animate-pulse">
        Loading Neural Network Visualizer...
      </p>
    </div>
  );
};

export default LoadingSpinner;
