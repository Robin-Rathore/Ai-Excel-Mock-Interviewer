//@ts-nocheck
import type React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Users,
  FileText,
  Mail,
  Mic,
  BarChart3,
  Shield,
  Clock,
} from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Excel AI Interviewer
              </h1>
            </div>
            <nav className="flex items-center space-x-6">
              <Link
                to="/hr"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                HR Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              AI-Powered Excel Skills Assessment
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revolutionize your hiring process with our intelligent Excel
              interviewer. Conduct comprehensive, voice-based assessments that
              adapt to each candidate's experience level.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                to="/hr"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                Start Hiring
              </Link>
              <a
                href="#features"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors text-lg font-medium border border-blue-600"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose AI Excel Interviewer?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our advanced AI technology provides fair, consistent, and
              comprehensive Excel skills evaluation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Intelligence',
                description:
                  'Advanced AI analyzes resumes and generates personalized questions based on candidate experience and skills.',
              },
              {
                icon: Mic,
                title: 'Voice-to-Voice Interaction',
                description:
                  'Natural conversation flow with speech recognition and text-to-speech for an engaging interview experience.',
              },
              {
                icon: FileText,
                title: 'Resume-Based Questions',
                description:
                  "Dynamic question generation tailored to each candidate's background, skills, and experience level.",
              },
              {
                icon: BarChart3,
                title: 'Professional Scoring',
                description:
                  'Comprehensive evaluation on technical accuracy, communication, problem-solving, and completeness.',
              },
              {
                icon: Clock,
                title: 'Time Efficient',
                description:
                  '15-20 minute assessments that provide deep insights into Excel proficiency and practical knowledge.',
              },
              {
                icon: Mail,
                title: 'Automated Reports',
                description:
                  'Detailed PDF reports automatically generated and emailed to candidates with actionable feedback.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Simple, efficient, and effective Excel skills assessment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Send Invitations',
                description:
                  'HR sends personalized interview links to candidates via email',
                icon: Mail,
              },
              {
                step: '2',
                title: 'Upload Resume',
                description:
                  'Candidates upload their resume for AI analysis and question personalization',
                icon: FileText,
              },
              {
                step: '3',
                title: 'AI Interview',
                description:
                  'Voice-based interview with 7-8 adaptive questions based on experience',
                icon: Mic,
              },
              {
                step: '4',
                title: 'Instant Results',
                description:
                  'Comprehensive PDF report generated and emailed automatically',
                icon: BarChart3,
              },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <step.icon className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Transform Your Excel Hiring Process
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Shield,
                    title: 'Fair & Consistent',
                    description:
                      'Eliminate interviewer bias with standardized AI evaluation criteria',
                  },
                  {
                    icon: Clock,
                    title: 'Save Time & Resources',
                    description:
                      'Automated screening reduces HR workload and speeds up hiring',
                  },
                  {
                    icon: BarChart3,
                    title: 'Detailed Insights',
                    description:
                      'Comprehensive reports provide actionable feedback for candidates',
                  },
                  {
                    icon: Users,
                    title: 'Scalable Solution',
                    description:
                      'Handle multiple candidates simultaneously with consistent quality',
                  },
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <benefit.icon className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl">
              <div className="text-center">
                <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Ready to Get Started?
                </h3>
                <p className="text-gray-600 mb-6">
                  Join forward-thinking companies using AI to revolutionize
                  their Excel hiring process
                </p>
                <Link
                  to="/hr"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium inline-block"
                >
                  Access HR Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Brain className="w-8 h-8 text-blue-400" />
              <h3 className="text-2xl font-bold">Excel AI Interviewer</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Revolutionizing Excel skills assessment with artificial
              intelligence
            </p>
            <div className="border-t border-gray-800 pt-6">
              <p className="text-gray-500">
                © 2024 Excel AI Interviewer. Powered by advanced AI technology.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
