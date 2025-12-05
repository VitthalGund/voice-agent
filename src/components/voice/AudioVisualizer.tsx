import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  width?: number;
  height?: number;
  barColor?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
    stream, 
    width = 300, 
    height = 100, 
    barColor = '#00ff00' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d')!;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        canvasCtx.fillStyle = barColor;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      // Don't close context here if re-using, but for now we let it be.
    };
  }, [stream, barColor]);

  // Clear canvas when stream is null
  useEffect(() => {
    if (!stream && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')!;
        ctx.clearRect(0, 0, width, height);
    }
  }, [stream, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-lg shadow-lg" />;
};

export default AudioVisualizer;
