import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const UploadForm = ({ refresh }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const controllerRef = useRef(null);
  const dropRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setMessage('');
      setProgress(0);
      setIsUploading(true);

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
        formData,
        {
          signal: controller.signal,
          onUploadProgress: (event) => {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          }
        }
      );

      setMessage('File uploaded successfully!');
      setTimeout(() => setMessage(''), 10000);
      setFile(null);
      refresh();
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
        setMessage('Upload cancelled.');
        setFile(null);
        setTimeout(() => setMessage(''), 10000);
      } else {
        setMessage('Upload failed.');
        setTimeout(() => setMessage(''), 10000);
      }
    } finally {
      setProgress(0);
      setIsUploading(false);
      controllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  };

  const handleRemove = () => {
    setFile(null);
    setMessage('');
    setProgress(0);
  };

  const getTruncatedFileName = (name) => {
    if (!name) return '';
    return name.length > 10 ? name.slice(0, 10) + '...' : name;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <form
      onSubmit={handleUpload}
      className="mb-6 p-4 border-4 border-double border-yellow-300 bg-transparent rounded-2xl shadow-vintage"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      ref={dropRef}
    >
      <label className="block mb-2 text-xl text-yellow-200">Choose a file:</label>

      <label
        htmlFor="fileInput"
        className="block w-full max-w-full cursor-pointer bg-yellow-500 text-black px-4 py-2 rounded font-bold text-sm md:text-base mb-4 text-center overflow-hidden whitespace-nowrap truncate"
        title={file ? file.name : 'Browse file'}
      >
        {file ? getTruncatedFileName(file.name) : 'Browse file (or drag & drop)'}
      </label>
      <input
        id="fileInput"
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="hidden"
      />

      {isUploading && (
        <>
          <div className="w-full bg-yellow-200 rounded-full h-4 mb-3 overflow-hidden">
            <div
              className="bg-green-900 h-full transition-all duration-200 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-1 bg-red-600 hover:bg-red-700 text-white rounded vintage-btn"
            >
              Cancel Upload
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-4 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded vintage-btn"
            >
              Remove File
            </button>
          </div>
        </>
      )}

      {!isUploading && file && (
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md vintage-btn"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md vintage-btn"
          >
            Remove
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-pink-100">{message}</p>}
    </form>
  );
};

export default UploadForm;
