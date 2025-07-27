//@ts-nocheck
import {
  Annotation,
  StateGraph,
  MessagesAnnotation,
} from '@langchain/langgraph';
import { ToolMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { excelInterviewTools } from './tools.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini AI
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-flash',
  temperature: 0.3,
  maxRetries: 2,
});

// Define state annotation for Excel interview
const ExcelInterviewStateAnnotation = Annotation.Root({
  candidateEmail: Annotation,
  sessionId: Annotation,
  currentStep: Annotation,
  interviewData: Annotation,
  audioBuffer: Annotation,
  transcript: Annotation,
  evaluation: Annotation,
  reportGenerated: Annotation,
});

// Create tools mapping
const toolsByName = Object.fromEntries(
  excelInterviewTools.map((tool) => [tool.name, tool])
);

// Bind tools to LLM
const llmWithTools = llm.bindTools(excelInterviewTools);

// System prompt for Excel Interview AI
const systemPrompt = `You are an AI Excel Skills Interviewer, designed to conduct comprehensive Excel assessments for job candidates.

CORE RESPONSIBILITIES:
1. Parse candidate resumes and extract Excel-related experience (with robust fallbacks)
2. Generate personalized interview introductions (even with minimal data)
3. Create dynamic questions based on candidate background and previous responses
4. Process voice responses using speech-to-text
5. Evaluate responses with strict professional standards
6. Generate detailed PDF reports
7. Send professional follow-up communications

CRITICAL WORKFLOW HANDLING:
- If resume parsing fails, ALWAYS create a fallback profile and continue
- If candidate profile is missing, generate one from email and continue
- Never stop the interview due to parsing failures
- Always provide a professional experience regardless of data quality

INTERVIEW FLOW:
1. Resume Analysis → Extract skills, experience level, background (with fallbacks)
2. Personalized Introduction → Welcome candidate, explain process (even with basic info)
3. Dynamic Questioning → 7-8 questions adapted to candidate level
4. Voice Processing → Convert speech to text accurately
5. Response Evaluation → Score on technical accuracy, communication, problem-solving
6. Report Generation → Comprehensive PDF with feedback
7. Thank You Email → Professional follow-up with attached report

EVALUATION STANDARDS:
- Technical Accuracy (40%): Correct Excel knowledge and procedures
- Practical Application (30%): Real-world understanding and examples
- Communication Clarity (20%): Clear explanations and structure
- Completeness (10%): Fully addressing the question

SCORING GUIDELINES (0-10 scale):
- 9-10: Exceptional knowledge with perfect examples
- 7-8: Very good understanding with minor gaps
- 5-6: Adequate knowledge but missing key points
- 3-4: Basic understanding with significant gaps
- 1-2: Poor knowledge with major errors
- 0: "I don't know" or completely incorrect

COMMUNICATION STYLE:
- Professional and encouraging
- Clear instructions and expectations
- Supportive feedback regardless of performance
- Honest assessment with constructive guidance

TOOL USAGE:
- Always use appropriate tools for each step
- If a tool fails, use fallback approaches
- Process responses sequentially through the interview flow
- Maintain session state throughout the interview
- Generate comprehensive reports with actionable feedback

FAILURE HANDLING:
- If parseResume fails, immediately call generateIntroduction with fallback
- If any tool fails, continue with the next logical step
- Never leave the candidate waiting due to technical issues
- Always provide a professional interview experience

Remember: This is a professional assessment that impacts hiring decisions. Maintain high standards while being fair and encouraging to all candidates. Technical failures should never prevent a candidate from completing their interview.`;

// LLM Node
async function llmNode(state) {
  const result = await llmWithTools.invoke([
    {
      role: 'system',
      content: systemPrompt,
    },
    ...state.messages,
  ]);
  return {
    messages: [result],
  };
}

// Tool Execution Node
async function toolExecutionNode(state) {
  const results = [];
  const lastMessage = state.messages.at(-1);

  if (
    lastMessage?.tool_calls &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length > 0
  ) {
    for (const toolCall of lastMessage.tool_calls) {
      if (toolCall && toolCall.name && toolsByName[toolCall.name]) {
        const tool = toolsByName[toolCall.name];
        try {
          console.log(`🔧 Executing tool: ${toolCall.name}`);
          console.log(`📝 Tool args:`, toolCall.args);

          const observation = await tool.invoke(toolCall.args || {});

          console.log(`✅ Tool result:`, observation.substring(0, 200) + '...');

          results.push(
            new ToolMessage({
              content: observation,
              tool_call_id: toolCall.id,
            })
          );
        } catch (error) {
          console.error(`❌ Tool execution error for ${toolCall.name}:`, error);
          results.push(
            new ToolMessage({
              content: `Error executing tool ${toolCall.name}: ${error.message}`,
              tool_call_id: toolCall.id,
            })
          );
        }
      } else {
        if (toolCall && toolCall.id) {
          results.push(
            new ToolMessage({
              content: `Error: Invalid tool request for '${
                toolCall?.name || 'unknown tool'
              }'`,
              tool_call_id: toolCall.id,
            })
          );
        }
      }
    }
  }

  return { messages: results };
}

// Decision function
function determineNextStep(state) {
  const lastMessage = state.messages.at(-1);
  if (
    lastMessage?.tool_calls &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'ExecuteTool';
  }
  return '__end__';
}

// Build the Excel Interview workflow
const excelInterviewAgent = new StateGraph(MessagesAnnotation)
  .addNode('llmNode', llmNode)
  .addNode('toolExecutionNode', toolExecutionNode)
  .addEdge('__start__', 'llmNode')
  .addConditionalEdges('llmNode', determineNextStep, {
    ExecuteTool: 'toolExecutionNode',
    __end__: '__end__',
  })
  .addEdge('toolExecutionNode', 'llmNode')
  .compile();

// Main function to run Excel Interview Agent
async function runExcelInterviewAgent(userMessage, context = {}) {
  try {
    console.log('🚀 Starting Excel Interview Agent');
    console.log('📝 User message:', userMessage);
    console.log('🔧 Context:', context);

    const result = await excelInterviewAgent.invoke({
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    console.log('✅ Agent completed successfully');
    return result.messages;
  } catch (error) {
    console.error('❌ Excel Interview Agent error:', error);
    throw error;
  }
}

// Specialized functions for different interview phases
async function processResumeAndIntroduce(
  candidateEmail,
  resumeBuffer,
  fileType
) {
  try {
    // First try to parse the resume
    const parseResult = await runExcelInterviewAgent(
      `Parse the resume for candidate ${candidateEmail} and then generate an introduction. If parsing fails, create a fallback profile and generate introduction anyway.`,
      {
        candidateEmail,
        resumeBuffer,
        fileType,
      }
    );

    return parseResult;
  } catch (error) {
    console.error(
      '❌ Resume processing failed, using fallback approach:',
      error
    );

    // Fallback: Just generate introduction with basic info
    return await runExcelInterviewAgent(
      `Generate introduction for candidate: ${candidateEmail}. Create a basic profile if none exists.`,
      { candidateEmail }
    );
  }
}

async function conductInterviewQuestion(sessionId) {
  return await runExcelInterviewAgent(
    `Generate next question for interview session: ${sessionId}`,
    { sessionId }
  );
}

async function processAudioResponse(sessionId, audioBuffer) {
  return await runExcelInterviewAgent(
    `Process audio response for session: ${sessionId}`,
    { sessionId, audioBuffer }
  );
}

async function evaluateAndScore(sessionId, transcript, confidence = 1.0) {
  return await runExcelInterviewAgent(
    `Evaluate response for session: ${sessionId} with transcript: ${transcript}`,
    {
      sessionId,
      transcript,
      confidence,
    }
  );
}

async function generateReportAndSendEmail(sessionId) {
  return await runExcelInterviewAgent(
    `Generate report and send thank you email for session: ${sessionId}`,
    {
      sessionId,
    }
  );
}

async function sendPreScreeningInvitations(candidateEmails, hrEmail) {
  return await runExcelInterviewAgent(
    `Send pre-screening invitations to candidates: ${candidateEmails.join(
      ', '
    )}`,
    {
      candidateEmails,
      hrEmail,
    }
  );
}

// Export everything
export {
  excelInterviewAgent,
  runExcelInterviewAgent,
  processResumeAndIntroduce,
  conductInterviewQuestion,
  processAudioResponse,
  evaluateAndScore,
  generateReportAndSendEmail,
  sendPreScreeningInvitations,
  ExcelInterviewStateAnnotation,
};
