//@ts-nocheck
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
import multer from 'multer';
import {
  runExcelInterviewAgent,
  processResumeAndIntroduce,
  conductInterviewQuestion,
  processAudioResponse,
  evaluateAndScore,
  generateReportAndSendEmail,
  sendPreScreeningInvitations,
} from './agent/agent.js';

config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// In-memory storage for sessions
const activeSessions = new Map();
const hrSessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size,
    hrSessions: hrSessions.size,
    env: process.env.NODE_ENV || 'development',
  });
});

// HR Authentication and Management Routes
app.post('/api/hr/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Simple authentication (in production, use proper auth)
    if (
      email === process.env.HR_EMAIL &&
      password === process.env.HR_PASSWORD
    ) {
      const sessionId = `hr_${Date.now()}`;
      hrSessions.set(sessionId, { email, loginTime: new Date() });

      res.json({
        success: true,
        sessionId,
        message: 'HR login successful',
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/hr/send-invitations', async (req, res) => {
  try {
    const { hrSessionId, candidateEmails, hrEmail } = req.body;

    if (!hrSessions.has(hrSessionId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid HR session',
      });
    }

    console.log('📧 Sending pre-screening invitations...');
    const result = await sendPreScreeningInvitations(candidateEmails, hrEmail);

    res.json({
      success: true,
      result: result[result.length - 1]?.content || 'Invitations sent',
    });
  } catch (error) {
    console.error('❌ Error sending invitations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Candidate Interview Routes
app.get('/api/interview/start/:candidateEmail', async (req, res) => {
  try {
    const { candidateEmail } = req.params;

    // Create interview session
    const sessionId = `interview_${Date.now()}_${candidateEmail.replace(
      /[^a-zA-Z0-9]/g,
      ''
    )}`;
    activeSessions.set(sessionId, {
      candidateEmail,
      status: 'waiting_resume',
      startTime: new Date(),
    });

    res.json({
      success: true,
      sessionId,
      candidateEmail,
      message:
        'Interview session created. Please upload your resume to continue.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post(
  '/api/interview/upload-resume',
  upload.single('resume'),
  async (req, res) => {
    try {
      const { sessionId, candidateEmail } = req.body;
      const resumeFile = req.file;

      if (!resumeFile) {
        return res.status(400).json({
          success: false,
          message: 'Resume file is required',
        });
      }

      if (!activeSessions.has(sessionId)) {
        return res.status(404).json({
          success: false,
          message: 'Interview session not found',
        });
      }

      console.log('📄 Processing resume upload...');
      console.log('📧 Candidate:', candidateEmail);
      console.log('📁 File type:', resumeFile.mimetype);
      console.log('📏 File size:', resumeFile.size);

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!allowedTypes.includes(resumeFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Only PDF and DOCX files are supported',
        });
      }

      // Convert buffer to base64 for the agent
      const resumeBuffer = resumeFile.buffer.toString('base64');

      try {
        // Process resume and generate introduction
        const result = await processResumeAndIntroduce(
          candidateEmail,
          resumeBuffer,
          resumeFile.mimetype
        );

        // Update session status
        const session = activeSessions.get(sessionId);
        session.status = 'resume_processed';
        session.resumeProcessed = true;
        activeSessions.set(sessionId, session);

        console.log('✅ Resume processed successfully');

        res.json({
          success: true,
          message: 'Resume processed successfully',
          result: result[result.length - 1]?.content || 'Resume processed',
        });
      } catch (processingError) {
        console.error('❌ Resume processing error:', processingError);

        // Even if processing fails, allow the interview to continue
        const session = activeSessions.get(sessionId);
        session.status = 'resume_processed';
        session.resumeProcessed = true;
        activeSessions.set(sessionId, session);

        res.json({
          success: true,
          message:
            'Resume upload completed (with processing issues, but interview can continue)',
          result: 'Resume received, proceeding with interview',
        });
      }
    } catch (error) {
      console.error('❌ Error processing resume:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Socket.IO for real-time interview with enhanced voice processing
io.on('connection', (socket) => {
  console.log(`👤 Client connected: ${socket.id}`);

  // Start interview after resume processing
  socket.on('start-interview', async (data) => {
    try {
      const { sessionId, candidateEmail } = data;

      if (!activeSessions.has(sessionId)) {
        socket.emit('error', 'Interview session not found');
        return;
      }

      const session = activeSessions.get(sessionId);
      if (session.status !== 'resume_processed') {
        socket.emit('error', 'Resume must be processed first');
        return;
      }

      console.log('🎤 Starting interview for:', candidateEmail);

      // Generate introduction
      const introResult = await runExcelInterviewAgent(
        `Generate introduction for candidate: ${candidateEmail}`
      );

      socket.emit('interview-started', {
        sessionId,
        introduction:
          introResult[introResult.length - 1]?.content ||
          'Welcome to your Excel skills assessment!',
      });

      // Update session
      session.status = 'interview_active';
      session.socketId = socket.id;
      activeSessions.set(sessionId, session);
    } catch (error) {
      console.error('❌ Error starting interview:', error);
      socket.emit('error', `Failed to start interview: ${error.message}`);
    }
  });

  // Generate next question
  socket.on('request-question', async (data) => {
    try {
      const { sessionId } = data;

      if (!activeSessions.has(sessionId)) {
        socket.emit('error', 'Interview session not found');
        return;
      }

      console.log('❓ Generating question for session:', sessionId);

      const questionResult = await conductInterviewQuestion(sessionId);

      socket.emit('question-generated', {
        question:
          questionResult[questionResult.length - 1]?.content ||
          'Tell me about your Excel experience.',
      });
    } catch (error) {
      console.error('❌ Error generating question:', error);
      socket.emit('error', `Failed to generate question: ${error.message}`);
    }
  });

  // Process audio response (Enhanced like your AI agent)
  socket.on('audio-response', async (data) => {
    try {
      const { sessionId, audioBuffer } = data;

      if (!activeSessions.has(sessionId)) {
        socket.emit('error', 'Interview session not found');
        return;
      }

      console.log('🎵 Processing audio response for session:', sessionId);
      console.log('📊 Audio buffer size:', audioBuffer?.length || 0);

      if (!audioBuffer || audioBuffer.length === 0) {
        socket.emit('error', 'No audio data received');
        return;
      }

      // Convert audio to text using enhanced STT
      const transcriptResult = await processAudioResponse(
        sessionId,
        audioBuffer
      );

      // Parse the result to get transcript and confidence
      let transcript = '';
      let confidence = 1.0;

      try {
        const resultContent =
          transcriptResult[transcriptResult.length - 1]?.content || '{}';
        const parsedResult = JSON.parse(resultContent);
        transcript = parsedResult.transcript || '';
        confidence = parsedResult.confidence || 1.0;
      } catch (parseError) {
        console.error('Error parsing transcript result:', parseError);
        transcript =
          transcriptResult[transcriptResult.length - 1]?.content || '';
      }

      if (!transcript || transcript.length < 3) {
        socket.emit(
          'error',
          'Could not transcribe audio clearly. Please try again.'
        );
        return;
      }

      console.log('📝 Transcript:', transcript);
      console.log('🎯 Confidence:', confidence);

      // Evaluate the response with confidence score
      const evaluationResult = await evaluateAndScore(
        sessionId,
        transcript,
        confidence
      );

      socket.emit('response-evaluated', {
        transcript,
        confidence,
        evaluation:
          evaluationResult[evaluationResult.length - 1]?.content ||
          'Response evaluated',
      });

      console.log('✅ Response processed and evaluated successfully');
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      socket.emit('error', `Failed to process audio: ${error.message}`);
    }
  });

  // Complete interview
  socket.on('complete-interview', async (data) => {
    try {
      const { sessionId } = data;

      if (!activeSessions.has(sessionId)) {
        socket.emit('error', 'Interview session not found');
        return;
      }

      console.log('🏁 Completing interview for session:', sessionId);

      // Generate report and send thank you email
      const completionResult = await generateReportAndSendEmail(sessionId);

      socket.emit('interview-completed', {
        message: 'Interview completed successfully',
        result:
          completionResult[completionResult.length - 1]?.content ||
          'Thank you for completing the assessment!',
      });

      // Update session status
      const session = activeSessions.get(sessionId);
      session.status = 'completed';
      session.endTime = new Date();
      activeSessions.set(sessionId, session);

      console.log('✅ Interview completed and report sent');
    } catch (error) {
      console.error('❌ Error completing interview:', error);
      socket.emit('error', `Failed to complete interview: ${error.message}`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`👋 Client disconnected: ${socket.id}, reason: ${reason}`);

    // Find and update any active sessions
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.socketId === socket.id) {
        session.status = 'disconnected';
        session.disconnectTime = new Date();
        activeSessions.set(sessionId, session);
        console.log(`🧹 Updated session ${sessionId} status to disconnected`);
        break;
      }
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// General AI Agent endpoint for testing
app.post('/api/agent', async (req, res) => {
  try {
    const { message, context } = req.body;

    console.log('🤖 Processing agent request:', message);

    const result = await runExcelInterviewAgent(message, context || {});

    res.json({
      success: true,
      response: result[result.length - 1]?.content || 'No response generated',
      fullResult: result,
    });
  } catch (error) {
    console.error('❌ Agent error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get session status
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  if (activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);
    res.json({
      success: true,
      session: {
        sessionId,
        candidateEmail: session.candidateEmail,
        status: session.status,
        startTime: session.startTime,
      },
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Excel Interview AI Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(
    `🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`
  );
  console.log(
    `📧 Email configured: ${process.env.EMAIL ? '✅ Set' : '❌ Missing'}`
  );
  console.log(`👤 HR Email: ${process.env.HR_EMAIL ? '✅ Set' : '❌ Missing'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
