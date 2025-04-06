import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BenchmarkResults {
  accuracy: number;
  inferenceTime: number;
  memoryUsage: number;
  fps: number;
  latency: number;
  throughput: number;
  gpuUtilization?: number;
}

export interface Model {
  id: string;
  name: string;
  format: string;
  size: number;
  file: File;
  createdAt: string;
  benchmarkResults?: BenchmarkResults;
}

export interface User {
  id: string;
  email: string;
}

interface ModelStore {
  models: Model[];
  addModel: (model: Omit<Model, 'id' | 'createdAt'>) => void;
  updateModelBenchmark: (id: string, results: BenchmarkResults) => void;
  deleteModel: (id: string) => void;
  isAuthenticated: boolean;
  user: User | null;
  logout: () => void;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      models: [],
      isAuthenticated: false,
      user: null,
      addModel: (modelData) =>
        set((state) => ({
          models: [
            ...state.models,
            {
              ...modelData,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateModelBenchmark: (id, results) =>
        set((state) => ({
          models: state.models.map((model) =>
            model.id === id ? { ...model, benchmarkResults: results } : model
          ),
        })),
      deleteModel: (id) =>
        set((state) => ({
          models: state.models.filter((model) => model.id !== id),
        })),
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },
    }),
    {
      name: 'model-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            const { state, version } = JSON.parse(str);
            return {
              state: {
                ...state,
                isAuthenticated: state.isAuthenticated || false,
                user: state.user || null,
                models: (state.models || []).map((m: any) => ({
                   ...m,
                   file: undefined,
                   benchmarkResults: m.benchmarkResults || undefined
                }))
              },
              version: version
            };
          } catch (e) {
             logger.error("Failed to parse persisted state:", e);
             localStorage.removeItem(name);
             return null;
          }
        },
        setItem: (name, newValue) => {
          try {
            const stateToPersist = {
              ...newValue.state,
              models: newValue.state.models.map((m: Model) => {
                const { file, ...rest } = m;
                return { ...rest, benchmarkResults: m.benchmarkResults || undefined };
              }),
            };
            localStorage.setItem(name, JSON.stringify({
                state: stateToPersist,
                version: newValue.version
              })
            );
          } catch (e) {
             logger.error("Failed to save state:", e);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

const logger = console;