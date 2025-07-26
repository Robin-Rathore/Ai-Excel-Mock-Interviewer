//@ts-nocheck
import { GoogleGenerativeAI } from '@google/generative-ai';

interface CandidateInfo {
  name: string;
  email: string;
  skills: string[];
  experienceLevel: string;
}

interface ConversationItem {
  question: string;
  answer: string;
  score: number;
  timestamp: string;
  feedback: string;
}

export class AIAgent {
  private genAI: GoogleGenerativeAI;
  private questionBank: { [key: string]: string[] };

  constructor() {
    this.genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || 'demo-key'
    );
    this.initializeQuestionBank();
  }

  private initializeQuestionBank() {
    this.questionBank = {
      beginner: [
        'Can you explain what Excel is and what you primarily use it for?',
        'How would you create a simple SUM formula to add numbers in a range of cells?',
        "What's the difference between a relative cell reference like A1 and an absolute reference like $A$1?",
        'How do you format cells to display numbers as currency in Excel?',
        'Can you describe how to create a basic chart from your data?',
        'How would you sort data in Excel from highest to lowest?',
        'What is a cell range and how do you select one?',
        'How do you freeze rows or columns in Excel?',
      ],
      intermediate: [
        "Can you explain how VLOOKUP works and give me an example of when you'd use it?",
        'How would you create a pivot table and what insights can it provide?',
        'What is conditional formatting and how would you use it to highlight important data?',
        'How do you use the IF function with multiple conditions?',
        'Can you explain the difference between VLOOKUP and INDEX-MATCH functions?',
        'How would you remove duplicate values from a dataset?',
        'What are some ways to validate data entry in Excel?',
        'How do you use SUMIF and COUNTIF functions?',
      ],
      advanced: [
        'How would you create a dynamic dashboard in Excel with interactive elements?',
        'Can you explain array formulas and give a practical example?',
        'How do you use Power Query to transform and clean data?',
        'Describe how you would automate repetitive tasks using VBA macros.',
        'How would you handle and analyze large datasets efficiently in Excel?',
        "What are some advanced pivot table features you've used?",
        'How do you create custom functions in Excel?',
        'Can you explain how to use Excel for statistical analysis?',
      ],
    };
  }

  async generateIntroduction(candidateInfo: CandidateInfo): Promise<string> {
    const introduction = `Hello ${
      candidateInfo.name
    }! Welcome to your Excel skills assessment interview. 

I'm your AI interviewer, and I'll be evaluating your Excel knowledge and experience today. This interview will take approximately 8 to 10 minutes and will consist of 7 to 8 questions.

Based on your resume, I can see you have experience with ${candidateInfo.skills
      .slice(0, 3)
      .join(', ')} and your experience level appears to be ${
      candidateInfo.experienceLevel
    }.

Here's how this will work:
1. I'll ask you questions about Excel concepts and practical scenarios
2. Please answer each question clearly and provide examples when possible
3. Your responses will be evaluated on technical accuracy, communication clarity, and problem-solving approach
4. After all questions, you'll receive a detailed report with your scores and feedback

Are you ready to begin? Let's start with our first question.`;

    return introduction;
  }

  async generateNextQuestion(
    candidateInfo: CandidateInfo,
    conversationHistory: ConversationItem[]
  ): Promise<string> {
    const questionCount = conversationHistory.length;
    const difficulty = this.determineDifficulty(
      candidateInfo,
      conversationHistory
    );

    // Get questions for the determined difficulty level
    const questions =
      this.questionBank[difficulty] || this.questionBank.intermediate;

    // Select question based on count, avoiding repetition
    const questionIndex = questionCount % questions.length;
    let selectedQuestion = questions[questionIndex];

    // Add context based on previous answers if available
    if (conversationHistory.length > 0) {
      const lastScore =
        conversationHistory[conversationHistory.length - 1].score;
      if (lastScore < 6) {
        selectedQuestion = this.adjustQuestionForDifficulty(
          selectedQuestion,
          'easier'
        );
      } else if (lastScore > 8) {
        selectedQuestion = this.adjustQuestionForDifficulty(
          selectedQuestion,
          'harder'
        );
      }
    }

    return selectedQuestion;
  }

  async evaluateResponse(question: string, answer: string): Promise<any> {
    try {
      if (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === 'demo-key'
      ) {
        // Fallback evaluation for demo
        return this.fallbackEvaluation(question, answer);
      }

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      const prompt = `Evaluate this Excel interview response on a scale of 1-10:

Question: ${question}
Answer: ${answer}

Please provide a JSON response with the following structure:
{
  "score": 8.5,
  "technical": 8.0,
  "communication": 9.0,
  "problemSolving": 8.5,
  "feedback": "Detailed feedback about the response",
  "strengths": ["Clear explanation", "Good examples"],
  "improvements": ["Could provide more detail", "Consider edge cases"]
}

Evaluate based on:
- Technical accuracy (40%)
- Communication clarity (30%)
- Problem-solving approach (30%)`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('No valid JSON in response');
    } catch (error) {
      console.error('Error evaluating response:', error);
      return this.fallbackEvaluation(question, answer);
    }
  }

  private fallbackEvaluation(question: string, answer: string): any {
    // Simple fallback evaluation based on answer length and keywords
    const answerLength = answer.trim().length;
    let score = 5; // Base score

    // Adjust based on answer length
    if (answerLength > 100) score += 1;
    if (answerLength > 200) score += 1;

    // Check for Excel-related keywords
    const excelKeywords = [
      'formula',
      'function',
      'cell',
      'range',
      'pivot',
      'vlookup',
      'chart',
      'data',
    ];
    const keywordCount = excelKeywords.filter((keyword) =>
      answer.toLowerCase().includes(keyword)
    ).length;

    score += Math.min(keywordCount * 0.5, 2);

    // Ensure score is within bounds
    score = Math.max(1, Math.min(10, score));

    return {
      score: score,
      technical: score,
      communication: score,
      problemSolving: score,
      feedback: `Your response shows ${
        score >= 7 ? 'good' : 'basic'
      } understanding of the topic. ${
        score < 7
          ? 'Consider providing more detailed explanations and examples.'
          : 'Well explained!'
      }`,
      strengths: ['Clear communication'],
      improvements:
        score < 7
          ? ['Provide more technical detail', 'Include specific examples']
          : ['Keep up the good work'],
    };
  }

  async generateClosingRemarks(scores: any): Promise<string> {
    const overall = scores.overall;
    let performance = 'good';

    if (overall >= 8.5) performance = 'excellent';
    else if (overall >= 7) performance = 'very good';
    else if (overall < 6) performance = 'needs improvement';

    return `Thank you for completing the Excel skills assessment! 

You've demonstrated ${performance} Excel knowledge with an overall score of ${overall.toFixed(
      1
    )} out of 10.

Your detailed report is being generated and will be available for download shortly. The report includes:
- Detailed score breakdown for each question
- Specific feedback on your responses  
- Recommendations for skill improvement
- Areas of strength and development opportunities

Thank you for your time today, and best of luck with your Excel journey!`;
  }

  private determineDifficulty(
    candidateInfo: CandidateInfo,
    conversationHistory: ConversationItem[]
  ): 'beginner' | 'intermediate' | 'advanced' {
    // Start with resume-based difficulty
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';

    const experienceLevel = candidateInfo.experienceLevel.toLowerCase();
    const skills = candidateInfo.skills.map((s) => s.toLowerCase());

    if (experienceLevel.includes('beginner') || skills.length < 3) {
      difficulty = 'beginner';
    } else if (
      experienceLevel.includes('advanced') ||
      skills.some(
        (s) => s.includes('vba') || s.includes('macro') || s.includes('power')
      )
    ) {
      difficulty = 'advanced';
    }

    // Adjust based on performance if we have history
    if (conversationHistory.length > 0) {
      const avgScore =
        conversationHistory.reduce((sum, item) => sum + item.score, 0) /
        conversationHistory.length;

      if (avgScore > 8.5 && difficulty !== 'advanced') {
        difficulty = difficulty === 'beginner' ? 'intermediate' : 'advanced';
      } else if (avgScore < 5.5 && difficulty !== 'beginner') {
        difficulty = difficulty === 'advanced' ? 'intermediate' : 'beginner';
      }
    }

    return difficulty;
  }

  private adjustQuestionForDifficulty(
    question: string,
    adjustment: 'easier' | 'harder'
  ): string {
    // Simple question adjustment - in production, you'd have more sophisticated logic
    if (adjustment === 'easier') {
      return question.replace('advanced', 'basic').replace('complex', 'simple');
    } else {
      return question.replace('basic', 'advanced').replace('simple', 'complex');
    }
  }
}
