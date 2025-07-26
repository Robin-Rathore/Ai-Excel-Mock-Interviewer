import PDFDocument from "pdfkit"

export class ReportGenerator {
  async generatePDF(sessionData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 })
        const chunks: Buffer[] = []

        doc.on("data", (chunk) => chunks.push(chunk))
        doc.on("end", () => resolve(Buffer.concat(chunks)))

        // Header
        this.addHeader(doc, sessionData)

        // Executive Summary
        this.addExecutiveSummary(doc, sessionData)

        // Detailed Scores
        this.addDetailedScores(doc, sessionData)

        // Question Analysis
        this.addQuestionAnalysis(doc, sessionData)

        // Recommendations
        this.addRecommendations(doc, sessionData)

        // Footer
        this.addFooter(doc)

        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  private addHeader(doc: PDFDocument, sessionData: any): void {
    // Company logo and header
    doc.fontSize(24).fillColor("#2563eb").text("Excel Skills Assessment Report", 50, 50)

    doc
      .fontSize(12)
      .fillColor("#666666")
      .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80)
      .text(`Candidate: ${sessionData.candidateInfo.name}`, 50, 95)
      .text(`Session ID: ${sessionData.sessionId}`, 50, 110)

    // Add a line separator
    doc.moveTo(50, 130).lineTo(550, 130).stroke("#cccccc")

    doc.moveDown(2)
  }

  private addExecutiveSummary(doc: PDFDocument, sessionData: any): void {
    const yPosition = 150

    doc.fontSize(18).fillColor("#1f2937").text("Executive Summary", 50, yPosition)

    doc
      .fontSize(12)
      .fillColor("#374151")
      .text(`Overall Score: ${sessionData.overallScores.overall.toFixed(1)}/10`, 50, yPosition + 30)

    const performanceLevel = this.getPerformanceLevel(sessionData.overallScores.overall)
    doc.text(`Performance Level: ${performanceLevel}`, 50, yPosition + 50)

    doc.text(`Interview Duration: ${this.calculateDuration(sessionData.startTime)} minutes`, 50, yPosition + 70)
    doc.text(`Questions Answered: ${sessionData.conversationHistory.length}`, 50, yPosition + 90)

    // Overall assessment
    const assessment = this.generateOverallAssessment(sessionData.overallScores)
    doc.text("Assessment:", 50, yPosition + 120)
    doc.text(assessment, 50, yPosition + 140, { width: 500, align: "justify" })

    doc.moveDown(3)
  }

  private addDetailedScores(doc: PDFDocument, sessionData: any): void {
    const yPosition = doc.y + 20

    doc.fontSize(18).fillColor("#1f2937").text("Detailed Score Breakdown", 50, yPosition)

    const scores = [
      { label: "Technical Skills", value: sessionData.overallScores.technical, color: "#3b82f6" },
      { label: "Communication", value: sessionData.overallScores.communication, color: "#10b981" },
      { label: "Problem Solving", value: sessionData.overallScores.problemSolving, color: "#8b5cf6" },
    ]

    let currentY = yPosition + 40

    scores.forEach((score, index) => {
      // Score label and value
      doc
        .fontSize(14)
        .fillColor("#374151")
        .text(score.label, 50, currentY)
        .text(`${score.value.toFixed(1)}/10`, 450, currentY)

      // Progress bar background
      doc.rect(50, currentY + 20, 400, 10).fillAndStroke("#e5e7eb", "#e5e7eb")

      // Progress bar fill
      const fillWidth = (score.value / 10) * 400
      doc.rect(50, currentY + 20, fillWidth, 10).fill(score.color)

      currentY += 50
    })

    doc.moveDown(2)
  }

  private addQuestionAnalysis(doc: PDFDocument, sessionData: any): void {
    const yPosition = doc.y + 20

    doc.fontSize(18).fillColor("#1f2937").text("Question-by-Question Analysis", 50, yPosition)

    let currentY = yPosition + 30

    sessionData.conversationHistory.forEach((item: any, index: number) => {
      // Check if we need a new page
      if (currentY > 700) {
        doc.addPage()
        currentY = 50
      }

      // Question header
      doc
        .fontSize(14)
        .fillColor("#1f2937")
        .text(`Question ${index + 1} - Score: ${item.score.toFixed(1)}/10`, 50, currentY)

      // Question text
      doc
        .fontSize(11)
        .fillColor("#4b5563")
        .text(item.question, 50, currentY + 20, { width: 500 })

      // Answer text
      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("Your Answer:", 50, currentY + 60)
        .text(item.answer, 50, currentY + 75, { width: 500 })

      // Feedback if available
      if (item.feedback) {
        doc
          .fontSize(10)
          .fillColor("#059669")
          .text("Feedback:", 50, currentY + 120)
          .text(item.feedback, 50, currentY + 135, { width: 500 })
      }

      currentY += 180
    })

    doc.moveDown(2)
  }

  private addRecommendations(doc: PDFDocument, sessionData: any): void {
    const recommendations = this.generateRecommendations(sessionData.overallScores)

    doc.addPage()

    doc.fontSize(18).fillColor("#1f2937").text("Recommendations for Improvement", 50, 50)

    let currentY = 90

    recommendations.forEach((rec, index) => {
      doc
        .fontSize(14)
        .fillColor("#374151")
        .text(`${index + 1}. ${rec.title}`, 50, currentY)

      doc
        .fontSize(11)
        .fillColor("#4b5563")
        .text(rec.description, 70, currentY + 20, { width: 480 })

      currentY += 80
    })
  }

  private addFooter(doc: PDFDocument): void {
    const pageCount = doc.bufferedPageRange().count

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)

      doc
        .fontSize(8)
        .fillColor("#9ca3af")
        .text(`Page ${i + 1} of ${pageCount}`, 50, 750)
        .text("Generated by Excel Skills Assessment System", 400, 750)
    }
  }

  private getPerformanceLevel(score: number): string {
    if (score >= 8.5) return "Excellent"
    if (score >= 7.5) return "Very Good"
    if (score >= 6.5) return "Good"
    if (score >= 5.5) return "Fair"
    return "Needs Improvement"
  }

  private calculateDuration(startTime: Date): number {
    const duration = Date.now() - new Date(startTime).getTime()
    return Math.round(duration / (1000 * 60))
  }

  private generateOverallAssessment(scores: any): string {
    const overall = scores.overall

    if (overall >= 8.5) {
      return "Exceptional Excel skills demonstrated. The candidate shows mastery of advanced features and excellent problem-solving abilities. Ready for complex Excel-based roles."
    } else if (overall >= 7.0) {
      return "Strong Excel skills with good technical knowledge and communication. The candidate can handle most Excel tasks effectively with minimal supervision."
    } else if (overall >= 5.5) {
      return "Solid foundation in Excel with room for improvement in advanced features. The candidate would benefit from additional training in specific areas."
    } else {
      return "Basic Excel knowledge demonstrated. Significant training and practice recommended before taking on Excel-intensive roles."
    }
  }

  private generateRecommendations(scores: any): any[] {
    const recommendations = []

    if (scores.technical < 7) {
      recommendations.push({
        title: "Strengthen Technical Excel Skills",
        description:
          "Focus on mastering advanced formulas, pivot tables, and data analysis features. Consider taking an advanced Excel course or certification program.",
      })
    }

    if (scores.communication < 7) {
      recommendations.push({
        title: "Improve Technical Communication",
        description:
          "Practice explaining Excel concepts clearly and concisely. Work on articulating your thought process when solving problems.",
      })
    }

    if (scores.problemSolving < 7) {
      recommendations.push({
        title: "Enhance Problem-Solving Approach",
        description:
          "Practice breaking down complex Excel problems into smaller steps. Work on developing systematic approaches to data analysis challenges.",
      })
    }

    // Add general recommendations
    recommendations.push({
      title: "Continuous Learning",
      description:
        "Stay updated with new Excel features and best practices. Join Excel communities and practice with real-world datasets.",
    })

    return recommendations
  }
}
