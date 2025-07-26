import pdfParse from "pdf-parse"
import mammoth from "mammoth"

export class ResumeParser {
  private excelSkills = [
    "excel",
    "vlookup",
    "pivot table",
    "pivot tables",
    "macro",
    "macros",
    "vba",
    "index match",
    "sumif",
    "countif",
    "conditional formatting",
    "data validation",
    "charts",
    "graphs",
    "formulas",
    "functions",
    "spreadsheet",
    "data analysis",
    "power query",
    "power pivot",
    "dashboard",
    "xlookup",
    "power bi",
  ]

  async parseResume(buffer: Buffer, fileType: string): Promise<any> {
    let text = ""

    try {
      if (fileType === "application/pdf") {
        const pdfData = await pdfParse(buffer)
        text = pdfData.text
      } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const docxData = await mammoth.extractRawText({ buffer })
        text = docxData.value
      } else {
        throw new Error("Unsupported file type")
      }

      return this.extractInformation(text)
    } catch (error) {
      console.error("Error parsing resume:", error)
      throw new Error("Failed to parse resume")
    }
  }

  private extractInformation(text: string): any {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    return {
      name: this.extractName(lines),
      email: this.extractEmail(text),
      skills: this.extractExcelSkills(text),
      experienceLevel: this.determineExperienceLevel(text),
      rawText: text,
    }
  }

  private extractName(lines: string[]): string {
    // Usually the name is in the first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i]
      // Skip lines that look like headers, emails, or phone numbers
      if (!line.includes("@") && !line.includes("http") && !/^\d+/.test(line) && line.length > 2 && line.length < 50) {
        // Check if it looks like a name (contains letters and possibly spaces)
        if (/^[a-zA-Z\s]+$/.test(line)) {
          return line
        }
      }
    }
    return "Candidate"
  }

  private extractEmail(text: string): string {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    const match = text.match(emailRegex)
    return match ? match[0] : ""
  }

  private extractExcelSkills(text: string): string[] {
    const lowerText = text.toLowerCase()
    const foundSkills: string[] = []

    this.excelSkills.forEach((skill) => {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.push(skill)
      }
    })

    // Remove duplicates and return
    return [...new Set(foundSkills)]
  }

  private determineExperienceLevel(text: string): string {
    const lowerText = text.toLowerCase()

    // Count experience indicators
    let experienceScore = 0

    // Years of experience
    const yearsMatch = lowerText.match(/(\d+)\s*(?:years?|yrs?)/g)
    if (yearsMatch) {
      const years = yearsMatch.map((match) => Number.parseInt(match.match(/\d+/)?.[0] || "0"))
      const maxYears = Math.max(...years)
      experienceScore += Math.min(maxYears, 10) // Cap at 10 years
    }

    // Advanced skills
    const advancedSkills = ["vba", "macro", "power query", "power pivot", "advanced excel"]
    advancedSkills.forEach((skill) => {
      if (lowerText.includes(skill)) {
        experienceScore += 2
      }
    })

    // Job titles
    const seniorTitles = ["senior", "lead", "manager", "director", "analyst", "specialist"]
    seniorTitles.forEach((title) => {
      if (lowerText.includes(title)) {
        experienceScore += 1
      }
    })

    // Determine level based on score
    if (experienceScore >= 8) {
      return "Advanced"
    } else if (experienceScore >= 4) {
      return "Intermediate"
    } else {
      return "Beginner"
    }
  }

  private extractWorkExperience(text: string): any[] {
    // Extract work experience sections
    const experiences: any[] = []
    const lines = text.split("\n")

    // This is a simplified extraction - in a real implementation,
    // you'd use more sophisticated NLP techniques
    let currentExperience: any = null

    lines.forEach((line) => {
      const trimmedLine = line.trim()

      // Look for date patterns that might indicate job periods
      const datePattern = /\b\d{4}\b.*\b\d{4}\b|\b\d{4}\b.*present/i
      if (datePattern.test(trimmedLine)) {
        if (currentExperience) {
          experiences.push(currentExperience)
        }
        currentExperience = {
          period: trimmedLine,
          description: [],
        }
      } else if (currentExperience && trimmedLine.length > 0) {
        currentExperience.description.push(trimmedLine)
      }
    })

    if (currentExperience) {
      experiences.push(currentExperience)
    }

    return experiences
  }
}
