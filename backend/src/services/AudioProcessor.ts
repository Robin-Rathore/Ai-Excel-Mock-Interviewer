// ============= BACKEND: Updated AudioProcessor.ts =============
//@ts-nocheck
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { InterviewManager } from './InterviewManager';
import { io } from 'socket.io-client';

export class AudioProcessor {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  async speechToText(audioBuffer: Buffer): Promise<string> {
    try {
      // Save audio buffer to temporary file for processing
      const tempFileName = `temp_audio_${uuidv4()}.webm`;
      const tempDir = path.join(process.cwd(), 'temp');

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, tempFileName);
      fs.writeFileSync(tempFilePath, audioBuffer);

      // Get the generative model
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      // Convert audio file to base64
      const audioData = fs.readFileSync(tempFilePath);
      const base64Audio = audioData.toString('base64');

      // Create the request with audio data
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'audio/webm',
            data: base64Audio,
          },
        },
        'Please transcribe this audio to text. Only return the transcribed text, no additional commentary or formatting.',
      ]);

      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      const response = await result.response;
      const transcript = response.text().trim();

      console.log('Speech to text result:', transcript);
      return transcript;
    } catch (error) {
      console.error('Error in speech to text:', error);

      // Clean up temp file on error
      const tempFileName = `temp_audio_${uuidv4()}.webm`;
      const tempFilePath = path.join(process.cwd(), 'temp', tempFileName);
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      throw new Error('Failed to convert speech to text: ' + error.message);
    }
  }

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      // Using Google Text-to-Speech via a simple approach
      // For production, use proper TTS service like Google Cloud TTS, Azure Speech, etc.

      // For now, we'll use the browser's built-in speech synthesis
      // Return empty buffer and handle TTS on frontend
      console.log('TTS Text:', text);
      return Buffer.alloc(0);
    } catch (error) {
      console.error('Error in text to speech:', error);
      return Buffer.alloc(0);
    }
  }

  processAudioChunk(audioChunk: Buffer): Buffer {
    // Basic audio processing - normalize volume, remove noise, etc.
    return audioChunk;
  }

  detectSilence(audioBuffer: Buffer): boolean {
    // Simple silence detection based on buffer size
    return audioBuffer.length < 1000;
  }

  normalizeAudio(audioBuffer: Buffer): Buffer {
    // Audio normalization logic
    return audioBuffer;
  }
}

// ============= FRONTEND: VoiceInterface Component =============
// Create this as a React component or vanilla JS

class VoiceInterface {
  private socket: any;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording = false;
  private audioChunks: Blob[] = [];

  constructor(socket: any) {
    this.socket = socket;
    this.initializeAudio();
  }

  async initializeAudio() {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Initialize MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      // Initialize AudioContext for playback
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      this.setupRecorderEvents();
      console.log('Audio initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      alert('Microphone access is required for voice interview');
    }
  }

  setupRecorderEvents() {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];
      this.sendAudioToServer(audioBlob);
    };
  }

  startRecording() {
    if (!this.mediaRecorder || this.isRecording) return;

    this.audioChunks = [];
    this.mediaRecorder.start();
    this.isRecording = true;
    console.log('Recording started');

    // Visual feedback
    this.updateMicButton(true);
  }

  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return;

    this.mediaRecorder.stop();
    this.isRecording = false;
    console.log('Recording stopped');

    // Visual feedback
    this.updateMicButton(false);
  }

  async sendAudioToServer(audioBlob: Blob) {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = new Uint8Array(arrayBuffer);

      // Send audio data via WebSocket
      this.socket.emit('audio-data', {
        audio: Array.from(audioBuffer),
        mimeType: 'audio/webm',
      });

      console.log('Audio sent to server');
    } catch (error) {
      console.error('Failed to send audio:', error);
    }
  }

  async playAudioResponse(audioBuffer: ArrayBuffer) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      // Resume audio context if suspended (required by browser policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Decode and play audio
      const audioData = await this.audioContext.decodeAudioData(audioBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioData;
      source.connect(this.audioContext.destination);
      source.start(0);

      console.log('Playing audio response');
    } catch (error) {
      console.error('Failed to play audio:', error);
      // Fallback to HTML5 audio
      this.playAudioFallback(audioBuffer);
    }
  }

  playAudioFallback(audioBuffer: ArrayBuffer) {
    try {
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Audio fallback failed:', error);
    }
  }

  updateMicButton(isRecording: boolean) {
    const micButton = document.getElementById('mic-button');
    if (micButton) {
      micButton.style.backgroundColor = isRecording ? '#ef4444' : '#10b981';
      micButton.textContent = isRecording ? '🛑 Stop' : '🎤 Talk';
    }
  }

  // Toggle recording on button click
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  // Voice Activity Detection (simple implementation)
  startVoiceActivityDetection() {
    // This would be more sophisticated in production
    let silenceTimer: NodeJS.Timeout | null = null;

    if (this.mediaRecorder && this.mediaRecorder.stream) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(
        this.mediaRecorder.stream
      );

      source.connect(analyser);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

        if (average > 20 && !this.isRecording) {
          // Voice detected, start recording
          this.startRecording();
        } else if (average < 10 && this.isRecording) {
          // Silence detected, stop recording after delay
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            this.stopRecording();
          }, 1500); // Stop after 1.5 seconds of silence
        } else if (average > 10 && silenceTimer) {
          // Voice detected again, cancel stop timer
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }

        requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    }
  }
}

// ============= BACKEND: Updated WebSocket Handler =============
// Add this to your server.ts

// io.on('connection', (socket) => {
//   console.log('Client connected:', socket.id);

//   // Handle audio data from client
//   socket.on('audio-data', async (data) => {
//     try {
//       const { audio, mimeType } = data;
//       const audioBuffer = Buffer.from(audio);

//       // Process audio with your existing interview manager
//       const transcript = await AudioProcessor.speechToText(audioBuffer);
//       console.log('Transcript:', transcript);

//       // Generate AI response
//       const aiResponse = await InterviewManager.processResponse(
//         socket.id,
//         transcript
//       );

//       // Generate TTS audio
//       const audioResponse = await AudioProcessor.textToSpeech(aiResponse);

//       // Send audio response back to client
//       socket.emit('audio-response', {
//         text: aiResponse,
//         audio: Array.from(audioResponse),
//       });
//     } catch (error) {
//       console.error('Error processing audio:', error);
//       socket.emit('error', { message: 'Failed to process audio' });
//     }
//   });
// });

// ============= FRONTEND: HTML Implementation =============
// Add this to your frontend HTML

/*
<div id="voice-interview">
  <button id="mic-button" onclick="voiceInterface.toggleRecording()">
    🎤 Talk
  </button>
  <div id="status">Ready to start interview</div>
  <div id="transcript"></div>
</div>

<script>
  // Initialize voice interface
  const socket = io('http://localhost:3001')
  const voiceInterface = new VoiceInterface(socket)
  
  // Handle audio responses from server
  socket.on('audio-response', (data) => {
    const { text, audio } = data
    
    // Display text
    document.getElementById('transcript').textContent = text
    
    // Play audio
    const audioBuffer = new Uint8Array(audio).buffer
    voiceInterface.playAudioResponse(audioBuffer)
  })
  
  // Optional: Enable automatic voice activity detection
  // voiceInterface.startVoiceActivityDetection()
</script>
*/
