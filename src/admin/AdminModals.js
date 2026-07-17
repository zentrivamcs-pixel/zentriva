import React from 'react';
import { DETAIL_SECTIONS, EDIT_FIELDS, formatValue } from './adminHelpers';

export function AdminViewModal({ member, onClose, onEdit, onResetAccount }) {
  return (
    <div className="fixed inset-0 bg-on-background/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant sticky top-0 bg-surface-container-lowest">
          <h2 className="font-headline-md text-headline-md text-primary">{member.full_name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent p-1 text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Portal account status + stopgap reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">
                {member.has_password ? 'lock' : 'lock_open'}
              </span>
              <div>
                <p className="text-label-md font-bold text-on-surface">Portal Account</p>
                <p className="text-label-sm text-on-surface-variant">
                  {member.has_password
                    ? 'Activated — the member can log in with their password.'
                    : 'Not activated — the member can activate with their email and payment reference.'}
                </p>
              </div>
            </div>
            {member.has_password && (
              <button
                type="button"
                onClick={onResetAccount}
                className="px-3 py-1.5 border border-error/40 text-error rounded-lg text-label-sm hover:bg-error/10 transition-colors bg-transparent"
              >
                Reset account
              </button>
            )}
          </div>

          {DETAIL_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-3">
                {section.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {section.rows.map(([label, key]) => (
                  <div key={key} className="flex justify-between gap-4 border-b border-outline-variant/40 pb-2">
                    <span className="text-label-sm text-on-surface-variant">{label}</span>
                    <span className="text-body-md text-on-surface text-right break-words">
                      {formatValue(member[key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-lowest transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminEditModal({ editForm, saving, onChange, onSubmit, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-on-background/50 flex items-center justify-center z-50 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant sticky top-0 bg-surface-container-lowest">
          <h2 className="font-headline-md text-headline-md text-primary">Edit Member</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="bg-transparent p-1 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EDIT_FIELDS.map(({ name, label, type }) => (
              <div key={name} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-label-sm text-on-surface-variant mb-1">{label}</label>
                {type === 'textarea' ? (
                  <textarea
                    name={name}
                    rows="3"
                    value={editForm[name]}
                    onChange={onChange}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                ) : (
                  <input
                    type={type === 'array' ? 'text' : type}
                    name={name}
                    value={editForm[name]}
                    onChange={onChange}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-lowest transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
