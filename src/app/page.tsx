"use client";

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from '@uploadthing/react';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import Auth from './components/Auth';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState('png');
  const [quality, setQuality] = useState(80);
  const [lossless, setLossless] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
      'image/avif': [],
    }
  });

  const handleConvert = async () => {
    if (files.length === 0 || !user) return;

    setIsConverting(true);
    setError(null);

    const token = await user.getIdToken();

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('outputFormat', outputFormat);
    formData.append('quality', String(quality));
    formData.append('lossless', String(lossless));

    try {
      const response = await fetch(`https://imagetoolbackend.onrender.com/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted-images.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();

    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred');
        }
    } finally {
      setIsConverting(false);
    }
  };

  const renderCompressionOptions = () => {
    switch (outputFormat) {
      case 'jpg':
      case 'webp':
      case 'avif':
        return (
          <div className="w-full sm:w-auto">
            <label htmlFor="quality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quality: {quality}</label>
            <input
              type="range"
              id="quality"
              name="quality"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        );
      case 'png':
        return (
            <div className="flex items-center">
                <input
                    id="lossless"
                    name="lossless"
                    type="checkbox"
                    checked={lossless}
                    onChange={(e) => setLossless(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="lossless" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Lossless
                </label>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-50 dark:bg-gray-900">
        <div className="absolute top-4 right-4">
            <Auth user={user} />
        </div>
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 dark:text-white mb-8">
          Image Format Converter
        </h1>

        {user ? (
          <>
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${isDragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/20"
                }`}>
              <input {...getInputProps()} />
              <div className="text-center p-4">
                <p className="text-lg text-gray-500 dark:text-gray-400">
                  {isDragActive
                    ? "Drop the files here ..."
                    : "Drag 'n' drop some files here, or click to select files"}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Supported formats: JPG, PNG, WEBP, AVIF
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 text-center text-red-500 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                <p>{error}</p>
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-white mb-4">Selected Files:</h2>
                <ul className="space-y-2">
                  {files.map(file => (
                    <li key={file.name} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-800 dark:text-gray-200">
                      {file.name} - {Math.round(file.size / 1024)} KB
                    </li>
                  ))}
                </ul>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                  <div className="sm:col-span-1">
                    <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Convert to:</label>
                    <select
                      id="outputFormat"
                      name="outputFormat"
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WEBP</option>
                      <option value="avif">AVIF</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    {renderCompressionOptions()}
                  </div>
                  <div className="sm:col-span-1 sm:justify-self-end">
                    <button
                        onClick={handleConvert}
                        disabled={isConverting}
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isConverting ? 'Converting...' : 'Convert'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>Please log in to use the converter.</p>
          </div>
        )}
      </div>
    </main>
  );
}
