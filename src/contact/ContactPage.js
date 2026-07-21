import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/tailwind.css';
import Logo from '../shared/Logo';
import { publicApi } from '../shared/api';
import { SUPPORT_EMAIL } from '../shared/contact';

const inputClass =
  'w-full bg-background border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed';

function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setSending(true);
    try {
      await publicApi('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, message }),
      });
      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen text-on-surface font-body-md">
      <header className="bg-primary-container text-on-primary-container">
        <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-10">
          <Link to="/" className="flex items-center gap-2 mb-6 no-underline text-on-primary-container">
            <Logo onDark className="h-9 w-9" />
            <span className="font-headline-md text-headline-md font-bold">ZENTRIVA</span>
          </Link>
          <h1 className="font-headline-lg text-headline-lg font-bold">Contact Us</h1>
          <p className="font-body-md text-body-md opacity-80 mt-2">
            Questions about membership, training, or anything else? Send us a message.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-10">
        <div className="max-w-2xl bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8">
          {sent ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-primary text-5xl mb-4 block">mark_email_read</span>
              <p className="font-headline-sm text-headline-sm text-on-surface mb-2">Message sent</p>
              <p className="font-body-md text-body-md text-secondary mb-6">
                Thanks for reaching out — we'll get back to you by email.
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
                <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="contact-name">
                  Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  maxLength={120}
                  disabled={sending}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="contact-email">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={254}
                  disabled={sending}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  className={inputClass}
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
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

          <div className="mt-8 pt-6 border-t border-outline-variant">
            <Link to="/" className="text-primary font-label-md hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ContactPage;
