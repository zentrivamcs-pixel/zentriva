import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Submits to the Members page's own search/filter toolbar (via a ?q= query
// param) rather than maintaining a second, disconnected search here.
function AdminTopNav({ onMenuToggle }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const term = search.trim();
    navigate(term ? `/admin/members?q=${encodeURIComponent(term)}` : '/admin/members');
  };

  return (
    <header className="flex justify-between items-center h-16 px-margin-mobile md:px-margin-desktop bg-surface-container-lowest sticky top-0 border-b border-outline-variant shadow-sm z-40 gap-3">
      {/* Mobile menu toggle — the sidebar is a drawer below md */}
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={onMenuToggle}
        className="bg-transparent md:hidden p-2 text-on-surface-variant hover:text-primary rounded-lg transition-colors"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <form onSubmit={handleSubmit} className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full focus-within:ring-2 focus-within:ring-primary rounded-lg transition-all">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            placeholder="Search members, professions, businesses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg focus:ring-0 text-body-md"
          />
        </div>
      </form>
      <div className="flex items-center gap-6 ml-2 md:ml-6">
        <div className="flex items-center gap-3 md:pl-6 md:border-l border-outline-variant">
          <div className="text-right hidden lg:block">
            <p className="text-label-md font-bold text-on-surface">Administrator</p>
            <p className="text-label-sm text-on-surface-variant">Zentriva CMS</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center border border-outline-variant">
            <span className="material-symbols-outlined text-on-secondary-container">account_circle</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminTopNav;
