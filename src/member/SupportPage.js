import React, { useState } from 'react';
import { memberApi } from '../shared/api';
import { SUPPORT_EMAIL } from '../shared/contact';

const inputClass =
  'w-full bg-background border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed';

function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!message.trim()) {
      setError('Please enter a message.');
      return;
    }
    setSending(true);
    try {
      await memberApi('/api/me/support', {
        method: 'POST',
        body: JSON.stringify({ subject, message }),
      });
      setSent(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Support</h2>
        <p className="font-body-md text-body-md text-secondary">
          Have a question or ran into a problem? Send us a message and admin will get back to you.
        </p>
      </div>

      <div className="max-w-2xl bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8">
        {sent ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-primary text-5xl mb-4 block">mark_email_read</span>
            <p className="font-headline-sm text-headline-sm text-on-surface mb-2">Message sent</p>
            <p className="font-body-md text-body-md text-secondary mb-6">
              We've received your message and will get back to you by email.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="px-5 py-2 border border-primary text-primary font-label-md text-label-md rounded-lg hover:bg-primary hover:text-white transition-all"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="text-body-sm text-error font-medium" role="alert">{error}</p>
            )}

            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="support-subject">
                Subject
              </label>
              <input
                id="support-subject"
                type="text"
                className={inputClass}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
                maxLength={200}
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="support-message">
                Message
              </label>
              <textarea
                id="support-message"
                className={inputClass}
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's going on…"
                maxLength={5000}
                disabled={sending}
                required
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Send Message'}
            </button>

            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Prefer email? Reach us directly at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                {SUPPORT_EMAIL}
              </a>.
            </p>
          </form>
        )}
      </div>
    </>
  );
}

export default SupportPage;
