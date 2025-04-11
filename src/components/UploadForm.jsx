// src/components/UploadForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/files/upload`, formData);
      setMessage('File uploaded successfully!');
      setFile(null);
    } catch (err) {
      setMessage('Upload failed.');
    }
  };

  return (
    <form
      onSubmit={handleUpload}
      className="mb-6 p-4 border-4 border-double border-yellow-300 bg-pink-200 bg-opacity-30 rounded-2xl shadow-vintage"
    >
      <label className="block mb-2 text-xl text-yellow-200">Choose a file:</label>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4 w-full sm:w-auto"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md vintage-btn"
      >
        Upload
      </button>
      {message && <p className="mt-3 text-pink-100">{message}</p>}
    </form>
  );
};

export default UploadForm;
