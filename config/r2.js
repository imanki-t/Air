// config/r2.js
const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 is S3-compatible. The endpoint format is always:
// https://<ACCOUNT_ID>.r2.cloudflarestorage.com
const initR2Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 credentials. Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are set in .env'
    );
  }

  const client = new S3Client({
    region: 'auto',  // R2 uses 'auto' as the region
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return client;
};

module.exports = { initR2Client };
