import React from 'react';

/**
 * Renders `src` when one is supplied; otherwise shows a labeled placeholder
 * so image slots (avatars, QR codes, decorative graphics) are visible and
 * swap-in-ready before real assets/uploads exist.
 */
function ImagePlaceholder({
  src,
  alt = '',
  icon = 'image',
  shape = 'circle',
  className = '',
}) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded';

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${shapeClass} object-cover ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt || 'Image placeholder'}
      className={`${shapeClass} bg-surface-container-high border border-dashed border-outline flex items-center justify-center text-outline ${className}`}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </div>
  );
}

export default ImagePlaceholder;
