import type React from "react"

interface ScoreDisplayProps {
  scores: {
    technical: number
    communication: number
    problemSolving: number
    overall: number
  }
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ scores }) => {
  const scoreItems = [
    { label: "Technical", value: scores.technical, color: "bg-blue-500" },
    { label: "Communication", value: scores.communication, color: "bg-green-500" },
    { label: "Problem Solving", value: scores.problemSolving, color: "bg-purple-500" },
    { label: "Overall", value: scores.overall, color: "bg-orange-500" },
  ]

  return (
    <div className="space-y-4">
      {scoreItems.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-medium">{item.value.toFixed(1)}/10</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${item.color} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${(item.value / 10) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ScoreDisplay
