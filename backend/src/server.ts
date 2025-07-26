//@ts-nocheck
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
import { InterviewManager } from './services/InterviewManager.js';
import { ResumeParser } from './services/ResumeParser.js';
import { RedisClient } from './services/RedisClient.js';
import { AudioProcessor } from './services/AudioProcessor.js';

config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Initialize services
const redisClient = new RedisClient();
const resumeParser = new ResumeParser();
const interviewManager = new InterviewManager(redisClient);
const audioProcessor = new AudioProcessor();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Download report endpoint
app.get('/api/report/download/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`Report download requested for session: ${sessionId}`);

    const reportBuffer = await interviewManager.generateReport(sessionId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=excel-interview-report-${sessionId}.pdf`
    );
    res.send(reportBuffer);

    console.log(`Report downloaded for session: ${sessionId}`);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Start interview
  socket.on('start-interview', async (data) => {
    try {
      console.log('Starting interview for:', data.fileName);

      const { fileName, fileData, fileType } = data;

      // Parse the base64 file data
      const base64Data = fileData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      // Parse resume
      const resumeData = await resumeParser.parseResume(buffer, fileType);
      console.log('Resume parsed:', resumeData);

      // Create interview session
      const sessionId = await interviewManager.createSession(resumeData);

      socket.emit('session-created', sessionId);
      socket.emit('candidate-info-extracted', resumeData);

      // Start the interview
      await interviewManager.startInterview(sessionId, socket);
    } catch (error) {
      console.error('Error starting interview:', error);
      socket.emit('error', 'Failed to start interview: ' + error.message);
    }
  });

  // Handle audio data from client
  socket.on('audio-data', async (audioData) => {
    try {
      console.log('Received audio data, size:', audioData.length);

      const sessionId = await interviewManager.getSessionIdBySocket(socket.id);
      if (!sessionId) {
        console.log('No session found for socket:', socket.id);
        socket.emit('error', 'Session not found');
        return;
      }

      // Convert audio data to buffer
      const audioBuffer = Buffer.from(audioData);

      // Process speech to text
      const transcript = await audioProcessor.speechToText(audioBuffer);

      if (!transcript || transcript.trim().length < 5) {
        socket.emit(
          'ai-message',
          "I didn't catch that clearly. Could you please repeat your answer?"
        );
        socket.emit('start-listening');
        return;
      }

      console.log('Transcript:', transcript);

      // Process the response through interview manager
      await interviewManager.processTextResponse(sessionId, transcript);
    } catch (error) {
      console.error('Error processing audio:', error);
      socket.emit('error', 'Failed to process audio: ' + error.message);
      socket.emit('start-listening'); // Allow retry
    }
  });

  // Handle text response (fallback)
  socket.on('text-response', async (data) => {
    try {
      const { sessionId, text } = data;
      console.log(
        `Text response received for session ${sessionId}: ${text.substring(
          0,
          100
        )}...`
      );

      await interviewManager.processTextResponse(sessionId, text);
    } catch (error) {
      console.error('Error processing text response:', error);
      socket.emit('error', 'Failed to process response');
    }
  });

  // Stop interview
  socket.on('stop-interview', async () => {
    try {
      const sessionId = await interviewManager.getSessionIdBySocket(socket.id);
      if (sessionId) {
        console.log(`Stopping interview for session: ${sessionId}`);
        // Handle interview stop logic here
      }
    } catch (error) {
      console.error('Error stopping interview:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    interviewManager.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
