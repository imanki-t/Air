# 🚀 Airstream Backend - Quick Start Guide

Get your secure cloud storage backend running in 5 minutes!

## ✅ Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js 14+ installed
- [ ] MongoDB installed and running
- [ ] Gmail account (or other SMTP service)
- [ ] Google Cloud account

## 📦 Step 1: Install Dependencies

```bash
npm install
```

## ⚙️ Step 2: Configure Environment

### 2.1 Create Environment File
```bash
cp .env.example .env
```

### 2.2 Set Up MongoDB

**Option A: Local MongoDB**
```env
MONGO_URI=mongodb://localhost:27017/airstream
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Add to `.env`:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/airstream
```

### 2.3 Configure Email (Gmail)

1. **Enable 2-Step Verification**
   - Go to Google Account → Security
   - Turn on 2-Step Verification

2. **Generate App Password**
   - Google Account → Security → 2-Step Verification
   - Scroll down to "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password

3. **Add to .env**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### 2.4 Set Up Google Drive API

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Click "New Project"
   - Name it "Airstream Storage"

2. **Enable Drive API**
   - In your project, go to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Name it "airstream-service"
   - Click "Done"

4. **Generate Key**
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON"
   - Save the file (it will download automatically)

5. **Add Credentials to .env**
   - Open the downloaded JSON file
   - Copy the ENTIRE content (it's one long line)
   - Paste it in your `.env` file:
```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project",...}
```

6. **Share Drive Folder**
   - Create a folder in your Google Drive named "Airstream-Files"
   - Right-click the folder → Share
   - Add the service account email (from the JSON file, looks like: `airstream-service@project-id.iam.gserviceaccount.com`)
   - Give it "Editor" access

### 2.5 Configure URLs and Secrets

```env
# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# JWT Secrets (CHANGE THESE!)
JWT_SECRET=generate-a-random-32-character-string-here
JWT_REFRESH_SECRET=generate-another-random-32-character-string
```

**Generate random secrets using:**
```bash
# On Linux/Mac
openssl rand -base64 32

# Or use this Node.js one-liner
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🗄️ Step 3: Run Migration (For Existing Data)

If you're upgrading from v1.0:
```bash
node scripts/migrate.js
```

Follow the prompts to:
- Create your admin account
- Migrate existing files
- Set up default folders

## 🚀 Step 4: Start the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ Connected to MongoDB
✅ Google Drive folder initialized
🚀 Server running on port 5000
```

## ✨ Step 5: Test the API

### 5.1 Create First User

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "SecurePass123"
  }'
```

### 5.2 Check Email

You should receive a verification email. Click the link or:

```bash
# Replace TOKEN with the one from email
curl http://localhost:5000/api/auth/verify-email/YOUR_TOKEN
```

### 5.3 Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "admin@example.com",
    "password": "SecurePass123"
  }'
```

You'll receive:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {...}
}
```

### 5.4 Access Protected Endpoint

```bash
# Replace YOUR_TOKEN with the accessToken from login
curl -X GET http://localhost:5000/api/folders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎉 Success!

Your backend is now running! You should see 4 default folders created.

## 🔧 Common Issues

### Issue: Email not sending
**Solution:**
1. Check your Gmail app password is correct
2. Make sure 2-Step Verification is enabled
3. Try using a different SMTP provider (SendGrid, Mailgun)

### Issue: MongoDB connection failed
**Solution:**
1. Ensure MongoDB is running: `mongod`
2. Check connection string format
3. For MongoDB Atlas, whitelist your IP address

### Issue: Google Drive upload failed
**Solution:**
1. Verify service account email is correct
2. Check the Drive folder is shared with service account
3. Ensure Drive API is enabled in Google Cloud Console

### Issue: "Invalid token" error
**Solution:**
1. Make sure you copied the full accessToken
2. Tokens expire in 15 minutes - login again
3. Use the refresh token endpoint to get a new access token

## 📚 Next Steps

1. **Configure Frontend**: Update frontend `.env` with backend URL
2. **Add More Users**: Use `/api/auth/signup` endpoint
3. **Create Folders**: Use `/api/folders` endpoint
4. **Upload Files**: Use `/api/files/upload` endpoint
5. **Set Up Production**: Deploy to your preferred hosting (Heroku, DigitalOcean, AWS)

## 🛡️ Security Checklist for Production

Before deploying to production:
- [ ] Change all default secrets in `.env`
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Set proper CORS origin
- [ ] Use a secure SMTP service
- [ ] Set up monitoring and logging
- [ ] Configure regular backups
- [ ] Review rate limits

## 📖 Documentation

For more details, see:
- [Full README](README.md) - Complete documentation
- [API Reference](API.md) - All endpoints and examples
- [Migration Guide](MIGRATION.md) - Upgrading from v1.0

## 💡 Tips

1. **Development**: Use `npm run dev` for auto-restart
2. **Testing**: Use Postman or Thunder Client for API testing
3. **Debugging**: Check server logs for detailed error messages
4. **Email Testing**: Use [Mailtrap](https://mailtrap.io/) for email testing in development

## 🆘 Need Help?

- Check server logs for errors
- Review the README.md for detailed documentation
- Verify all environment variables are set correctly
- Ensure all prerequisites are installed

---

**Ready to build something amazing! 🚀**
