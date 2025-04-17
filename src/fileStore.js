const DB_NAME = 'UploadResumeDB';
const STORE_NAME = 'files';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
  });
}

export async function saveFile(id, file) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(file, id);
  return tx.complete;
}

export async function getFile(id) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  return tx.objectStore(STORE_NAME).get(id);
}

export async function deleteFile(id) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return tx.complete;
}
