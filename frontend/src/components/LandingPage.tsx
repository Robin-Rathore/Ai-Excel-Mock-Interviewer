'use client';

import type React from 'react';
import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Mic,
  Video,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { useInterview } from '../contexts/InterviewContext';

const LandingPage: React.FC = () => {
  const { startInterview, error } = useInterview();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        alert('Please select a PDF or DOCX file');
      }
    }
  };

  const handleStartInterview = async () => {
    if (!selectedFile || !permissionsGranted) return;

    setIsUploading(true);
    try {
      await startInterview(selectedFile);
    } catch (error) {
      console.error('Failed to start interview:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      // Request both microphone and camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // Test speech synthesis
      if ('speechSynthesis' in window) {
        const testUtterance = new SpeechSynthesisUtterance(
          'Permissions granted successfully!'
        );
        testUtterance.volume = 0.5;
        window.speechSynthesis.speak(testUtterance);
      }

      // Stop the stream immediately after getting permission
      stream.getTracks().forEach((track) => track.stop());

      setPermissionsGranted(true);
      alert(
        "✅ Microphone and camera permissions granted! Speech synthesis is working. You're ready to start the voice interview."
      );
    } catch (error) {
      console.error('Permission error:', error);
      alert(
        '❌ Please grant microphone and camera permissions to use the voice interview feature. You can also use text input as a fallback.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Excel Mock Interview
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Practice your Excel skills with our AI-powered voice interviewer.
            Get real-time feedback and detailed assessment reports through
            natural conversation.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold mb-6">How it works</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Upload Resume</h3>
                    <p className="text-gray-600 text-sm">
                      Upload your resume to personalize questions based on your
                      Excel experience
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mic className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Voice Interview</h3>
                    <p className="text-gray-600 text-sm">
                      AI speaks questions aloud, you respond by voice - just
                      like a real interview
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Video className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Get Report</h3>
                    <p className="text-gray-600 text-sm">
                      Receive detailed PDF report with scores, feedback, and
                      recommendations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-6">Get Started</h2>

              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Resume (PDF or DOCX)
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      selectedFile
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700">
                          {selectedFile.name}
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Permissions */}
                <button
                  onClick={requestPermissions}
                  className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    permissionsGranted
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                  }`}
                >
                  {permissionsGranted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Voice Interview Ready!</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Enable Voice Interview (Required)</span>
                    </>
                  )}
                </button>

                {/* Start Interview */}
                <button
                  onClick={handleStartInterview}
                  disabled={!selectedFile || !permissionsGranted || isUploading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>
                    {isUploading
                      ? 'Starting Voice Interview...'
                      : 'Start Voice Interview'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="text-center text-gray-500 text-sm">
          <p>
            🎤 Voice Interview • Duration: 8-10 minutes • Questions: 7-8 •
            Real-time AI scoring
          </p>
          <p className="mt-1">
            The AI will speak questions to you, and you'll respond by voice -
            just like a real interview!
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
