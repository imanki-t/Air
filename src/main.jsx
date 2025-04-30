 import React from 'react'
 import ReactDOM from 'react-dom/client'
 import App from './App'
 import './index.css'
 // Import BrowserRouter instead of HashRouter
 import { BrowserRouter } from 'react-router-dom' // Changed 

 ReactDOM.createRoot(document.getElementById('root')).render(
   <React.StrictMode>
     {/* Use BrowserRouter */}
     <BrowserRouter> {/* Changed */}
       <App />
     </BrowserRouter>
   </React.StrictMode>
 ) 
