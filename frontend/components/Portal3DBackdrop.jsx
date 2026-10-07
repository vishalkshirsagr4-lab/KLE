'use client';

import { useEffect } from 'react';

export default function Portal3DBackdrop() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/kle-loader.js';
    script.dataset.main = '/bg3d.js';
    script.dataset.gsap = '0';
    script.dataset.kleScene = 'backdrop';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (window.KLEBG3D?.destroy) window.KLEBG3D.destroy();
      script.remove();
    };
  }, []);
  return <canvas id="bg" aria-hidden="true" />;
}
