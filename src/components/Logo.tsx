'use client';

import React, { useEffect, useRef } from 'react';

interface LogoProps {
  className?: string;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ className, theme = 'light' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/logo.jpg';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const aspectRatio = img.width / img.height;
      const displayHeight = 128; // Internal resolution height for high-DPI displays
      const displayWidth = Math.round(displayHeight * aspectRatio);

      canvas.height = displayHeight;
      canvas.width = displayWidth;

      // Draw original image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Process pixels to implement transparency and dynamic, uniform recoloring
      try {
        const imgData = ctx.getImageData(0, 0, displayWidth, displayHeight);
        const data = imgData.data;

        // Dark mode: Cyan-450 (#22d3ee)
        // Light mode: Cyan-600 (#0891b2)
        const targetColor = theme === 'dark' 
          ? { r: 34, g: 211, b: 238 } 
          : { r: 8, g: 145, b: 178 };

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];

          const brightness = (r + g + b) / 3;

          if (brightness > 250) {
            // White background is fully transparent
            data[i+3] = 0;
          } else if (brightness > 215) {
            // Smooth transparency transition for edges and light letters (like 'A')
            const ratio = (250 - brightness) / (250 - 215);
            data[i+3] = Math.round(ratio * 255);
            
            // Apply target theme color
            data[i] = targetColor.r;
            data[i+1] = targetColor.g;
            data[i+2] = targetColor.b;
          } else {
            // Opaque logo letters
            data[i+3] = 255;
            data[i] = targetColor.r;
            data[i+1] = targetColor.g;
            data[i+2] = targetColor.b;
          }
        }

        ctx.putImageData(imgData, 0, 0);
      } catch (e) {
        console.error('Error processing logo pixels:', e);
      }
    };
  }, [theme]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={{ display: 'block', height: '100%', width: 'auto' }}
    />
  );
};
export default Logo;
