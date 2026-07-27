import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// Inbound support email received via Resend's "Inbound" feature
// (email.received webhook -> shared/inboxRepo.js). Message bodies come from
// external senders, so the HTML view renders inside a fully sandboxed
// iframe (sandbox="" — no scripts, no same-origin access) rather than
// dangerouslySetInnerHTML, which would execute attacker HTML in this
// authenticated admin page.
function AdminInbox() {
  const { messages, inboxLoading, inboxError, reloadInbox, markMessageRead } = useOutletContext();
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('text'); // 'text' | 'html'

  const selected = messages.find((m) => m.id === selectedId) || null;

  const openMessage = (message) => {
    setSelectedId(message.id);
    setView(message.text_body ? 'text' : 'html');
    if (!message.is_read) markMessageRead(message, true);
  };

  if (inboxLoading) {
    return <p className="text-on-surface-variant text-body-md">Loading inbox…</p>;
  }

  return (
    <>
      <div className="mb-gutter flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Inbox</h2>
          <p className="text-on-surface-variant text-body-md">
            Messages from the website contact form and email received at your Zentriva support address.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected && (
            <button
              type="button"
              onClick={() => markMessageRead(selected, !selected.is_read)}
              className="px-4 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-low transition-colors bg-transparent"
            >
              Mark as {selected.is_read ? 'unread' : 'read'}
            </button>
          )}
          <button
            type="button"
            onClick={reloadInbox}
            className="px-4 py-2 border border-outline-variant rounded-lg text-label-md flex items-center gap-2 hover:bg-surface-container-low transition-colors bg-transparent"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* A failed load and an empty inbox are not the same thing — say which. */}
      {inboxError && (
        <div className="mb-gutter p-4 rounded-xl bg-error-container text-on-error-container" role="alert">
          <p className="text-body-md font-bold">Couldn't load messages</p>
          <p className="text-body-sm">{inboxError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-gutter">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm divide-y divide-outline-variant/20 overflow-hidden">
          {messages.length === 0 && !inboxError && (
            <div className="p-6 space-y-2">
              <p className="text-on-surface-variant text-body-sm">No messages yet.</p>
              <p className="text-outline text-label-sm">
                Contact-form submissions appear here immediately. Email sent to your support address
                needs Resend Inbound plus the <code>RESEND_WEBHOOK_SECRET</code> and{' '}
                <code>RESEND_API_KEY</code> environment variables — see DEPLOY.md.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => openMessage(m)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                selectedId === m.id ? 'bg-secondary-container' : 'bg-transparent hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-body-sm truncate ${m.is_read ? 'text-on-surface-variant' : 'font-bold text-on-surface'}`}>
                  {m.from_address || 'Unknown sender'}
                </span>
                {!m.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-label="Unread" />}
              </div>
              <p className={`text-body-sm truncate ${m.is_read ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                {m.subject || '(no subject)'}
              </p>
              <p className="text-label-sm text-on-surface-variant">{formatDate(m.received_at || m.created_at)}</p>
            </button>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 min-h-[300px]">
          {!selected ? (
            <p className="text-on-surface-variant text-body-md">Select a message to read it.</p>
          ) : (
            <>
              <div className="mb-4 pb-4 border-b border-outline-variant/20">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">{selected.subject || '(no subject)'}</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  From <strong>{selected.from_address}</strong> to {selected.to_address}
                </p>
                <p className="text-label-sm text-on-surface-variant">{formatDate(selected.received_at || selected.created_at)}</p>
              </div>

              {selected.text_body && selected.html_body && (
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setView('text')}
                    className={`px-3 py-1 rounded-full text-label-sm ${view === 'text' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'}`}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('html')}
                    className={`px-3 py-1 rounded-full text-label-sm ${view === 'html' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'}`}
                  >
                    HTML
                  </button>
                </div>
              )}

              {view === 'html' && selected.html_body ? (
                <iframe
                  title="Message body"
                  sandbox=""
                  srcDoc={selected.html_body}
                  className="w-full h-96 border border-outline-variant rounded-lg bg-white"
                />
              ) : (
                <pre className="text-body-sm text-on-surface whitespace-pre-wrap font-body-md">
                  {selected.text_body || '(empty message)'}
                </pre>
              )}

              {selected.attachments && selected.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-outline-variant/20">
                  <p className="text-label-sm text-on-surface-variant mb-2">
                    {selected.attachments.length} attachment{selected.attachments.length === 1 ? '' : 's'} (not downloadable here — check the Resend dashboard)
                  </p>
                  <ul className="text-body-sm text-on-surface list-disc list-inside">
                    {selected.attachments.map((a) => (
                      <li key={a.id || a.filename}>{a.filename} ({a.content_type})</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default AdminInbox;
