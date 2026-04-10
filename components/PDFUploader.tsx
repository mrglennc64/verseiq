"use client";

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ExtractedData {
  artist: string;
  title: string;
  isrc: string;
  amount: number;
  period: string;
  earnings: Array<{
    source: string;
    amount: number;
    plays: number;
  }>;
}

export default function PDFUploader({ onDataExtracted }: { onDataExtracted: (data: ExtractedData) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Send to backend for parsing
      const response = await fetch('/api/parse-label-pdf', {
        method: 'POST',
        body: formData
      });

      clearInterval(interval);
      
      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const data = await response.json();
      setProgress(100);
      setTimeout(() => {
        setUploading(false);
        onDataExtracted(data);
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  }, [onDataExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.xlsx']
    },
    maxFiles: 1,
    maxSize: 10485760, // 10MB
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <FileText className="h-5 w-5 text-purple-600 mr-2" />
        Upload Statement
      </h3>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragActive 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 text-purple-600 animate-spin" />
            <p className="text-sm text-gray-600">Processing PDF... {progress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-600">
              {isDragActive
                ? "Drop your statement here"
                : "Drag & drop PDF statement, or click to browse"}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supports PRO statements (ASCAP/BMI/PRS), distributor reports (DistroKid/TuneCore), royalty contracts
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
          ASCAP/BMI/PRS
        </div>
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
          DistroKid/TuneCore
        </div>
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
          Label statements
        </div>
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
          Royalty contracts
        </div>
      </div>
    </div>
  );
}
