//@ts-nocheck

import type React from 'react';
import { useState } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  Send,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { useInterview } from '../contexts/InterviewContext';
import AudioVisualizer from './AudioVisualizer';
import VideoPreview from './VideoPreview';
import ScoreDisplay from './ScoreDisplay';

const InterviewScreen: React.FC = () => {
  const {
    currentMessage,
    currentQuestion,
    isListening,
    isAISpeaking,
    isProcessing,
    scores,
    candidateInfo,
    conversationHistory,
    questionCount,
    audioLevel,
    silenceTimer,
    recordingDuration,
    connectionStatus,
    startListening,
    stopListening,
    sendTextResponse,
    stopInterview,
    interviewStatus,
    error,
  } = useInterview();

  const [textResponse, setTextResponse] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const maxQuestions = 8;
  const progress = (questionCount / maxQuestions) * 100;

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSendResponse = () => {
    if (textResponse.trim() && !isAISpeaking && !isProcessing) {
      sendTextResponse(textResponse.trim());
      setTextResponse('');
      setShowTextInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendResponse();
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

  if (interviewStatus === 'waiting') {
    return (
      <div className="interview-container flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-lg bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Preparing Your Professional Interview
          </h2>
          <p className="text-gray-600 mb-4">
            Our AI is analyzing your resume and generating personalized Excel
            questions based on your experience level and skills...
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              ✨ Creating questions tailored to your background
              <br />
              🎯 Setting appropriate difficulty level
              <br />
              🔊 Preparing Indian English voice system
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-container flex min-h-screen bg-gray-50">
      {/* Main Interview Area */}
      <div className="flex-1 flex flex-col p-6">
        {/* Header with Connection Status */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                AI Excel Skills Interview
              </h1>
              <div
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                  connectionStatus === 'connected'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {connectionStatus === 'connected' ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span>{connectionStatus}</span>
              </div>
            </div>
            {candidateInfo && (
              <p className="text-gray-600">Welcome, {candidateInfo.name}</p>
            )}
          </div>
          <button
            onClick={stopInterview}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Square className="w-4 h-4" />
            <span>End Interview</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <p className="text-red-700 font-medium">Error</p>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Question {questionCount} of {maxQuestions}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Message/Question */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-gray-100">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-medium text-gray-900">
                    {currentQuestion ? 'Current Question' : 'AI Message'}
                  </h2>
                  {isProcessing && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">
                        Processing your response...
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {currentMessage ||
                    'Please wait while I prepare your personalized interview...'}
                </div>
                {isAISpeaking && (
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

          {/* Enhanced Voice Controls */}
          {!isAISpeaking && currentQuestion && !isProcessing && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4 border border-gray-100">
              <div className="flex justify-center items-center space-x-8">
                <div className="text-center">
                  <AudioVisualizer
                    audioLevel={audioLevel}
                    isActive={isListening}
                  />
                  <p className="text-xs text-gray-500 mt-2">Voice Level</p>
                  <p className="text-xs font-mono text-gray-400">
                    {Math.round(audioLevel)}
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  <button
                    onClick={handleMicToggle}
                    disabled={isAISpeaking || isProcessing}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg transform hover:scale-105 ${
                      isListening
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } ${
                      isAISpeaking || isProcessing
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-8 h-8" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {isAISpeaking
                        ? 'AI is speaking...'
                        : isProcessing
                        ? 'Processing your response...'
                        : isListening
                        ? 'Listening... (Speak naturally)'
                        : 'Click to start answering'}
                    </p>
                    {isListening && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-center space-x-2 text-blue-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-mono">
                            {formatTime(recordingDuration)}
                          </span>
                        </div>
                        {silenceTimer > 0 && (
                          <div className="flex items-center justify-center space-x-1 text-orange-600">
                            <span className="text-xs">
                              Auto-stop in {getSilenceCountdown()}s if silent
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

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
                  <p className="text-xs text-gray-500 mt-2">Audio Strength</p>
                </div>
              </div>

              {/* Enhanced Instructions */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">
                  Professional Voice Interview Guidelines
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <ul className="space-y-1">
                    <li>
                      • <strong>No time limits</strong> - Speak as long as
                      needed
                    </li>
                    <li>
                      • <strong>Natural pace</strong> - AI understands Indian
                      English
                    </li>
                    <li>
                      • <strong>Be honest</strong> - Say "I don't know" if
                      unsure
                    </li>
                    <li>
                      • <strong>Give examples</strong> - Share specific
                      experiences
                    </li>
                  </ul>
                  <ul className="space-y-1">
                    <li>
                      • <strong>Think aloud</strong> - Explain your process
                    </li>
                    <li>
                      • <strong>Auto-stop</strong> - 3 seconds silence triggers
                      processing
                    </li>
                    <li>
                      • <strong>Stay calm</strong> - Take pauses to think
                    </li>
                    <li>
                      • <strong>Be specific</strong> - Technical details matter
                    </li>
                  </ul>
                </div>
              </div>

              {/* Alternative text input option */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowTextInput(!showTextInput)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                  disabled={isAISpeaking || isProcessing}
                >
                  {showTextInput
                    ? 'Hide text input'
                    : 'Prefer typing? Use text input'}
                </button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4 border border-gray-100">
              <div className="flex items-center justify-center space-x-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-900">
                    Processing Your Response
                  </p>
                  <p className="text-sm text-gray-600">
                    AI is analyzing your answer and calculating scores...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Text Response Input (Alternative) */}
          {showTextInput &&
            !isAISpeaking &&
            currentQuestion &&
            !isProcessing && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Type Your Response
                </h3>
                <div className="space-y-4">
                  <textarea
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your detailed answer here... Be specific and provide examples. (Press Enter to send, Shift+Enter for new line)"
                    className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isAISpeaking || isProcessing}
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {textResponse.length}/1000 characters
                      {textResponse.length > 800 && (
                        <span className="text-orange-600 ml-2">
                          Consider being more concise
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleSendResponse}
                      disabled={
                        !textResponse.trim() || isAISpeaking || isProcessing
                      }
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Response</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* Status Messages */}
          {!isListening &&
            !isAISpeaking &&
            !showTextInput &&
            currentQuestion &&
            !isProcessing && (
              <div className="text-center text-gray-600 bg-white rounded-lg p-4 shadow-sm">
                <p>Please wait for the next question...</p>
              </div>
            )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col shadow-lg">
        {/* Video Preview */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Video Preview
          </h3>
          <VideoPreview />
        </div>

        {/* Live Scores */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Live Assessment
          </h3>
          <ScoreDisplay scores={scores} />
        </div>

        {/* Interview Progress */}
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Question Progress
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {conversationHistory.map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 border border-gray-100"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Q{index + 1}</span>
                  <span
                    className={`text-sm font-bold px-2 py-1 rounded ${
                      item.score >= 7
                        ? 'bg-green-100 text-green-700'
                        : item.score >= 4
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.score.toFixed(1)}/10
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {item.question}
                </p>
                {item.feedback && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    "{item.feedback.substring(0, 50)}..."
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Tips */}
        <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Professional Tips</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              • <strong>Be specific:</strong> Give real examples from work
            </li>
            <li>
              • <strong>Think step-by-step:</strong> Explain your process
            </li>
            <li>
              • <strong>Ask for clarity:</strong> If question is unclear
            </li>
            <li>
              • <strong>Admit gaps:</strong> Honesty over guessing
            </li>
            <li>
              • <strong>Stay professional:</strong> This is a real assessment
            </li>
          </ul>
        </div>

        {/* Interview Stats */}
        <div className="mt-4 bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">
            Session Stats
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Questions: {questionCount}/8</div>
            <div>Connection: {connectionStatus}</div>
            <div>Audio Level: {Math.round(audioLevel)}</div>
            <div>
              Status:{' '}
              {isListening
                ? 'Listening'
                : isProcessing
                ? 'Processing'
                : 'Ready'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewScreen;
