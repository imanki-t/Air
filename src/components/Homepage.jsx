import React, { useState, useEffect } from 'react';

const Homepage = ({ isLoggedIn }) => {
  const [darkMode, setDarkMode] = useState(true);
  
  // Interactive Code Terminal State
  const [activeCodeTab, setActiveCodeTab] = useState('sdk');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Resumable Upload Simulator State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(65);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState('24.2 MB/s');

  // Vault Sandbox State
  const [activeVaultCategory, setActiveVaultCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    // Sync with root class for dark mode
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle Upload Simulator animation loop
  useEffect(() => {
    let interval = null;
    if (isUploading && !isPaused) {
      interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            setIsUploading(false);
            return 100;
          }
          return prev + 5;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isUploading, isPaused]);

  const handleDashboardClick = () => {
    window.location.href = isLoggedIn ? '/dashboard' : '/signup';
  };

  const handleCopyCode = (codeText) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const codeSnippets = {
    sdk: `import { AirClient } from '@airstream/sdk';

const air = new AirClient({
  endpoint: 'https://api.airstream.cloud',
  token: process.env.AIR_API_KEY
});

// Resumable multi-chunk upload with automatic retry
const file = document.getElementById('file-input').files[0];
const upload = air.createUpload(file, {
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  encryption: 'AES-256-GCM',
  onProgress: (percent, speed) => {
    console.log(\`Uploaded \${percent}% at \${speed}\`);
  }
});

await upload.start();`,
    cli: `# Install Airstream CLI globally
npm install -g airstream-cli

# Authenticate your local workstation
air auth login --key=air_live_99f28a7c0

# Sync local directory to cloud vault with chunking
air sync ./my-projects --vault=default --encrypt --watch

# Output:
# ✓ Connection established (ping 14ms)
# ➔ Uploading 4 files [====================] 100% (34.2 MB/s)`,
    api: `POST /api/files/upload-chunk HTTP/1.1
Host: api.airstream.cloud
Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="chunkIndex"
2
------WebKitFormBoundary
Content-Disposition: form-data; name="totalChunks"
8
------WebKitFormBoundary
Content-Disposition: form-data; name="fileHash"
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
------WebKitFormBoundary--`,
    pipeline: `// Cloudflare R2 / AWS S3 Direct Multi-part Pipeline
const prepareUploadPipeline = async (fileMetadata) => {
  const { uploadId, key, urls } = await air.initiateDirectPipeline({
    filename: fileMetadata.name,
    size: fileMetadata.size,
    mimeType: fileMetadata.type,
    chunksCount: Math.ceil(fileMetadata.size / CHUNK_SIZE)
  });

  return new ResumableStream({ uploadId, key, urls });
};`
  };

  const sampleVaultFiles = [
    { name: 'Financial_Report_Q3_2026.pdf', size: '4.8 MB', type: 'doc', date: '2 mins ago', status: 'Encrypted' },
    { name: 'Project_Airstream_Demo.mp4', size: '142.5 MB', type: 'media', date: '1 hour ago', status: 'Stream Ready' },
    { name: 'Architecture_Diagram_V2.png', size: '1.2 MB', type: 'media', date: '3 hours ago', status: 'Synced' },
    { name: 'Database_Backup_Incremental.zip', size: '850 MB', type: 'archive', date: 'Yesterday', status: 'Encrypted' },
    { name: 'Meeting_Notes_Aug2026.md', size: '12 KB', type: 'note', date: '3 days ago', status: 'Published' }
  ];

  const filteredVaultFiles = sampleVaultFiles.filter(file => {
    const matchesCategory = activeVaultCategory === 'all' || 
      (activeVaultCategory === 'doc' && file.type === 'doc') ||
      (activeVaultCategory === 'media' && file.type === 'media') ||
      (activeVaultCategory === 'notes' && file.type === 'note');
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const faqs = [
    {
      q: "What makes Airstream different from traditional cloud storage?",
      a: "Airstream is a self-hostable, developer-friendly cloud storage vault designed for performance. It features built-in chunked resumable uploads, zero-knowledge AES-256 encryption, WebSocket real-time sync, and direct compatibility with Cloudflare R2 and AWS S3."
    },
    {
      q: "How do resumable uploads work when network connection drops?",
      a: "Airstream splits files into cryptographic chunks. If your internet disconnects mid-upload, progress is saved in local storage. When you reconnect or refresh the page, Airstream resumes from the exact chunk without starting over."
    },
    {
      q: "Can I host Airstream on my own server or Cloudflare R2?",
      a: "Yes! Airstream is completely open-source. You can run the Node.js/Express backend on any VPS, Docker container, or cloud host, connected to your custom S3-compatible bucket or Cloudflare R2 storage."
    },
    {
      q: "Is there built-in support for notes and document previewing?",
      a: "Absolute! Airstream includes a real-time markdown notes workspace, instant audio/video player stream preview, PDF viewer, and zip archive inspecting right within your dashboard."
    }
  ];

  return (
    <div className={`min-h-screen relative overflow-hidden font-sans transition-colors duration-500 selection:bg-blue-500 selection:text-white ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Dynamic Background Mesh & Spotlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] glow-spotlight-blue blur-3xl"></div>
        <div className="absolute top-[40%] right-0 w-[600px] h-[600px] glow-spotlight-purple blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-[800px] h-[500px] bg-gradient-to-tr from-blue-900/10 via-purple-900/10 to-transparent blur-3xl"></div>
      </div>

      {/* Navigation Header */}
      <header className={`sticky top-0 z-50 transition-colors duration-300 border-b backdrop-blur-xl ${
        darkMode ? 'bg-slate-950/80 border-slate-800/80 text-white' : 'bg-white/80 border-slate-200 text-slate-900'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-blue-500/25">
              A
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 dark:from-white dark:to-slate-300">
                AIRSTREAM
              </span>
              <span className="text-[10px] tracking-widest uppercase font-mono text-blue-400 font-semibold -mt-1">
                Cloud Vault v1.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#code-demo" className="hover:text-blue-400 transition-colors">SDK & API</a>
            <a href="#architecture" className="hover:text-blue-400 transition-colors">Architecture</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a>
          </nav>

          {/* Action Header Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition-all duration-200 ${
                darkMode
                  ? 'bg-slate-900 border-slate-700/80 text-yellow-400 hover:border-slate-500'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 shadow-sm'
              }`}
              title="Toggle theme"
            >
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleDashboardClick}
              className="relative group inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95"
            >
              <span>{isLoggedIn ? 'Open Dashboard' : 'Get Started Free'}</span>
              <svg className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold tracking-wide mb-8 backdrop-blur-md animate-pulse">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span>Airstream v1.0 Live</span>
          <span className="text-slate-400 font-normal">|</span>
          <span className="text-slate-300">Fast Resumable File Vault</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
          <span className={darkMode ? 'text-white' : 'text-slate-900'}>
            The Open-Source
          </span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
            Resumable Cloud Storage
          </span>
        </h1>

        <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-400 font-normal leading-relaxed mb-10">
          Store, sync, and stream your files seamlessly with chunked resumable uploads, zero-knowledge AES encryption, and Cloudflare R2 / AWS S3 compatibility. Lightweight & blazing fast.
        </p>

        {/* Hero CTA Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={handleDashboardClick}
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Launch Cloud Vault
          </button>

          <a
            href="https://github.com/imanki-t/Air"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold border backdrop-blur-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
              darkMode
                ? 'bg-slate-900/80 border-slate-700/80 text-white hover:bg-slate-800 hover:border-slate-600'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Star on GitHub</span>
          </a>
        </div>

        {/* Live Interactive Hero Terminal Code Switcher (REPLACES SCREENSHOTS) */}
        <div id="code-demo" className="mt-12 text-left max-w-5xl mx-auto rounded-2xl border border-slate-800/80 bg-slate-950/90 shadow-2xl shadow-blue-500/10 backdrop-blur-2xl overflow-hidden font-mono text-sm">
          {/* Terminal Top Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              <span className="text-xs text-slate-500 font-sans font-medium ml-2 hidden sm:inline">airstream-live-preview.js</span>
            </div>

            {/* Code Selector Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-sans">
              {[
                { id: 'sdk', label: 'JavaScript SDK' },
                { id: 'cli', label: 'CLI Terminal' },
                { id: 'api', label: 'REST API' },
                { id: 'pipeline', label: 'R2 Pipeline' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCodeTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                    activeCodeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Copy Code Button */}
            <button
              onClick={() => handleCopyCode(codeSnippets[activeCodeTab])}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              {copiedCode ? (
                <span className="text-green-400 font-semibold">✓ Copied</span>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Terminal Main Code View */}
          <div className="p-6 overflow-x-auto text-slate-200 leading-relaxed bg-slate-950/70">
            <pre className="text-xs sm:text-sm">
              <code>{codeSnippets[activeCodeTab]}</code>
            </pre>
          </div>

          {/* Terminal Output Log Footer */}
          <div className="px-6 py-3 bg-slate-900/60 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Status: <strong className="text-slate-200 font-mono">Live WebSocket Sync (0ms delay)</strong></span>
            </div>
            <span className="text-slate-500 hidden sm:inline">Zero Image Payload • Pure Code Preview</span>
          </div>
        </div>
      </section>

      {/* Main Interactive Feature Section (REPLACES FEATURE SCREENSHOTS) */}
      <section id="features" className={`py-20 px-4 sm:px-6 lg:px-8 border-t border-b ${
        darkMode ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-200 bg-slate-100/60'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">
              Interactive Product Demonstrators
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Engineered for Speed, Reliability & Simplicity
            </h3>
            <p className="mt-4 text-slate-400 text-base sm:text-lg">
              Explore live previews of core engine capabilities. Built to load instantly without heavy screenshot assets.
            </p>
          </div>

          {/* 3 Main Interactive Feature Previews Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Feature 1: Resumable Upload Engine (Replaces feature1.jpg) */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              darkMode ? 'bg-slate-900/70 border-slate-800/80 hover:border-blue-500/40 shadow-xl' : 'bg-white border-slate-200 shadow-md'
            }`}>
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-2">Chunked Resumable Uploads</h4>
                <p className="text-sm text-slate-400 mb-6">
                  Splits files into micro-chunks. If network drops mid-way, upload automatically resumes without restarting.
                </p>
              </div>

              {/* Interactive Upload Component Sandbox */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                <div className="flex items-center justify-between mb-3 text-slate-300 font-sans font-semibold">
                  <span className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    <span>Video_4K_Render.mov</span>
                  </span>
                  <span className="text-blue-400 font-mono">{uploadProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-4">
                  <span>Speed: <strong className="text-slate-200">{uploadSpeed}</strong></span>
                  <span>Chunks: <strong className="text-slate-200">{Math.floor((uploadProgress / 100) * 8)} / 8</strong></span>
                </div>

                {/* Simulation Control Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (uploadProgress >= 100) setUploadProgress(0);
                      setIsUploading(!isUploading);
                      setIsPaused(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold transition-colors"
                  >
                    {isUploading ? 'Stop' : uploadProgress >= 100 ? 'Restart Demo' : 'Start Upload'}
                  </button>
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    disabled={!isUploading}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors font-sans"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature 2: Encrypted Storage Vault & Notes Explorer (Replaces feature2.jpg) */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              darkMode ? 'bg-slate-900/70 border-slate-800/80 hover:border-purple-500/40 shadow-xl' : 'bg-white border-slate-200 shadow-md'
            }`}>
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-2">Encrypted Vault & Notes</h4>
                <p className="text-sm text-slate-400 mb-6">
                  Zero-trust security. Store documents, media, and integrated markdown notes in an encrypted personal dashboard.
                </p>
              </div>

              {/* Interactive Storage Vault Explorer Widget */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                {/* Search Bar Input */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vault files..."
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <svg className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filter Tabs */}
                <div className="flex space-x-1 mb-3 text-[11px]">
                  {['all', 'doc', 'media', 'notes'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveVaultCategory(cat)}
                      className={`px-2 py-0.5 rounded capitalize ${
                        activeVaultCategory === cat ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* File List Items */}
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {filteredVaultFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800/60 transition-colors">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-purple-400 font-bold">📄</span>
                        <span className="truncate text-slate-200">{file.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">
                        {file.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 3: Real-Time Sync & WebSocket Gateway (Replaces feature3.jpg) */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              darkMode ? 'bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/40 shadow-xl' : 'bg-white border-slate-200 shadow-md'
            }`}>
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-2">Real-Time Sync Engine</h4>
                <p className="text-sm text-slate-400 mb-6">
                  Powered by Socket.io. Instant state sync across your mobile, browser, and desktop clients without manual refresh.
                </p>
              </div>

              {/* Interactive Network Graph Widget */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono relative overflow-hidden">
                <div className="flex items-center justify-around py-4 relative z-10">
                  {/* Client Node */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 shadow-md">
                      💻
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 font-sans">Browser Client</span>
                  </div>

                  {/* Pulsing Sync Line */}
                  <div className="flex-1 px-2 flex items-center justify-center relative">
                    <div className="w-full h-0.5 bg-slate-800"></div>
                    <div className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                  </div>

                  {/* Cloud Node */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-md">
                      ☁️
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 font-sans">R2 Storage Node</span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-sans">
                  <span>Latency: <strong className="text-emerald-400 font-mono">14ms</strong></span>
                  <span>Sync: <strong className="text-slate-200">Active</strong></span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Technical Bento Grid Architecture Section */}
      <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">
            System Architecture
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Built for Modern Developers & Storage DIY
          </h3>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            High throughput file pipelines combined with lightweight node controllers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-6 rounded-2xl border">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
              Cloudflare R2 & AWS S3
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Direct S3 API integration allowing zero egress fees with Cloudflare R2 or standard AWS bucket hosting.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 rounded-2xl border">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center">
              <span className="w-2 h-2 rounded-full bg-indigo-400 mr-2"></span>
              Zero-Trust Security
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              JWT authentication with HTTP-Only cookie verification and bcrypt password protection for custom vaults.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 rounded-2xl border">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center">
              <span className="w-2 h-2 rounded-full bg-purple-400 mr-2"></span>
              Integrated Notes Suite
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Write, store, and organize markdown notes alongside your cloud files without relying on external apps.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-card p-6 rounded-2xl border">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
              In-Browser Audio & Media Player
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Stream music, podcasts, and videos directly inside your browser with custom HTML5 audio playback.
            </p>
          </div>

          {/* Card 5 */}
          <div className="glass-card p-6 rounded-2xl border">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center">
              <span className="w-2 h-2 rounded-full bg-pink-400 mr-2"></span>
              Microsecond Zip Extraction
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Inspect and extract zip archive contents on-the-fly using node archiver services.
            </p>
          </div>

          {/* Card 6 */}
          <div className="glass-card p-6 rounded-2xl border">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center">
              <span className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></span>
              Self-Hostable & Docker Ready
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Single command setup. Run locally or deploy anywhere with Node.js & Vite environment variables.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section id="faq" className={`py-20 px-4 sm:px-6 lg:px-8 border-t ${
        darkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-white'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">
              Frequently Asked Questions
            </h2>
            <h3 className="text-3xl font-extrabold">Everything You Need to Know</h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  darkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between font-semibold text-base sm:text-lg focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 text-blue-400 ${
                      openFaqIndex === idx ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaqIndex === idx && (
                  <div className="px-6 pb-6 text-sm sm:text-base text-slate-400 leading-relaxed border-t border-slate-800/40 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10">
        <div className="p-10 sm:p-16 rounded-3xl border border-blue-500/20 bg-gradient-to-b from-blue-950/40 via-slate-900/60 to-purple-950/40 backdrop-blur-2xl relative overflow-hidden shadow-2xl shadow-blue-500/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-6">
              Ready to Upgrade Your Cloud Vault?
            </h2>
            <p className="text-slate-300 text-base sm:text-lg mb-8">
              Experience fast, resumable, zero-image-payload storage today. Completely open-source and customizable.
            </p>
            <button
              onClick={handleDashboardClick}
              className="px-10 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
            >
              Access Dashboard Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-4 sm:px-6 lg:px-8 border-t ${
        darkMode ? 'border-slate-800/80 bg-slate-950 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center">
              A
            </div>
            <span className="font-bold text-slate-200 tracking-wider">AIRSTREAM</span>
            <span className="text-xs text-slate-500">Cloud Storage DIY</span>
          </div>

          <div className="flex space-x-6 text-xs">
            <a href="https://github.com/imanki-t/Air" target="_blank" rel="noreferrer" className="hover:text-blue-400">GitHub Repository</a>
            <a href="#features" className="hover:text-blue-400">Features</a>
            <a href="#code-demo" className="hover:text-blue-400">API Documentation</a>
          </div>

          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} Airstream. MIT Licensed.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Homepage;
