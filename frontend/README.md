# AI Excel Mock Interviewer - Professional Voice-to-Voice Edition

A comprehensive AI-powered Excel skills assessment platform that conducts **professional voice-to-voice interviews** with Indian English support, accurate speech analysis, and real-world evaluation standards.

## 🎯 Professional Features

### **🇮🇳 Indian English Voice Support**

- AI speaks in clear Indian English with female voice
- Understands Indian accents and local expressions
- Natural conversation flow with cultural context
- Professional interview tone and pace

### **🎤 Advanced Voice Analysis**

- Accurate speech-to-text using Google Gemini AI
- Every word analyzed for technical accuracy
- Honest responses like "I don't know" properly scored (can receive 0 points)
- No time pressure - speak as long as needed
- Auto-stop after 3 seconds of silence

### **📊 Strict Professional Scoring**

- **0-10 scale** with precise evaluation
- Technical accuracy weighted at 40%
- Practical knowledge at 30%
- Communication clarity at 20%
- Completeness at 10%
- Zero tolerance for vague or incorrect answers

### **🎯 Real-World Assessment**

- Industry-standard interview questions
- Personalized based on resume analysis
- Adaptive difficulty based on performance
- Professional feedback and improvement recommendations

## 🚀 Quick Start Guide

### **Backend Setup**

1. **Navigate to backend directory:**
   \`\`\`bash
   cd backend
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Create environment file:**
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. **Add your Gemini API key to `.env`:**
   \`\`\`env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3001
   NODE_ENV=development
   \`\`\`

5. **Start the backend:**
   \`\`\`bash
   npm run dev
   \`\`\`

### **Frontend Setup**

1. **Navigate to frontend directory:**
   \`\`\`bash
   cd frontend
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Start the frontend:**
   \`\`\`bash
   npm run dev
   \`\`\`

## 🎙️ Professional Interview Experience

### **Pre-Interview Setup**

1. **Resume Upload**: PDF/DOCX analysis for personalized questions
2. **Voice Setup**: Grant microphone/camera permissions
3. **Voice Test**: Test Indian English female AI voice
4. **Readiness Check**: Ensure all systems are working

### **Interview Flow**

1. **AI Greeting**: Professional welcome in Indian English
2. **Question Delivery**: AI speaks each question clearly
3. **Natural Response**: Speak freely without time limits
4. **Silence Detection**: Auto-stop after 3 seconds of silence
5. **Real-time Analysis**: Immediate speech-to-text and evaluation
6. **Progressive Scoring**: Live score updates after each question
7. **Professional Closing**: Summary and next steps

### **Post-Interview**

1. **Comprehensive Report**: Detailed PDF with scores and feedback
2. **Improvement Plan**: Specific recommendations for skill development
3. **Performance Analysis**: Question-by-question breakdown

## 🔍 Scoring Methodology

### **Evaluation Criteria**

- **9-10**: Exceptional answer with perfect technical accuracy and excellent examples
- **7-8**: Very good answer with minor gaps or could be more detailed
- **5-6**: Adequate answer but missing key points or has some inaccuracies
- **3-4**: Basic understanding shown but significant gaps or errors
- **1-2**: Poor answer with major inaccuracies or very incomplete
- **0**: No relevant answer, "I don't know", or completely incorrect

### **Special Assessment Rules**

- **"I don't know" responses**: Scored 0-1 (honesty appreciated but shows knowledge gap)
- **Vague answers**: Maximum score of 4 points
- **Uncertainty phrases** ("I think", "maybe"): Score reduction applied
- **Specific examples**: Bonus points for real-world applications
- **Step-by-step explanations**: Higher scores for detailed processes

## 🎯 Voice Technology Stack

### **Speech Recognition (Backend)**

- **Google Gemini AI**: Advanced speech-to-text with Indian English support
- **Audio Processing**: WebM format with noise cancellation
- **Accuracy Enhancement**: Context-aware transcription for Excel terminology

### **Text-to-Speech (Frontend)**

- **Web Speech API**: Browser's built-in synthesis
- **Voice Selection**: Automatic Indian English female voice selection
- **Speech Optimization**: Rate (0.85), Pitch (1.1), Volume (0.9)

### **Audio Intelligence**

- **Silence Detection**: 3-second pause triggers processing
- **Audio Visualization**: Real-time voice level indicators
- **Quality Monitoring**: Audio strength and clarity feedback

## 🎤 Voice Interview Guidelines

### **For Candidates**

- **Speak Naturally**: Use your normal speaking pace and tone
- **Be Specific**: Provide real examples from your work experience
- **Think Aloud**: Explain your thought process step-by-step
- **Be Honest**: Say "I don't know" rather than guessing
- **Take Your Time**: No rush - speak as long as needed
- **Ask Questions**: Seek clarification if needed

### **Technical Requirements**

- **Chrome/Edge**: Recommended for best voice support
- **Microphone**: Clear audio input required
- **Quiet Environment**: Minimize background noise
- **Stable Internet**: For real-time processing

## 📊 Assessment Categories

### **Beginner Level**

- Basic Excel functions and formulas
- Cell references and formatting
- Simple charts and data sorting
- Fundamental concepts and terminology

### **Intermediate Level**

- VLOOKUP and pivot tables
- Conditional formatting and data validation
- IF functions with multiple conditions
- Data analysis and manipulation

### **Advanced Level**

- Dynamic dashboards and Power Query
- VBA macros and automation
- Array formulas and custom functions
- Statistical analysis and large datasets

## 🔧 Environment Configuration

### **Backend (.env)**

\`\`\`env

# Required

GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001

# Optional

REDIS_URL=redis://localhost:6379
NODE_ENV=development
\`\`\`

### **Frontend (.env) - Optional**

\`\`\`env
VITE_BACKEND_URL=http://localhost:3001
\`\`\`

## 🚨 Troubleshooting Guide

### **Voice Issues**

1. **AI Not Speaking**: Check browser speech synthesis support
2. **Microphone Problems**: Verify permissions and device access
3. **Speech Recognition Failing**: Ensure clear audio and stable internet
4. **Indian English Issues**: Speak clearly, system is trained for accents

### **Technical Issues**

1. **Backend Connection**: Verify Gemini API key and server status
2. **File Upload Problems**: Check file format (PDF/DOCX) and size
3. **Report Generation**: Ensure session completion and valid session ID

## 🎯 Professional Use Cases

### **For Job Seekers**

- Practice Excel interviews before real job interviews
- Identify skill gaps and improvement areas
- Build confidence in technical communication
- Get professional feedback on Excel knowledge

### **For Employers**

- Standardized Excel skill assessment
- Objective candidate evaluation
- Detailed skill reports for hiring decisions
- Consistent interview experience

### **For Training Organizations**

- Excel skill benchmarking
- Progress tracking and assessment
- Professional development planning
- Certification preparation

## 🔮 Advanced Features

### **Adaptive Intelligence**

- Questions adjust based on performance
- Difficulty scaling with candidate responses
- Personalized learning recommendations
- Industry-specific Excel scenarios

### **Professional Reporting**

- Executive summary with performance level
- Detailed question-by-question analysis
- Skill gap identification
- Customized improvement roadmap

### **Quality Assurance**

- Multiple evaluation criteria
- Consistency checks across responses
- Professional interview standards
- Industry-benchmarked scoring

---

**Experience the future of Excel skill assessment with professional AI interviewing technology!** 🚀

This platform provides a comprehensive, fair, and professional evaluation experience that mirrors real-world interview standards while leveraging cutting-edge AI technology for accurate assessment and meaningful feedback.
