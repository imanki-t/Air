// utils/tokenCrypto.js
// Encrypt/decrypt long-lived secrets (Google Drive refresh tokens) before
// they touch MongoDB, so a leaked DB URI or backup doesn't hand over
// standing access to every user's Drive folder.
//
// Algorithm: AES-256-GCM (authenticated — tampering is detected on decrypt).
// Key: 32 random bytes, read once from process.env.DRIVE_TOKEN_ENCRYPTION_KEY,
//      base64-encoded. Never stored anywhere but the environment.
//
// Stored format: "v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>"
// The "v1:" prefix lets us recognise already-encrypted values (and skip
// double-encrypting) and gives room for a future key-rotation scheme.
//
// Required env var:
//   DRIVE_TOKEN_ENCRYPTION_KEY — 32 bytes, base64-encoded.
//   Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'v1';
const IV_LENGTH = 12; // recommended IV length for GCM

let cachedKey = null;

const getKey = () => {
  if (cachedKey) return cachedKey;

  const raw = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'DRIVE_TOKEN_ENCRYPTION_KEY is not set. Generate one with: ' +
      `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" ` +
      'and add it to your environment.'
    );
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `DRIVE_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  cachedKey = key;
  return cachedKey;
};

// True if the value is already in our "v1:iv:tag:ciphertext" format.
// Lets existing plaintext tokens (from before this change shipped) pass
// through decrypt() untouched — they get encrypted automatically the next
// time the user's tokens are refreshed and re-saved.
const isEncrypted = (value) =>
  typeof value === 'string' && value.startsWith(`${PREFIX}:`) && value.split(':').length === 4;

const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return plaintext;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [PREFIX, iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
};

const decrypt = (storedValue) => {
  if (storedValue === null || storedValue === undefined) return storedValue;

  // Legacy plaintext token stored before encryption was added — return as-is.
  if (!isEncrypted(storedValue)) return storedValue;

  const [, ivB64, authTagB64, ciphertextB64] = storedValue.split(':');
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
};

module.exports = { encrypt, decrypt, isEncrypted };
