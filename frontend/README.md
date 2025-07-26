# AI Excel Mock Interviewer - Voice-to-Voice Edition

A comprehensive AI-powered Excel skills assessment platform that conducts **voice-to-voice** mock interviews and generates detailed reports.

## 🎤 Voice Features

- **AI Text-to-Speech**: AI speaks questions and messages aloud using browser's speech synthesis
- **Speech Recognition**: Your voice responses are converted to text using Google Gemini AI
- **Natural Conversation**: Just like a real interview - AI speaks, you respond by voice
- **Audio Visualization**: Real-time audio level indicators during recording
- **Fallback Text Input**: Option to type responses if voice isn't working

## 🚀 Quick Start

### Backend Setup

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
   \`\`\`

5. **Start the backend:**
   \`\`\`bash
   npm run dev
   \`\`\`

### Frontend Setup

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

## 🎯 Voice Interview Flow

1. **Landing Page**: Upload resume + enable voice permissions
2. **Permission Check**: Grant microphone/camera access + test speech synthesis
3. **Start Interview**: AI analyzes resume and prepares personalized questions
4. **Voice Greeting**: AI speaks welcome message and explains the process
5. **Question Cycle**:
   - AI speaks question aloud
   - You click microphone and respond by voice
   - AI processes your speech and evaluates response
   - Scores update in real-time
6. **Completion**: AI speaks closing remarks + PDF report download

## 🔧 Voice Technology Stack

### Speech Recognition (Backend)

- **Google Gemini AI**: Converts audio to text
- **WebM Audio**: Browser records in WebM format
- **Buffer Processing**: Audio data transmitted via Socket.io

### Text-to-Speech (Frontend)

- **Web Speech API**: Browser's built-in speech synthesis
- **Voice Selection**: Automatically selects best English voice
- **Speech Control**: Rate, pitch, and volume optimization

### Audio Processing

- **MediaRecorder API**: Records user voice
- **AudioContext**: Real-time audio visualization
- **Auto-stop**: 15-second recording limit with manual control

## 🎙️ Voice Commands & Controls

- **Click Microphone**: Start/stop voice recording
- **Auto-stop**: Recording stops after 15 seconds
- **Visual Feedback**: Audio bars show recording levels
- **Speech Status**: Clear indicators when AI is speaking
- **Fallback Option**: Text input available if voice fails

## 🔊 Audio Requirements

### Browser Compatibility

- **Chrome/Edge**: Full support for MediaRecorder + Speech Synthesis
- **Firefox**: Good support with some voice limitations
- **Safari**: Basic support (may need fallback)

### Permissions Needed

- **Microphone**: Required for voice input
- **Camera**: Required for video preview
- **Speech Synthesis**: Automatic (no permission needed)

## 🛠️ Troubleshooting Voice Issues

### Common Problems & Solutions

1. **AI Not Speaking**

   - Check if browser supports Speech Synthesis API
   - Ensure volume is up and not muted
   - Try refreshing the page

2. **Microphone Not Working**

   - Grant microphone permissions when prompted
   - Check browser settings for microphone access
   - Ensure microphone is not used by other apps

3. **Speech Recognition Failing**

   - Verify Gemini API key is set correctly
   - Check internet connection
   - Speak clearly and avoid background noise

4. **Audio Quality Issues**
   - Use headphones to prevent echo
   - Speak 6-12 inches from microphone
   - Minimize background noise

## 📝 Environment Variables

### Backend (.env)

\`\`\`env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
REDIS_URL=redis://localhost:6379 # Optional
NODE_ENV=development
\`\`\`

### Frontend (.env) - Optional

\`\`\`env
VITE_BACKEND_URL=http://localhost:3001
\`\`\`

## 🎵 Audio Events Flow

\`\`\`

1. User clicks "Start Interview"
2. AI generates greeting text
3. Browser speaks greeting aloud (TTS)
4. AI generates first question
5. Browser speaks question aloud (TTS)
6. User clicks microphone button
7. Browser starts recording voice
8. User speaks answer
9. Recording stops (manual/auto)
10. Audio sent to backend via Socket.io
11. Gemini AI converts speech to text
12. AI evaluates text response
13. Scores updated and sent to frontend
14. Process repeats for next question
    \`\`\`

## 🔄 Socket Events for Voice

### Client → Server

- `audio-data`: Raw audio buffer from microphone
- `start-interview`: Begin voice interview
- `stop-interview`: End interview early

### Server → Client

- `ai-message`: Text for TTS (greeting/closing)
- `ai-question`: Question text for TTS
- `ai-speaking`: AI is processing/speaking
- `start-listening`: Ready for voice input
- `stop-listening`: Stop voice recording

## 🎯 Voice Interview Tips

- **Speak Clearly**: Enunciate words for better recognition
- **Normal Pace**: Don't speak too fast or too slow
- **Wait for AI**: Let AI finish speaking before responding
- **Quiet Environment**: Minimize background noise
- **Good Microphone**: Use quality microphone if possible

## 🚀 Future Voice Enhancements

- **Real-time Speech Recognition**: Stream audio for instant feedback
- **Voice Activity Detection**: Auto-start/stop based on speech
- **Multiple Language Support**: Support for non-English interviews
- **Voice Emotion Analysis**: Detect confidence and stress levels
- **Custom Voice Selection**: Choose different AI voices

The application now provides a complete voice-to-voice interview experience! 🎤✨
