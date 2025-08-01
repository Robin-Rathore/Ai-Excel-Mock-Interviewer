//@ts-nocheck

import type React from 'react';
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from 'react';
import { io, type Socket } from 'socket.io-client';

interface InterviewState {
  sessionId: string | null;
  interviewStatus: 'not-started' | 'waiting' | 'in-progress' | 'completed';
  currentQuestion: string;
  currentMessage: string;
  isListening: boolean;
  isAISpeaking: boolean;
  isProcessing: boolean;
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    overall: number;
  };
  candidateInfo: {
    name: string;
    email: string;
    skills: string[];
    experienceLevel: string;
  } | null;
  conversationHistory: Array<{
    question: string;
    answer: string;
    score: number;
    timestamp: string;
    feedback?: string;
  }>;
  questionCount: number;
  audioLevel: number;
  silenceTimer: number;
  recordingDuration: number;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

type InterviewAction =
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_STATUS'; payload: InterviewState['interviewStatus'] }
  | { type: 'SET_QUESTION'; payload: string }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'SET_LISTENING'; payload: boolean }
  | { type: 'SET_AI_SPEAKING'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'UPDATE_SCORES'; payload: Partial<InterviewState['scores']> }
  | { type: 'SET_CANDIDATE_INFO'; payload: InterviewState['candidateInfo'] }
  | {
      type: 'ADD_CONVERSATION';
      payload: InterviewState['conversationHistory'][0];
    }
  | { type: 'SET_QUESTION_COUNT'; payload: number }
  | { type: 'SET_AUDIO_LEVEL'; payload: number }
  | { type: 'SET_SILENCE_TIMER'; payload: number }
  | { type: 'SET_RECORDING_DURATION'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | {
      type: 'SET_CONNECTION_STATUS';
      payload: InterviewState['connectionStatus'];
    }
  | { type: 'RESET_INTERVIEW' };

const initialState: InterviewState = {
  sessionId: null,
  interviewStatus: 'not-started',
  currentQuestion: '',
  currentMessage: '',
  isListening: false,
  isAISpeaking: false,
  isProcessing: false,
  scores: {
    technical: 0,
    communication: 0,
    problemSolving: 0,
    overall: 0,
  },
  candidateInfo: null,
  conversationHistory: [],
  questionCount: 0,
  audioLevel: 0,
  silenceTimer: 0,
  recordingDuration: 0,
  error: null,
  connectionStatus: 'connecting',
};

const interviewReducer = (
  state: InterviewState,
  action: InterviewAction
): InterviewState => {
  switch (action.type) {
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_STATUS':
      return { ...state, interviewStatus: action.payload };
    case 'SET_QUESTION':
      return { ...state, currentQuestion: action.payload };
    case 'SET_MESSAGE':
      return { ...state, currentMessage: action.payload };
    case 'SET_LISTENING':
      return { ...state, isListening: action.payload };
    case 'SET_AI_SPEAKING':
      return { ...state, isAISpeaking: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'UPDATE_SCORES':
      return { ...state, scores: { ...state.scores, ...action.payload } };
    case 'SET_CANDIDATE_INFO':
      return { ...state, candidateInfo: action.payload };
    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversationHistory: [...state.conversationHistory, action.payload],
      };
    case 'SET_QUESTION_COUNT':
      return { ...state, questionCount: action.payload };
    case 'SET_AUDIO_LEVEL':
      return { ...state, audioLevel: action.payload };
    case 'SET_SILENCE_TIMER':
      return { ...state, silenceTimer: action.payload };
    case 'SET_RECORDING_DURATION':
      return { ...state, recordingDuration: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'RESET_INTERVIEW':
      return { ...initialState, connectionStatus: state.connectionStatus };
    default:
      return state;
  }
};

interface InterviewContextType extends InterviewState {
  dispatch: React.Dispatch<InterviewAction>;
  socket: Socket | null;
  startInterview: (resumeFile: File) => Promise<void>;
  stopInterview: () => void;
  startListening: () => void;
  stopListening: () => void;
  sendTextResponse: (text: string) => void;
  downloadReport: () => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(
  undefined
);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(interviewReducer, initialState);
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voicesLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    initializeConnection();
    loadVoices();

    return () => {
      cleanup();
    };
  }, []);

  const initializeConnection = () => {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });

    socketRef.current = io(backendUrl, {
      transports: ['websocket'],
      forceNew: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      dispatch({ type: 'SET_ERROR', payload: null });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: 'Connection failed. Please check your internet connection.',
      });
    });

    // Interview events
    socket.on('session-created', (sessionId: string) => {
      console.log('✅ Session created:', sessionId);
      dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
    });

    socket.on(
      'candidate-info-extracted',
      (info: InterviewState['candidateInfo']) => {
        console.log('✅ Candidate info extracted:', info);
        dispatch({ type: 'SET_CANDIDATE_INFO', payload: info });
      }
    );

    socket.on('interview-started', () => {
      console.log('✅ Interview started');
      dispatch({ type: 'SET_STATUS', payload: 'in-progress' });
    });

    socket.on('ai-speaking', () => {
      console.log('🗣️ AI is speaking');
      dispatch({ type: 'SET_AI_SPEAKING', payload: true });
      dispatch({ type: 'SET_LISTENING', payload: false });
      dispatch({ type: 'SET_PROCESSING', payload: false });
    });

    socket.on('ai-message', (message: string) => {
      console.log('💬 AI message:', message.substring(0, 100) + '...');
      dispatch({ type: 'SET_MESSAGE', payload: message });
      dispatch({ type: 'SET_AI_SPEAKING', payload: false });
      speakText(message);
    });

    socket.on('ai-question', (question: string) => {
      console.log('❓ AI question:', question.substring(0, 100) + '...');
      dispatch({ type: 'SET_QUESTION', payload: question });
      dispatch({ type: 'SET_MESSAGE', payload: question });
      dispatch({ type: 'SET_AI_SPEAKING', payload: false });
      speakText(question);
    });

    socket.on('start-listening', () => {
      console.log('🎤 Start listening signal received');
      setTimeout(() => {
        if (!state.isAISpeaking) {
          dispatch({ type: 'SET_LISTENING', payload: true });
          startListening();
        }
      }, 2000); // Wait for TTS to finish
    });

    socket.on('stop-listening', () => {
      console.log('🛑 Stop listening signal received');
      dispatch({ type: 'SET_LISTENING', payload: false });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      stopListening();
    });

    socket.on('scores-updated', (scores: Partial<InterviewState['scores']>) => {
      console.log('📊 Scores updated:', scores);
      dispatch({ type: 'UPDATE_SCORES', payload: scores });
    });

    socket.on('question-completed', (data: any) => {
      console.log('✅ Question completed:', data);
      dispatch({ type: 'SET_QUESTION_COUNT', payload: data.questionNumber });
      dispatch({ type: 'SET_PROCESSING', payload: false });

      // Add to conversation history
      if (state.currentQuestion) {
        dispatch({
          type: 'ADD_CONVERSATION',
          payload: {
            question: state.currentQuestion,
            answer: 'Response recorded',
            score: data.score,
            timestamp: new Date().toISOString(),
            feedback: data.feedback,
          },
        });
      }
    });

    socket.on('interview-completed', (data: any) => {
      console.log('🏁 Interview completed:', data);
      dispatch({ type: 'SET_STATUS', payload: 'completed' });
      dispatch({ type: 'SET_LISTENING', payload: false });
      dispatch({ type: 'SET_AI_SPEAKING', payload: false });
      dispatch({ type: 'SET_PROCESSING', payload: false });
      dispatch({ type: 'UPDATE_SCORES', payload: data.scores });
      cleanup();
    });

    socket.on('error', (error: string) => {
      console.error('❌ Socket error:', error);
      dispatch({ type: 'SET_ERROR', payload: error });
      dispatch({ type: 'SET_PROCESSING', payload: false });
    });
  };

  const loadVoices = () => {
    if ('speechSynthesis' in window) {
      const loadVoicesHandler = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          voicesLoadedRef.current = true;
          console.log('🔊 Voices loaded:', voices.length);

          // Log available Indian English voices
          const indianVoices = voices.filter((voice) =>
            voice.lang.includes('en-IN')
          );
          console.log(
            '🇮🇳 Indian English voices:',
            indianVoices.map((v) => v.name)
          );
        }
      };

      // Load voices immediately if available
      loadVoicesHandler();

      // Also listen for the event
      window.speechSynthesis.onvoiceschanged = loadVoicesHandler;
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('⚠️ Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Enhanced settings for Indian English
    utterance.rate = 0.8; // Slower for clarity
    utterance.pitch = 1.1; // Slightly higher for female voice
    utterance.volume = 0.9;

    // Select the best available voice
    const voices = window.speechSynthesis.getVoices();

    // Priority order for voice selection
    const preferredVoice =
      voices.find(
        (voice) =>
          voice.lang === 'en-IN' && voice.name.toLowerCase().includes('female')
      ) ||
      voices.find((voice) => voice.lang === 'en-IN') ||
      voices.find(
        (voice) =>
          voice.lang.startsWith('en-') &&
          voice.name.toLowerCase().includes('female')
      ) ||
      voices.find(
        (voice) =>
          voice.lang.startsWith('en-') &&
          (voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('karen') ||
            voice.name.toLowerCase().includes('susan') ||
            voice.name.toLowerCase().includes('raveena'))
      ) ||
      voices.find((voice) => voice.lang.startsWith('en-')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log(
        '🔊 Selected voice:',
        preferredVoice.name,
        preferredVoice.lang
      );
    }

    utterance.onstart = () => {
      console.log('🗣️ TTS started');
      dispatch({ type: 'SET_AI_SPEAKING', payload: true });
    };

    utterance.onend = () => {
      console.log('🔇 TTS ended');
      dispatch({ type: 'SET_AI_SPEAKING', payload: false });
    };

    utterance.onerror = (event) => {
      console.error('❌ TTS error:', event);
      dispatch({ type: 'SET_AI_SPEAKING', payload: false });
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const startInterview = async (resumeFile: File) => {
    if (!socketRef.current) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }

    if (state.connectionStatus !== 'connected') {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Please wait for connection to establish',
      });
      return;
    }

    dispatch({ type: 'SET_STATUS', payload: 'waiting' });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      console.log('📤 Starting interview with file:', resumeFile.name);

      // Convert file to base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(resumeFile);
      });

      socketRef.current.emit('start-interview', {
        fileName: resumeFile.name,
        fileData: fileData,
        fileType: resumeFile.type,
      });
    } catch (error) {
      console.error('❌ Error starting interview:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to process resume file' });
    }
  };

  const startListening = async () => {
    try {
      console.log('🎤 Starting to listen...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Setup media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('🛑 Recording stopped, processing audio...');

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (socketRef.current && audioBlob.size > 0) {
          try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioArray = Array.from(new Uint8Array(arrayBuffer));

            console.log('📤 Sending audio data, size:', audioArray.length);
            socketRef.current.emit('audio-data', audioArray);
          } catch (error) {
            console.error('❌ Error processing audio blob:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to process audio' });
          }
        }

        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      console.log('🎙️ Recording started');

      // Start monitoring
      startAudioMonitoring();
      startRecordingTimer();
    } catch (error) {
      console.error('❌ Error starting to listen:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to access microphone. Please check permissions.',
      });
    }
  };

  const startAudioMonitoring = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceCount = 0;
    const silenceThreshold = 25;
    const silenceLimit = 30; // 3 seconds at 10 checks per second

    const checkAudioLevel = () => {
      if (!analyserRef.current || !state.isListening) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      dispatch({ type: 'SET_AUDIO_LEVEL', payload: average });

      if (average < silenceThreshold) {
        silenceCount++;
        dispatch({ type: 'SET_SILENCE_TIMER', payload: silenceCount });

        if (silenceCount >= silenceLimit) {
          console.log('🔇 Silence detected, stopping recording');
          stopListening();
          return;
        }
      } else {
        silenceCount = 0;
        dispatch({ type: 'SET_SILENCE_TIMER', payload: 0 });
      }

      audioLevelTimerRef.current = setTimeout(checkAudioLevel, 100);
    };

    checkAudioLevel();
  };

  const startRecordingTimer = () => {
    let duration = 0;
    recordingTimerRef.current = setInterval(() => {
      duration++;
      dispatch({ type: 'SET_RECORDING_DURATION', payload: duration });
    }, 1000);
  };

  const stopListening = () => {
    console.log('🛑 Stopping listening...');

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }

    if (audioLevelTimerRef.current) {
      clearTimeout(audioLevelTimerRef.current);
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    dispatch({ type: 'SET_LISTENING', payload: false });
    dispatch({ type: 'SET_AUDIO_LEVEL', payload: 0 });
    dispatch({ type: 'SET_SILENCE_TIMER', payload: 0 });
    dispatch({ type: 'SET_RECORDING_DURATION', payload: 0 });
  };

  const sendTextResponse = (text: string) => {
    if (!socketRef.current || !state.sessionId) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Cannot send response - not connected',
      });
      return;
    }

    if (state.connectionStatus !== 'connected') {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Connection lost. Please refresh the page.',
      });
      return;
    }

    console.log('📤 Sending text response:', text.substring(0, 100) + '...');

    dispatch({ type: 'SET_PROCESSING', payload: true });

    socketRef.current.emit('text-response', {
      sessionId: state.sessionId,
      text: text,
    });

    dispatch({ type: 'SET_LISTENING', payload: false });
  };

  const stopInterview = () => {
    console.log('🛑 Stopping interview...');

    if (socketRef.current) {
      socketRef.current.emit('stop-interview');
    }

    cleanup();
    dispatch({ type: 'RESET_INTERVIEW' });
  };

  const cleanup = () => {
    // Stop recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Clear timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (audioLevelTimerRef.current) {
      clearTimeout(audioLevelTimerRef.current);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    // Stop speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const downloadReport = () => {
    if (!state.sessionId) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'No session ID available for report',
      });
      return;
    }

    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const downloadUrl = `${backendUrl}/api/report/download/${state.sessionId}`;

    console.log('📥 Downloading report from:', downloadUrl);
    window.open(downloadUrl, '_blank');
  };

  const contextValue: InterviewContextType = {
    ...state,
    dispatch,
    socket: socketRef.current,
    startInterview,
    stopInterview,
    startListening,
    stopListening,
    sendTextResponse,
    downloadReport,
  };

  return (
    <InterviewContext.Provider value={contextValue}>
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};
