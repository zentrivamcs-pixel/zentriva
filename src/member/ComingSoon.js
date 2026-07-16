import React from 'react';

/**
 * Placeholder for member sub-pages (Membership ID, Profile Info, Security,
 * Billing, Benefits) whose designs haven't been integrated yet.
 */
function ComingSoon({ title, icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl">
      <span className="material-symbols-outlined text-primary text-[40px] mb-4">
        {icon}
      </span>
      <h2 className="font-headline-md text-headline-md text-primary mb-2">{title}</h2>
      <p className="font-body-md text-body-md text-secondary max-w-md">
        This section is coming soon. It will be integrated here once its design is ready.
      </p>
    </div>
  );
}

export default ComingSoon;
