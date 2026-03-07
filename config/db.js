// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // TTL indexes: MongoDB automatically deletes documents once their expiresAt
    // timestamp is reached. createIndex is idempotent — safe on every startup.
    await mongoose.connection.collection('refresh_tokens').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'refresh_tokens_ttl' }
    );
    // export_tokens already expire after 72 h but were never auto-deleted.
    await mongoose.connection.collection('export_tokens').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'export_tokens_ttl' }
    );
    console.log('TTL indexes ensured');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
