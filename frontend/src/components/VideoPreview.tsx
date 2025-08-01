'use client';

import type React from 'react';
import { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff } from 'lucide-react';

const VideoPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Unable to access camera/microphone');
      }
    };

    initializeMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  if (error) {
    return (
      <div className="relative w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <CameraOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Video overlay when disabled */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <CameraOff className="w-12 h-12 text-gray-400" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-2 left-2 flex space-x-2">
        <button
          onClick={toggleVideo}
          className={`p-2 rounded-full ${
            isVideoEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          } text-white transition-colors`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Camera className="w-4 h-4" />
          ) : (
            <CameraOff className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={toggleAudio}
          className={`p-2 rounded-full ${
            isAudioEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          } text-white transition-colors`}
          title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioEnabled ? (
            <Mic className="w-4 h-4" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Status indicator */}
      <div className="absolute top-2 right-2">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
