//@ts-nocheck
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class AudioProcessor {
  private genAI: GoogleGenerativeAI;
  private tempDir: string;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async speechToText(
    audioBuffer: Buffer
  ): Promise<{ text: string; confidence: number }> {
    let tempFilePath = '';

    try {
      console.log('Processing audio buffer of size:', audioBuffer.length);

      if (audioBuffer.length < 1000) {
        throw new Error('Audio buffer too small - likely silence or no audio');
      }

      // Create temporary file
      const tempFileName = `audio_${uuidv4()}_${Date.now()}.webm`;
      tempFilePath = path.join(this.tempDir, tempFileName);

      // Write audio buffer to file
      fs.writeFileSync(tempFilePath, audioBuffer);
      console.log('Audio file written:', tempFilePath);

      // Verify file was written correctly
      const fileStats = fs.statSync(tempFilePath);
      if (fileStats.size === 0) {
        throw new Error('Written audio file is empty');
      }

      // Get the generative model
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      // Read and encode audio file
      const audioData = fs.readFileSync(tempFilePath);
      const base64Audio = audioData.toString('base64');

      console.log('Sending audio to Gemini AI for transcription...');

      // Enhanced prompt for better transcription
      const transcriptionPrompt = `
You are a professional speech-to-text transcriber for an Excel skills interview. 

CRITICAL INSTRUCTIONS:
1. Transcribe EXACTLY what is spoken - every word, including filler words
2. The speaker may have an Indian English accent - account for this
3. Focus on Excel-related terminology (formulas, functions, pivot tables, etc.)
4. If the speaker says "I don't know" or similar - transcribe it exactly
5. Include hesitations like "um", "uh", "you know" as they indicate uncertainty
6. Maintain original grammar and sentence structure as spoken
7. If audio is unclear or silent, respond with "UNCLEAR_AUDIO"
8. Do not add punctuation that wasn't clearly indicated by speech patterns

Return ONLY the transcribed text, nothing else.

Audio to transcribe:`;

      // Send request to Gemini
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'audio/webm',
            data: base64Audio,
          },
        },
        transcriptionPrompt,
      ]);

      const response = await result.response;
      const transcript = response.text().trim();

      console.log('Transcription result:', transcript);

      // Check for unclear audio
      if (transcript.includes('UNCLEAR_AUDIO') || transcript.length < 3) {
        throw new Error('Audio transcription unclear or too short');
      }

      // Calculate confidence based on transcript quality
      const confidence = this.calculateTranscriptionConfidence(transcript);

      return {
        text: transcript,
        confidence: confidence,
      };
    } catch (error) {
      console.error('Speech to text error:', error);
      throw new Error(`Speech recognition failed: ${error.message}`);
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log('Cleaned up temp file:', tempFilePath);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
      }
    }
  }

  private calculateTranscriptionConfidence(transcript: string): number {
    let confidence = 0.5; // Base confidence

    // Length factor
    if (transcript.length > 20) confidence += 0.2;
    if (transcript.length > 50) confidence += 0.1;

    // Excel terminology factor
    const excelTerms = [
      'excel',
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
      'worksheet',
      'workbook',
      'macro',
      'vba',
      'conditional',
      'formatting',
    ];

    const foundTerms = excelTerms.filter((term) =>
      transcript.toLowerCase().includes(term)
    ).length;

    confidence += Math.min(foundTerms * 0.05, 0.2);

    // Uncertainty indicators (reduce confidence)
    const uncertaintyPhrases = [
      "i don't know",
      'not sure',
      'i think',
      'maybe',
      'probably',
      'i guess',
      'um',
      'uh',
      'you know',
    ];

    const uncertaintyCount = uncertaintyPhrases.filter((phrase) =>
      transcript.toLowerCase().includes(phrase)
    ).length;

    confidence -= uncertaintyCount * 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Clean up old temp files periodically
  cleanupTempFiles(): void {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes

      files.forEach((file) => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log('Cleaned up old temp file:', file);
        }
      });
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  // Validate audio buffer quality
  validateAudioBuffer(audioBuffer: Buffer): {
    isValid: boolean;
    reason?: string;
  } {
    if (!audioBuffer || audioBuffer.length === 0) {
      return { isValid: false, reason: 'Empty audio buffer' };
    }

    if (audioBuffer.length < 1000) {
      return { isValid: false, reason: 'Audio too short - likely silence' };
    }

    if (audioBuffer.length > 10 * 1024 * 1024) {
      // 10MB limit
      return { isValid: false, reason: 'Audio file too large' };
    }

    // Check for actual audio content (not just silence)
    const samples = new Uint8Array(audioBuffer);
    let nonZeroSamples = 0;

    for (let i = 0; i < Math.min(samples.length, 1000); i++) {
      if (samples[i] !== 0 && samples[i] !== 128) {
        // 128 is silence in some formats
        nonZeroSamples++;
      }
    }

    if (nonZeroSamples < 10) {
      return { isValid: false, reason: 'Audio appears to be silence' };
    }

    return { isValid: true };
  }
}
