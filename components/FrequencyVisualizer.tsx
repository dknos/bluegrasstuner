
import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  className?: string;
}

const FrequencyVisualizer: React.FC<VisualizerProps> = ({ analyser, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set buffer size
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveformArray = new Uint8Array(bufferLength);

    const draw = () => {
      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(waveformArray);

      // Clear background with a slight fade for trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'; 
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Draw Frequency Bars
      const barWidth = (WIDTH / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        // Gradient color based on height/intensity
        const r = barHeight + (25 * (i / bufferLength));
        const g = 250 * (i / bufferLength);
        const b = 50;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        // Scale height to fit approx half screen
        const scaledHeight = (barHeight / 255) * (HEIGHT * 0.6);
        ctx.fillRect(x, HEIGHT - scaledHeight, barWidth, scaledHeight);

        x += barWidth + 1;
      }

      // Draw Waveform Overlay
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00f3ff'; // Neon Blue
      ctx.beginPath();

      const sliceWidth = WIDTH * 1.0 / bufferLength;
      let waveX = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = waveformArray[i] / 128.0;
        const y = v * HEIGHT / 4; // Top quarter of screen

        if (i === 0) {
          ctx.moveTo(waveX, y);
        } else {
          ctx.lineTo(waveX, y);
        }

        waveX += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 4);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser]);

  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.parentElement?.clientWidth || 800;
        canvasRef.current.height = canvasRef.current.parentElement?.clientHeight || 400;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden shadow-2xl bg-black border border-gray-800 ${className}`}>
        <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default FrequencyVisualizer;
