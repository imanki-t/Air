// src/components/dashboard/ShareModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import fileService from '../../services/fileService';

export const ShareModal = ({ file, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState(30);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);

  useEffect(() => {
    generateShareLink();
  }, []);

  const generateShareLink = async () => {
    setLoading(true);
    try {
      const options = {
        expiresIn,
        requirePassword,
        password: requirePassword ? password : undefined,
        allowDownload
      };
      
      const response = await fileService.generateShareLink(file._id, options);
      setShareLink(response.url);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleRegenerateLink = () => {
    setShareLink('');
    generateShareLink();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card text-card-foreground border border-border rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Share "{file.filename}"</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code */}
          {shareLink && !loading && (
            <div className="flex justify-center p-4 bg-secondary rounded-lg">
              <QRCodeSVG
                value={shareLink}
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* Share Link */}
          {shareLink && !loading && (
            <div>
              <label className="block text-sm font-medium mb-2">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm font-mono"
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {copied ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Link Expiration</label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-input"
              >
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={0}>Never</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md border border-border">
              <div>
                <p className="text-sm font-medium">Password Protection</p>
                <p className="text-xs text-muted-foreground">Require password to access</p>
              </div>
              <button
                onClick={() => setRequirePassword(!requirePassword)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  requirePassword ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    requirePassword ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {requirePassword && (
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-input"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-md border border-border">
              <div>
                <p className="text-sm font-medium">Allow Download</p>
                <p className="text-xs text-muted-foreground">Allow recipients to download</p>
              </div>
              <button
                onClick={() => setAllowDownload(!allowDownload)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  allowDownload ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    allowDownload ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleRegenerateLink}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              Regenerate Link
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors"
            >
              Done
            </button>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Anyone with this link can {allowDownload ? 'view and download' : 'view'} this file
              {expiresIn > 0 ? ` for the next ${expiresIn} day${expiresIn > 1 ? 's' : ''}` : ''}.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
