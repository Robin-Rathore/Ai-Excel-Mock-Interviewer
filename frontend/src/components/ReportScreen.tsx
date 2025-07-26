//@ts-nocheck

import type React from 'react';
import { Download, RotateCcw, CheckCircle } from 'lucide-react';
import { useInterview } from '../contexts/InterviewContext';

const ReportScreen: React.FC = () => {
  const {
    scores,
    conversationHistory,
    candidateInfo,
    stopInterview,
    downloadReport,
  } = useInterview();

  const handleDownloadReport = () => {
    downloadReport();
  };

  const handleStartNew = () => {
    stopInterview();
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Completed!
          </h1>
          <p className="text-gray-600">
            Here's your comprehensive Excel skills assessment
          </p>
          {candidateInfo && (
            <p className="text-gray-500 mt-2">
              Candidate: {candidateInfo.name}
            </p>
          )}
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {scores.overall.toFixed(1)}
            </div>
            <div className="text-xl text-gray-600 mb-4">Overall Score</div>
            <div
              className={`text-lg font-medium ${getScoreColor(scores.overall)}`}
            >
              {getScoreLabel(scores.overall)}
            </div>
          </div>
        </div>

        {/* Detailed Scores */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Technical Skills
            </h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {scores.technical.toFixed(1)}
            </div>
            <div className={`font-medium ${getScoreColor(scores.technical)}`}>
              {getScoreLabel(scores.technical)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(scores.technical / 10) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Communication
            </h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {scores.communication.toFixed(1)}
            </div>
            <div
              className={`font-medium ${getScoreColor(scores.communication)}`}
            >
              {getScoreLabel(scores.communication)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(scores.communication / 10) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Problem Solving
            </h3>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {scores.problemSolving.toFixed(1)}
            </div>
            <div
              className={`font-medium ${getScoreColor(scores.problemSolving)}`}
            >
              {getScoreLabel(scores.problemSolving)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${(scores.problemSolving / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Question Breakdown
          </h2>
          <div className="space-y-4">
            {conversationHistory.map((item, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">
                    Question {index + 1}
                  </h3>
                  <span className={`font-bold ${getScoreColor(item.score)}`}>
                    {item.score.toFixed(1)}/10
                  </span>
                </div>
                <p className="text-gray-700 mb-2">{item.question}</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                  <strong>Your answer:</strong> {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleDownloadReport}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Download Full Report</span>
          </button>
          <button
            onClick={handleStartNew}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Start New Interview</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportScreen;
