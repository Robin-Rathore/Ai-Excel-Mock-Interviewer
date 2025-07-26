import type React from 'react';

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioLevel,
  isActive,
}) => {
  const bars = Array.from({ length: 5 }, (_, i) => {
    const baseHeight = 10;
    const maxHeight = 40;
    const height = isActive
      ? Math.max(
          baseHeight,
          (audioLevel / 255) * maxHeight + Math.random() * 10
        )
      : baseHeight;

    return (
      <div
        key={i}
        className={`audio-bar ${isActive ? 'speaking' : ''}`}
        style={{
          height: `${height}px`,
          backgroundColor: isActive ? '#3b82f6' : '#d1d5db',
          transition: 'all 0.1s ease',
        }}
      />
    );
  });

  return (
    <div className="audio-visualizer flex items-center justify-center gap-1">
      {bars}
    </div>
  );
};

export default AudioVisualizer;
