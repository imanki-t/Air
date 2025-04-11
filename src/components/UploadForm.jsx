import React, { useState, useRef } from 'react';
import axios from 'axios';

const UploadForm = ({ refresh }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const controllerRef = useRef(null); // to store abort controller

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
      setFile(null);
      refresh();
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
        setMessage('Upload cancelled.');
      } else {
        setMessage('Upload failed.');
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

  return (
    <form
      onSubmit={handleUpload}
      className="mb-6 p-4 border-4 border-double border-yellow-300 bg-pink-200 bg-opacity-30 rounded-2xl shadow-vintage"
    >
      <label className="block mb-2 text-xl text-yellow-200">Choose a file:</label>

      <label
        htmlFor="fileInput"
        className="block w-full cursor-pointer bg-yellow-500 text-black px-4 py-2 rounded font-bold text-center mb-4"
      >
        {file ? file.name : 'Browse file'}
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
              className="bg-green-500 h-full transition-all duration-200 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="mb-4 px-4 py-1 bg-red-600 hover:bg-red-700 text-white rounded vintage-btn"
          >
            Cancel Upload
          </button>
        </>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className={`px-4 py-2 ${
          isUploading ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        } text-white rounded-md vintage-btn`}
      >
        Upload
      </button>

      {message && <p className="mt-3 text-pink-100">{message}</p>}
    </form>
  );
};

export default UploadForm;
