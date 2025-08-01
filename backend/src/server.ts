import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
import multer from 'multer';
import { runExcelInterviewAgent } from './agent/agent.js';

config();

console.log('🔧 Environment configuration:');
console.log(`📌 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`📌 PORT: ${process.env.PORT || 3001}`);
console.log(
  `📌 GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`
);
console.log(
  `📌 ELEVENLABS_API_KEY: ${
    process.env.ELEVENLABS_API_KEY ? '✅ Set' : '❌ Missing'
  }`
);
console.log(`📌 EMAIL: ${process.env.EMAIL ? '✅ Set' : '❌ Missing'}`);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'));
    }
  },
});

// In-memory storage
const activeSessions = new Map();
const hrSessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size,
    hrSessions: hrSessions.size,
  });
});

// HR Authentication
app.post('/api/hr/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔑 HR login attempt: ${email}`);

    if (
      email === process.env.HR_EMAIL &&
      password === process.env.HR_PASSWORD
    ) {
      const sessionId = `hr_${Date.now()}`;
      hrSessions.set(sessionId, { email, loginTime: new Date() });
      console.log(`✅ HR login successful: ${email}`);

      res.json({
        success: true,
        sessionId,
        message: 'HR login successful',
      });
    } else {
      console.log(`❌ HR login failed: ${email}`);
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
  } catch (error) {
    console.error('❌ HR login error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Send invitations
app.post('/api/hr/send-invitations', async (req, res) => {
  try {
    const { hrSessionId, candidateEmails, hrEmail } = req.body;
    console.log(
      `📧 HR invitation request: ${candidateEmails.length} candidates`
    );

    if (!hrSessions.has(hrSessionId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid HR session',
      });
    }

    console.log('📧 Sending pre-screening invitations...');
    const result = await runExcelInterviewAgent(
      `Send interview invitations to: ${candidateEmails.join(
        ', '
      )} from HR: ${hrEmail}`
    );

    console.log(`✅ Invitations sent to ${candidateEmails.length} candidates`);

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

// Start interview session
app.get('/api/interview/start/:candidateEmail', async (req, res) => {
  try {
    const { candidateEmail } = req.params;
    console.log(`🚀 Starting interview session for: ${candidateEmail}`);

    const sessionId = `interview_${Date.now()}_${candidateEmail.replace(
      /[^a-zA-Z0-9]/g,
      ''
    )}`;
    activeSessions.set(sessionId, {
      candidateEmail,
      status: 'waiting_resume',
      startTime: new Date(),
    });

    console.log(`✅ Created session: ${sessionId}`);

    res.json({
      success: true,
      sessionId,
      candidateEmail,
      message:
        'Interview session created. Please upload your resume to continue.',
    });
  } catch (error) {
    console.error('❌ Error starting interview session:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Resume upload
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

      // Convert buffer to base64 for the agent
      const resumeBuffer = resumeFile.buffer.toString('base64');

      try {
        console.log('🧠 Processing resume and generating introduction...');
        const result = await runExcelInterviewAgent(
          `Process resume for ${candidateEmail} and generate introduction. Resume data: ${resumeBuffer.substring(
            0,
            1000
          )}...`
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

        // Allow interview to continue even if processing fails
        const session = activeSessions.get(sessionId);
        session.status = 'resume_processed';
        session.resumeProcessed = true;
        activeSessions.set(sessionId, session);

        res.json({
          success: true,
          message: 'Resume upload completed, interview can continue',
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

// Socket.IO for real-time interview
io.on('connection', (socket) => {
  console.log(`👤 Client connected: ${socket.id}`);

  socket.on('start-interview', async (data) => {
    try {
      const { sessionId, candidateEmail } = data;
      console.log(
        `🚀 Start interview request: ${sessionId}, ${candidateEmail}`
      );

      if (!activeSessions.has(sessionId)) {
        socket.emit('error', 'Interview session not found');
        return;
      }

      const session = activeSessions.get(sessionId);
      if (session.status !== 'resume_processed') {
        socket.emit('error', 'Resume must be processed first');
        return;
      }

      console.log('🎤 Starting interview with voice for:', candidateEmail);

      const introResult = await runExcelInterviewAgent(
        `Generate introduction and start interview for candidate: ${candidateEmail}`
      );

      const resultContent =
        introResult[introResult.length - 1]?.content || '{}';
      let parsedResult;

      try {
        parsedResult = JSON.parse(resultContent);
      } catch (parseError) {
        parsedResult = { introduction: resultContent, hasAudio: false };
      }

      socket.emit('interview-started', {
        sessionId,
        introduction:
          parsedResult.introduction ||
          'Welcome to your Excel skills assessment!',
        hasAudio: parsedResult.hasAudio || false,
      });

      session.status = 'interview_active';
      session.socketId = socket.id;
      activeSessions.set(sessionId, session);

      console.log('✅ Interview started');
    } catch (error) {
      console.error('❌ Error starting interview:', error);
      socket.emit('error', `Failed to start interview: ${error.message}`);
    }
  });

  socket.on('request-question', async (data) => {
    try {
      const { sessionId } = data;
      console.log(`❓ Question request for session: ${sessionId}`);

      if (!activeSessions.has(sessionId)) {
        socket.emit('error', 'Interview session not found');
        return;
      }

      const questionResult = await runExcelInterviewAgent(
        `Generate next interview question for session: ${sessionId}`
      );

      const resultContent =
        questionResult[questionResult.length - 1]?.content || '{}';
      let parsedResult;

      try {
        parsedResult = JSON.parse(resultContent);
      } catch (parseError) {
        parsedResult = { question: resultContent, hasAudio: false };
      }

      socket.emit('question-generated', {
        question:
          parsedResult.question || 'Tell me about your Excel experience.',
        questionNumber: parsedResult.questionNumber || 1,
        totalQuestions: parsedResult.totalQuestions || 8,
        hasAudio: parsedResult.hasAudio || false,
      });

      console.log('✅ Question generated');
    } catch (error) {
      console.error('❌ Error generating question:', error);
      socket.emit('error', `Failed to generate question: ${error.message}`);
    }
  });

  socket.on('audio-response', async (data) => {
    try {
      const { sessionId, audioBuffer } = data;
      console.log(`🎵 Audio response received for session: ${sessionId}`);

      if (!activeSessions.has(sessionId)) {
        socket.emit('error', 'Interview session not found');
        return;
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        socket.emit('error', 'No audio data received');
        return;
      }

      const transcriptResult = await runExcelInterviewAgent(
        `Process audio response for session: ${sessionId}. Audio data length: ${audioBuffer.length}`
      );

      const transcriptContent =
        transcriptResult[transcriptResult.length - 1]?.content || '{}';
      let transcript = '';
      let confidence = 1.0;

      try {
        const parsedTranscript = JSON.parse(transcriptContent);
        transcript = parsedTranscript.transcript || '';
        confidence = parsedTranscript.confidence || 1.0;
      } catch (parseError) {
        transcript = transcriptContent;
      }

      if (!transcript || transcript.length < 3) {
        socket.emit(
          'error',
          'Could not transcribe audio clearly. Please try again.'
        );
        return;
      }

      console.log('📝 Transcript:', transcript);

      const evaluationResult = await runExcelInterviewAgent(
        `Evaluate response for session: ${sessionId}. Transcript: ${transcript}. Confidence: ${confidence}`
      );

      const evalContent =
        evaluationResult[evaluationResult.length - 1]?.content || '{}';
      let parsedEvaluation;

      try {
        parsedEvaluation = JSON.parse(evalContent);
      } catch (parseError) {
        parsedEvaluation = { evaluation: evalContent, hasAudioFeedback: false };
      }

      socket.emit('response-evaluated', {
        transcript,
        confidence,
        evaluation: parsedEvaluation.evaluation || 'Response evaluated',
        currentScores: parsedEvaluation.currentScores || {},
        questionCount: parsedEvaluation.questionCount || 0,
        isComplete: parsedEvaluation.isComplete || false,
        hasAudioFeedback: parsedEvaluation.hasAudioFeedback || false,
      });

      console.log('✅ Response processed');
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      socket.emit('error', `Failed to process audio: ${error.message}`);
    }
  });

  socket.on('complete-interview', async (data) => {
    try {
      const { sessionId } = data;
      console.log(`🏁 Completing interview for session: ${sessionId}`);

      if (!activeSessions.has(sessionId)) {
        socket.emit('error', 'Interview session not found');
        return;
      }

      const completionResult = await runExcelInterviewAgent(
        `Complete interview and generate report for session: ${sessionId}`
      );

      const completionMessage =
        'Thank you for completing your Excel skills assessment! We have generated your detailed report and sent it to your email.';

      socket.emit('interview-completed', {
        message: completionMessage,
        result:
          completionResult[completionResult.length - 1]?.content ||
          'Thank you for completing the assessment!',
        hasCompletionAudio: false,
      });

      const session = activeSessions.get(sessionId);
      session.status = 'completed';
      session.endTime = new Date();
      activeSessions.set(sessionId, session);

      console.log('✅ Interview completed');
    } catch (error) {
      console.error('❌ Error completing interview:', error);
      socket.emit('error', `Failed to complete interview: ${error.message}`);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`👋 Client disconnected: ${socket.id}, reason: ${reason}`);

    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.socketId === socket.id) {
        session.status = 'disconnected';
        session.disconnectTime = new Date();
        activeSessions.set(sessionId, session);
        break;
      }
    }
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
    `🔑 ElevenLabs API Key: ${
      process.env.ELEVENLABS_API_KEY ? '✅ Set' : '❌ Missing'
    }`
  );
  console.log(
    `📧 Email configured: ${process.env.EMAIL ? '✅ Set' : '❌ Missing'}`
  );
});

export default app;
