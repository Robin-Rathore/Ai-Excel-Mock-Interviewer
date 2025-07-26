//@ts-nocheck

import type React from 'react';
import { useState } from 'react';
import { Mic, MicOff, Square, Volume2, Send } from 'lucide-react';
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
    scores,
    candidateInfo,
    conversationHistory,
    questionCount,
    audioLevel,
    startListening,
    stopListening,
    sendTextResponse,
    stopInterview,
    interviewStatus,
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
    if (textResponse.trim() && !isAISpeaking) {
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

  if (interviewStatus === 'waiting') {
    return (
      <div className="interview-container flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Preparing Your Interview
          </h2>
          <p className="text-gray-600">
            Analyzing your resume and generating personalized questions based on
            your Excel experience...
          </p>
          <div className="mt-4 text-sm text-gray-500">
            This may take a few moments
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-container flex min-h-screen">
      {/* Main Interview Area */}
      <div className="flex-1 flex flex-col p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Excel Skills Interview
            </h1>
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

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Question {questionCount} of {maxQuestions}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Message/Question */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-medium text-gray-900 mb-3">
                  {currentQuestion ? 'Current Question' : 'AI Message'}
                </h2>
                <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {currentMessage ||
                    'Please wait while I prepare your interview...'}
                </div>
                {isAISpeaking && (
                  <div className="mt-4 flex items-center space-x-2 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    <span className="text-sm">AI is speaking...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Voice Controls */}
          {!isAISpeaking && currentQuestion && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
              <div className="flex justify-center items-center space-x-6">
                <AudioVisualizer
                  audioLevel={audioLevel}
                  isActive={isListening}
                />

                <button
                  onClick={handleMicToggle}
                  disabled={isAISpeaking}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } ${isAISpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isListening ? (
                    <MicOff className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {isAISpeaking
                      ? 'AI is speaking...'
                      : isListening
                      ? 'Listening... (Click to stop)'
                      : 'Click to answer'}
                  </p>
                  {isListening && (
                    <p className="text-xs text-gray-500 mt-1">
                      Recording will auto-stop in 15 seconds
                    </p>
                  )}
                </div>
              </div>

              {/* Alternative text input option */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowTextInput(!showTextInput)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                  disabled={isAISpeaking}
                >
                  {showTextInput ? 'Hide text input' : 'Use text input instead'}
                </button>
              </div>
            </div>
          )}

          {/* Text Response Input (Alternative) */}
          {showTextInput && !isAISpeaking && currentQuestion && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Type Your Response
              </h3>
              <div className="space-y-4">
                <textarea
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer here... (Press Enter to send, Shift+Enter for new line)"
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isAISpeaking}
                />
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {textResponse.length}/500 characters
                  </div>
                  <button
                    onClick={handleSendResponse}
                    disabled={!textResponse.trim() || isAISpeaking}
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
            currentQuestion && (
              <div className="text-center text-gray-600">
                <p>Please wait for the next question...</p>
              </div>
            )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col">
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
            Live Scores
          </h3>
          <ScoreDisplay scores={scores} />
        </div>

        {/* Interview Progress */}
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Progress</h3>
          <div className="space-y-3">
            {conversationHistory.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Q{index + 1}</span>
                  <span className="text-sm text-blue-600 font-medium">
                    {item.score.toFixed(1)}/10
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {item.question}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Voice Interview Tips
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Speak clearly and at normal pace</li>
            <li>• Wait for AI to finish speaking</li>
            <li>• Use the microphone button to control recording</li>
            <li>• Provide specific examples in your answers</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InterviewScreen;
