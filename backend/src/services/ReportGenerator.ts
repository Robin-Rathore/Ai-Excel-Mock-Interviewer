import PDFDocument from 'pdfkit';

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
  overallScores: {
    technical: number;
    communication: number;
    problemSolving: number;
    overall: number;
  };
  questionCount: number;
  startTime: Date;
}

export class ReportGenerator {
  constructor() {
    console.log('📄 ReportGenerator initialized');
  }

  async generatePDF(sessionData: SessionData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log(
          `📋 Generating PDF report for ${sessionData.candidateInfo.name}`
        );

        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          console.log(
            `✅ PDF generated successfully, size: ${pdfBuffer.length} bytes`
          );
          resolve(pdfBuffer);
        });

        // Header
        doc
          .fontSize(20)
          .text('Excel Skills Assessment Report', { align: 'center' });
        doc.moveDown();

        // Candidate Information
        doc.fontSize(16).text('Candidate Information', { underline: true });
        doc.fontSize(12);
        doc.text(`Name: ${sessionData.candidateInfo.name}`);
        doc.text(`Email: ${sessionData.candidateInfo.email}`);
        doc.text(
          `Experience Level: ${sessionData.candidateInfo.experienceLevel}`
        );
        doc.text(
          `Assessment Date: ${new Date(
            sessionData.startTime
          ).toLocaleDateString()}`
        );
        doc.text(`Questions Completed: ${sessionData.questionCount}`);
        doc.moveDown();

        // Overall Scores
        doc.fontSize(16).text('Overall Assessment Scores', { underline: true });
        doc.fontSize(12);
        doc.text(
          `Overall Score: ${sessionData.overallScores.overall.toFixed(1)}/10`
        );
        doc.text(
          `Technical Skills: ${sessionData.overallScores.technical.toFixed(
            1
          )}/10`
        );
        doc.text(
          `Communication: ${sessionData.overallScores.communication.toFixed(
            1
          )}/10`
        );
        doc.text(
          `Problem Solving: ${sessionData.overallScores.problemSolving.toFixed(
            1
          )}/10`
        );
        doc.moveDown();

        // Performance Summary
        doc.fontSize(16).text('Performance Summary', { underline: true });
        doc.fontSize(12);
        const overall = sessionData.overallScores.overall;
        let performanceLevel = '';
        let recommendation = '';

        if (overall >= 8.5) {
          performanceLevel = 'Exceptional';
          recommendation = 'Highly Recommended';
        } else if (overall >= 7) {
          performanceLevel = 'Very Good';
          recommendation = 'Recommended';
        } else if (overall >= 5) {
          performanceLevel = 'Satisfactory';
          recommendation = 'Consider with Training';
        } else if (overall >= 3) {
          performanceLevel = 'Needs Improvement';
          recommendation = 'Additional Training Required';
        } else {
          performanceLevel = 'Requires Development';
          recommendation = 'Not Recommended';
        }

        doc.text(`Performance Level: ${performanceLevel}`);
        doc.text(`Hiring Recommendation: ${recommendation}`);
        doc.moveDown();

        // Question-by-Question Analysis
        doc
          .fontSize(16)
          .text('Detailed Question Analysis', { underline: true });
        doc.fontSize(10);

        sessionData.conversationHistory.forEach((item, index) => {
          if (doc.y > 700) {
            // Check if we need a new page
            doc.addPage();
          }

          doc.fontSize(12).text(`Question ${index + 1}:`, { underline: true });
          doc.fontSize(10).text(item.question, { width: 500 });
          doc.text(`Score: ${item.score.toFixed(1)}/10`);
          doc.text(
            `Answer: ${item.answer.substring(0, 200)}${
              item.answer.length > 200 ? '...' : ''
            }`
          );
          doc.text(
            `Feedback: ${item.feedback.substring(0, 300)}${
              item.feedback.length > 300 ? '...' : ''
            }`
          );
          doc.moveDown(0.5);
        });

        // Skills Assessment
        if (doc.y > 600) {
          doc.addPage();
        }

        doc.fontSize(16).text('Skills Assessment', { underline: true });
        doc.fontSize(12);

        const skills = sessionData.candidateInfo.skills || [];
        if (skills.length > 0) {
          doc.text('Skills from Resume:');
          skills.forEach((skill) => {
            doc.text(`• ${skill}`);
          });
        } else {
          doc.text('No specific skills listed in resume');
        }
        doc.moveDown();

        // Recommendations
        doc
          .fontSize(16)
          .text('Development Recommendations', { underline: true });
        doc.fontSize(12);

        if (overall >= 7) {
          doc.text('• Continue developing advanced Excel features');
          doc.text('• Consider Excel certification programs');
          doc.text('• Explore Power BI and advanced analytics');
        } else if (overall >= 5) {
          doc.text('• Focus on strengthening fundamental Excel concepts');
          doc.text('• Practice with real-world Excel scenarios');
          doc.text('• Take structured Excel training courses');
        } else {
          doc.text('• Start with basic Excel fundamentals');
          doc.text('• Complete beginner-level Excel courses');
          doc.text('• Practice daily with simple Excel tasks');
        }

        doc.moveDown();

        // Footer
        doc
          .fontSize(10)
          .text(
            'This report was generated by AI Excel Skills Assessment System',
            { align: 'center' }
          );
        doc.text(`Generated on: ${new Date().toLocaleString()}`, {
          align: 'center',
        });

        doc.end();
      } catch (error) {
        console.error('❌ Error generating PDF:', error);
        reject(error);
      }
    });
  }

  async generateHTMLReport(sessionData: SessionData): Promise<string> {
    try {
      console.log(
        `📋 Generating HTML report for ${sessionData.candidateInfo.name}`
      );

      const overall = sessionData.overallScores.overall;
      let performanceLevel = '';
      let recommendation = '';
      let performanceColor = '';

      if (overall >= 8.5) {
        performanceLevel = 'Exceptional';
        recommendation = 'Highly Recommended';
        performanceColor = '#10B981'; // Green
      } else if (overall >= 7) {
        performanceLevel = 'Very Good';
        recommendation = 'Recommended';
        performanceColor = '#3B82F6'; // Blue
      } else if (overall >= 5) {
        performanceLevel = 'Satisfactory';
        recommendation = 'Consider with Training';
        performanceColor = '#F59E0B'; // Yellow
      } else if (overall >= 3) {
        performanceLevel = 'Needs Improvement';
        recommendation = 'Additional Training Required';
        performanceColor = '#EF4444'; // Red
      } else {
        performanceLevel = 'Requires Development';
        recommendation = 'Not Recommended';
        performanceColor = '#DC2626'; // Dark Red
      }

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Excel Skills Assessment Report - ${
      sessionData.candidateInfo.name
    }</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; margin-bottom: 10px; }
        .section { margin-bottom: 25px; }
        .section h2 { color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 5px; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .score-card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #2563EB; }
        .score-value { font-size: 24px; font-weight: bold; color: #1e40af; }
        .performance-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background-color: ${performanceColor}; }
        .question-item { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #10b981; }
        .question-score { float: right; background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .skill-tag { background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Excel Skills Assessment Report</h1>
            <p>Professional AI-Powered Evaluation</p>
        </div>

        <div class="section">
            <h2>Candidate Information</h2>
            <p><strong>Name:</strong> ${sessionData.candidateInfo.name}</p>
            <p><strong>Email:</strong> ${sessionData.candidateInfo.email}</p>
            <p><strong>Experience Level:</strong> ${
              sessionData.candidateInfo.experienceLevel
            }</p>
            <p><strong>Assessment Date:</strong> ${new Date(
              sessionData.startTime
            ).toLocaleDateString()}</p>
            <p><strong>Questions Completed:</strong> ${
              sessionData.questionCount
            }</p>
        </div>

        <div class="section">
            <h2>Overall Assessment Scores</h2>
            <div class="score-grid">
                <div class="score-card">
                    <div class="score-value">${sessionData.overallScores.overall.toFixed(
                      1
                    )}/10</div>
                    <div>Overall Score</div>
                </div>
                <div class="score-card">
                    <div class="score-value">${sessionData.overallScores.technical.toFixed(
                      1
                    )}/10</div>
                    <div>Technical Skills</div>
                </div>
                <div class="score-card">
                    <div class="score-value">${sessionData.overallScores.communication.toFixed(
                      1
                    )}/10</div>
                    <div>Communication</div>
                </div>
                <div class="score-card">
                    <div class="score-value">${sessionData.overallScores.problemSolving.toFixed(
                      1
                    )}/10</div>
                    <div>Problem Solving</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Performance Summary</h2>
            <p><strong>Performance Level:</strong> <span class="performance-badge">${performanceLevel}</span></p>
            <p><strong>Hiring Recommendation:</strong> ${recommendation}</p>
        </div>

        <div class="section">
            <h2>Skills Assessment</h2>
            <div class="skills-list">
                ${(sessionData.candidateInfo.skills || [])
                  .map((skill) => `<span class="skill-tag">${skill}</span>`)
                  .join('')}
            </div>
        </div>

        <div class="section">
            <h2>Question Analysis</h2>
            ${sessionData.conversationHistory
              .map(
                (item, index) => `
                <div class="question-item">
                    <div class="question-score">${item.score.toFixed(
                      1
                    )}/10</div>
                    <h4>Question ${index + 1}</h4>
                    <p><strong>Q:</strong> ${item.question}</p>
                    <p><strong>A:</strong> ${item.answer.substring(0, 200)}${
                  item.answer.length > 200 ? '...' : ''
                }</p>
                    <p><strong>Feedback:</strong> ${item.feedback.substring(
                      0,
                      300
                    )}${item.feedback.length > 300 ? '...' : ''}</p>
                </div>
            `
              )
              .join('')}
        </div>

        <div class="footer">
            <p>This report was generated by AI Excel Skills Assessment System</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

      console.log('✅ HTML report generated successfully');
      return html;
    } catch (error) {
      console.error('❌ Error generating HTML report:', error);
      throw error;
    }
  }
}
