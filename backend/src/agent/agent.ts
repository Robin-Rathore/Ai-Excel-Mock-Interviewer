//@ts-nocheck
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';
import { ToolMessage, type BaseMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { excelInterviewTools } from './tools.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini AI
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-flash',
  temperature: 0.3,
  maxRetries: 2,
  apiKey: process.env.GEMINI_API_KEY,
});

// Define state interface
interface InterviewState {
  messages: BaseMessage[];
  currentQuestion: string;
  questionNumber: number;
  totalQuestions: number;
  candidateAnswers: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }>;
  resumeData: any;
  experienceLevel: string;
  isComplete: boolean;
  audioBuffer?: Buffer;
  lastAction: string;
}

// Create tools mapping
const toolsByName = Object.fromEntries(
  excelInterviewTools.map((tool) => [tool.name, tool])
);

// Bind tools to LLM
const llmWithTools = llm.bindTools(excelInterviewTools);

// System prompt for Excel Interview AI
const systemPrompt = `You are an AI Excel Skills Interviewer conducting comprehensive Excel assessments for job candidates.

CORE RESPONSIBILITIES:
1. Process candidate resumes and extract Excel-related experience
2. Generate personalized interview introductions with Indian English female voice
3. Create dynamic questions based on candidate background
4. Process voice responses using speech-to-text
5. Evaluate responses with professional standards (0-10 scale)
6. Generate detailed reports with scores and feedback
7. Send professional follow-up communications

INTERVIEW FLOW:
1. Resume Analysis → Extract skills, experience level, background
2. Personalized Introduction → Welcome candidate, explain process
3. Dynamic Questioning → 7-8 questions adapted to candidate level
4. Voice Processing → Convert speech to text accurately
5. Response Evaluation → Score on technical accuracy, communication, problem-solving
6. Report Generation → Comprehensive feedback with recommendations

EVALUATION STANDARDS (0-10 scale):
- Technical Accuracy (40%): Correct Excel knowledge and procedures
- Practical Application (30%): Real-world understanding and examples
- Communication Clarity (20%): Clear explanations and structure
- Completeness (10%): Fully addressing the question

SCORING GUIDELINES:
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

Always use appropriate tools for each step and maintain professional standards throughout the interview process.`;

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
          const observation = await tool.invoke(toolCall.args || {});
          console.log(`✅ Tool ${toolCall.name} executed successfully`);

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

export { runExcelInterviewAgent };
