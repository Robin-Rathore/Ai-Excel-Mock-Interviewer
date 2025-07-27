//@ts-nocheck
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { RedisClient } from '../services/RedisClient.js';
import { ResumeParser } from '../services/ResumeParser.js';
import { ReportGenerator } from '../services/ReportGenerator.js';
import { AudioProcessor } from '../services/AudioProcessor.js';
import { AIAgent } from '../services/AIAgent.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize services
const redisClient = new RedisClient();
const resumeParser = new ResumeParser();
const reportGenerator = new ReportGenerator();
const audioProcessor = new AudioProcessor();
const aiAgent = new AIAgent();

// Email configuration with enhanced Gmail setu

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Test the email connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Enhanced Resume Parser Tool with robust fallbacks
export const parseResume = tool(
  async ({ resumeBuffer, candidateEmail, fileType }) => {
    try {
      console.log(`📄 Processing ${fileType} file for ${candidateEmail}`);

      let resumeText = '';
      let parseMethod = 'unknown';

      // Convert base64 to buffer if needed
      let buffer;
      if (typeof resumeBuffer === 'string') {
        if (resumeBuffer.startsWith('data:')) {
          const base64Data = resumeBuffer.split(',')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          buffer = Buffer.from(resumeBuffer, 'base64');
        }
      } else {
        buffer = resumeBuffer;
      }

      console.log(
        `📄 Processing ${fileType} file, size: ${buffer.length} bytes`
      );

      // Try to parse based on file type
      try {
        if (fileType === 'application/pdf' || fileType === 'pdf') {
          const pdfData = await pdf(buffer);
          resumeText = pdfData.text || '';
          parseMethod = 'pdf_success';
          console.log(
            `✅ PDF parsed successfully, text length: ${resumeText.length}`
          );
        } else if (
          fileType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          fileType === 'docx'
        ) {
          const docxData = await mammoth.extractRawText({ buffer });
          resumeText = docxData.value || '';
          parseMethod = 'docx_success';
          console.log(
            `✅ DOCX parsed successfully, text length: ${resumeText.length}`
          );
        } else {
          throw new Error(`Unsupported file type: ${fileType}`);
        }
      } catch (parseError) {
        console.error(
          `❌ ${fileType.toUpperCase()} parsing error:`,
          parseError.message
        );
        resumeText = `Resume for ${candidateEmail}. ${fileType.toUpperCase()} parsing encountered issues.`;
        parseMethod = 'parse_fallback';
      }

      // Ensure we have some text to work with
      if (!resumeText || resumeText.trim().length < 10) {
        resumeText = `Resume for ${candidateEmail}. File processing completed with limited text extraction.`;
        parseMethod = 'minimal_fallback';
      }

      console.log(`📋 Resume text preview: ${resumeText.substring(0, 100)}...`);

      // Extract candidate information using AI
      let candidateProfile;
      try {
        const aiResponse = await aiAgent.extractCandidateInfo(
          resumeText,
          candidateEmail
        );
        console.log(
          `🤖 AI extraction response: ${aiResponse.substring(0, 200)}...`
        );

        // Try to parse JSON response
        let extractedData;
        try {
          // Clean the response to extract JSON
          const jsonMatch =
            aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
            aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            extractedData = JSON.parse(jsonStr);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (jsonError) {
          console.error(`❌ JSON parsing error, using structured fallback`);
          throw new Error('JSON parsing failed');
        }

        // Create structured profile from AI extraction
        candidateProfile = {
          name: extractedData.name || candidateEmail.split('@')[0],
          email: candidateEmail,
          phone: extractedData.phone || 'Unknown',
          experience_level: extractedData.experience_level || 'Intermediate',
          excel_skills: Array.isArray(extractedData.excel_skills)
            ? extractedData.excel_skills
            : ['Basic Excel', 'Formulas', 'Data Entry'],
          total_experience: extractedData.total_experience || '2-3 years',
          current_role: extractedData.current_role || 'Professional',
          education: extractedData.education || 'Unknown',
          certifications: Array.isArray(extractedData.certifications)
            ? extractedData.certifications
            : [],
          projects: Array.isArray(extractedData.projects)
            ? extractedData.projects
            : [],
        };
        parseMethod = 'ai_extraction';
      } catch (aiError) {
        console.error(
          `❌ AI extraction error, using structured fallback:`,
          aiError.message
        );

        // Structured fallback based on email and basic analysis
        const nameFromEmail = candidateEmail
          .split('@')[0]
          .replace(/[^a-zA-Z]/g, '');
        const capitalizedName =
          nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

        candidateProfile = {
          name: capitalizedName,
          email: candidateEmail,
          phone: 'Unknown',
          experience_level: 'Intermediate',
          excel_skills: [
            'Basic Excel',
            'Formulas',
            'Data Entry',
            'Charts',
            'Pivot Tables',
          ],
          total_experience: '2-3 years',
          current_role: 'Professional',
          education: 'Unknown',
          certifications: [],
          projects: [],
        };
        parseMethod = 'ai_fallback';
      }

      // Store the profile in Redis
      await redisClient.setCandidateProfile(candidateEmail, candidateProfile);
      console.log(
        `✅ Stored profile for ${candidateEmail}: ${candidateProfile.name} (method: ${parseMethod})`
      );

      return JSON.stringify({
        success: true,
        candidateProfile,
        parseMethod,
        resumeText: resumeText.substring(0, 500), // First 500 chars for reference
      });
    } catch (error) {
      console.error(`❌ Complete resume parsing failure:`, error);

      // Emergency fallback - always create a basic profile
      const nameFromEmail = candidateEmail
        .split('@')[0]
        .replace(/[^a-zA-Z]/g, '');
      const capitalizedName =
        nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

      const emergencyProfile = {
        name: capitalizedName,
        email: candidateEmail,
        phone: 'Unknown',
        experience_level: 'Intermediate',
        excel_skills: ['Basic Excel', 'Data Entry', 'Formulas'],
        total_experience: '1-2 years',
        current_role: 'Professional',
        education: 'Unknown',
        certifications: [],
        projects: [],
      };

      try {
        await redisClient.setCandidateProfile(candidateEmail, emergencyProfile);
        console.log(
          `🆘 Emergency profile created for ${candidateEmail}: ${emergencyProfile.name}`
        );
      } catch (redisError) {
        console.error(`❌ Redis storage failed:`, redisError);
      }

      return JSON.stringify({
        success: true, // Always return success to continue the interview
        candidateProfile: emergencyProfile,
        parseMethod: 'emergency_fallback',
        resumeText: `Resume processing completed for ${candidateEmail}`,
      });
    }
  },
  {
    name: 'parseResume',
    description:
      'Parse candidate resume and extract relevant information for Excel skills assessment',
    schema: z.object({
      resumeBuffer: z.string().describe('Base64 encoded resume file content'),
      candidateEmail: z.string().describe("Candidate's email address"),
      fileType: z
        .string()
        .describe(
          'File type (application/pdf or application/vnd.openxmlformats-officedocument.wordprocessingml.document)'
        ),
    }),
  }
);

// Enhanced Introduction Generator with multiple fallback layers
export const generateIntroduction = tool(
  async ({ candidateEmail }) => {
    try {
      console.log(`🎤 Generating introduction for ${candidateEmail}`);

      // Try to get candidate profile
      let candidateProfile;
      try {
        candidateProfile = await redisClient.getCandidateProfile(
          candidateEmail
        );
      } catch (error) {
        console.log(`⚠️ Could not retrieve profile, creating basic one`);
        candidateProfile = null;
      }

      // If no profile exists, create a basic one
      if (!candidateProfile) {
        const nameFromEmail = candidateEmail
          .split('@')[0]
          .replace(/[^a-zA-Z]/g, '');
        const capitalizedName =
          nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

        candidateProfile = {
          name: capitalizedName,
          email: candidateEmail,
          phone: 'Unknown',
          experience_level: 'Intermediate',
          excel_skills: ['Basic Excel', 'Data Entry', 'Formulas'],
          total_experience: '1-2 years',
          current_role: 'Professional',
          education: 'Unknown',
          certifications: [],
          projects: [],
        };

        // Store the basic profile
        try {
          await redisClient.setCandidateProfile(
            candidateEmail,
            candidateProfile
          );
        } catch (error) {
          console.error(`❌ Failed to store basic profile:`, error);
        }
      }

      // Create interview session
      const sessionId = uuidv4();
      const sessionData = {
        sessionId,
        candidateInfo: candidateProfile,
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
        lastActivity: new Date(),
      };

      await redisClient.setSession(sessionId, sessionData);
      console.log(
        `✅ Created interview session ${sessionId} for ${candidateProfile.name}`
      );

      // Generate personalized introduction
      const introduction = await aiAgent.generateIntroduction(candidateProfile);

      return JSON.stringify({
        success: true,
        sessionId,
        candidateProfile,
        introduction,
      });
    } catch (error) {
      console.error(`❌ Introduction generation error:`, error);

      // Emergency fallback introduction
      const nameFromEmail = candidateEmail
        .split('@')[0]
        .replace(/[^a-zA-Z]/g, '');
      const capitalizedName =
        nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      const sessionId = uuidv4();

      const emergencyIntroduction = `Hello ${capitalizedName}, welcome to your Excel skills assessment! I'm your AI interviewer, and I'm excited to evaluate your Excel capabilities today. 

This interview will take approximately 15-20 minutes and will consist of 7-8 questions designed to assess your technical Excel skills, practical application knowledge, and communication abilities.

Please speak clearly and take your time with each response. I'll be listening carefully and will automatically detect when you've finished speaking. If you don't know an answer, it's perfectly fine to say so - honesty is valued in this assessment.

Are you ready to begin? Let's start with our first question!`;

      return JSON.stringify({
        success: true,
        sessionId,
        candidateProfile: {
          name: capitalizedName,
          email: candidateEmail,
          experience_level: 'Intermediate',
        },
        introduction: emergencyIntroduction,
      });
    }
  },
  {
    name: 'generateIntroduction',
    description:
      'Generate personalized introduction for the candidate based on their profile',
    schema: z.object({
      candidateEmail: z.string().describe("Candidate's email address"),
    }),
  }
);

// Generate Next Question Tool
export const generateNextQuestion = tool(
  async ({ sessionId }) => {
    try {
      console.log(`❓ Generating next question for session ${sessionId}`);

      const sessionData = await redisClient.getSession(sessionId);
      if (!sessionData) {
        throw new Error('Session not found');
      }

      const question = await aiAgent.generateNextQuestion(
        sessionData.candidateInfo,
        sessionData.conversationHistory
      );

      // Update session with new question
      sessionData.currentQuestion = question;
      sessionData.currentState = 'questioning';
      sessionData.lastActivity = new Date();
      await redisClient.setSession(sessionId, sessionData);

      return JSON.stringify({
        success: true,
        question,
        questionNumber: sessionData.questionCount + 1,
        totalQuestions: 8,
      });
    } catch (error) {
      console.error(`❌ Question generation error:`, error);
      return JSON.stringify({
        success: false,
        error: error.message,
        question:
          'Can you tell me about your experience with Excel formulas and functions?',
      });
    }
  },
  {
    name: 'generateNextQuestion',
    description:
      'Generate the next interview question based on candidate profile and conversation history',
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
    }),
  }
);

// Process Audio Response Tool
export const processAudioResponse = tool(
  async ({ sessionId, audioBuffer }) => {
    try {
      console.log(`🎵 Processing audio for session ${sessionId}`);

      const sessionData = await redisClient.getSession(sessionId);
      if (!sessionData) {
        throw new Error('Session not found');
      }

      // Convert audio data to buffer
      const buffer = Buffer.from(audioBuffer);

      // Process speech to text
      const transcriptionResult = await audioProcessor.speechToText(buffer);
      const { text: transcript, confidence } = transcriptionResult;

      if (!transcript || transcript.trim().length < 3) {
        return JSON.stringify({
          success: false,
          error: 'Transcript too short or empty',
          message: 'Please try speaking again more clearly',
        });
      }

      return JSON.stringify({
        success: true,
        transcript,
        confidence,
      });
    } catch (error) {
      console.error(`❌ Audio processing error:`, error);
      return JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to process audio response',
      });
    }
  },
  {
    name: 'processAudioResponse',
    description: 'Process audio response from candidate and convert to text',
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
      audioBuffer: z
        .array(z.number())
        .describe('Audio data as array of numbers'),
    }),
  }
);

// Evaluate Response Tool
export const evaluateResponse = tool(
  async ({ sessionId, transcript, confidence = 1.0 }) => {
    try {
      console.log(`📊 Evaluating response for session ${sessionId}`);

      const sessionData = await redisClient.getSession(sessionId);
      if (!sessionData) {
        throw new Error('Session not found');
      }

      // Evaluate the response
      const evaluation = await aiAgent.evaluateResponse(
        sessionData.currentQuestion,
        transcript,
        confidence
      );

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
      const history = sessionData.conversationHistory;
      const count = history.length;

      if (count > 0) {
        sessionData.overallScores.technical =
          history.reduce((sum, item) => sum + item.evaluation.technical, 0) /
          count;
        sessionData.overallScores.communication =
          history.reduce(
            (sum, item) => sum + item.evaluation.communication,
            0
          ) / count;
        sessionData.overallScores.problemSolving =
          history.reduce((sum, item) => sum + item.evaluation.practical, 0) /
          count;
        sessionData.overallScores.overall =
          sessionData.overallScores.technical * 0.4 +
          sessionData.overallScores.communication * 0.2 +
          sessionData.overallScores.problemSolving * 0.3 +
          (history.reduce(
            (sum, item) => sum + item.evaluation.completeness,
            0
          ) /
            count) *
            0.1;
      }

      await redisClient.setSession(sessionId, sessionData);

      return JSON.stringify({
        success: true,
        evaluation,
        currentScores: sessionData.overallScores,
        questionCount: sessionData.questionCount,
        isComplete: sessionData.questionCount >= 8,
      });
    } catch (error) {
      console.error(`❌ Response evaluation error:`, error);
      return JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to evaluate response',
      });
    }
  },
  {
    name: 'evaluateResponse',
    description: "Evaluate candidate's response and provide scoring",
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
      transcript: z.string().describe("Candidate's response transcript"),
      confidence: z
        .number()
        .optional()
        .describe('Speech recognition confidence score'),
    }),
  }
);

// Generate Report Tool
export const generateReport = tool(
  async ({ sessionId }) => {
    try {
      console.log(`📄 Generating report for session ${sessionId}`);

      const sessionData = await redisClient.getSession(sessionId);
      if (!sessionData) {
        throw new Error('Session not found');
      }

      const reportBuffer = await reportGenerator.generatePDF(sessionData);

      return JSON.stringify({
        success: true,
        message: 'Report generated successfully',
        sessionId,
      });
    } catch (error) {
      console.error(`❌ Report generation error:`, error);
      return JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to generate report',
      });
    }
  },
  {
    name: 'generateReport',
    description: 'Generate PDF report for completed interview',
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
    }),
  }
);

// Send Thank You Email Tool
export const sendThankYouEmail = tool(
  async ({ sessionId, candidateEmail }) => {
    try {
      console.log(`📧 Sending thank you email for session ${sessionId}`);

      const sessionData = await redisClient.getSession(sessionId);
      if (!sessionData) {
        throw new Error('Session not found');
      }

      // Generate report first
      const reportBuffer = await reportGenerator.generatePDF(sessionData);

      // Email content
      const emailContent = `
Dear ${sessionData.candidateInfo.name},

Thank you for completing the Excel Skills Assessment! We appreciate the time you took to participate in our AI-powered interview process.

Your Assessment Summary:
• Overall Score: ${sessionData.overallScores.overall.toFixed(1)}/10
• Technical Skills: ${sessionData.overallScores.technical.toFixed(1)}/10
• Communication: ${sessionData.overallScores.communication.toFixed(1)}/10
• Problem Solving: ${sessionData.overallScores.problemSolving.toFixed(1)}/10

Please find your detailed assessment report attached to this email. The report includes:
- Question-by-question analysis
- Detailed feedback and recommendations
- Areas for improvement
- Next steps in the hiring process

Our HR team will review your assessment and contact you within 2-3 business days regarding the next steps.

If you have any questions about your assessment or the hiring process, please don't hesitate to reach out to us.

Best regards,
The Hiring Team
Excel Skills Assessment AI
      `;

      const mailOptions = {
        from: `"Excel Skills Assessment" <${process.env.EMAIL_USER}>`,
        to: candidateEmail,
        cc: process.env.HR_EMAIL,
        subject: `Excel Skills Assessment Results - ${sessionData.candidateInfo.name}`,
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>'),
        attachments: [
          {
            filename: `Excel_Assessment_Report_${sessionData.candidateInfo.name.replace(
              /\s+/g,
              '_'
            )}.pdf`,
            content: reportBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      await emailTransporter.sendMail(mailOptions);
      console.log(`✅ Thank you email sent to ${candidateEmail}`);

      return JSON.stringify({
        success: true,
        message: 'Thank you email sent successfully',
        candidateEmail,
      });
    } catch (error) {
      console.error(`❌ Email sending error:`, error);
      return JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to send thank you email',
      });
    }
  },
  {
    name: 'sendThankYouEmail',
    description: 'Send thank you email with assessment report to candidate',
    schema: z.object({
      sessionId: z.string().describe('Interview session ID'),
      candidateEmail: z.string().describe("Candidate's email address"),
    }),
  }
);

// Send Pre-screening Invitations Tool
export const sendPreScreeningInvitations = tool(
  async ({ candidateEmails, hrEmail }) => {
    try {
      console.log(
        `📧 Sending pre-screening invitations to ${candidateEmails.length} candidates`
      );

      const results = [];

      for (const candidateEmail of candidateEmails) {
        try {
          const interviewLink = `${
            process.env.FRONTEND_URL || 'http://localhost:3000'
          }/interview?candidate=${encodeURIComponent(candidateEmail)}`;

          const emailContent = `
Dear Candidate,

You have been invited to participate in our Excel Skills Assessment as part of our hiring process.

This is an AI-powered voice interview that will assess your Excel knowledge and skills. The assessment includes:

• Personalized questions based on your background
• Voice-based responses (approximately 15-20 minutes)
• Immediate feedback and scoring
• Detailed assessment report

To begin your assessment, please click the link below:
${interviewLink}

Important Instructions:
1. Ensure you have a quiet environment
2. Test your microphone and speakers
3. Use a desktop or laptop computer (mobile not recommended)
4. Complete the assessment in one session
5. Upload your resume when prompted

The assessment is available 24/7 and you can take it at your convenience. Please complete it within 7 days of receiving this invitation.

If you have any technical issues or questions, please contact our HR team at ${hrEmail}.

Best regards,
The Hiring Team
Excel Skills Assessment AI
          `;

          const mailOptions = {
            from: `"Excel Skills Assessment" <${process.env.EMAIL_USER}>`,
            to: candidateEmail,
            bcc: hrEmail,
            subject: 'Invitation: Excel Skills Assessment - AI Interview',
            text: emailContent,
            html: emailContent.replace(/\n/g, '<br>'),
          };

          await emailTransporter.sendMail(mailOptions);
          results.push({ email: candidateEmail, status: 'sent' });
          console.log(`✅ Invitation sent to ${candidateEmail}`);
        } catch (error) {
          console.error(
            `❌ Failed to send invitation to ${candidateEmail}:`,
            error
          );
          results.push({
            email: candidateEmail,
            status: 'failed',
            error: error.message,
          });
        }
      }

      return JSON.stringify({
        success: true,
        message: `Invitations processed for ${candidateEmails.length} candidates`,
        results,
      });
    } catch (error) {
      console.error(`❌ Pre-screening invitations error:`, error);
      return JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to send pre-screening invitations',
      });
    }
  },
  {
    name: 'sendPreScreeningInvitations',
    description:
      'Send pre-screening interview invitations to multiple candidates',
    schema: z.object({
      candidateEmails: z
        .array(z.string())
        .describe('Array of candidate email addresses'),
      hrEmail: z.string().describe('HR email address for notifications'),
    }),
  }
);

// Export all tools
export const excelInterviewTools = [
  parseResume,
  generateIntroduction,
  generateNextQuestion,
  processAudioResponse,
  evaluateResponse,
  generateReport,
  sendThankYouEmail,
  sendPreScreeningInvitations,
];
