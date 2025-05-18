// config/drive.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Google Drive API configuration
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Initialize the Google Drive API client
const initDriveClient = () => {
  try {
    const auth = new google.auth.GoogleAuth({
      // Use the credentials file from Google Developer Console
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: SCOPES,
    });

    // Create a new drive client
    const drive = google.drive({
      version: 'v3',
      auth,
    });

    return { drive, auth };
  } catch (error) {
    console.error('Error initializing Google Drive client:', error.message);
    throw error;
  }
};

// Create folder in Google Drive if it doesn't exist
const initDriveFolder = async (drive) => {
  try {
    const folderName = process.env.DRIVE_FOLDER_NAME || 'Airstream-Files';
    
    // Check if folder exists
    const res = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (res.data.files.length > 0) {
      // Return existing folder ID
      return res.data.files[0].id;
    } else {
      // Create folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      
      const folder = await drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });
      
      return folder.data.id;
    }
  } catch (error) {
    console.error('Error initializing Google Drive folder:', error.message);
    throw error;
  }
};

module.exports = { initDriveClient, initDriveFolder };
