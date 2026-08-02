// Modified fileStore.js for better ID handling

const DB_NAME = 'UploadResumeDB';
const STORE_NAME = 'files';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveFile(id, file) {
  // Ensure we're storing a clean ID without any special characters that might cause issues
  const cleanId = typeof id === 'string' ? sanitizeId(id) : id;
  
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, cleanId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFile(id) {
  // Ensure we're looking up with a clean ID
  const cleanId = typeof id === 'string' ? sanitizeId(id) : id;
  
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(cleanId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFile(id) {
  // Ensure we're deleting with a clean ID
  const cleanId = typeof id === 'string' ? sanitizeId(id) : id;
  
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(cleanId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listFiles() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const files = [];
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        files.push({ id: cursor.key, file: cursor.value });
        cursor.continue();
      } else {
        resolve(files);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Helper function to ensure file IDs are properly formatted
 * - If the ID is a MongoDB ObjectId, keep it as is
 * - If it's a filename, ensure it's a valid key for IndexedDB
 */
function sanitizeId(id) {
  // Check if it's already a MongoDB ObjectId (24 hex chars)
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return id;
  }
  
  // For filenames or other non-MongoDB IDs, ensure they're valid for IndexedDB
  // Replace characters that might cause issues in IndexedDB keys
  return id.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

/**
 * Helper function to get the backend ID (MongoDB ObjectId)
 * from the frontend file object
 */
export function getBackendId(fileObject) {
  // If the file has a MongoDB ID stored, use that
  if (fileObject && fileObject.mongoId) {
    return fileObject.mongoId;
  }
  
  // Otherwise, fall back to the filename or original ID
  return fileObject ? (fileObject.name || fileObject.id) : null;
}
