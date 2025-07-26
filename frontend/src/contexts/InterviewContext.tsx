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
  }>;
  questionCount: number;
  audioLevel: number;
  error: string | null;
}

type InterviewAction =
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_STATUS'; payload: InterviewState['interviewStatus'] }
  | { type: 'SET_QUESTION'; payload: string }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'SET_LISTENING'; payload: boolean }
  | { type: 'SET_AI_SPEAKING'; payload: boolean }
  | { type: 'UPDATE_SCORES'; payload: Partial<InterviewState['scores']> }
  | { type: 'SET_CANDIDATE_INFO'; payload: InterviewState['candidateInfo'] }
  | {
      type: 'ADD_CONVERSATION';
      payload: InterviewState['conversationHistory'][0];
    }
  | { type: 'SET_QUESTION_COUNT'; payload: number }
  | { type: 'SET_AUDIO_LEVEL'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_INTERVIEW' };

const initialState: InterviewState = {
  sessionId: null,
  interviewStatus: 'not-started',
  currentQuestion: '',
  currentMessage: '',
  isListening: false,
  isAISpeaking: false,
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
  error: null,
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
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_INTERVIEW':
      return initialState;
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

  useEffect(() => {
    // Get the current host and use it for backend connection
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

    // Initialize socket connection
    socketRef.current = io(backendUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server');
      dispatch({ type: 'SET_ERROR', payload: null });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('session-created', (sessionId: string) => {
      console.log('Session created:', sessionId);
      dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
    });

    socket.on(
      'candidate-info-extracted',
      (info: InterviewState['candidateInfo']) => {
        console.log('Candidate info extracted:', info);
        dispatch({ type: 'SET_CANDIDATE_INFO', payload: info });
      }
    );

    socket.on('interview-started', () => {
      console.log('Interview started');
      dispatch({ type: 'SET_STATUS', payload: 'in-progress' });
    });

    socket.on('ai-speaking', () => {
      console.log('AI is speaking');
      dispatch({ type: 'SET_AI_SPEAKING', payload: true });
      dispatch({ type: 'SET_LISTENING', payload: false });
    });

    socket.on('ai-message', (message: string) => {
      console.log('AI message:', message);
      dispatch({ type: 'SET_MESSAGE', payload: message });
      dispatch({ type: 'SET_AI_SPEAKING', payload: false });

      // Use text-to-speech to speak the message
      speakText(message);
    });

    socket.on('ai-question', (question: string) => {
      console.log('AI question:', question);
      dispatch({ type: 'SET_QUESTION', payload: question });
      dispatch({ type: 'SET_MESSAGE', payload: question });
      dispatch({ type: 'SET_AI_SPEAKING', payload: false });

      // Use text-to-speech to speak the question
      speakText(question);
    });

    socket.on('start-listening', () => {
      console.log('Start listening');
      setTimeout(() => {
        dispatch({ type: 'SET_LISTENING', payload: true });
        startListening();
      }, 1000); // Small delay after TTS finishes
    });

    socket.on('stop-listening', () => {
      console.log('Stop listening');
      dispatch({ type: 'SET_LISTENING', payload: false });
      stopListening();
    });

    socket.on('scores-updated', (scores: Partial<InterviewState['scores']>) => {
      console.log('Scores updated:', scores);
      dispatch({ type: 'UPDATE_SCORES', payload: scores });
    });

    socket.on('question-completed', (data: any) => {
      console.log('Question completed:', data);
      dispatch({ type: 'SET_QUESTION_COUNT', payload: data.questionNumber });

      // Add to conversation history
      if (state.currentQuestion) {
        dispatch({
          type: 'ADD_CONVERSATION',
          payload: {
            question: state.currentQuestion,
            answer: 'Voice response recorded',
            score: data.score,
            timestamp: new Date().toISOString(),
          },
        });
      }
    });

    socket.on('interview-completed', (data: any) => {
      console.log('Interview completed:', data);
      dispatch({ type: 'SET_STATUS', payload: 'completed' });
      dispatch({ type: 'SET_LISTENING', payload: false });
      dispatch({ type: 'SET_AI_SPEAKING', payload: false });
      dispatch({ type: 'UPDATE_SCORES', payload: data.scores });
    });

    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
      dispatch({ type: 'SET_ERROR', payload: error });
    });

    return () => {
      socket.disconnect();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Text-to-Speech function
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Find a good voice (prefer female, English)
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (voice) =>
            voice.lang.includes('en') &&
            voice.name.toLowerCase().includes('female')
        ) ||
        voices.find((voice) => voice.lang.includes('en')) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        console.log('TTS started');
        dispatch({ type: 'SET_AI_SPEAKING', payload: true });
      };

      utterance.onend = () => {
        console.log('TTS ended');
        dispatch({ type: 'SET_AI_SPEAKING', payload: false });
      };

      utterance.onerror = (event) => {
        console.error('TTS error:', event);
        dispatch({ type: 'SET_AI_SPEAKING', payload: false });
      };

      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startInterview = async (resumeFile: File) => {
    if (!socketRef.current) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }

    dispatch({ type: 'SET_STATUS', payload: 'waiting' });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Convert file to base64 for transmission
      const fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(resumeFile);
      });

      socketRef.current.emit('start-interview', {
        fileName: resumeFile.name,
        fileData: fileData,
        fileType: resumeFile.type,
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to process resume file' });
    }
  };

  const stopInterview = () => {
    if (socketRef.current) {
      socketRef.current.emit('stop-interview');
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    dispatch({ type: 'RESET_INTERVIEW' });
  };

  const startListening = async () => {
    try {
      console.log('Starting to listen...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });

        if (socketRef.current && audioBlob.size > 0) {
          // Convert blob to array buffer then to array for transmission
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioArray = Array.from(new Uint8Array(arrayBuffer));

          console.log('Sending audio data, size:', audioArray.length);
          socketRef.current.emit('audio-data', audioArray);
        }

        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      console.log('Recording started');

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'recording'
        ) {
          console.log('Auto-stopping recording after 15 seconds');
          mediaRecorderRef.current.stop();
          dispatch({ type: 'SET_LISTENING', payload: false });
        }
      }, 15000);

      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (analyserRef.current && state.isListening) {
          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount
          );
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          dispatch({ type: 'SET_AUDIO_LEVEL', payload: average });
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();
    } catch (error) {
      console.error('Error starting to listen:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to access microphone' });
    }
  };

  const stopListening = () => {
    console.log('Stopping listening...');
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }
    dispatch({ type: 'SET_LISTENING', payload: false });
    dispatch({ type: 'SET_AUDIO_LEVEL', payload: 0 });
  };

  const sendTextResponse = (text: string) => {
    if (!socketRef.current || !state.sessionId) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Cannot send response - not connected',
      });
      return;
    }

    console.log('Sending text response:', text);
    socketRef.current.emit('text-response', {
      sessionId: state.sessionId,
      text: text,
    });

    dispatch({ type: 'SET_LISTENING', payload: false });
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
      import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const downloadUrl = `${backendUrl}/api/report/download/${state.sessionId}`;

    console.log('Downloading report from:', downloadUrl);
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
