import React, { useRef } from 'react';

// Small building blocks shared by the two modules on the registration page.
// The design calls for an icon beside every label; the page uses Material
// Symbols (already loaded site-wide in public/index.html) rather than pulling
// in a second icon font just for this screen.

export function Icon({ name, className = '' }) {
  return (
    <span className={`icon material-symbols-outlined ${className}`.trim()} aria-hidden="true">
      {name}
    </span>
  );
}

export function Field({ id, label, icon, hint, children }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {icon && <Icon name={icon} />}
        {label}
      </label>
      {children}
      {hint && <p className="upload-status">{hint}</p>}
    </div>
  );
}

// Radio pills. The design highlights the chosen pill, which CSS :has() can do
// on its own but not in every browser Zentriva's members actually use — so
// the selected class is applied explicitly.
export function GenderPicker({ name, value, onChange, icon = 'wc', label = 'Gender' }) {
  return (
    <div className="form-group">
      <label htmlFor={`${name}-Male`}>
        <Icon name={icon} />
        {label}
      </label>
      <div className="gender-options">
        {['Male', 'Female'].map((option) => (
          <label
            key={option}
            htmlFor={`${name}-${option}`}
            className={value === option ? 'is-selected' : ''}
          >
            <input
              type="radio"
              id={`${name}-${option}`}
              name={name}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(e.target.value)}
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

// Image picker with an inline thumbnail. The file is uploaded the moment it
// is chosen (see uploadImage) so the URL is ready before payment — nobody
// should be made to wait on an upload after their money has moved.
export function PhotoUpload({
  id, label, icon = 'photo_camera', buttonLabel, hint,
  url, uploading, error, onPick,
}) {
  const inputRef = useRef(null);

  return (
    <div className="form-group">
      <label htmlFor={id}>
        <Icon name={icon} />
        {label}
      </label>
      <div className="upload-field">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // let the same file be re-picked after a failure
            if (file) onPick(file);
          }}
        />
        <button
          type="button"
          className="upload-button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name={uploading ? 'hourglass_top' : 'upload'} />
          {uploading ? 'Uploading…' : (url ? 'Replace photo' : buttonLabel)}
        </button>
        {url && !uploading && <img className="upload-preview" src={url} alt={`${label} preview`} />}
      </div>
      {error
        ? <p className="upload-status" style={{ color: '#8c2130' }} role="alert">{error}</p>
        : <p className="upload-status">{url ? '✓ Uploaded' : hint}</p>}
    </div>
  );
}
