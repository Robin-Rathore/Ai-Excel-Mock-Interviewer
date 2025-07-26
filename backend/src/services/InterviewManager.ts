import type { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type { RedisClient } from './RedisClient.js';
import { AIAgent } from './AIAgent.js';
import { AudioProcessor } from './AudioProcessor.js';
import { ReportGenerator } from './ReportGenerator.js';

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
  }>;
  currentState:
    | 'created'
    | 'intro'
    | 'questioning'
    | 'waiting-response'
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
    };

    await this.redisClient.setSession(sessionId, sessionData);
    console.log(`Created session ${sessionId} for ${candidateInfo.name}`);
    return sessionId;
  }

  async startInterview(sessionId: string, socket: Socket): Promise<void> {
    const sessionData = await this.redisClient.getSession(sessionId);
    if (!sessionData) {
      socket.emit('error', 'Session not found');
      return;
    }

    // Map socket to session
    this.socketToSession.set(socket.id, sessionId);
    this.sessionSockets.set(sessionId, socket);
    sessionData.socketId = socket.id;

    console.log(`Starting interview for session ${sessionId}`);

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

        console.log('Introduction sent to client');

        // Wait for introduction to be "read" then start first question
        setTimeout(async () => {
          await this.askNextQuestion(sessionId);
        }, 8000); // 8 seconds for introduction
      } catch (error) {
        console.error('Error in introduction:', error);
        socket.emit('error', 'Failed to start interview');
      }
    }, 1000);
  }

  private async askNextQuestion(sessionId: string): Promise<void> {
    const sessionData = await this.redisClient.getSession(sessionId);
    const socket = this.sessionSockets.get(sessionId);

    if (!sessionData || !socket) {
      console.error('Session or socket not found for question');
      return;
    }

    try {
      // Check if we should end the interview
      if (sessionData.questionCount >= 8) {
        await this.endInterview(sessionId);
        return;
      }

      console.log(
        `Asking question ${
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
      await this.redisClient.setSession(sessionId, sessionData);

      // Send question to client
      socket.emit('ai-speaking');
      socket.emit('ai-question', question);

      console.log('Question sent:', question.substring(0, 100) + '...');

      // After a delay, start listening for response
      setTimeout(() => {
        sessionData.currentState = 'waiting-response';
        this.redisClient.setSession(sessionId, sessionData);
        socket.emit('start-listening');
        console.log('Started listening for response');
      }, 3000);
    } catch (error) {
      console.error('Error asking question:', error);
      socket.emit('error', 'Failed to generate question');
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
      console.log('Invalid state for processing response');
      return;
    }

    try {
      console.log(
        `Processing response for session ${sessionId}: ${responseText.substring(
          0,
          100
        )}...`
      );

      // Stop listening
      socket.emit('stop-listening');

      // Evaluate the response
      const evaluation = await this.aiAgent.evaluateResponse(
        sessionData.currentQuestion,
        responseText
      );

      console.log('Response evaluated:', evaluation);

      // Store conversation item
      const conversationItem = {
        question: sessionData.currentQuestion,
        answer: responseText,
        score: evaluation.score,
        timestamp: new Date().toISOString(),
        feedback: evaluation.feedback,
      };

      sessionData.conversationHistory.push(conversationItem);
      sessionData.questionCount++;

      // Update scores
      this.updateScores(sessionData, evaluation);

      await this.redisClient.setSession(sessionId, sessionData);

      // Send updated scores to client
      socket.emit('scores-updated', sessionData.overallScores);
      socket.emit('question-completed', {
        questionNumber: sessionData.questionCount,
        score: evaluation.score,
        feedback: evaluation.feedback,
      });

      console.log(
        `Question ${sessionData.questionCount} completed with score ${evaluation.score}`
      );

      // Wait a moment then ask next question or end interview
      setTimeout(async () => {
        if (sessionData.questionCount >= 8) {
          await this.endInterview(sessionId);
        } else {
          await this.askNextQuestion(sessionId);
        }
      }, 2000);
    } catch (error) {
      console.error('Error processing response:', error);
      socket.emit('error', 'Failed to process your response');

      // Reset state to allow retry
      sessionData.currentState = 'waiting-response';
      await this.redisClient.setSession(sessionId, sessionData);
    }
  }

  private updateScores(sessionData: SessionData, evaluation: any): void {
    const history = sessionData.conversationHistory;
    const count = history.length;

    if (count === 0) return;

    // Calculate averages from all responses
    sessionData.overallScores.technical =
      history.reduce(
        (sum, item) => sum + (evaluation.technical || item.score),
        0
      ) / count;
    sessionData.overallScores.communication =
      history.reduce(
        (sum, item) => sum + (evaluation.communication || item.score),
        0
      ) / count;
    sessionData.overallScores.problemSolving =
      history.reduce(
        (sum, item) => sum + (evaluation.problemSolving || item.score),
        0
      ) / count;

    // Overall score is weighted average
    sessionData.overallScores.overall =
      sessionData.overallScores.technical * 0.4 +
      sessionData.overallScores.communication * 0.3 +
      sessionData.overallScores.problemSolving * 0.3;
  }

  private async endInterview(sessionId: string): Promise<void> {
    const sessionData = await this.redisClient.getSession(sessionId);
    const socket = this.sessionSockets.get(sessionId);

    if (!sessionData || !socket) return;

    try {
      console.log(`Ending interview for session ${sessionId}`);

      // Generate closing remarks
      const closingRemarks = await this.aiAgent.generateClosingRemarks(
        sessionData.overallScores
      );

      sessionData.currentState = 'completed';
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
        console.log('Interview completed successfully');
      }, 5000);
    } catch (error) {
      console.error('Error ending interview:', error);
      socket.emit('error', 'Failed to complete interview');
    }
  }

  async generateReport(sessionId: string): Promise<Buffer> {
    const sessionData = await this.redisClient.getSession(sessionId);
    if (!sessionData) {
      throw new Error('Session not found');
    }

    console.log(`Generating report for session ${sessionId}`);
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
        `Cleaned up session ${sessionId} for disconnected socket ${socketId}`
      );
    }
  }
}
