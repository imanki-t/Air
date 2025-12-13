// scripts/migrate.js
/**
 * Migration script to update existing data to new auth system
 * Run this ONCE after updating to v2.0
 * 
 * Usage: node scripts/migrate.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Import models
const User = require('../models/User');
const Folder = require('../models/Folder');
const DriveMapping = require('../models/DriveMapping');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function createDefaultUser() {
  console.log('\n📝 Creating default user account...');
  console.log('You can create additional users through the signup endpoint.\n');

  const username = await question('Enter username: ');
  const email = await question('Enter email: ');
  const password = await question('Enter password (min 8 chars): ');

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    return null;
  }

  try {
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      console.log('⚠️  User already exists, using existing user...');
      return existingUser;
    }

    const user = new User({
      username,
      email,
      password,
      isEmailVerified: true // Auto-verify for migration
    });

    await user.save();
    console.log('✅ Default user created and verified');
    return user;
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    return null;
  }
}

async function createDefaultFolders(userId) {
  console.log('\n📁 Creating default folders...');

  const defaultFolders = [
    { name: 'Documents', color: '#3b82f6' },
    { name: 'Images', color: '#10b981' },
    { name: 'Videos', color: '#f59e0b' },
    { name: 'Music', color: '#8b5cf6' }
  ];

  for (const folderData of defaultFolders) {
    try {
      const existing = await Folder.findOne({
        user: userId,
        name: folderData.name
      });

      if (!existing) {
        await Folder.create({
          name: folderData.name,
          user: userId,
          isDefault: true,
          color: folderData.color
        });
        console.log(`  ✅ Created folder: ${folderData.name}`);
      } else {
        console.log(`  ⏭️  Folder already exists: ${folderData.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create folder ${folderData.name}:`, error.message);
    }
  }
}

async function migrateDriveMappings(userId) {
  console.log('\n🔄 Migrating existing file mappings...');

  try {
    // Get old collection name
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const oldCollection = collections.find(c => c.name === 'drive_mappings');

    if (!oldCollection) {
      console.log('  ℹ️  No existing drive_mappings collection found');
      return;
    }

    // Update all existing mappings to include userId
    const result = await db.collection('drive_mappings').updateMany(
      { userId: { $exists: false } },
      { $set: { userId: userId } }
    );

    console.log(`  ✅ Updated ${result.modifiedCount} file mappings with userId`);

    // Update folder statistics
    const folders = await Folder.find({ user: userId });
    for (const folder of folders) {
      await folder.updateStats();
    }
    console.log(`  ✅ Updated statistics for ${folders.length} folders`);

  } catch (error) {
    console.error('  ❌ Migration failed:', error.message);
  }
}

async function verifyMigration(userId) {
  console.log('\n🔍 Verifying migration...');

  try {
    const user = await User.findById(userId);
    console.log(`  ✅ User: ${user.username} (${user.email})`);

    const folderCount = await Folder.countDocuments({ user: userId });
    console.log(`  ✅ Folders: ${folderCount}`);

    const fileCount = await DriveMapping.countDocuments({ userId: userId });
    console.log(`  ✅ Files: ${fileCount}`);

    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('  ❌ Verification failed:', error.message);
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════╗
║                                        ║
║   Airstream v2.0 Migration Script     ║
║                                        ║
║   This will:                           ║
║   • Create a default user account      ║
║   • Create default folders             ║
║   • Migrate existing file mappings     ║
║                                        ║
║   ⚠️  Run this ONCE after upgrading    ║
║                                        ║
╚════════════════════════════════════════╝
`);

  const confirm = await question('\nDo you want to proceed? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ Migration cancelled');
    rl.close();
    process.exit(0);
  }

  await connectDB();

  // Step 1: Create default user
  const user = await createDefaultUser();
  if (!user) {
    console.log('\n❌ Cannot proceed without a user account');
    rl.close();
    process.exit(1);
  }

  // Step 2: Create default folders
  await createDefaultFolders(user._id);

  // Step 3: Migrate existing data
  await migrateDriveMappings(user._id);

  // Step 4: Verify migration
  await verifyMigration(user._id);

  console.log(`
╔════════════════════════════════════════╗
║                                        ║
║   🎉 Migration Complete!               ║
║                                        ║
║   Next steps:                          ║
║   1. Start the server: npm start       ║
║   2. Login with your credentials       ║
║   3. Additional users can signup       ║
║      through /api/auth/signup          ║
║                                        ║
║   Your access credentials:             ║
║   Email: ${user.email.padEnd(27)}║
║   (Use the password you entered)       ║
║                                        ║
╚════════════════════════════════════════╝
`);

  rl.close();
  await mongoose.connection.close();
  process.exit(0);
}

// Run migration
main().catch(error => {
  console.error('❌ Migration failed:', error);
  rl.close();
  process.exit(1);
});
