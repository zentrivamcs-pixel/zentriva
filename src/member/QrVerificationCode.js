import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// Renders a real, scannable QR code (not a decorative icon) encoding
// `value` onto a canvas.
function QrVerificationCode({ value, size = 108, dark = '#0E2A1F', light = '#ffffff', label = 'Verification QR code' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 0,
      color: { dark, light },
    }).catch(() => {});
  }, [value, size, dark, light]);

  return <canvas ref={canvasRef} width={size} height={size} role="img" aria-label={label} />;
}

export default QrVerificationCode;
