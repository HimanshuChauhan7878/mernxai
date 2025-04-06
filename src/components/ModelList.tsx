import React, { useState } from 'react';
import {
  BarChart,
  Clock,
  MemoryStick as Memory,
  Play,
  Gauge,
  Zap,
  Activity,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useModelStore, BenchmarkResults } from '../lib/store';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8003';

export function ModelList() {
  const { models, updateModelBenchmark, deleteModel } = useModelStore();
  const [benchmarkingId, setBenchmarkingId] = useState<string | null>(null);

  const checkServerConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      return response.ok;
    } catch (error) {
      console.error('Health check error:', error);
      return false;
    }
  };

  const runBenchmark = async (modelId: string, modelFile: File) => {
    // Add check for modelFile and modelFile.name
    if (!modelFile || !modelFile.name) {
      toast.error('Invalid file data. Cannot determine file name or type.');
      console.error('runBenchmark called with invalid modelFile:', modelFile);
      return;
    }

    // Log file details for debugging
    console.log('File details:', {
      name: modelFile.name,
      size: modelFile.size,
      type: modelFile.type,
      lastModified: modelFile.lastModified
    });

    // Validate file type
    const validExtensions = ['.onnx', '.pt', '.pth'];
    const fileExt = modelFile.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !validExtensions.includes(`.${fileExt}`)) {
      toast.error('Invalid file type. Please upload an ONNX, PyTorch (.pt), or PyTorch (.pth) file.');
      return;
    }

    setBenchmarkingId(modelId); // Set loading state for this model
    const toastId = toast.loading('Checking server connection...');

    try {
      // Check if server is running
      const isServerRunning = await checkServerConnection();
      if (!isServerRunning) {
        toast.error('Backend server is not running. Please start the server first.', { id: toastId });
        setBenchmarkingId(null);
        return;
      }

      toast.loading('Running benchmark... This may take a moment.', { id: toastId });

      const formData = new FormData();
      formData.append('file', modelFile);
      formData.append('model_format', fileExt);

      // Log FormData contents
      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const response = await fetch(`${API_URL}/benchmark`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error response:', errorData);
        throw new Error(errorData.detail || 'Benchmark failed');
      }

      const results = await response.json();
      console.log('Benchmark results:', results);
      
      // Ensure all metrics have default values
      const benchmarkResults: BenchmarkResults = {
        accuracy: results.accuracy ?? 0,
        inferenceTime: results.inference_time ?? 0,
        memoryUsage: (results.memory_usage ?? 0) * 1024 * 1024, // Convert MB to bytes
        fps: results.fps ?? 0,
        latency: results.latency ?? 0,
        throughput: results.throughput ?? 0,
        gpuUtilization: results.gpu_utilization ?? undefined,
      };

      updateModelBenchmark(modelId, benchmarkResults);
      toast.success('Benchmark completed!', { id: toastId });
    } catch (error) {
      console.error('Benchmark error:', error);
      if (error instanceof Error) {
        toast.error(`Benchmark failed: ${error.message}`, { id: toastId });
      } else {
        toast.error('Failed to run benchmark. Please check if the server is running.', { id: toastId });
      }
    } finally {
      setBenchmarkingId(null); // Clear loading state
    }
  };

  const handleDelete = (modelId: string, modelName: string) => {
    // Simple confirmation dialog
    if (window.confirm(`Are you sure you want to delete the model "${modelName}"?`)) {
      deleteModel(modelId);
      toast.success(`Model "${modelName}" deleted.`);
    }
  };

  const formatMetric = (value: number | undefined, suffix: string = '', precision: number = 2) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    // Handle potential Infinity from FPS calculation
    if (!isFinite(value)) return 'Very High'; 
    return `${value.toFixed(precision)}${suffix}`;
  };

  return (
    <div className="space-y-6">
      {models.map((model) => {
        const isBenchmarking = benchmarkingId === model.id;
        return (
          <div
            key={model.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-950/30 p-6 border border-transparent dark:border-gray-700 transition-shadow duration-300 hover:shadow-xl dark:hover:border-gray-600"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
              {/* Model Info */}
              <div className="flex-grow">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{model.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Format: <span className="font-medium text-gray-700 dark:text-gray-300">{model.format.toUpperCase()}</span> • 
                  Size: <span className="font-medium text-gray-700 dark:text-gray-300">{(model.size / 1024 / 1024).toFixed(2)} MB</span> • 
                  Added: <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(model.createdAt).toLocaleDateString()}</span>
                </p>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {!model.benchmarkResults && model.file && (
                  <button
                    onClick={() => runBenchmark(model.id, model.file as File)}
                    disabled={isBenchmarking}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:scale-100 disabled:cursor-wait"
                    title="Run benchmark for this model"
                  >
                    {isBenchmarking ? (
                       <Loader2 className="w-4 h-4 animate-spin" /> 
                    ) : (
                       <Play className="w-4 h-4" />
                    )}
                    <span>{isBenchmarking ? 'Running...' : 'Benchmark'}</span>
                  </button>
                )}
                {!model.benchmarkResults && !model.file && (
                  <span className="text-xs text-red-500 dark:text-red-400 italic px-4 py-2">File unavailable</span>
                )}
                <button
                  onClick={() => handleDelete(model.id, model.name)}
                  className="p-2 text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700 rounded-full transition-colors duration-300"
                  title="Delete this model"
                  disabled={isBenchmarking} // Optionally disable delete while benchmarking
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Benchmark Results */}
            {model.benchmarkResults && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Metric Item Structure */}
                {[ // Define metrics in an array for easier mapping/styling
                  { Icon: BarChart, label: 'Accuracy', value: model.benchmarkResults.accuracy, suffix: ' %', color: 'text-blue-500 dark:text-blue-400' },
                  { Icon: Clock, label: 'Inference Time', value: model.benchmarkResults.inferenceTime, suffix: ' ms', color: 'text-green-500 dark:text-green-400' },
                  { Icon: Memory, label: 'Memory Usage', value: model.benchmarkResults.memoryUsage / (1024 * 1024), suffix: ' MB', color: 'text-purple-500 dark:text-purple-400' },
                  { Icon: Zap, label: 'FPS', value: model.benchmarkResults.fps, suffix: '', color: 'text-yellow-500 dark:text-yellow-400' },
                  { Icon: Gauge, label: 'Latency', value: model.benchmarkResults.latency, suffix: ' ms', color: 'text-red-500 dark:text-red-400' },
                  { Icon: Activity, label: 'Throughput', value: model.benchmarkResults.throughput, suffix: ' FPS', color: 'text-indigo-500 dark:text-indigo-400' },
                  ...(model.benchmarkResults.gpuUtilization !== undefined ? 
                     [{ Icon: Activity, label: 'GPU Utilization', value: model.benchmarkResults.gpuUtilization, suffix: ' %', color: 'text-pink-500 dark:text-pink-400' }] : [])
                ].map(({ Icon, label, value, suffix, color }) => (
                   <div key={label} className="flex items-center space-x-3">
                     <Icon className={`w-6 h-6 flex-shrink-0 ${color}`} />
                     <div>
                       <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                       <p className="font-semibold text-gray-800 dark:text-gray-100">
                         {formatMetric(value, suffix)}
                       </p>
                     </div>
                   </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {models.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-950/30 border border-transparent dark:border-gray-700">
          No models added yet. Upload a model using the section above!
        </div>
      )}
    </div>
  );
}