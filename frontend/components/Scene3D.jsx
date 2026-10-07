'use client';

import { useEffect } from 'react';

export default function Scene3D() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/kle-loader.js';
    script.dataset.main = '/kle3d.js';
    script.dataset.gsap = '1';
    script.dataset.kleScene = 'main';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (window.KLE3D?.destroy) window.KLE3D.destroy();
      script.remove();
    };
  }, []);

  return <canvas id="gl" aria-hidden="true" />;
}
