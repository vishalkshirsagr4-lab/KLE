'use client';
import { useEffect, useRef } from 'react';

export default function Portal3DBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/bg3d.js';
    script.type = 'module';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return <canvas id="bg" ref={canvasRef} />;
}
