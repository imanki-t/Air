import React, { useState, useRef, useCallback, useEffect } from 'react'; import axios from 'axios';

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes const STORAGE_KEY = 'fileUploadState'; const STATUS_MESSAGE_TIMEOUT = 15 * 1000; // 15s

export default function UploadForm({ refresh, darkMode }) { const [file, setFile] = useState(null); const [message, setMessage] = useState(''); const [progress, setProgress] = useState(0); const [isUploading, setIsUploading] = useState(false); const [estimatedTime, setEstimatedTime] = useState(null); const [uploadSpeed, setUploadSpeed] = useState(0); const [resumableState, setResumableState] = useState(null); const [showResumePrompt, setShowResumePrompt] = useState(false); const controllerRef = useRef(null); const fileInputRef = useRef(null); const lastUpdate = useRef({ time: 0, loaded: 0 });

// Load saved state on mount useEffect(() => { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const saved = JSON.parse(raw); if (Date.now() - saved.timestamp < UPLOAD_EXPIRY_TIME) { setResumableState(saved); setShowResumePrompt(true); // restore placeholder file const placeholder = new File([new ArrayBuffer(0)], saved.fileName, { type: saved.fileType }); Object.defineProperty(placeholder, 'size', { value: saved.fileSize }); setFile(placeholder); } else { localStorage.removeItem(STORAGE_KEY); } } }, []);

// Auto-hide messages useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), STATUS_MESSAGE_TIMEOUT); return () => clearTimeout(t); }, [message]);

// Helpers const formatBytes = (bytes) => { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(k)); return (bytes/Math.pow(k,i)).toFixed(2) + ' ' + sizes[i]; }; const formatTime = (sec) => { if (sec < 60) return ${Math.round(sec)}s; const m = Math.floor(sec/60); const s = Math.round(sec%60); return ${m}m ${s}s; };

const saveState = (fileObj, progressVal) => { const state = { fileName: fileObj.name, fileSize: fileObj.size, fileType: fileObj.type, progress: progressVal, timestamp: Date.now() }; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); };

const cleanupSave = () => { localStorage.removeItem(STORAGE_KEY); setShowResumePrompt(false); setResumableState(null); };

// Upload const onUpload = async (e) => { e && e.preventDefault(); const toUpload = fileInputRef.current?.files[0] || (resumableState && new File([new ArrayBuffer(0)], resumableState.fileName, { type: resumableState.fileType })); if (!toUpload) { setMessage('Select a file'); return; }

const formData = new FormData();
formData.append('file', toUpload);

const ctrl = new AbortController(); controllerRef.current = ctrl;
try {
  setIsUploading(true);
  setProgress(resumableState?.progress || 0);
  setEstimatedTime('Calculating...');
  setUploadSpeed(0);

  await axios.post(
    `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
    formData,
    {
      signal: ctrl.signal,
      onUploadProgress: (evt) => {
        const percent = Math.round((evt.loaded*100)/evt.total);
        setProgress(percent);
        const now = Date.now();
        if (now - lastUpdate.current.time > 500) {
          const loadedDiff = evt.loaded - lastUpdate.current.loaded;
          const speed = loadedDiff/((now-lastUpdate.current.time)/1000);
          setUploadSpeed(speed);
          lastUpdate.current = { time: now, loaded: evt.loaded };
          const rem = (evt.total-evt.loaded)/speed;
          setEstimatedTime(formatTime(rem));
          saveState(toUpload, percent);
        }
        if (percent === 100) setEstimatedTime('Finalizing...');
      }
    }
  );
  cleanupSave();
  setMessage('Upload successful');
  setFile(null);
  refresh();
} catch (err) {
  if (axios.isCancel(err)) setMessage('Upload cancelled');
  else { setMessage('Upload failed'); saveState(toUpload, progress); setShowResumePrompt(true); }
} finally {
  setIsUploading(false);
  controllerRef.current = null;
}

};

const onCancel = () => { controllerRef.current?.abort(); cleanupSave(); setFile(null); setIsUploading(false); };

const onResume = () => { cleanupSave(); fileInputRef.current.value = null; onUpload(); };

return ( <form onSubmit={onUpload} className={p-6 rounded-xl shadow-md ${darkMode?'bg-gray-800':'bg-white'}}>
<h3 className={${darkMode?'text-white':'text-gray-800'} text-xl font-medium mb-4 text-center}>Upload File</h3>

{showResumePrompt && resumableState && (
    <div className={`${darkMode?'bg-blue-900/30 border-blue-700':'bg-blue-100 border-blue-300'} p-5 rounded-lg border mb-6`}>          
      <p className={`${darkMode?'text-blue-400':'text-blue-700'} mb-2`}>Resume "{resumableState.fileName}" at {resumableState.progress}%?</p>
      <div className="flex gap-4">
        <button type="button" onClick={onResume} className="flex-1 py-2 rounded-md bg-blue-600 text-white">Resume</button>
        <button type="button" onClick={cleanupSave} className="flex-1 py-2 rounded-md ${darkMode?'bg-gray-700 text-white':'bg-gray-200 text-gray-700'}">Cancel</button>
      </div>
    </div>
  )}

  {!file && !isUploading && !showResumePrompt && (
    <label htmlFor="fileInput" className={`${darkMode?'bg-gray-700 border-gray-600':'bg-gray-100 border-gray-300'} border-2 border-dashed rounded-lg w-full py-8 mb-5 flex flex-col items-center justify-center cursor-pointer`}>          
      <span className={`${darkMode?'text-gray-300':'text-gray-600'} mb-2`}>Drag & drop or click to browse</span>
    </label>
  )}
  <input ref={fileInputRef} id="fileInput" type="file" className="hidden" onChange={e=>{ setFile(e.target.files[0]); }} />

  {file && !isUploading && !showResumePrompt && (
    <div className="flex gap-3 mb-4">
      <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-md">Upload</button>
      <button type="button" onClick={()=>setFile(null)} className="py-2 bg-gray-200 text-gray-700 rounded-md">Remove</button>
    </div>
  )}

  {isUploading && (
    <>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div className="h-full transition-width duration-200 bg-blue-600" style={{ width: `${progress}%` }} />
      </div>
      <div className="space-y-1 mb-4">
        <p className={`${darkMode?'text-gray-200':'text-gray-700'}`}>Progress: {progress}%</p>
        <p className={`${darkMode?'text-gray-300':'text-gray-600'}`}>Speed: {uploadSpeed?formatBytes(uploadSpeed)+'/s':'Calculating...'}</p>
        <p className={`${darkMode?'text-gray-300':'text-gray-600'}`}>ETA: {estimatedTime}</p>
      </div>
      <button type="button" onClick={onCancel} className="w-full py-2 bg-red-600 text-white rounded-md">Cancel Upload</button>
    </>
  )}

  {message && <p className={`${darkMode?'text-green-400':'text-green-600'} mt-4 text-center`}>{message}</p>}
</form>

); }

  
