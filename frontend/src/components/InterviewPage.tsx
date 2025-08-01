//@ts-nocheck

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Upload,
  FileText,
  Volume2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import io, { type Socket } from 'socket.io-client';

interface InterviewState {
  step: 'upload' | 'processing' | 'ready' | 'interview' | 'completed';
  sessionId: string | null;
  candidateEmail: string | null;
  isListening: boolean;
  isAISpeaking: boolean;
  currentQuestion: string;
  questionNumber: number;
  totalQuestions: number;
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    overall: number;
  };
  introductionComplete: boolean;
}

const InterviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const candidateEmail = searchParams.get('candidate');

  const [state, setState] = useState<InterviewState>({
    step: 'upload',
    sessionId: null,
    candidateEmail,
    isListening: false,
    isAISpeaking: false,
    currentQuestion: '',
    questionNumber: 0,
    totalQuestions: 8,
    scores: { technical: 0, communication: 0, problemSolving: 0, overall: 0 },
    introductionComplete: false,
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [introduction, setIntroduction] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!candidateEmail) {
      toast.error('Invalid interview link. Please contact HR.');
      return;
    }

    // Initialize socket connection
    socketRef.current = io('http://localhost:3000', {
      transports: ['websocket'],
      forceNew: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Connected to interview server');
      toast.success('Connected to interview server');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      toast.error('Connection failed. Please check your internet connection.');
    });

    socket.on('interview-started', (data) => {
      console.log('🎤 Interview started:', data);
      setIntroduction(data.introduction);
      setState((prev) => ({
        ...prev,
        step: 'interview',
        sessionId: data.sessionId,
        introductionComplete: false,
      }));
      speakText(data.introduction, true); // Mark as introduction
    });

    socket.on('question-generated', (data) => {
      console.log('❓ Question generated:', data);
      setState((prev) => ({
        ...prev,
        currentQuestion: data.question,
        questionNumber: data.questionNumber || prev.questionNumber + 1,
        isAISpeaking: true,
      }));
      speakText(data.question, false); // Not introduction
    });

    socket.on('response-evaluated', (data) => {
      console.log('📊 Response evaluated:', data);
      toast.success('Response recorded and evaluated!');

      // Parse evaluation data
      try {
        const evaluationData =
          typeof data.evaluation === 'string'
            ? JSON.parse(data.evaluation)
            : data.evaluation;
        if (evaluationData.currentScores) {
          setState((prev) => ({
            ...prev,
            scores: evaluationData.currentScores,
          }));
        }
      } catch (error) {
        console.error('Error parsing evaluation data:', error);
      }

      // Request next question or complete interview
      if (state.questionNumber >= state.totalQuestions) {
        setTimeout(() => {
          socket.emit('complete-interview', { sessionId: state.sessionId });
        }, 2000);
      } else {
        setTimeout(() => {
          socket.emit('request-question', { sessionId: state.sessionId });
        }, 3000);
      }
    });

    socket.on('interview-completed', (data) => {
      console.log('🏁 Interview completed:', data);
      setState((prev) => ({ ...prev, step: 'completed' }));
      speakText(data.message, false);
      toast.success(
        'Interview completed! Check your email for the detailed report.'
      );
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      toast.error(error);
    });

    return () => {
      cleanup();
      socket?.disconnect();
    };
  }, [candidateEmail]);

  const speakText = (text: string, isIntroduction = false) => {
    if ('speechSynthesis' in window) {
      setState((prev) => ({ ...prev, isAISpeaking: true }));

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;

      // Select the best available voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (voice) =>
            voice.lang === 'en-IN' &&
            voice.name.toLowerCase().includes('female')
        ) ||
        voices.find((voice) => voice.lang === 'en-IN') ||
        voices.find(
          (voice) =>
            voice.lang.startsWith('en-') &&
            voice.name.toLowerCase().includes('female')
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
        setState((prev) => ({ ...prev, isAISpeaking: true }));
      };

      utterance.onend = () => {
        console.log('🔇 TTS ended');
        setState((prev) => ({ ...prev, isAISpeaking: false }));

        // If this was the introduction, automatically request first question
        if (isIntroduction) {
          console.log('📝 Introduction complete, requesting first question...');
          setState((prev) => ({ ...prev, introductionComplete: true }));

          // Wait a moment then request first question
          setTimeout(() => {
            if (socketRef.current && state.sessionId) {
              console.log('🎯 Requesting first question...');
              socketRef.current.emit('request-question', {
                sessionId: state.sessionId,
              });
            }
          }, 2000);
        }
      };

      utterance.onerror = (event) => {
        console.error('❌ TTS error:', event);
        setState((prev) => ({ ...prev, isAISpeaking: false }));

        // If introduction failed, still try to continue
        if (isIntroduction) {
          setState((prev) => ({ ...prev, introductionComplete: true }));
          setTimeout(() => {
            if (socketRef.current && state.sessionId) {
              socketRef.current.emit('request-question', {
                sessionId: state.sessionId,
              });
            }
          }, 1000);
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (
        file.type === 'application/pdf' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        setResumeFile(file);
        toast.success('Resume selected successfully!');
      } else {
        toast.error('Please upload a PDF or DOCX file');
      }
    }
  };

  const handleResumeSubmit = async () => {
    if (!resumeFile || !candidateEmail) {
      toast.error('Please select a resume file');
      return;
    }

    setIsLoading(true);
    setState((prev) => ({ ...prev, step: 'processing' }));

    try {
      // Create interview session
      const sessionResponse = await fetch(
        `http://localhost:3000/api/interview/start/${encodeURIComponent(
          candidateEmail
        )}`
      );
      const sessionData = await sessionResponse.json();

      if (!sessionData.success) {
        throw new Error(sessionData.message);
      }

      const sessionId = sessionData.sessionId;

      // Upload resume
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('sessionId', sessionId);
      formData.append('candidateEmail', candidateEmail);

      const uploadResponse = await fetch(
        'http://localhost:3000/api/interview/upload-resume',
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();

      if (uploadData.success) {
        setState((prev) => ({ ...prev, step: 'ready', sessionId }));
        toast.success('Resume processed successfully!');
      } else {
        throw new Error(uploadData.message);
      }
    } catch (error) {
      console.error('Resume upload error:', error);
      toast.error('Failed to process resume. Please try again.');
      setState((prev) => ({ ...prev, step: 'upload' }));
    } finally {
      setIsLoading(false);
    }
  };

  const startInterview = () => {
    if (socketRef.current && state.sessionId) {
      console.log('🚀 Starting interview with session:', state.sessionId);
      socketRef.current.emit('start-interview', {
        sessionId: state.sessionId,
        candidateEmail,
      });
    }
  };

  // Enhanced audio recording
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

      // Setup media recorder with enhanced settings
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('🛑 Recording stopped, processing audio...');

        const audioBlob = new Blob(chunks, { type: mimeType });

        if (socketRef.current && audioBlob.size > 0) {
          try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioArray = Array.from(new Uint8Array(arrayBuffer));

            console.log('📤 Sending audio data, size:', audioArray.length);
            socketRef.current.emit('audio-response', {
              sessionId: state.sessionId,
              audioBuffer: audioArray,
            });
          } catch (error) {
            console.error('❌ Error processing audio blob:', error);
            toast.error('Failed to process audio');
          }
        }

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start(100); // Collect data every 100ms
      console.log('🎙️ Recording started');

      setState((prev) => ({ ...prev, isListening: true }));

      // Start monitoring
      startAudioMonitoring();
      startRecordingTimer();

      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopListening();
        }
      }, 60000);
    } catch (error) {
      console.error('❌ Error starting to listen:', error);
      toast.error('Failed to access microphone. Please check permissions.');
    }
  };

  // Enhanced audio monitoring
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

      setAudioLevel(average);

      if (average < silenceThreshold) {
        silenceCount++;
        setSilenceTimer(silenceCount);

        if (silenceCount >= silenceLimit) {
          console.log('🔇 Silence detected, stopping recording');
          stopListening();
          return;
        }
      } else {
        silenceCount = 0;
        setSilenceTimer(0);
      }

      audioLevelTimerRef.current = setTimeout(checkAudioLevel, 100);
    };

    checkAudioLevel();
  };

  const startRecordingTimer = () => {
    let duration = 0;
    recordingTimerRef.current = setInterval(() => {
      duration++;
      setRecordingDuration(duration);
    }, 1000);
  };

  const stopListening = () => {
    console.log('🛑 Stopping listening...');

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }

    cleanup();
    setState((prev) => ({ ...prev, isListening: false }));
  };

  const cleanup = () => {
    if (audioLevelTimerRef.current) {
      clearTimeout(audioLevelTimerRef.current);
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    setAudioLevel(0);
    setSilenceTimer(0);
    setRecordingDuration(0);
  };

  const requestNextQuestion = () => {
    if (socketRef.current && state.sessionId) {
      console.log('🎯 Manually requesting next question...');
      socketRef.current.emit('request-question', {
        sessionId: state.sessionId,
      });
    }
  };

  const getSilenceCountdown = () => {
    const remaining = Math.max(0, 30 - silenceTimer);
    return Math.ceil(remaining / 10);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!candidateEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Invalid Interview Link
          </h1>
          <p className="text-gray-600">
            Please contact HR for a valid interview link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Excel Skills Assessment
          </h1>
          <p className="text-gray-600">
            AI-Powered Voice Interview for {candidateEmail}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { step: 'upload', label: 'Upload Resume', icon: Upload },
              { step: 'processing', label: 'Processing', icon: Loader2 },
              { step: 'ready', label: 'Ready', icon: CheckCircle },
              { step: 'interview', label: 'Interview', icon: Mic },
              { step: 'completed', label: 'Completed', icon: CheckCircle },
            ].map(({ step, label, icon: Icon }, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    state.step === step
                      ? 'bg-blue-600 text-white'
                      : [
                          'upload',
                          'processing',
                          'ready',
                          'interview',
                          'completed',
                        ].indexOf(state.step) > index
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {label}
                </span>
                {index < 4 && <div className="w-8 h-0.5 bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {state.step === 'upload' && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Upload Your Resume
                </h2>
                <p className="text-gray-600">
                  Please upload your resume to begin the personalized Excel
                  skills assessment
                </p>
              </div>

              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {resumeFile
                      ? resumeFile.name
                      : 'Click to upload your resume'}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supports PDF and DOCX files (max 10MB)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Choose File
                  </button>
                </div>

                {resumeFile && (
                  <button
                    onClick={handleResumeSubmit}
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Process Resume & Continue</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {state.step === 'processing' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Your Resume
              </h2>
              <p className="text-gray-600">
                Our AI is analyzing your background and preparing personalized
                questions...
              </p>
            </div>
          )}

          {state.step === 'ready' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Begin!
              </h2>
              <p className="text-gray-600 mb-6">
                Your resume has been processed. The AI interviewer is ready to
                conduct your personalized Excel skills assessment.
              </p>

              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Before we start:
                </h3>
                <ul className="text-sm text-blue-800 space-y-2 text-left">
                  <li>• Ensure you're in a quiet environment</li>
                  <li>• Test your microphone and speakers</li>
                  <li>• The interview will take approximately 15-20 minutes</li>
                  <li>• You'll receive 7-8 personalized questions</li>
                  <li>• Speak clearly and provide detailed answers</li>
                  <li>
                    • AI will automatically detect when you finish speaking
                  </li>
                </ul>
              </div>

              <button
                onClick={startInterview}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                Start Voice Interview
              </button>
            </div>
          )}

          {state.step === 'interview' && (
            <div className="space-y-6">
              {/* AI Message Display */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Volume2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      {!state.introductionComplete
                        ? 'AI Interviewer - Welcome'
                        : `Question ${state.questionNumber} of ${state.totalQuestions}`}
                    </h3>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {!state.introductionComplete
                        ? introduction ||
                          'Preparing your personalized interview...'
                        : state.currentQuestion ||
                          'Preparing your next question...'}
                    </div>
                    {state.isAISpeaking && (
                      <div className="mt-4 flex items-center space-x-2 text-blue-600">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          />
                          <div
                            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          />
                        </div>
                        <span className="text-sm">
                          AI is speaking... (Indian English Female Voice)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Voice Controls - Only show after introduction */}
              {state.introductionComplete &&
                !state.isAISpeaking &&
                state.currentQuestion && (
                  <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-6">
                        Your Response
                      </h3>

                      <div className="flex justify-center items-center space-x-8 mb-6">
                        <div className="text-center">
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                              audioLevel > 50
                                ? 'bg-green-100'
                                : audioLevel > 25
                                ? 'bg-yellow-100'
                                : 'bg-gray-100'
                            }`}
                          >
                            <span
                              className={`text-2xl font-bold ${
                                audioLevel > 50
                                  ? 'text-green-600'
                                  : audioLevel > 25
                                  ? 'text-yellow-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {Math.round(audioLevel)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Audio Level
                          </p>
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                          <button
                            onClick={
                              state.isListening ? stopListening : startListening
                            }
                            disabled={state.isAISpeaking}
                            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg transform hover:scale-105 ${
                              state.isListening
                                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            } ${
                              state.isAISpeaking
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                          >
                            {state.isListening ? (
                              <MicOff className="w-8 h-8" />
                            ) : (
                              <Mic className="w-8 h-8" />
                            )}
                          </button>

                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">
                              {state.isAISpeaking
                                ? 'AI is speaking...'
                                : state.isListening
                                ? 'Listening... (Speak naturally)'
                                : 'Click to start answering'}
                            </p>
                            {state.isListening && (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-center space-x-2 text-blue-600">
                                  <span className="text-sm font-mono">
                                    {formatTime(recordingDuration)}
                                  </span>
                                </div>
                                {silenceTimer > 0 && (
                                  <div className="flex items-center justify-center space-x-1 text-orange-600">
                                    <span className="text-xs">
                                      Auto-stop in {getSilenceCountdown()}s if
                                      silent
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Volume2 className="w-6 h-6 text-blue-600" />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">AI Voice</p>
                        </div>
                      </div>

                      {/* Enhanced Instructions */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-3">
                          Professional Voice Interview Guidelines
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                          <ul className="space-y-1">
                            <li>
                              • <strong>No time limits</strong> - Speak as long
                              as needed
                            </li>
                            <li>
                              • <strong>Natural pace</strong> - AI understands
                              Indian English
                            </li>
                            <li>
                              • <strong>Be honest</strong> - Say "I don't know"
                              if unsure
                            </li>
                            <li>
                              • <strong>Give examples</strong> - Share specific
                              experiences
                            </li>
                          </ul>
                          <ul className="space-y-1">
                            <li>
                              • <strong>Think aloud</strong> - Explain your
                              process
                            </li>
                            <li>
                              • <strong>Auto-stop</strong> - 3 seconds silence
                              triggers processing
                            </li>
                            <li>
                              • <strong>Stay calm</strong> - Take pauses to
                              think
                            </li>
                            <li>
                              • <strong>Be specific</strong> - Technical details
                              matter
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Show manual trigger if introduction is complete but no question yet */}
              {state.introductionComplete &&
                !state.currentQuestion &&
                !state.isAISpeaking && (
                  <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Ready for Questions
                    </h3>
                    <p className="text-gray-600 mb-6">
                      The introduction is complete. Let's begin with your first
                      question!
                    </p>
                    <button
                      onClick={requestNextQuestion}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start First Question
                    </button>
                  </div>
                )}

              {/* Progress and Scores */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>
                      {state.questionNumber} of {state.totalQuestions} questions
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (state.questionNumber / state.totalQuestions) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Live Scores
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Technical:</span>
                      <span className="font-medium">
                        {state.scores.technical.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Communication:</span>
                      <span className="font-medium">
                        {state.scores.communication.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Problem Solving:</span>
                      <span className="font-medium">
                        {state.scores.problemSolving.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Overall:</span>
                      <span className="font-bold text-blue-600">
                        {state.scores.overall.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {state.step === 'completed' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Interview Completed!
              </h2>
              <p className="text-gray-600 mb-6">
                Thank you for completing the Excel skills assessment. Your
                detailed report has been generated and sent to your email
                address.
              </p>

              <div className="bg-green-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-green-900 mb-3">
                  Final Scores
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {state.scores.overall.toFixed(1)}
                    </div>
                    <div className="text-green-800">Overall Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {state.scores.technical.toFixed(1)}
                    </div>
                    <div className="text-blue-800">Technical Skills</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">
                  What's Next?
                </h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>
                    • Check your email for the comprehensive assessment report
                  </li>
                  <li>• Review your scores and detailed feedback</li>
                  <li>
                    • Use the recommendations to improve your Excel skills
                  </li>
                  <li>• HR will contact you regarding next steps</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;
