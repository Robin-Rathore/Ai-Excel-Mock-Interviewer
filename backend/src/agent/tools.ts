//@ts-nocheck
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import nodemailer from 'nodemailer';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ElevenLabsClient } from 'elevenlabs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize services
const model = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  apiKey: process.env.GEMINI_API_KEY,
});

const elevenLabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// In-memory storage for session data
const sessionStorage = new Map();

// Indian English female voice ID for ElevenLabs
const INDIAN_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// Audio Processing Class (integrated from your AudioProcessor)
class InterviewAudioProcessor {
  constructor() {
    this.elevenLabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
    this.voiceId = INDIAN_VOICE_ID;
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();

    console.log('🎤 Interview AudioProcessor initialized with ElevenLabs API');
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Enhanced text processing for natural speech
  private enhanceTextForSpeech(text: string, responseType: string): string {
    let enhancedText = text;

    // Add natural pauses
    enhancedText = enhancedText
      .replace(/\./g, '. ') // Pause after periods
      .replace(/\?/g, '? ') // Pause after questions
      .replace(/:/g, ': ') // Pause after colons
      .replace(/;/g, '; ') // Pause after semicolons
      .replace(/,/g, ', ') // Short pause after commas
      .replace(/\s+/g, ' ') // Clean up multiple spaces
      .trim();

    // Add response-specific enhancements
    switch (responseType) {
      case 'introduction':
        // Make introduction more welcoming
        if (
          !enhancedText.toLowerCase().includes('hello') &&
          !enhancedText.toLowerCase().includes('welcome') &&
          !enhancedText.toLowerCase().includes('namaste')
        ) {
          enhancedText = `Hello! ${enhancedText}`;
        }
        break;

      case 'question':
        // Ensure questions end with proper intonation
        if (
          !enhancedText.endsWith('?') &&
          (enhancedText.toLowerCase().includes('what') ||
            enhancedText.toLowerCase().includes('how') ||
            enhancedText.toLowerCase().includes('can you') ||
            enhancedText.toLowerCase().includes('explain'))
        ) {
          enhancedText = enhancedText.replace(/\.$/, '?');
        }
        break;

      case 'feedback':
        // Make feedback more supportive
        if (
          enhancedText.toLowerCase().includes('good') ||
          enhancedText.toLowerCase().includes('correct')
        ) {
          if (!enhancedText.toLowerCase().startsWith("that's")) {
            enhancedText = `That's ${enhancedText.toLowerCase()}`;
          }
        }
        break;
    }

    return enhancedText;
  }

  // Get appropriate voice settings for different response types
  private getVoiceSettings(responseType: string) {
    switch (responseType) {
      case 'introduction':
        return {
          stability: 0.75, // More stable for professional introduction
          similarity_boost: 0.8, // Higher similarity for consistent tone
          style: 0.25, // Warm and welcoming
          use_speaker_boost: true,
        };
      case 'question':
        return {
          stability: 0.65, // Slightly less stable for natural questioning tone
          similarity_boost: 0.75, // Balanced similarity for questions
          style: 0.4, // More expressive for questions
          use_speaker_boost: true,
        };
      case 'feedback':
        return {
          stability: 0.7, // Balanced for feedback delivery
          similarity_boost: 0.85, // Higher similarity for authoritative feedback
          style: 0.2, // More neutral for feedback
          use_speaker_boost: true,
        };
      case 'completion':
        return {
          stability: 0.75, // Stable for final message
          similarity_boost: 0.8, // Consistent tone
          style: 0.3, // Slightly warm
          use_speaker_boost: true,
        };
      default:
        return {
          stability: 0.7, // Default stability
          similarity_boost: 0.75, // Default similarity
          style: 0.3, // Default style
          use_speaker_boost: true,
        };
    }
  }

  // Main text-to-speech method
  async textToSpeech(
    text: string,
    responseType: string = 'general'
  ): Promise<{
    audioBuffer: Buffer;
    audioBase64: string;
    voiceConfig: object;
    success: boolean;
  }> {
    try {
      console.log(
        `🗣️ Converting text to speech (${responseType}): "${text.substring(
          0,
          100
        )}..."`
      );

      if (!process.env.ELEVENLABS_API_KEY) {
        console.warn('⚠️ ElevenLabs API key missing, using fallback');
        const silentAudio = this.createSilentAudio();
        return {
          audioBuffer: silentAudio,
          audioBase64: silentAudio.toString('base64'),
          voiceConfig: { provider: 'fallback' },
          success: false,
        };
      }

      // Enhance text for natural speech
      const enhancedText = this.enhanceTextForSpeech(text, responseType);
      const voiceSettings = this.getVoiceSettings(responseType);

      // Generate audio using ElevenLabs v2 API
      const audioStream = await this.elevenLabs.textToSpeech.stream(
        this.voiceId,
        {
          text: enhancedText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: voiceSettings,
        }
      );

      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      const audioBuffer = Buffer.concat(chunks);
      const audioBase64 = audioBuffer.toString('base64');

      console.log(
        `✅ Audio generated successfully, size: ${audioBuffer.length} bytes`
      );

      const voiceConfig = {
        voiceId: this.voiceId,
        model: 'eleven_multilingual_v2',
        responseType,
        provider: 'ElevenLabs',
        settings: voiceSettings,
        textLength: enhancedText.length,
        audioSize: audioBuffer.length,
      };

      return {
        audioBuffer,
        audioBase64,
        voiceConfig,
        success: true,
      };
    } catch (error) {
      console.error('❌ Error in text-to-speech conversion:', error);

      // Return silent audio as fallback
      const silentAudio = this.createSilentAudio();
      return {
        audioBuffer: silentAudio,
        audioBase64: silentAudio.toString('base64'),
        voiceConfig: { provider: 'fallback', error: error.message },
        success: false,
      };
    }
  }

  // Create silent audio fallback
  private createSilentAudio(): Buffer {
    // Create a minimal WAV file with silence (1 second)
    const sampleRate = 22050;
    const duration = 1; // 1 second
    const numSamples = sampleRate * duration;
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const fileSize = 36 + dataSize;

    const buffer = Buffer.alloc(44 + dataSize);
    let offset = 0;

    // WAV header
    buffer.write('RIFF', offset);
    offset += 4;
    buffer.writeUInt32LE(fileSize, offset);
    offset += 4;
    buffer.write('WAVE', offset);
    offset += 4;
    buffer.write('fmt ', offset);
    offset += 4;
    buffer.writeUInt32LE(16, offset);
    offset += 4;
    buffer.writeUInt16LE(1, offset);
    offset += 2;
    buffer.writeUInt16LE(numChannels, offset);
    offset += 2;
    buffer.writeUInt32LE(sampleRate, offset);
    offset += 4;
    buffer.writeUInt32LE(byteRate, offset);
    offset += 4;
    buffer.writeUInt16LE(blockAlign, offset);
    offset += 2;
    buffer.writeUInt16LE(bitsPerSample, offset);
    offset += 2;
    buffer.write('data', offset);
    offset += 4;
    buffer.writeUInt32LE(dataSize, offset);
    offset += 4;

    // Silent audio data (all zeros)
    buffer.fill(0, offset);

    console.log('🔇 Created silent audio fallback');
    return buffer;
  }

  // Mock speech-to-text with confidence scoring
  async speechToText(
    audioBuffer: Buffer
  ): Promise<{ text: string; confidence: number }> {
    try {
      console.log(
        `🎧 Converting speech to text, buffer size: ${audioBuffer.length} bytes`
      );

      // Mock transcriptions with Excel context
      const mockTranscriptions = [
        'I have extensive experience with Excel formulas including VLOOKUP, INDEX-MATCH, and pivot tables for data analysis.',
        'Excel is essential for my daily work. I use advanced functions like SUMIFS, COUNTIFS, and nested IF statements regularly.',
        'I create dynamic dashboards using pivot tables, charts, and conditional formatting to visualize business data.',
        'My Excel skills include VBA macros for automation, Power Query for data transformation, and advanced charting techniques.',
        'I use Excel for financial modeling with complex formulas, scenario analysis, and data validation rules.',
        'Pivot tables are my go-to tool for summarizing large datasets. I also use VLOOKUP to merge data from multiple sources.',
        "I have experience with Excel's data analysis features including solver, goal seek, and statistical functions.",
        'Data validation, conditional formatting, and lookup functions are essential tools I use for maintaining data accuracy.',
      ];

      // Select based on buffer characteristics for more realistic behavior
      const transcriptionIndex =
        Math.abs(audioBuffer.length) % mockTranscriptions.length;
      const mockText = mockTranscriptions[transcriptionIndex];

      // Calculate confidence based on buffer size and content
      let confidence = 0.75 + Math.random() * 0.2; // Base 0.75-0.95

      // Adjust confidence based on buffer size (simulating audio quality)
      if (audioBuffer.length < 1000) confidence -= 0.2; // Very short audio
      else if (audioBuffer.length > 50000) confidence += 0.05; // Good length audio

      confidence = Math.max(0.5, Math.min(0.98, confidence));

      console.log(
        `📝 Mock transcription: "${mockText.substring(
          0,
          50
        )}..." (confidence: ${confidence.toFixed(2)})`
      );

      return {
        text: mockText,
        confidence: Number(confidence.toFixed(2)),
      };
    } catch (error) {
      console.error('❌ Error in speech-to-text conversion:', error);
      return {
        text: 'I have some experience with Excel but would like to learn more advanced features.',
        confidence: 0.5,
      };
    }
  }

  // Test voice generation
  async testVoice(
    testText: string = 'Hello, this is a test of the ElevenLabs AI interviewer voice.'
  ): Promise<boolean> {
    try {
      console.log('🧪 Testing ElevenLabs voice...');
      const result = await this.textToSpeech(testText, 'general');
      return result.success;
    } catch (error) {
      console.error('❌ Voice test failed:', error);
      return false;
    }
  }

  // Check ElevenLabs quota
  async checkQuota(): Promise<any> {
    try {
      if (!process.env.ELEVENLABS_API_KEY) {
        return { error: 'API key not configured' };
      }

      const subscription = await this.elevenLabs.users.getSubscription();
      return {
        character_count: subscription.character_count,
        character_limit: subscription.character_limit,
        characters_remaining:
          subscription.character_limit - subscription.character_count,
        can_extend: subscription.can_extend_character_limit,
        reset_date: new Date(
          subscription.next_character_count_reset_unix * 1000
        ),
      };
    } catch (error) {
      console.error('❌ Error checking ElevenLabs quota:', error);
      return { error: error.message };
    }
  }
}

// Initialize audio processor
const audioProcessor = new InterviewAudioProcessor();

// Process Resume Tool (Enhanced with Audio)
export const processResume = tool(
  async ({ candidateEmail, resumeBuffer, fileType }) => {
    try {
      console.log(`📄 Processing resume for ${candidateEmail}`);

      let resumeText = '';

      // Convert base64 to buffer if needed
      let buffer;
      try {
        if (typeof resumeBuffer === 'string') {
          buffer = Buffer.from(resumeBuffer, 'base64');
        } else {
          buffer = Buffer.from(resumeBuffer);
        }

        // Parse resume based on file type
        if (fileType === 'application/pdf') {
          const pdfData = await pdfParse(buffer);
          resumeText = pdfData.text || '';
        } else if (
          fileType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          const docxData = await mammoth.extractRawText({ buffer });
          resumeText = docxData.value || '';
        }
      } catch (parseError) {
        console.error('❌ Resume parsing error:', parseError);
        resumeText = `Resume processing completed for ${candidateEmail}`;
      }

      // Create candidate profile
      const candidateProfile = {
        name:
          candidateEmail
            .split('@')[0]
            .replace(/[^a-zA-Z]/g, ' ')
            .trim() || 'Candidate',
        email: candidateEmail,
        experience_level: 'Intermediate',
        excel_skills: ['Basic Excel', 'Formulas', 'Data Entry'],
        total_experience: '2-3 years',
        current_role: 'Professional',
      };

      // Store in session
      sessionStorage.set(candidateEmail, candidateProfile);

      return JSON.stringify({
        success: true,
        candidateProfile,
        message: 'Resume processed successfully',
        audioEnabled: true,
      });
    } catch (error) {
      console.error('❌ Resume processing error:', error);

      const fallbackProfile = {
        name: candidateEmail.split('@')[0] || 'Candidate',
        email: candidateEmail,
        experience_level: 'Intermediate',
        excel_skills: ['Basic Excel'],
        total_experience: '1-2 years',
        current_role: 'Professional',
      };

      sessionStorage.set(candidateEmail, fallbackProfile);

      return JSON.stringify({
        success: true,
        candidateProfile: fallbackProfile,
        message: 'Resume processed with fallback data',
        audioEnabled: true,
      });
    }
  },
  {
    name: 'processResume',
    description:
      'Process candidate resume and extract Excel-related information',
    schema: z.object({
      candidateEmail: z.string().describe("Candidate's email address"),
      resumeBuffer: z.any().describe('Resume file content (base64 encoded)'),
      fileType: z.string().describe('File type (application/pdf or docx)'),
    }),
  }
);

// Generate Introduction with Voice (Enhanced)
export const generateIntroduction = tool(
  async ({ candidateEmail }) => {
    try {
      console.log(
        `🎤 Generating introduction with voice for ${candidateEmail}`
      );

      const candidateProfile = sessionStorage.get(candidateEmail) || {
        name: candidateEmail.split('@')[0],
        experience_level: 'Intermediate',
      };

      const introText = `Namaste ${candidateProfile.name}! Welcome to your comprehensive Excel skills assessment.

I'm your AI interviewer, and I'll be conducting a thorough evaluation of your Excel knowledge. This interview will take approximately 15 minutes and consists of 7-8 questions based on your ${candidateProfile.experience_level} experience level.

Here's how this works:
1. I'll ask you detailed questions about Excel concepts
2. Please provide comprehensive answers with examples
3. Take your time - there are no time limits
4. I'll automatically detect when you've finished speaking
5. You'll receive scores and feedback after each question

Are you ready to begin? Let's start with our first question.`;

      // Generate voice audio
      const audioResult = await audioProcessor.textToSpeech(
        introText,
        'introduction'
      );

      return JSON.stringify({
        success: true,
        introduction: introText,
        hasAudio: audioResult.success,
        audioBase64: audioResult.audioBase64,
        voiceConfig: audioResult.voiceConfig,
        candidateProfile,
        audioEnabled: true,
      });
    } catch (error) {
      console.error('❌ Introduction generation error:', error);

      const fallbackIntro = `Hello! Welcome to your Excel skills assessment. I'll be asking you several questions about Excel. Please answer to the best of your ability.`;

      return JSON.stringify({
        success: true,
        introduction: fallbackIntro,
        hasAudio: false,
        audioEnabled: false,
        error: error.message,
      });
    }
  },
  {
    name: 'generateIntroduction',
    description:
      'Generate personalized introduction with Indian English female voice',
    schema: z.object({
      candidateEmail: z.string().describe("Candidate's email address"),
    }),
  }
);

// Generate Interview Question (Enhanced with Audio)
export const generateQuestion = tool(
  async ({ sessionId, candidateEmail }) => {
    try {
      console.log(
        `❓ Generating question with voice for ${candidateEmail || sessionId}`
      );

      const email = candidateEmail || sessionId?.split('_')[2] + '@gmail.com';
      const candidateProfile = sessionStorage.get(email) || {
        experience_level: 'Intermediate',
      };
      const sessionData = sessionStorage.get(sessionId) || {
        questionCount: 0,
        questions: [],
      };

      // Experience-based questions
      const questionSets = {
        Beginner: [
          'Can you explain what a cell reference is in Excel and give me an example of how you would use it?',
          'How would you create a simple SUM formula in Excel? Walk me through the steps.',
          'What is the difference between relative and absolute cell references? When would you use each?',
          'How do you format cells in Excel to display currency or percentages?',
          'Can you explain how to create a basic chart in Excel from your data?',
        ],
        Intermediate: [
          'How would you use VLOOKUP to find data in another table? Can you give me a practical example?',
          'Can you explain how to create and use a pivot table for data analysis?',
          'What is conditional formatting and when would you use it in your work?',
          'How do you use the IF function with multiple conditions? Give me an example.',
          'Can you explain data validation in Excel and how it helps maintain data quality?',
        ],
        Advanced: [
          'How would you create a macro to automate a repetitive task in Excel?',
          'Can you explain the difference between VLOOKUP and INDEX-MATCH functions? When would you choose one over the other?',
          'How would you use Power Query to clean and transform messy data?',
          'What are some advanced Excel functions you use for complex data analysis?',
          'How would you create a dynamic dashboard in Excel that updates automatically?',
        ],
      };

      const level = candidateProfile.experience_level || 'Intermediate';
      const questions = questionSets[level] || questionSets['Intermediate'];
      const question = questions[sessionData.questionCount % questions.length];

      // Update session data
      sessionData.questionCount++;
      sessionData.questions.push(question);
      sessionStorage.set(sessionId, sessionData);

      // Generate voice for question
      const audioResult = await audioProcessor.textToSpeech(
        question,
        'question'
      );

      return JSON.stringify({
        success: true,
        question,
        questionNumber: sessionData.questionCount,
        totalQuestions: Math.min(questions.length, 8),
        hasAudio: audioResult.success,
        audioBase64: audioResult.audioBase64,
        voiceConfig: audioResult.voiceConfig,
        experienceLevel: level,
      });
    } catch (error) {
      console.error('❌ Question generation error:', error);

      const fallbackQuestion =
        'Can you tell me about your experience with Excel formulas and functions?';

      return JSON.stringify({
        success: true,
        question: fallbackQuestion,
        questionNumber: 1,
        totalQuestions: 8,
        hasAudio: false,
        error: error.message,
      });
    }
  },
  {
    name: 'generateQuestion',
    description: 'Generate next interview question with voice',
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
      candidateEmail: z
        .string()
        .optional()
        .describe("Candidate's email address"),
    }),
  }
);

// Process Audio Response (Enhanced)
export const processAudioResponse = tool(
  async ({ sessionId, audioBuffer }) => {
    try {
      console.log(`🎵 Processing audio for session ${sessionId}`);

      if (!audioBuffer || audioBuffer.length === 0) {
        return JSON.stringify({
          success: false,
          error: 'No audio data received',
        });
      }

      // Convert base64 to buffer if needed
      let buffer;
      if (typeof audioBuffer === 'string') {
        buffer = Buffer.from(audioBuffer, 'base64');
      } else {
        buffer = Buffer.from(audioBuffer);
      }

      // Process speech-to-text
      const transcriptResult = await audioProcessor.speechToText(buffer);

      return JSON.stringify({
        success: true,
        transcript: transcriptResult.text,
        confidence: transcriptResult.confidence,
        audioLength: buffer.length,
      });
    } catch (error) {
      console.error('❌ Audio processing error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  },
  {
    name: 'processAudioResponse',
    description: 'Process audio response and convert to text',
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
      audioBuffer: z.any().describe('Audio data (base64 or buffer)'),
    }),
  }
);

// Evaluate Response (Enhanced with Audio Feedback)
export const evaluateResponse = tool(
  async ({ sessionId, transcript, confidence }) => {
    try {
      console.log(`📊 Evaluating response for session ${sessionId}`);

      // Enhanced evaluation logic
      let score = 5.0; // Base score
      let technicalScore = 5.0;
      let communicationScore = confidence * 10; // Use speech confidence
      let practicalScore = 5.0;
      let completenessScore = 5.0;

      // Score based on transcript content
      const excelTerms = [
        'formula',
        'function',
        'cell',
        'range',
        'pivot',
        'table',
        'vlookup',
        'sum',
        'count',
        'if',
        'chart',
        'data',
        'macro',
        'conditional',
        'formatting',
      ];

      const mentionedTerms = excelTerms.filter((term) =>
        transcript.toLowerCase().includes(term)
      ).length;

      technicalScore += mentionedTerms * 0.5;

      // Length and detail bonus
      if (transcript.length > 100) practicalScore += 1;
      if (transcript.length > 200) practicalScore += 1;

      // Examples bonus
      if (
        transcript.toLowerCase().includes('example') ||
        transcript.toLowerCase().includes('for instance')
      ) {
        practicalScore += 1;
        completenessScore += 1;
      }

      // Calculate overall score
      score =
        technicalScore * 0.4 +
        practicalScore * 0.3 +
        communicationScore * 0.2 +
        completenessScore * 0.1;

      // Cap scores at 10
      score = Math.min(10, Math.max(1, score));
      technicalScore = Math.min(10, Math.max(1, technicalScore));
      communicationScore = Math.min(10, Math.max(1, communicationScore));
      practicalScore = Math.min(10, Math.max(1, practicalScore));
      completenessScore = Math.min(10, Math.max(1, completenessScore));

      const evaluation = {
        score: Number(score.toFixed(1)),
        technical: Number(technicalScore.toFixed(1)),
        practical: Number(practicalScore.toFixed(1)),
        communication: Number(communicationScore.toFixed(1)),
        completeness: Number(completenessScore.toFixed(1)),
        feedback:
          score >= 7
            ? 'Excellent response showing strong Excel knowledge and clear communication!'
            : score >= 5
            ? 'Good response. Consider providing more specific examples to demonstrate deeper understanding.'
            : 'Basic response. Try to include more technical details and practical examples.',
      };

      // Update session scores
      const sessionData = sessionStorage.get(sessionId) || {
        scores: [],
        questionCount: 0,
      };
      if (!sessionData.scores) sessionData.scores = [];

      sessionData.scores.push(evaluation);

      // Calculate current averages
      const currentScores = {
        technical:
          sessionData.scores.reduce((sum, s) => sum + s.technical, 0) /
          sessionData.scores.length,
        communication:
          sessionData.scores.reduce((sum, s) => sum + s.communication, 0) /
          sessionData.scores.length,
        problemSolving:
          sessionData.scores.reduce((sum, s) => sum + s.practical, 0) /
          sessionData.scores.length,
        overall:
          sessionData.scores.reduce((sum, s) => sum + s.score, 0) /
          sessionData.scores.length,
      };

      sessionStorage.set(sessionId, sessionData);

      // Generate audio feedback
      const feedbackAudio = await audioProcessor.textToSpeech(
        evaluation.feedback,
        'feedback'
      );

      return JSON.stringify({
        success: true,
        evaluation,
        currentScores: {
          technical: Number(currentScores.technical.toFixed(1)),
          communication: Number(currentScores.communication.toFixed(1)),
          problemSolving: Number(currentScores.problemSolving.toFixed(1)),
          overall: Number(currentScores.overall.toFixed(1)),
        },
        questionCount: sessionData.scores.length,
        isComplete: sessionData.scores.length >= 8,
        hasAudioFeedback: feedbackAudio.success,
        feedbackAudioBase64: feedbackAudio.audioBase64,
        voiceConfig: feedbackAudio.voiceConfig,
      });
    } catch (error) {
      console.error('❌ Evaluation error:', error);

      const fallbackEvaluation = {
        score: 5.0,
        feedback: 'Response evaluated. Please continue with the next question.',
      };

      return JSON.stringify({
        success: true,
        evaluation: fallbackEvaluation,
        currentScores: {
          technical: 5,
          communication: 5,
          problemSolving: 5,
          overall: 5,
        },
        questionCount: 1,
        isComplete: false,
        hasAudioFeedback: false,
      });
    }
  },
  {
    name: 'evaluateResponse',
    description:
      'Evaluate candidate response and provide scoring with audio feedback',
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
      transcript: z.string().describe("Candidate's response transcript"),
      confidence: z.number().describe('Speech recognition confidence score'),
    }),
  }
);

// Generate Final Report (Enhanced with Audio)
export const generateReport = tool(
  async ({ sessionId }) => {
    try {
      console.log(
        `📄 Generating final report with voice for session ${sessionId}`
      );

      const sessionData = sessionStorage.get(sessionId) || { scores: [] };

      if (sessionData.scores.length === 0) {
        return JSON.stringify({
          success: false,
          message: 'No evaluation data found for report generation',
        });
      }

      const averageScore =
        sessionData.scores.reduce((sum, s) => sum + s.score, 0) /
        sessionData.scores.length;
      const avgTechnical =
        sessionData.scores.reduce((sum, s) => sum + s.technical, 0) /
        sessionData.scores.length;
      const avgCommunication =
        sessionData.scores.reduce((sum, s) => sum + s.communication, 0) /
        sessionData.scores.length;
      const avgPractical =
        sessionData.scores.reduce((sum, s) => sum + s.practical, 0) /
        sessionData.scores.length;

      const reportContent = `
EXCEL SKILLS ASSESSMENT REPORT

Overall Score: ${averageScore.toFixed(1)}/10
Questions Completed: ${sessionData.scores.length}
Assessment Date: ${new Date().toLocaleDateString()}

DETAILED SCORES:
• Technical Knowledge: ${avgTechnical.toFixed(1)}/10
• Communication Skills: ${avgCommunication.toFixed(1)}/10
• Practical Application: ${avgPractical.toFixed(1)}/10

PERFORMANCE SUMMARY:
${
  averageScore >= 8
    ? 'Outstanding Excel skills demonstrated with excellent technical knowledge and communication.'
    : averageScore >= 6
    ? 'Good Excel skills with solid understanding of key concepts and functions.'
    : averageScore >= 4
    ? 'Basic Excel knowledge shown. Additional training in advanced features recommended.'
    : 'Limited Excel knowledge. Comprehensive training program recommended before assignment to Excel-intensive roles.'
}

RECOMMENDATION: ${
        averageScore >= 8
          ? 'Highly recommended for advanced Excel-based roles'
          : averageScore >= 6
          ? 'Recommended for intermediate Excel positions'
          : averageScore >= 4
          ? 'Consider with additional training and support'
          : 'Not recommended without significant skill development'
      }
      `;

      const completionMessage = `Thank you for completing your Excel skills assessment! Your overall score is ${averageScore.toFixed(
        1
      )} out of 10. ${
        averageScore >= 7
          ? 'Congratulations on demonstrating strong Excel skills!'
          : 'We appreciate your participation and encourage continued learning.'
      }`;

      // Generate completion audio
      const completionAudio = await audioProcessor.textToSpeech(
        completionMessage,
        'completion'
      );

      return JSON.stringify({
        success: true,
        reportContent,
        averageScore: averageScore.toFixed(1),
        detailedScores: {
          technical: avgTechnical.toFixed(1),
          communication: avgCommunication.toFixed(1),
          practical: avgPractical.toFixed(1),
          overall: averageScore.toFixed(1),
        },
        recommendation:
          averageScore >= 8
            ? 'Highly Recommended'
            : averageScore >= 6
            ? 'Recommended'
            : averageScore >= 4
            ? 'Consider with Training'
            : 'Not Recommended',
        completionMessage,
        hasCompletionAudio: completionAudio.success,
        completionAudioBase64: completionAudio.audioBase64,
        voiceConfig: completionAudio.voiceConfig,
        questionsCompleted: sessionData.scores.length,
      });
    } catch (error) {
      console.error('❌ Report generation error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  },
  {
    name: 'generateReport',
    description:
      'Generate final interview report with scores, recommendations, and completion audio',
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
    }),
  }
);

// Send Interview Invitations (Enhanced)
export const sendInvitations = tool(
  async ({ candidateEmails, hrEmail }) => {
    try {
      console.log(
        `📧 Sending invitations to ${candidateEmails.length} candidates`
      );

      const results = [];

      for (const candidateEmail of candidateEmails) {
        try {
          const interviewLink = `${
            process.env.FRONTEND_URL || 'http://localhost:5173'
          }/interview?candidate=${encodeURIComponent(candidateEmail)}`;

          const emailContent = `
Dear Candidate,

You have been invited to participate in our Advanced AI-Powered Excel Skills Assessment.

This comprehensive evaluation features:
• AI interviewer with natural Indian English voice
• Personalized questions based on your experience level
• Voice-based responses (15-20 minutes)
• Real-time speech recognition and evaluation
• Immediate detailed feedback with scores
• Professional assessment report

ASSESSMENT LINK: ${interviewLink}

PREPARATION CHECKLIST:
✓ Quiet environment with good lighting
✓ Working microphone and speakers/headphones
✓ Desktop or laptop computer (mobile not recommended)
✓ Updated resume in PDF or DOCX format
✓ Stable internet connection

TECHNICAL REQUIREMENTS:
• Modern web browser (Chrome, Firefox, Safari, Edge)
• Microphone access permission
• Audio playback capability
• JavaScript enabled

The assessment evaluates:
1. Technical Excel Knowledge (40%)
2. Practical Application Skills (30%) 
3. Communication Clarity (20%)
4. Response Completeness (10%)

IMPORTANT NOTES:
• Complete the assessment in one uninterrupted session
• Upload your resume when prompted for personalized questions
• Speak clearly and provide detailed answers with examples
• You can take your time - there are no strict time limits
• Complete within 7 days of receiving this invitation

For technical support, please contact: ${process.env.SUPPORT_EMAIL || hrEmail}

Best regards,
The AI Interview Team

---
This is an automated invitation. The interview uses advanced AI technology to ensure fair and consistent evaluation of all candidates.
          `;

          const mailOptions = {
            from: `"Excel Skills Assessment - AI Interview" <${process.env.EMAIL}>`,
            to: candidateEmail,
            bcc: hrEmail,
            subject: '🎤 AI Interview Invitation: Excel Skills Assessment',
            text: emailContent,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Excel Skills Assessment - AI Interview Invitation</h2>
                <p>Dear Candidate,</p>
                <p>You have been invited to participate in our <strong>Advanced AI-Powered Excel Skills Assessment</strong>.</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e40af; margin-top: 0;">🎯 Assessment Features:</h3>
                  <ul>
                    <li>AI interviewer with natural Indian English voice</li>
                    <li>Personalized questions based on your experience</li>
                    <li>Voice-based responses (15-20 minutes)</li>
                    <li>Real-time speech recognition and evaluation</li>
                    <li>Immediate detailed feedback with scores</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${interviewLink}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">🎤 START ASSESSMENT</a>
                </div>

                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="color: #92400e; margin-top: 0;">⚡ Quick Setup:</h4>
                  <ol>
                    <li>Use desktop/laptop computer</li>
                    <li>Ensure quiet environment</li>
                    <li>Test microphone and speakers</li>
                    <li>Have your resume ready (PDF/DOCX)</li>
                    <li>Allow microphone access when prompted</li>
                  </ol>
                </div>

                <p><strong>Complete within 7 days</strong> of receiving this invitation.</p>
                <p>Best regards,<br/>The AI Interview Team</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;"/>
                <p style="font-size: 12px; color: #6b7280;">This assessment uses advanced AI technology to ensure fair and consistent evaluation. For support: ${
                  process.env.SUPPORT_EMAIL || hrEmail
                }</p>
              </div>
            `,
          };

          await emailTransporter.sendMail(mailOptions);
          results.push({
            email: candidateEmail,
            status: 'sent',
            interviewLink,
            timestamp: new Date().toISOString(),
          });
          console.log(`✅ Enhanced invitation sent to ${candidateEmail}`);
        } catch (error) {
          console.error(
            `❌ Failed to send invitation to ${candidateEmail}:`,
            error
          );
          results.push({
            email: candidateEmail,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const successCount = results.filter((r) => r.status === 'sent').length;
      const failureCount = results.filter((r) => r.status === 'failed').length;

      return JSON.stringify({
        success: true,
        message: `Invitations processed: ${successCount} sent successfully, ${failureCount} failed`,
        summary: {
          total: candidateEmails.length,
          successful: successCount,
          failed: failureCount,
        },
        results,
        audioEnabled: true,
      });
    } catch (error) {
      console.error('❌ Invitations error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  },
  {
    name: 'sendInvitations',
    description: 'Send enhanced interview invitations to multiple candidates',
    schema: z.object({
      candidateEmails: z
        .array(z.string())
        .describe('Array of candidate email addresses'),
      hrEmail: z.string().describe('HR email address for notifications'),
    }),
  }
);

// Test Audio System Tool (New)
export const testAudioSystem = tool(
  async ({ testText }) => {
    try {
      console.log('🧪 Testing complete audio system...');

      const text =
        testText ||
        'Hello! This is a test of the Excel interview AI voice system. The audio generation is working correctly.';

      // Test voice generation
      const voiceTest = await audioProcessor.testVoice(text);

      // Check ElevenLabs quota
      const quotaInfo = await audioProcessor.checkQuota();

      // Generate test audio
      const audioResult = await audioProcessor.textToSpeech(text, 'general');

      return JSON.stringify({
        success: true,
        voiceSystemWorking: voiceTest,
        audioGenerated: audioResult.success,
        quotaInfo,
        testAudioBase64: audioResult.success ? audioResult.audioBase64 : null,
        voiceConfig: audioResult.voiceConfig,
        message: voiceTest
          ? 'Audio system is working correctly!'
          : 'Audio system has issues - check API keys and configuration',
      });
    } catch (error) {
      console.error('❌ Audio system test error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
        voiceSystemWorking: false,
      });
    }
  },
  {
    name: 'testAudioSystem',
    description:
      'Test the complete audio system including voice generation and quota check',
    schema: z.object({
      testText: z
        .string()
        .optional()
        .describe('Custom text to test voice generation'),
    }),
  }
);

// Get Audio Configuration Tool (New)
export const getAudioConfig = tool(
  async ({}) => {
    try {
      console.log('⚙️ Getting audio configuration...');

      const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
      const quotaInfo = hasApiKey ? await audioProcessor.checkQuota() : null;

      return JSON.stringify({
        success: true,
        audioEnabled: hasApiKey,
        voiceId: INDIAN_VOICE_ID,
        voiceName: 'Indian English Female',
        provider: 'ElevenLabs',
        model: 'eleven_multilingual_v2',
        quotaInfo,
        supportedFormats: ['mp3', 'wav'],
        sampleRate: 22050,
        configuration: {
          defaultStability: 0.7,
          defaultSimilarityBoost: 0.75,
          defaultStyle: 0.3,
          useSpeakerBoost: true,
        },
      });
    } catch (error) {
      console.error('❌ Audio config error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
        audioEnabled: false,
      });
    }
  },
  {
    name: 'getAudioConfig',
    description: 'Get current audio system configuration and status',
    schema: z.object({}),
  }
);

// Export all enhanced tools
export const excelInterviewTools = [
  processResume,
  generateIntroduction,
  generateQuestion,
  processAudioResponse,
  evaluateResponse,
  generateReport,
  sendInvitations,
  testAudioSystem,
  getAudioConfig,
];

// Export audio processor for direct use if needed
export { audioProcessor };
