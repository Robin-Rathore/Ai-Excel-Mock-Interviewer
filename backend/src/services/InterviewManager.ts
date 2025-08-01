//@ts-nocheck
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RedisClient } from './RedisClient.js';
import { AIAgent } from './AIAgent.js';
import { AudioProcessor } from './AudioProcessor.js';
import { ReportGenerator } from './ReportGenerator.js';
import type { Socket } from 'socket.io';

interface SessionData {
  sessionId: string;
  candidateInfo: {
    name: string;
    email: string;
    skills: string[];
    experienceLevel: string;
  };
  conversationHistory: Array<{
    question: string;
    answer: string;
    score: number;
    timestamp: string;
    feedback: string;
    evaluation: {
      technical: number;
      practical: number;
      communication: number;
      completeness: number;
    };
  }>;
  currentState:
    | 'created'
    | 'intro'
    | 'questioning'
    | 'waiting-response'
    | 'processing'
    | 'completed';
  currentQuestion: string;
  overallScores: {
    technical: number;
    communication: number;
    problemSolving: number;
    overall: number;
  };
  questionCount: number;
  startTime: Date;
  socketId: string;
  lastActivity: Date;
}

export class InterviewManager {
  private aiAgent: AIAgent;
  private audioProcessor: AudioProcessor;
  private reportGenerator: ReportGenerator;
  private socketToSession: Map<string, string> = new Map();
  private sessionSockets: Map<string, Socket> = new Map();

  constructor(private redisClient: RedisClient) {
    this.aiAgent = new AIAgent();
    this.audioProcessor = new AudioProcessor();
    this.reportGenerator = new ReportGenerator();

    // Clean up temp files periodically
    setInterval(() => {
      this.audioProcessor.cleanupTempFiles();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async createSession(candidateInfo: any): Promise<string> {
    const sessionId = uuidv4();

    const sessionData: SessionData = {
      sessionId,
      candidateInfo,
      conversationHistory: [],
      currentState: 'created',
      currentQuestion: '',
      overallScores: {
        technical: 0,
        communication: 0,
        problemSolving: 0,
        overall: 0,
      },
      questionCount: 0,
      startTime: new Date(),
      socketId: '',
      lastActivity: new Date(),
    };

    await this.redisClient.setSession(sessionId, sessionData);
    console.log(`✅ Created session ${sessionId} for ${candidateInfo.name}`);
    return sessionId;
  }

  async startInterview(sessionId: string, socket: Socket): Promise<void> {
    try {
      const sessionData = await this.redisClient.getSession(sessionId);
      if (!sessionData) {
        socket.emit('error', 'Session not found');
        return;
      }

      // Map socket to session
      this.socketToSession.set(socket.id, sessionId);
      this.sessionSockets.set(sessionId, socket);
      sessionData.socketId = socket.id;
      sessionData.lastActivity = new Date();

      console.log(`🚀 Starting interview for session ${sessionId}`);

      // Update session state
      sessionData.currentState = 'intro';
      await this.redisClient.setSession(sessionId, sessionData);

      socket.emit('interview-started');

      // Generate and send introduction
      setTimeout(async () => {
        try {
          const introduction = await this.aiAgent.generateIntroduction(
            sessionData.candidateInfo
          );

          socket.emit('ai-speaking');
          socket.emit('ai-message', introduction);

          console.log('📢 Introduction sent to client');

          // Wait for introduction to be spoken, then start first question
          setTimeout(async () => {
            await this.askNextQuestion(sessionId);
          }, 12000); // 12 seconds for introduction
        } catch (error) {
          console.error('❌ Error in introduction:', error);
          socket.emit('error', 'Failed to start interview');
        }
      }, 2000);
    } catch (error) {
      console.error('❌ Error starting interview:', error);
      socket.emit('error', 'Failed to start interview');
    }
  }

  private async askNextQuestion(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.redisClient.getSession(sessionId);
      const socket = this.sessionSockets.get(sessionId);

      if (!sessionData || !socket) {
        console.error('❌ Session or socket not found for question');
        return;
      }

      // Check if we should end the interview
      if (sessionData.questionCount >= 8) {
        await this.endInterview(sessionId);
        return;
      }

      console.log(
        `❓ Asking question ${
          sessionData.questionCount + 1
        } for session ${sessionId}`
      );

      // Generate next question
      const question = await this.aiAgent.generateNextQuestion(
        sessionData.candidateInfo,
        sessionData.conversationHistory
      );

      sessionData.currentQuestion = question;
      sessionData.currentState = 'questioning';
      sessionData.lastActivity = new Date();
      await this.redisClient.setSession(sessionId, sessionData);

      // Send question to client
      socket.emit('ai-speaking');
      socket.emit('ai-question', question);

      console.log(`📝 Question sent: ${question.substring(0, 100)}...`);

      // After TTS delay, start listening for response
      setTimeout(() => {
        sessionData.currentState = 'waiting-response';
        this.redisClient.setSession(sessionId, sessionData);
        socket.emit('start-listening');
        console.log('🎤 Started listening for response');
      }, 5000); // 5 seconds for TTS
    } catch (error) {
      console.error('❌ Error asking question:', error);
      const socket = this.sessionSockets.get(sessionId);
      if (socket) {
        socket.emit('error', 'Failed to generate question');
      }
    }
  }

  async processAudioResponse(
    sessionId: string,
    audioData: number[]
  ): Promise<void> {
    const sessionData = await this.redisClient.getSession(sessionId);
    const socket = this.sessionSockets.get(sessionId);

    if (!sessionData || !socket) {
      console.log('❌ Invalid session for audio processing');
      return;
    }

    if (sessionData.currentState !== 'waiting-response') {
      console.log(
        '❌ Invalid state for audio processing:',
        sessionData.currentState
      );
      return;
    }

    try {
      console.log(
        `🎵 Processing audio response for session ${sessionId}, size: ${audioData.length}`
      );

      // Update state to processing
      sessionData.currentState = 'processing';
      sessionData.lastActivity = new Date();
      await this.redisClient.setSession(sessionId, sessionData);

      // Stop listening
      socket.emit('stop-listening');

      // Convert audio data to buffer
      const audioBuffer = Buffer.from(audioData);

      // Validate audio buffer
      const validation = this.audioProcessor.validateAudioBuffer(audioBuffer);
      if (!validation.isValid) {
        console.log('❌ Invalid audio buffer:', validation.reason);
        socket.emit(
          'ai-message',
          "I didn't receive clear audio. Could you please try again?"
        );

        // Reset to listening state
        setTimeout(() => {
          sessionData.currentState = 'waiting-response';
          this.redisClient.setSession(sessionId, sessionData);
          socket.emit('start-listening');
        }, 3000);
        return;
      }

      // Process speech to text
      const transcriptionResult = await this.audioProcessor.speechToText(
        audioBuffer
      );
      const { text: transcript, confidence } = transcriptionResult;

      if (!transcript || transcript.trim().length < 3) {
        console.log('❌ Transcript too short or empty');
        socket.emit(
          'ai-message',
          "I couldn't understand your response clearly. Please try speaking again."
        );

        // Reset to listening state
        setTimeout(() => {
          sessionData.currentState = 'waiting-response';
          this.redisClient.setSession(sessionId, sessionData);
          socket.emit('start-listening');
        }, 3000);
        return;
      }

      console.log(
        `📝 Transcript (confidence: ${confidence.toFixed(2)}): ${transcript}`
      );

      // Evaluate the response
      const evaluation = await this.aiAgent.evaluateResponse(
        sessionData.currentQuestion,
        transcript,
        confidence
      );

      console.log('📊 Response evaluated:', {
        score: evaluation.score,
        technical: evaluation.technical,
        practical: evaluation.practical,
      });

      // Store conversation item
      const conversationItem = {
        question: sessionData.currentQuestion,
        answer: transcript,
        score: evaluation.score,
        timestamp: new Date().toISOString(),
        feedback: evaluation.feedback,
        evaluation: {
          technical: evaluation.technical,
          practical: evaluation.practical,
          communication: evaluation.communication,
          completeness: evaluation.completeness,
        },
      };

      sessionData.conversationHistory.push(conversationItem);
      sessionData.questionCount++;

      // Update overall scores
      this.updateOverallScores(sessionData);

      await this.redisClient.setSession(sessionId, sessionData);

      // Send results to client
      socket.emit('scores-updated', sessionData.overallScores);
      socket.emit('question-completed', {
        questionNumber: sessionData.questionCount,
        score: evaluation.score,
        feedback: evaluation.feedback,
        evaluation: evaluation,
      });

      console.log(
        `✅ Question ${sessionData.questionCount} completed with score ${evaluation.score}`
      );

      // Wait then ask next question or end interview
      setTimeout(async () => {
        if (sessionData.questionCount >= 8) {
          await this.endInterview(sessionId);
        } else {
          await this.askNextQuestion(sessionId);
        }
      }, 3000);
    } catch (error) {
      console.error('❌ Error processing audio response:', error);
      socket.emit('error', `Failed to process your response: ${error.message}`);

      // Reset state to allow retry
      setTimeout(() => {
        sessionData.currentState = 'waiting-response';
        this.redisClient.setSession(sessionId, sessionData);
        socket.emit('start-listening');
      }, 3000);
    }
  }

  async processTextResponse(
    sessionId: string,
    responseText: string
  ): Promise<void> {
    const sessionData = await this.redisClient.getSession(sessionId);
    const socket = this.sessionSockets.get(sessionId);

    if (
      !sessionData ||
      !socket ||
      sessionData.currentState !== 'waiting-response'
    ) {
      console.log('❌ Invalid state for text processing');
      return;
    }

    try {
      console.log(
        `📝 Processing text response for session ${sessionId}: ${responseText.substring(
          0,
          100
        )}...`
      );

      // Update state
      sessionData.currentState = 'processing';
      sessionData.lastActivity = new Date();
      await this.redisClient.setSession(sessionId, sessionData);

      // Stop listening
      socket.emit('stop-listening');

      // Evaluate the response (with high confidence since it's text)
      const evaluation = await this.aiAgent.evaluateResponse(
        sessionData.currentQuestion,
        responseText,
        1.0 // Perfect confidence for text input
      );

      console.log('📊 Text response evaluated:', evaluation);

      // Store conversation item
      const conversationItem = {
        question: sessionData.currentQuestion,
        answer: responseText,
        score: evaluation.score,
        timestamp: new Date().toISOString(),
        feedback: evaluation.feedback,
        evaluation: {
          technical: evaluation.technical,
          practical: evaluation.practical,
          communication: evaluation.communication,
          completeness: evaluation.completeness,
        },
      };

      sessionData.conversationHistory.push(conversationItem);
      sessionData.questionCount++;

      // Update overall scores
      this.updateOverallScores(sessionData);

      await this.redisClient.setSession(sessionId, sessionData);

      // Send results to client
      socket.emit('scores-updated', sessionData.overallScores);
      socket.emit('question-completed', {
        questionNumber: sessionData.questionCount,
        score: evaluation.score,
        feedback: evaluation.feedback,
        evaluation: evaluation,
      });

      console.log(
        `✅ Text question ${sessionData.questionCount} completed with score ${evaluation.score}`
      );

      // Wait then ask next question or end interview
      setTimeout(async () => {
        if (sessionData.questionCount >= 8) {
          await this.endInterview(sessionId);
        } else {
          await this.askNextQuestion(sessionId);
        }
      }, 2000);
    } catch (error) {
      console.error('❌ Error processing text response:', error);
      socket.emit('error', 'Failed to process your response');

      // Reset state to allow retry
      setTimeout(() => {
        sessionData.currentState = 'waiting-response';
        this.redisClient.setSession(sessionId, sessionData);
      }, 2000);
    }
  }

  private updateOverallScores(sessionData: SessionData): void {
    const history = sessionData.conversationHistory;
    const count = history.length;

    if (count === 0) return;

    // Calculate weighted averages
    sessionData.overallScores.technical =
      history.reduce((sum, item) => sum + item.evaluation.technical, 0) / count;

    sessionData.overallScores.communication =
      history.reduce((sum, item) => sum + item.evaluation.communication, 0) /
      count;

    sessionData.overallScores.problemSolving =
      history.reduce((sum, item) => sum + item.evaluation.practical, 0) / count;

    // Overall score with professional weighting
    sessionData.overallScores.overall =
      sessionData.overallScores.technical * 0.4 +
      sessionData.overallScores.communication * 0.2 +
      sessionData.overallScores.problemSolving * 0.3 +
      (history.reduce((sum, item) => sum + item.evaluation.completeness, 0) /
        count) *
        0.1;
  }

  private async endInterview(sessionId: string): Promise<void> {
    const sessionData = await this.redisClient.getSession(sessionId);
    const socket = this.sessionSockets.get(sessionId);

    if (!sessionData || !socket) return;

    try {
      console.log(`🏁 Ending interview for session ${sessionId}`);

      // Generate closing remarks
      const closingRemarks = await this.aiAgent.generateClosingRemarks(
        sessionData.overallScores,
        sessionData.questionCount
      );

      sessionData.currentState = 'completed';
      sessionData.lastActivity = new Date();
      await this.redisClient.setSession(sessionId, sessionData);

      // Send closing message
      socket.emit('ai-speaking');
      socket.emit('ai-message', closingRemarks);

      // Wait then complete interview
      setTimeout(() => {
        socket.emit('interview-completed', {
          scores: sessionData.overallScores,
          questionCount: sessionData.questionCount,
          sessionId: sessionId,
        });
        console.log('✅ Interview completed successfully');
      }, 8000); // 8 seconds for closing remarks
    } catch (error) {
      console.error('❌ Error ending interview:', error);
      socket.emit('error', 'Failed to complete interview');
    }
  }

  async generateReport(sessionId: string): Promise<Buffer> {
    const sessionData = await this.redisClient.getSession(sessionId);
    if (!sessionData) {
      throw new Error('Session not found');
    }

    console.log(`📄 Generating report for session ${sessionId}`);
    return await this.reportGenerator.generatePDF(sessionData);
  }

  async getSessionIdBySocket(socketId: string): Promise<string | undefined> {
    return this.socketToSession.get(socketId);
  }

  // Clean up when socket disconnects
  async handleDisconnect(socketId: string): Promise<void> {
    const sessionId = this.socketToSession.get(socketId);
    if (sessionId) {
      this.socketToSession.delete(socketId);
      this.sessionSockets.delete(sessionId);
      console.log(
        `🧹 Cleaned up session ${sessionId} for disconnected socket ${socketId}`
      );
    }
  }
}
