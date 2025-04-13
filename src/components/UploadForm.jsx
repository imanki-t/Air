import React, { useState, useRef, useCallback } from 'react';    
import axios from 'axios';    

const UploadForm = ({ refresh, darkMode }) => {    
  const [file, setFile] = useState(null);    
  const [message, setMessage] = useState('');    
  const [progress, setProgress] = useState(0);    
  const [isUploading, setIsUploading] = useState(false);    
  const controllerRef = useRef(null);    
  const fileInputRef = useRef(null);

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
    return name.length > 15 ? name.slice(0, 15) + '...' : name;    
  };    

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (    
    <form    
      onSubmit={handleUpload}    
      className={`mb-6 p-6 rounded-xl shadow-md transition-colors duration-300 ${
        darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
      }`}
    >    
      <h3 className={`text-xl font-medium mb-4 ${
        darkMode ? 'text-white' : 'text-gray-800'
      }`}>
        Upload File
      </h3>

      <label    
        htmlFor="fileInput"    
        className={`block w-full cursor-pointer px-4 py-6 rounded-lg mb-4 text-center transition-colors ${
          darkMode 
            ? 'bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600' 
            : 'bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300'
        } ${
          file ? 'border-blue-500' : ''
        }`}
        title={file ? file.name : 'Drag and drop file or click to browse'}    
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >    
        <div className="flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {file 
            ? <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{getTruncatedFileName(file.name)}</span>
            : <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Drag and drop file or click to browse</span>
          }
        </div>
      </label>    

      <input    
        id="fileInput"    
        type="file"    
        ref={fileInputRef}
        onChange={(e) => setFile(e.target.files[0])}    
        className="hidden"    
      />    

      {isUploading && (    
        <>    
          <div className={`w-full rounded-full h-4 mb-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>    
            <div    
              className="bg-blue-600 h-full transition-all duration-200 ease-in-out"    
              style={{ width: `${progress}%` }}    
            />    
          </div>    
          <div className="flex flex-wrap gap-2 mb-3">    
            <button    
              type="button"    
              onClick={handleCancel}    
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"    
            >    
              Cancel Upload    
            </button>    
            <button    
              type="button"    
              onClick={handleRemove}    
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}    
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"    
          >    
            Upload    
          </button>    
          <button    
            type="button"    
            onClick={handleRemove}    
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}    
          >    
            Remove    
          </button>    
        </div>    
      )}    

      {message && <p className={`mt-3 ${
        message.includes('success') 
          ? 'text-green-500' 
          : message.includes('failed') 
            ? 'text-red-500' 
            : 'text-blue-500'
      }`}>{message}</p>}    
    </form>    
  );    
};    

export default UploadForm;
