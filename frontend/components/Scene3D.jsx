'use client';
import { useEffect, useRef } from 'react';

export default function Scene3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Load 3D scene
    const script = document.createElement('script');
    script.src = '/kle3d.js';
    script.type = 'module';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return <canvas id="gl" ref={canvasRef} />;
}
