import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Loader2 } from 'lucide-react';
import { useModelStore } from '../lib/store';
import toast from 'react-hot-toast';

export function ModelUpload() {
  const addModel = useModelStore((state) => state.addModel);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false); // Simple state for demo

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const validExtensions = ['.onnx', '.pt', '.pth'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (fileExt && validExtensions.includes(`.${fileExt}`)) {
        setSelectedFile(file);
      } else {
        toast.error('Invalid file type. Please upload ONNX or PyTorch (.pt, .pth).');
        setSelectedFile(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'model/onnx': ['.onnx'],
      'application/octet-stream': ['.pt', '.pth'] // Common MIME types, adjust if needed
    }
  });

  const handleUpload = () => {
    if (selectedFile) {
      setIsUploading(true);
      // In a real app, this would involve actual upload logic.
      // Here, we just add it to the store after a fake delay.
      setTimeout(() => {
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown';
         const modelData = {
          name: selectedFile.name,
          format: fileExt,
          size: selectedFile.size,
          file: selectedFile // Pass the actual File object
        };
        
        try {
          addModel(modelData);
          toast.success(`Model "${selectedFile.name}" ready for benchmarking!`);
          setSelectedFile(null); // Clear selection after adding
        } catch (error) {
          console.error("Error adding model:", error);
          toast.error("Failed to add model to the list.");
        }
        setIsUploading(false);
      }, 1000); // Simulate 1 second upload
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer 
                    transition-colors duration-300 ease-in-out 
                    ${isDragActive 
                      ? 'border-primary bg-primary-50 dark:bg-primary-900/30' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        {isDragActive ? (
          <p className="text-primary dark:text-primary-300 font-semibold">Drop the model file here ...</p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            Drag & drop your ONNX or PyTorch model here, or click to select file
          </p>
        )}
      </div>

      {selectedFile && (
        <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md animate-fade-in-up">
          <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
            <FileIcon className="w-5 h-5 text-primary dark:text-primary-400" />
            <span>{selectedFile.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
          </div>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Model'
            )}
          </button>
        </div>
      )}
    </div>
  );
}