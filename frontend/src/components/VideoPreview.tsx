"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { Camera } from "lucide-react"

const VideoPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Error accessing camera:", error)
      }
    }

    startVideo()

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div className="video-preview bg-gray-900 rounded-lg overflow-hidden relative">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-48 object-cover" />
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
        <Camera className="w-4 h-4 text-white" />
      </div>
    </div>
  )
}

export default VideoPreview
