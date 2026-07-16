import React from 'react';

export const LOGO_SRC = `${process.env.PUBLIC_URL}/logo-zentriva.jpeg`;

/**
 * The Zentriva mark. It ships as a single square image with a white
 * backdrop, so on dark surfaces (`onDark`) it's wrapped in a light chip to
 * avoid a hard edge against the surrounding color.
 */
function Logo({ onDark = false, className = 'h-9 w-9' }) {
  if (!onDark) {
    return <img src={LOGO_SRC} alt="Zentriva" className={`${className} object-cover rounded-lg`} />;
  }

  return (
    <span className={`inline-flex items-center justify-center bg-white rounded-lg p-1 ${className}`}>
      <img src={LOGO_SRC} alt="Zentriva" className="w-full h-full object-cover rounded-md" />
    </span>
  );
}

export default Logo;
