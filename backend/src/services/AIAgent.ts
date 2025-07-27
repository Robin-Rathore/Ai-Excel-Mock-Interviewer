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
  evaluation: {
    technical: number;
    practical: number;
    communication: number;
    completeness: number;
  };
}

export class AIAgent {
  private genAI: GoogleGenerativeAI;
  private questionBank: { [key: string]: string[] };

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.initializeQuestionBank();
  }

  private initializeQuestionBank() {
    this.questionBank = {
      beginner: [
        "Can you explain what Microsoft Excel is and describe three main ways it's used in business environments?",
        'How would you create a SUM formula to add numbers in cells A1 through A10? Please walk me through each step.',
        "What's the difference between a relative cell reference like A1 and an absolute reference like $A$1? When would you use each type?",
        'How do you format cells to display numbers as Indian currency? Describe the complete process.',
        'Can you explain how to create a basic column chart from data in Excel? What are the key steps?',
        'How would you sort a list of employee names alphabetically in Excel?',
        'What is a cell range and how do you select a range like A1:C10?',
        'How do you freeze the first row in a worksheet so it stays visible when scrolling?',
      ],
      intermediate: [
        'Explain how VLOOKUP works and give me a specific business example where you would use it.',
        'How would you create a pivot table to analyze sales data by region and product? Walk me through the process.',
        'What is conditional formatting and how would you use it to highlight cells with values above 10,000?',
        "How do you create an IF statement that checks if a value is greater than 100 and returns 'High' or 'Low'?",
        'Compare VLOOKUP and INDEX-MATCH functions. Which is better and why?',
        'How would you remove duplicate entries from a customer database in Excel?',
        'Explain data validation and how you would restrict a cell to only accept dates between today and next year.',
        'How do SUMIF and COUNTIF functions work? Give me practical examples of each.',
      ],
      advanced: [
        'How would you create a dynamic dashboard in Excel that updates automatically when new data is added?',
        "Explain array formulas and provide a specific example of when you've used one to solve a complex problem.",
        'How do you use Power Query to clean and transform data from multiple CSV files?',
        'Describe how you would create a VBA macro to automate a monthly report generation process.',
        'How would you efficiently analyze a dataset with 500,000 rows in Excel without performance issues?',
        'What advanced pivot table features have you used for complex data analysis?',
        'How do you create custom functions in Excel using VBA? Give me an example.',
        'Explain how you would use Excel for statistical analysis including regression and correlation.',
      ],
    };
  }

  async generateIntroduction(candidateInfo: CandidateInfo): Promise<string> {
    const skillsList =
      candidateInfo.skills.length > 0
        ? candidateInfo.skills.slice(0, 3).join(', ')
        : 'basic Excel operations';

    return `Namaste ${candidateInfo.name}! Welcome to your comprehensive Excel skills assessment.

I'm your AI interviewer, and I'll be conducting a thorough evaluation of your Excel knowledge and practical experience. This interview will take approximately 12 to 15 minutes and consists of 7 to 8 detailed questions.

Based on your resume analysis, I can see you have experience with ${skillsList}, and your experience level appears to be ${candidateInfo.experienceLevel}.

Here's how this professional interview works:

1. I'll ask you detailed questions about Excel concepts and real-world scenarios
2. Please provide comprehensive answers with specific examples from your experience
3. Take your time - there are no time limits. Speak naturally and I'll wait for you to complete your thoughts
4. I'll automatically detect when you've finished speaking (after 3 seconds of silence)
5. Your responses will be evaluated on technical accuracy, practical knowledge, communication clarity, and completeness
6. After each question, you'll see your scores update in real-time
7. At the end, you'll receive a detailed PDF report with comprehensive feedback

Important guidelines:
- Be honest - if you don't know something, please say so. Honesty is valued over guessing
- Provide specific examples from your work experience whenever possible
- Explain your thought process step-by-step
- Feel free to ask for clarification if any question is unclear

The evaluation is strict and follows professional standards. Scores range from 0 to 10, where even experienced professionals typically score between 6-8 on average.

Are you ready to begin? Let's start with our first question.`;
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

    // Adjust difficulty based on recent performance
    if (conversationHistory.length > 0) {
      const recentScores = conversationHistory
        .slice(-2)
        .map((item) => item.score);
      const avgRecentScore =
        recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

      if (avgRecentScore < 3 && difficulty !== 'beginner') {
        selectedQuestion =
          this.questionBank.beginner[
            questionIndex % this.questionBank.beginner.length
          ];
      } else if (avgRecentScore > 8 && difficulty !== 'advanced') {
        selectedQuestion =
          this.questionBank.advanced[
            questionIndex % this.questionBank.advanced.length
          ];
      }
    }

    return selectedQuestion;
  }

  async evaluateResponse(
    question: string,
    answer: string,
    transcriptionConfidence: number
  ): Promise<any> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return this.fallbackEvaluation(question, answer);
      }

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      const evaluationPrompt = `You are a senior Excel expert conducting a professional skills assessment. Evaluate this candidate's response with strict professional standards.

QUESTION: ${question}

CANDIDATE'S ANSWER: ${answer}

TRANSCRIPTION CONFIDENCE: ${transcriptionConfidence.toFixed(
        2
      )} (1.0 = perfect, 0.1 = poor audio quality)

EVALUATION CRITERIA:
1. Technical Accuracy (40%): Is the information technically correct and complete?
2. Practical Knowledge (30%): Does the candidate show real-world understanding and experience?
3. Communication Clarity (20%): Is the explanation clear, structured, and professional?
4. Completeness (10%): Does the answer fully address all aspects of the question?

STRICT SCORING GUIDELINES:
- 9-10: Exceptional answer with perfect technical accuracy, excellent examples, and comprehensive coverage
- 7-8: Very good answer with minor gaps, good technical knowledge, and relevant examples
- 5-6: Adequate answer but missing key points, some inaccuracies, or lacks depth
- 3-4: Basic understanding shown but significant gaps, errors, or very incomplete
- 1-2: Poor answer with major inaccuracies, very incomplete, or shows minimal understanding
- 0: No relevant answer, "I don't know", completely incorrect, or unintelligible

SPECIAL SCORING RULES:
- If candidate says "I don't know" or "I'm not sure" → Maximum score 1
- If answer is vague without specifics → Maximum score 4
- If candidate shows uncertainty with "I think", "maybe", "probably" → Reduce score by 1-2 points
- If answer contains factual errors → Reduce score significantly
- If transcription confidence is low (< 0.5) → Consider audio quality in evaluation
- Reward specific examples, step-by-step explanations, and practical insights
- Penalize generic answers without real-world context

Provide your evaluation in this exact JSON format:
{
  "score": 7.5,
  "technical": 8.0,
  "practical": 7.0,
  "communication": 8.0,
  "completeness": 7.0,
  "feedback": "Detailed professional feedback explaining the score and what was good/missing",
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "improvements": ["Specific improvement needed 1", "Specific improvement needed 2"],
  "keyMissing": ["Important concept not mentioned", "Key detail overlooked"],
  "confidenceAdjustment": "How transcription confidence affected the evaluation"
}`;

      const result = await model.generateContent(evaluationPrompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);

        // Ensure all scores are within bounds
        evaluation.score = Math.max(
          0,
          Math.min(10, Number(evaluation.score) || 0)
        );
        evaluation.technical = Math.max(
          0,
          Math.min(10, Number(evaluation.technical) || evaluation.score)
        );
        evaluation.practical = Math.max(
          0,
          Math.min(10, Number(evaluation.practical) || evaluation.score)
        );
        evaluation.communication = Math.max(
          0,
          Math.min(10, Number(evaluation.communication) || evaluation.score)
        );
        evaluation.completeness = Math.max(
          0,
          Math.min(10, Number(evaluation.completeness) || evaluation.score)
        );

        // Adjust for low transcription confidence
        if (transcriptionConfidence < 0.5) {
          evaluation.score = Math.max(0, evaluation.score - 1);
          evaluation.feedback += ` Note: Audio quality was poor (confidence: ${transcriptionConfidence.toFixed(
            2
          )}), which may have affected transcription accuracy.`;
        }

        console.log('AI Evaluation completed:', {
          score: evaluation.score,
          confidence: transcriptionConfidence,
        });

        return evaluation;
      }

      throw new Error('No valid JSON in AI response');
    } catch (error) {
      console.error('Error in AI evaluation:', error);
      return this.fallbackEvaluation(question, answer);
    }
  }

  private fallbackEvaluation(question: string, answer: string): any {
    const answerLower = answer.toLowerCase().trim();

    // Check for explicit "don't know" responses
    const dontKnowPhrases = [
      "i don't know",
      "i'm not sure",
      "i'm not aware",
      'no idea',
      'not familiar',
      "don't have experience",
      'never used',
      'not sure',
      'i have no idea',
    ];

    const isDontKnow = dontKnowPhrases.some((phrase) =>
      answerLower.includes(phrase)
    );

    if (isDontKnow || answerLower.length < 10) {
      return {
        score: 0,
        technical: 0,
        practical: 0,
        communication: 1,
        completeness: 0,
        feedback:
          "The candidate indicated they don't know the answer or provided insufficient information. While honesty is appreciated, this shows a significant knowledge gap in this Excel concept.",
        strengths: ['Honest about knowledge limitations'],
        improvements: [
          'Study this Excel concept thoroughly',
          'Practice with hands-on examples',
          'Gain practical experience',
        ],
        keyMissing: [
          'Complete understanding of the concept',
          'Practical examples',
          'Technical implementation details',
        ],
        confidenceAdjustment:
          'N/A - Clear response indicating lack of knowledge',
      };
    }

    // Basic scoring algorithm
    let score = 1; // Base score for attempting

    // Excel terminology check
    const excelKeywords = [
      'formula',
      'function',
      'cell',
      'range',
      'pivot',
      'vlookup',
      'chart',
      'data',
      'worksheet',
      'workbook',
      'sum',
      'count',
      'if',
      'index',
      'match',
      'filter',
      'conditional',
      'formatting',
      'macro',
      'vba',
    ];

    const keywordCount = excelKeywords.filter((keyword) =>
      answerLower.includes(keyword)
    ).length;
    score += Math.min(keywordCount * 0.5, 3);

    // Length and structure
    if (answer.length > 50) score += 1;
    if (answer.length > 150) score += 1;
    if (answer.includes('example') || answer.includes('for instance'))
      score += 1;

    // Check for uncertainty
    const uncertaintyPhrases = [
      'i think',
      'maybe',
      'probably',
      'i guess',
      'not sure',
      'might be',
    ];
    const hasUncertainty = uncertaintyPhrases.some((phrase) =>
      answerLower.includes(phrase)
    );
    if (hasUncertainty) score -= 2;

    // Ensure score is within bounds
    score = Math.max(0, Math.min(10, score));

    return {
      score: score,
      technical: score,
      practical: Math.max(score - 1, 0),
      communication: Math.min(score + 1, 10),
      completeness: Math.max(score - 1, 0),
      feedback: `Your response shows ${
        score >= 6 ? 'good' : score >= 3 ? 'basic' : 'limited'
      } understanding. ${
        score < 6
          ? 'To improve, provide more specific technical details, step-by-step explanations, and real-world examples.'
          : 'Good foundation, but could be enhanced with more depth and specific examples.'
      }`,
      strengths:
        score >= 6
          ? ['Relevant content', 'Clear communication']
          : ['Attempted to answer'],
      improvements:
        score < 6
          ? [
              'Add more technical detail',
              'Provide specific examples',
              'Explain step-by-step processes',
            ]
          : ['Include more depth', 'Add practical examples'],
      keyMissing: [
        'More technical specifics',
        'Practical examples',
        'Complete process explanation',
      ],
      confidenceAdjustment:
        'Fallback evaluation used due to AI service unavailability',
    };
  }

  async generateClosingRemarks(
    scores: any,
    questionCount: number
  ): Promise<string> {
    const overall = scores.overall;
    let performance = '';
    let feedback = '';
    let nextSteps = '';

    if (overall >= 8.5) {
      performance = 'exceptional';
      feedback =
        'You have demonstrated outstanding Excel expertise with comprehensive knowledge and excellent practical understanding. Your responses showed deep technical knowledge and real-world experience.';
      nextSteps =
        'Consider pursuing advanced Excel certifications or specializing in areas like Power BI, advanced analytics, or Excel training roles.';
    } else if (overall >= 7) {
      performance = 'very good';
      feedback =
        'You have shown strong Excel knowledge with good technical understanding and practical experience. Your responses demonstrated solid competency in most areas.';
      nextSteps =
        'Focus on the specific improvement areas mentioned in your report to reach expert level. Consider advanced Excel courses for specialized topics.';
    } else if (overall >= 5) {
      performance = 'satisfactory';
      feedback =
        'You have a decent foundation in Excel with room for significant improvement. Your responses showed basic understanding but lacked depth in several areas.';
      nextSteps =
        'I recommend structured Excel training focusing on the gaps identified in your report. Practice with real-world scenarios and hands-on exercises.';
    } else if (overall >= 3) {
      performance = 'needs improvement';
      feedback =
        'Your Excel knowledge shows significant gaps that need to be addressed. While you demonstrated some basic understanding, many fundamental concepts require strengthening.';
      nextSteps =
        'Consider taking a comprehensive Excel course starting from basics. Focus on hands-on practice and building practical experience with real datasets.';
    } else {
      performance = 'requires substantial development';
      feedback =
        'The assessment revealed major gaps in Excel knowledge. This indicates a need for comprehensive training and practice.';
      nextSteps =
        'I strongly recommend starting with beginner-level Excel courses and dedicating significant time to hands-on practice before considering Excel-intensive roles.';
    }

    return `Thank you for completing this comprehensive Excel skills assessment!

ASSESSMENT SUMMARY:
- Overall Performance: ${performance.toUpperCase()}
- Final Score: ${overall.toFixed(1)} out of 10
- Questions Completed: ${questionCount}
- Assessment Duration: Professional standard evaluation

PERFORMANCE ANALYSIS:
${feedback}

NEXT STEPS:
${nextSteps}

Your detailed report is now being generated and will include:
- Complete question-by-question analysis with scores
- Detailed technical feedback for each response
- Specific skill gaps and improvement recommendations
- Personalized learning path based on your performance
- Industry benchmarking and career guidance
- Resources for continued Excel skill development

This assessment follows professional industry standards. The scoring is intentionally strict to provide accurate skill evaluation for career development and hiring decisions.

Your report will be available for download in a moment. Thank you for your honest responses and professional participation in this assessment.

Best of luck with your Excel skill development journey!`;
  }

  private determineDifficulty(
    candidateInfo: CandidateInfo,
    conversationHistory: ConversationItem[]
  ): 'beginner' | 'intermediate' | 'advanced' {
    // Start with resume-based assessment
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';

    const experienceLevel = candidateInfo.experienceLevel.toLowerCase();
    const skills = candidateInfo.skills.map((s) => s.toLowerCase());

    // Initial difficulty based on resume
    if (experienceLevel.includes('beginner') || skills.length < 2) {
      difficulty = 'beginner';
    } else if (
      experienceLevel.includes('advanced') ||
      skills.some(
        (s) =>
          s.includes('vba') ||
          s.includes('macro') ||
          s.includes('power') ||
          s.includes('advanced')
      )
    ) {
      difficulty = 'advanced';
    }

    // Adjust based on actual performance
    if (conversationHistory.length >= 2) {
      const avgScore =
        conversationHistory.reduce((sum, item) => sum + item.score, 0) /
        conversationHistory.length;

      if (avgScore > 7.5 && difficulty !== 'advanced') {
        difficulty = difficulty === 'beginner' ? 'intermediate' : 'advanced';
      } else if (avgScore < 4 && difficulty !== 'beginner') {
        difficulty = difficulty === 'advanced' ? 'intermediate' : 'beginner';
      }
    }

    return difficulty;
  }
}
