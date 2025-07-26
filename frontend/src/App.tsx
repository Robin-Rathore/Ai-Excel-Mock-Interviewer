import { useInterview } from "./contexts/InterviewContext"
import LandingPage from "./components/LandingPage"
import InterviewScreen from "./components/InterviewScreen"
import ReportScreen from "./components/ReportScreen"

function App() {
  const { interviewStatus } = useInterview()

  const renderScreen = () => {
    switch (interviewStatus) {
      case "not-started":
        return <LandingPage />
      case "in-progress":
      case "waiting":
        return <InterviewScreen />
      case "completed":
        return <ReportScreen />
      default:
        return <LandingPage />
    }
  }

  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">{renderScreen()}</div>
}

export default App
