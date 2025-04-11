import React from 'react';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';

function App() {
  return (
    <div className="min-h-screen p-6 bg-black bg-opacity-50">
      <h1 className="text-4xl mb-8 text-yellow-300 border-b-4 border-dashed border-pink-500 inline-block">wsp bro 🥰</h1>
      <UploadForm />
      <FileList />
    </div>
  );
}

export default App;
