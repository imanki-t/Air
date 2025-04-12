import React, { useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const FileItem = ({ file, refresh }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const download = () => {
    window.open(`${backendUrl}/api/files/download/${file._id}`, '_blank');
  };

  const deleteFile = async () => {
    try {
      await axios.delete(`${backendUrl}/api/files/${file._id}`);
      refresh();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const share = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
      setShareLink(res.data.url);
      setCopied(false);
      setShowShare(true);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const renderPreview = () => {
    const url = `${backendUrl}/api/files/download/${file._id}`;
    const type = file.metadata?.type;
    const previewClass = 'rounded-lg mb-2 w-full max-h-48 object-contain';

    if (type === 'image') return <img src={url} alt={file.filename} className={previewClass} />;
    if (type === 'video') return <video src={url} controls className={previewClass} />;
    if (type === 'audio') return <audio src={url} controls className="w-full mb-2" />;

    return (
      <div className="mb-2 p-2 text-sm text-center bg-yellow-200 rounded">
        {file.filename.split('.').pop().toUpperCase()} file
      </div>
    );
  };

  return (
    <>
      {/* File Card */}
      <div className="bg-yellow-500 w-full p-3 sm:p-4 text-sm sm:text-base rounded-xl shadow-lg border-4 border-dashed border-purple-600 overflow-hidden">
        {renderPreview()}
        <h3 className="text-black font-bold truncate">{file.filename}</h3>
        <p className="text-xs text-gray-600">Type: {file.metadata?.type}</p>
        <p className="text-xs text-gray-600">Size: {formatSize(file.length)}</p>
        <p className="text-xs text-gray-500">Uploaded: {new Date(file.uploadDate).toLocaleString()}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={download} className="vintage-btn bg-blue-600 hover:bg-blue-700">Download</button>
          <button onClick={share} className="vintage-btn bg-green-600 hover:bg-green-700" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Share'}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="vintage-btn bg-red-600 hover:bg-red-700">Delete</button>
        </div>
      </div>

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className="bg-green-400 border-4 border-purple-600 p-4 rounded-xl max-w-sm w-full text-center relative shadow-vintage">
            <button
              onClick={() => setShowShare(false)}
              className="absolute top-2 right-2 text-xl font-bold text-red-600 hover:text-red-800"
              title="Close"
            >
              ×
            </button>
            <h2 className="font-bold mb-3 text-lg text-purple-800 vintage-btn">Shareable URL</h2>

            {/* QR Code */}
            {shareLink ? (
              <div className="flex justify-center mb-4">
                <div className="p-2 border-4 border-dashed border-black bg-yellow-100 rounded-xl">
                  <QRCodeSVG
                    value={shareLink}
                    size={128}
                    fgColor="#3b2f2f"
                    bgColor="#fdf6e3"
                    level="H"
                    style={{ width: '128px', height: '128px', display: 'block' }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600 mb-4">Failed to generate QR code.</p>
            )}

            {/* Link + Copy */}
            <input
  value={shareLink}
  readOnly
  className="w-[90%] px-3 py-2 bg-yellow-200 border border-yellow-400 rounded font-mono text-sm mb-3 text-black"
/>
            <button
              onClick={copyToClipboard}
              className="vintage-btn bg-green-600 hover:bg-green-700"
            >
              ⧉ {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className="bg-yellow-100 border-4 border-red-600 p-4 rounded-xl max-w-sm w-full text-center relative shadow-vintage">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute top-2 right-2 text-xl font-bold text-red-600 hover:text-red-800"
              title="Cancel"
            >
              ×
            </button>
            <h2 className="font-bold mb-2 text-lg text-red-700">Confirm Delete</h2>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete <span className="font-bold">{file.filename}</span>?
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={deleteFile} className="vintage-btn bg-red-600 hover:bg-red-700">Yes</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="vintage-btn bg-gray-600 hover:bg-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileItem;
