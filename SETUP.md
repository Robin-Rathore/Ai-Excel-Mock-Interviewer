# 🚀 Complete Setup Guide - AI Excel Mock Interviewer

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Google Gemini API Key** ([Get it here](https://makersuite.google.com/app/apikey))
- **Gmail Account** with App Password enabled
- **Code Editor** (VS Code recommended)
- **Modern Browser** (Chrome/Edge for best voice support)

## 🔧 Step-by-Step Installation

### **1. Clone or Download the Project**

\`\`\`bash

# If using Git

git clone <repository-url>
cd AiExcelMockInterviewer

# Or extract the downloaded ZIP file

\`\`\`

### **2. Backend Setup**

\`\`\`bash

# Navigate to backend directory

cd backend

# Install dependencies

npm install

# Create environment file

cp .env.example .env
\`\`\`

### **3. Configure Environment Variables**

Edit the `.env` file in the backend directory:

\`\`\`env

# AI Configuration

GEMINI_API_KEY=your_actual_gemini_api_key_here

# Email Configuration (Gmail)

EMAIL=your_gmail_address@gmail.com
PASSWORD=your_gmail_app_password_here

# HR Authentication

HR_EMAIL=hr@yourcompany.com
HR_PASSWORD=your_secure_hr_password

# Server Configuration

PORT=3001
NODE_ENV=development
BASE_URL=http://localhost:3000
\`\`\`

### **4. Gmail App Password Setup**

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Step Verification if not already enabled
4. Go to **App passwords**
5. Generate a new app password for "Mail"
6. Use this 16-character password in your `.env` file

### **5. Start the Backend Server**

\`\`\`bash

# In the backend directory

npm run dev
\`\`\`

You should see:
\`\`\`
🚀 Excel Interview AI Server running on port 3001
🏥 Health check: http://localhost:3001/health
🔑 Gemini API Key: ✅ Set
📧 Email configured: ✅ Set
\`\`\`

### **6. Frontend Setup**

Open a new terminal window:

\`\`\`bash

# Navigate to frontend directory

cd frontend

# Install dependencies

npm install

# Start the development server

npm run dev
\`\`\`

You should see:
\`\`\`
Local: http://localhost:3000/
Network: http://192.168.x.x:3000/
\`\`\`

### **7. Verify Installation**

1. **Open your browser** and go to `http://localhost:3000`
2. **Check the landing page** loads correctly
3. **Test HR Dashboard** by clicking "HR Dashboard"
4. **Verify backend health** by visiting `http://localhost:3001/health`

## 🎯 Testing the System

### **HR Dashboard Test**

1. Go to `http://localhost:3000/hr`
2. Login with:
   - Email: The HR_EMAIL from your .env file
   - Password: The HR_PASSWORD from your .env file
3. Try sending a test invitation to your own email

### **Interview Test**

1. Check your email for the interview invitation
2. Click the interview link
3. Upload a sample resume (PDF or DOCX)
4. Test the voice interview functionality

## 🔍 Common Issues & Solutions

### **Backend Issues**

**❌ "Gemini API Key not found"**
\`\`\`bash

# Solution: Check your .env file

cat backend/.env | grep GEMINI_API_KEY
\`\`\`

**❌ "Email authentication failed"**
\`\`\`bash

# Solution: Verify Gmail app password

# Make sure you're using the 16-character app password, not your regular Gmail password

\`\`\`

**❌ "Port 3001 already in use"**
\`\`\`bash

# Solution: Kill the process or change port

lsof -ti:3001 | xargs kill -9

# Or change PORT in .env file

\`\`\`

### **Frontend Issues**

**❌ "Cannot connect to backend"**
\`\`\`bash

# Solution: Ensure backend is running on port 3001

curl http://localhost:3001/health
\`\`\`

**❌ "Voice not working"**
\`\`\`bash

# Solution: Use Chrome/Edge browser and allow microphone permissions

\`\`\`

### **Voice Issues**

**❌ "Microphone not detected"**

- Grant microphone permissions in browser
- Check browser settings → Privacy → Microphone
- Try refreshing the page

**❌ "AI voice not speaking"**

- Ensure speakers/headphones are working
- Check browser's speech synthesis support
- Try a different browser (Chrome recommended)

## 🎤 Voice Setup Tips

### **For Best Voice Experience:**

1. **Use Chrome or Edge** browser
2. **Quiet environment** - minimize background noise
3. **Good microphone** - built-in laptop mic works fine
4. **Stable internet** - for real-time processing
5. **Allow permissions** - microphone and speaker access

### **Voice Settings:**

The system automatically:

- Selects Indian English female voice when available
- Adjusts speech rate, pitch, and volume for clarity
- Detects silence after 3 seconds to stop recording
- Provides real-time audio level feedback

## 📊 System Architecture

\`\`\`
┌─────────────────┐ ┌─────────────────┐
│ Frontend │ │ Backend │
│ (React) │◄──►│ (Express) │
│ Port 3000 │ │ Port 3001 │
└─────────────────┘ └─────────────────┘
│ │
│ │
┌─────────┐ ┌─────────┐
│ Browser │ │ Gemini │
│ Speech │ │ AI │
│ API │ │ API │
└─────────┘ └─────────┘
\`\`\`

## 🚀 Production Deployment

### **Environment Variables for Production:**

\`\`\`env
NODE_ENV=production
BASE_URL=https://your-domain.com
PORT=3001

# Use secure passwords in production

HR_PASSWORD=very_secure_password_here

# Consider using a dedicated email service

EMAIL=noreply@yourcompany.com
\`\`\`

### **Build Commands:**

\`\`\`bash

# Backend

cd backend
npm run build
npm start

# Frontend

cd frontend
npm run build
npm run preview
\`\`\`

## 📞 Support

If you encounter any issues:

1. **Check the console logs** in both frontend and backend
2. **Verify all environment variables** are set correctly
3. **Test API connectivity** using the health endpoint
4. **Check browser permissions** for microphone access
5. **Try a different browser** if voice features don't work

## 🎯 Next Steps

Once everything is working:

1. **Customize the questions** in `backend/src/agent/tools.ts`
2. **Modify the scoring criteria** to match your requirements
3. **Update the email templates** for your branding
4. **Add more assessment categories** as needed
5. **Configure production deployment** settings

---

**🎉 Congratulations! Your AI Excel Mock Interviewer is now ready to conduct professional voice-based assessments!**
\`\`\`

Perfect! I've now completed the AI Excel Mock Interviewer project with all the essential files and comprehensive setup instructions. Here's what I've added:

## 🎯 **Complete Project Structure:**

### **✅ Backend Files:**

- **Enhanced agent.ts** - Complete LangGraph workflow
- **package.json** - All required dependencies
- **tsconfig.json** - TypeScript configuration
- **.env.example** - Environment template

### **✅ Frontend Files:**

- **package.json** - React dependencies
- **tsconfig.json** - Frontend TypeScript config
- **vite.config.ts** - Development server configuration

### **✅ Documentation:**

- **README.md** - Comprehensive project documentation
- **SETUP.md** - Step-by-step installation guide

## 🚀 **Key Features Implemented:**

1. **Professional Voice Processing** - Like your AI agent examples
2. **LangChain/LangGraph Architecture** - Complete workflow system
3. **Real-time Audio Monitoring** - Visual feedback and silence detection
4. **Indian English TTS/STT** - Optimized for local accents
5. **Professional Scoring System** - Strict evaluation criteria
6. **Comprehensive Reporting** - PDF generation and email delivery
7. **HR Management Dashboard** - Complete admin interface

## 🎤 **Voice Technology Stack:**

- **Enhanced STT** - Google Gemini AI with confidence scoring
- **Professional TTS** - Indian English female voice selection
- **Real-time Audio** - Level monitoring and silence detection
- **Quality Assurance** - Audio validation and error handling

## 📋 **Ready to Use:**

The system is now complete and ready for deployment. Users can:

1. **Install dependencies** with simple npm commands
2. **Configure environment** with their API keys
3. **Start both servers** and begin conducting interviews
4. **Send invitations** to candidates via HR dashboard
5. **Conduct voice interviews** with real-time processing
6. **Generate reports** automatically with email delivery

This provides a professional-grade Excel skills assessment platform that matches the quality and functionality of your previous AI agent implementations! 🎯
