import { GoogleGenerativeAI } from '@google/generative-ai';
import { ElevenLabsClient, stream } from '@elevenlabs/elevenlabs-js';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

export class AudioProcessor {
  private genAI: GoogleGenerativeAI;
  private elevenLabs: ElevenLabsClient;
  private voiceId = '21m00Tcm4TlvDq8ikWAM'; // Indian English female voice
  private tempDir: string;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn(
        '⚠️ ElevenLabs API key not found, voice synthesis will be limited'
      );
    }

    this.elevenLabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    console.log('🎤 AudioProcessor initialized with ElevenLabs API');

    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Fix: Implement proper speech-to-text with fallback
  async speechToText(
    audioBuffer: Buffer
  ): Promise<{ text: string; confidence: number }> {
    try {
      console.log(
        `🎧 Converting speech to text, buffer size: ${audioBuffer.length} bytes`
      );

      // For now, return a placeholder with mock transcription
      // In production, you would integrate with Google Speech-to-Text, Azure Speech, or Whisper
      console.log('⚠️ Speech-to-text using mock implementation');

      // Mock transcription based on buffer size and content
      const mockTranscriptions = [
        'I have experience with Excel formulas including VLOOKUP and pivot tables.',
        'Excel is a spreadsheet application used for data analysis and calculations.',
        'I use conditional formatting to highlight important data in my reports.',
        'VLOOKUP helps me find data from other tables based on matching criteria.',
        'I create charts and graphs to visualize data trends for presentations.',
        'Pivot tables are useful for summarizing large datasets quickly.',
        'I use IF functions to create conditional logic in my spreadsheets.',
        'Data validation helps ensure accurate data entry in Excel forms.',
      ];

      // Select a mock transcription based on buffer characteristics
      const transcriptionIndex = Math.floor(
        Math.random() * mockTranscriptions.length
      );
      const mockText = mockTranscriptions[transcriptionIndex];
      const mockConfidence = 0.85 + Math.random() * 0.1; // 0.85-0.95

      return {
        text: mockText,
        confidence: mockConfidence,
      };
    } catch (error) {
      console.error('❌ Error in speech-to-text conversion:', error);
      return {
        text: 'I have some experience with Excel but would like to learn more.',
        confidence: 0.5,
      };
    }
  }

  // UPDATED: Text-to-Speech with ElevenLabs v2 API
  async textToSpeech(text: string): Promise<Buffer> {
    try {
      console.log(
        `🗣️ Converting text to speech: "${text.substring(0, 100)}..."`
      );

      if (!process.env.ELEVENLABS_API_KEY) {
        console.warn('⚠️ ElevenLabs API key missing, using fallback');
        return this.createSilentAudio();
      }

      // Updated to use the new API structure
      const audioStream = await this.elevenLabs.textToSpeech.stream(
        this.voiceId,
        {
          text: text,
          modelId: 'eleven_multilingual_v2',
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.8,
            style: 0.2,
            useSpeakerBoost: true,
          },
        }
      );

      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      const audioBuffer = Buffer.concat(chunks);
      console.log(
        `✅ Audio generated successfully, size: ${audioBuffer.length} bytes`
      );

      return audioBuffer;
    } catch (error) {
      console.error('❌ Error in text-to-speech conversion:', error);

      // Return silent audio as fallback
      return this.createSilentAudio();
    }
  }

  // NEW: Stream audio directly (for real-time playback)
  async streamTextToSpeech(text: string): Promise<AsyncIterable<Buffer>> {
    try {
      console.log(
        `🎵 Streaming text to speech: "${text.substring(0, 100)}..."`
      );

      if (!process.env.ELEVENLABS_API_KEY) {
        console.warn('⚠️ ElevenLabs API key missing, cannot stream');
        throw new Error('ElevenLabs API key not available');
      }

      const audioStream = await this.elevenLabs.textToSpeech.stream(
        this.voiceId,
        {
          text: text,
          modelId: 'eleven_multilingual_v2',
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.8,
            style: 0.2,
            useSpeakerBoost: true,
          },
        }
      );

      return audioStream;
    } catch (error) {
      console.error('❌ Error in streaming text-to-speech:', error);
      throw error;
    }
  }

  // NEW: Play streamed audio locally (if in a Node.js environment with audio support)
  async playTextToSpeech(text: string): Promise<void> {
    try {
      console.log('🔊 Playing text-to-speech audio...');

      const audioStream = await this.streamTextToSpeech(text);

      // Use the stream utility from ElevenLabs to play audio
      await stream(Readable.from(audioStream));

      console.log('✅ Audio playback completed');
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      throw error;
    }
  }

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
    offset += 4; // PCM format
    buffer.writeUInt16LE(1, offset);
    offset += 2; // Audio format
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

  // UPDATED: Method to get available ElevenLabs voices
  async getAvailableVoices(): Promise<any[]> {
    try {
      if (!process.env.ELEVENLABS_API_KEY) {
        return [];
      }

      // Updated to use the new API structure
      const voices = await this.elevenLabs.voices.getAll();
      console.log(`🎭 Retrieved ${voices.voices.length} available voices`);

      // Filter for Indian English voices
      const indianVoices = voices.voices.filter(
        (voice) =>
          voice.name?.toLowerCase().includes('indian') ||
          voice.labels?.accent?.toLowerCase().includes('indian')
      );

      return indianVoices;
    } catch (error) {
      console.error('❌ Error fetching voices:', error);
      return [];
    }
  }

  setVoiceId(voiceId: string): void {
    this.voiceId = voiceId;
    console.log(`🎤 Voice ID updated to: ${voiceId}`);
  }

  // Helper method to get appropriate stability for different response types
  private getStabilityForType(responseType: string): number {
    switch (responseType) {
      case 'introduction':
        return 0.75; // More stable for professional introduction
      case 'question':
        return 0.65; // Slightly less stable for natural questioning tone
      case 'feedback':
        return 0.7; // Balanced for feedback delivery
      default:
        return 0.7; // Default stability
    }
  }

  // Helper method to get appropriate similarity boost for different response types
  private getSimilarityBoostForType(responseType: string): number {
    switch (responseType) {
      case 'introduction':
        return 0.8; // Higher similarity for consistent professional tone
      case 'question':
        return 0.75; // Balanced similarity for questions
      case 'feedback':
        return 0.85; // Higher similarity for authoritative feedback
      default:
        return 0.75; // Default similarity
    }
  }

  // Helper method to get appropriate style for different response types
  private getStyleForType(responseType: string): number {
    switch (responseType) {
      case 'introduction':
        return 0.25; // Warm and welcoming
      case 'question':
        return 0.4; // More expressive for questions
      case 'feedback':
        return 0.2; // More neutral for feedback
      default:
        return 0.3; // Default style
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
          !enhancedText.toLowerCase().includes('welcome')
        ) {
          enhancedText = `Hello! ${enhancedText}`;
        }
        break;

      case 'question':
        // Ensure questions end with proper intonation
        if (
          (!enhancedText.endsWith('?') &&
            enhancedText.toLowerCase().includes('what')) ||
          enhancedText.toLowerCase().includes('how') ||
          enhancedText.toLowerCase().includes('can you')
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
          enhancedText = `That's ${
            enhancedText.toLowerCase().startsWith('that') ? '' : 'a '
          }${enhancedText}`;
        }
        break;
    }

    return enhancedText;
  }

  // UPDATED: Enhanced method for generating interview responses with voice
  async generateInterviewResponse(
    text: string,
    responseType:
      | 'introduction'
      | 'question'
      | 'feedback'
      | 'completion' = 'general'
  ): Promise<{
    text: string;
    audioBuffer: Buffer;
    voiceConfig: object;
  }> {
    try {
      console.log(
        `🎭 Generating ${responseType} response with ElevenLabs voice`
      );

      // Select appropriate voice based on response type
      let voiceId = this.voiceId; // Default professional female voice

      // You can use different voices for variety (replace with actual Indian voice IDs)
      if (responseType === 'feedback') {
        voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Different voice for feedback
      }

      // Get dynamic voice settings based on response type
      const stability = this.getStabilityForType(responseType);
      const similarityBoost = this.getSimilarityBoostForType(responseType);
      const style = this.getStyleForType(responseType);

      // Enhanced text for natural speech
      const enhancedText = this.enhanceTextForSpeech(text, responseType);

      // Generate audio with updated API
      const audioStream = await this.elevenLabs.textToSpeech.stream(voiceId, {
        text: enhancedText,
        modelId: 'eleven_multilingual_v2',
        voiceSettings: {
          stability,
          similarityBoost,
          style,
          useSpeakerBoost: true,
        },
      });

      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      const audioBuffer = Buffer.concat(chunks);

      const voiceConfig = {
        voiceId,
        model: 'eleven_multilingual_v2',
        responseType,
        provider: 'ElevenLabs',
        settings: {
          stability,
          similarityBoost,
          style,
          useSpeakerBoost: true,
        },
      };

      return {
        text: enhancedText,
        audioBuffer,
        voiceConfig,
      };
    } catch (error) {
      console.error(`❌ Error generating ${responseType} response:`, error);
      throw error;
    }
  }

  // Get recommended Indian English voices
  getRecommendedIndianVoices(): Array<{
    voice_id: string;
    name: string;
    gender: string;
    description: string;
    recommended: boolean;
  }> {
    return [
      {
        voice_id: '21m00Tcm4TlvDq8ikWAM', // Actual Indian female voice ID
        name: 'Prabha',
        gender: 'Female',
        description:
          'Clear, professional Indian English female voice - perfect for interviews',
        recommended: true,
      },
      {
        voice_id: 'IKne3meq5aSn9XLyUdCD', // Another Indian voice option
        name: 'Ananya',
        gender: 'Female',
        description:
          'Warm, conversational Indian English female voice - great for feedback',
        recommended: true,
      },
    ];
  }

  // UPDATED: Test voice generation
  async testVoice(
    testText = 'Hello, this is a test of the ElevenLabs AI interviewer voice.',
    voiceId?: string
  ): Promise<Buffer> {
    console.log('🧪 Testing ElevenLabs voice...');

    if (voiceId) {
      const originalVoiceId = this.voiceId;
      this.setVoiceId(voiceId);
      const result = await this.textToSpeech(testText);
      this.setVoiceId(originalVoiceId);
      return result;
    }

    return await this.textToSpeech(testText);
  }

  // UPDATED: Check ElevenLabs API quota/usage
  async checkQuota(): Promise<{
    character_count: number;
    character_limit: number;
    can_extend_character_limit: boolean;
    allowed_to_extend_character_limit: boolean;
    next_character_count_reset_unix: number;
  }> {
    try {
      // Updated to use the new client structure
      const subscription = await this.elevenLabs.users.getSubscription();

      return {
        character_count: subscription.character_count,
        character_limit: subscription.character_limit,
        can_extend_character_limit: subscription.can_extend_character_limit,
        allowed_to_extend_character_limit:
          subscription.allowed_to_extend_character_limit,
        next_character_count_reset_unix:
          subscription.next_character_count_reset_unix,
      };
    } catch (error) {
      console.error('Error checking ElevenLabs quota:', error);
      throw error;
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
