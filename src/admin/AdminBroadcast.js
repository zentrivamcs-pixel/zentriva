import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { adminApi } from '../shared/api';
import { BROADCAST_AUDIENCES, countAudience } from './broadcastAudiences';

// Admin → Send Mail. Composes one message and sends it to every member in
// the chosen audience, individually addressed (no shared To/BCC list) from
// the no-reply sender, with replies pointed back at the support address so
// they land in the Inbox page.
//
// The recipient count shown here is a preview computed from the member list
// already in memory; the server re-selects recipients from the database at
// send time, so this page never dictates who gets mailed.

const CARD = 'bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6';
const SUBJECT_MAX = 200;
const BODY_MAX = 20000;

function formatDate(iso) {
  if (!iso) return '—';
  try {
    // SQLite's datetime('now') has no timezone marker; treat it as UTC so
    // times don't read an hour off in WAT.
    const value = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(iso) ? `${iso.replace(' ', 'T')}Z` : iso;
    return new Date(value).toLocaleString();
  } catch {
    return iso;
  }
}

function audienceLabel(key) {
  const found = BROADCAST_AUDIENCES.find((a) => a.key === key);
  return found ? found.label : key;
}

function AdminBroadcast() {
  const { members } = useOutletContext();

  const [audience, setAudience] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [openId, setOpenId] = useState(null);

  const counts = useMemo(() => {
    const out = {};
    BROADCAST_AUDIENCES.forEach(({ key }) => { out[key] = countAudience(members, key); });
    return out;
  }, [members]);

  const recipientCount = counts[audience] || 0;

  const loadHistory = useCallback(async () => {
    setHistoryError('');
    try {
      const data = await adminApi('/api/inbox/broadcasts');
      setHistory(data.broadcasts || []);
      setEmailEnabled(data.emailEnabled !== false);
    } catch (err) {
      console.error('Error loading broadcast history:', err);
      setHistoryError(err.message || 'Could not load past broadcasts.');
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!subject.trim() || !body.trim()) {
      setError('A subject and a message are both required.');
      return;
    }
    // Mail can't be recalled — make the blast radius explicit before it goes.
    if (!window.confirm(
      `Send "${subject.trim()}" to ${recipientCount} member${recipientCount === 1 ? '' : 's'} ` +
      `(${audienceLabel(audience)})?\n\nThis cannot be undone.`
    )) return;

    setSending(true);
    try {
      const data = await adminApi('/api/inbox/broadcast', {
        method: 'POST',
        body: JSON.stringify({ audience, subject: subject.trim(), body: body.trim() }),
      });
      setResult(data);
      // Only clear the composer on a clean send — if part of it failed, the
      // admin still has the text to retry with.
      if (!data.failed) {
        setSubject('');
        setBody('');
      }
      loadHistory();
    } catch (err) {
      console.error('Error sending broadcast:', err);
      setError(err.message || 'The broadcast could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const disabled = sending || !emailEnabled || recipientCount === 0;

  return (
    <>
      <div className="mb-gutter">
        <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Send Mail</h2>
        <p className="text-on-surface-variant text-body-md">
          Email every member in an audience from the society's no-reply address. Each member
          receives their own copy — nobody sees anyone else's address — and replies come back to
          your support inbox.
        </p>
      </div>

      {!emailEnabled && (
        <div className="mb-gutter p-4 rounded-xl bg-error-container text-on-error-container" role="alert">
          <p className="text-body-md font-bold">Email is not configured</p>
          <p className="text-body-sm">
            Set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in your environment
            variables and redeploy — until then nothing can be sent. See DEPLOY.md.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,340px)] gap-gutter items-start">
        <form onSubmit={handleSend} className={CARD}>
          <label className="block mb-5">
            <span className="text-label-md text-on-surface-variant">Send to</span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md"
            >
              {BROADCAST_AUDIENCES.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label} ({counts[a.key] || 0})
                </option>
              ))}
            </select>
            <span className="text-label-sm text-on-surface-variant block mt-1">
              {(BROADCAST_AUDIENCES.find((a) => a.key === audience) || {}).hint}
            </span>
          </label>

          <label className="block mb-5">
            <span className="text-label-md text-on-surface-variant">Subject</span>
            <input
              type="text"
              value={subject}
              maxLength={SUBJECT_MAX}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. October general meeting — Saturday 12th"
              className="mt-1 w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md"
            />
          </label>

          <label className="block mb-2">
            <span className="text-label-md text-on-surface-variant">Message</span>
            <textarea
              value={body}
              rows={14}
              maxLength={BODY_MAX}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'Hi {{first_name}},\n\nOur next general meeting holds on…\n\n**Venue:** Zentriva Secretariat\n[See the agenda](https://example.com/agenda)'}
              className="mt-1 w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md font-body-md"
            />
          </label>

          <p className="text-label-sm text-on-surface-variant mb-6">
            Blank lines start new paragraphs. <code>**bold**</code> and{' '}
            <code>[link text](https://…)</code> are formatted for you. Use{' '}
            <code>{'{{first_name}}'}</code>, <code>{'{{name}}'}</code> or{' '}
            <code>{'{{membership_id}}'}</code> to personalise each copy.{' '}
            <span className="text-outline">{body.length}/{BODY_MAX}</span>
          </p>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container" role="alert">
              <p className="text-body-sm">{error}</p>
            </div>
          )}

          {result && (
            <div
              className={`mb-4 p-4 rounded-xl ${result.failed
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-secondary-container text-on-secondary-container'}`}
              role="status"
            >
              <p className="text-body-md font-bold">
                Sent to {result.sent} of {result.recipientCount} member
                {result.recipientCount === 1 ? '' : 's'}
              </p>
              {!!result.failed && (
                <p className="text-body-sm">
                  {result.failed} could not be delivered{result.error ? `: ${result.error}` : '.'}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={disabled}
              className="px-6 py-3 rounded-lg bg-primary text-on-primary text-label-md font-bold border-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {sending ? 'Sending…' : `Send to ${recipientCount} member${recipientCount === 1 ? '' : 's'}`}
            </button>
            {recipientCount === 0 && emailEnabled && (
              <span className="text-label-sm text-on-surface-variant">
                No members match this audience.
              </span>
            )}
          </div>
        </form>

        <div className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Recently sent</h3>
            <button
              type="button"
              onClick={loadHistory}
              className="p-2 rounded-lg bg-transparent border-none text-on-surface-variant hover:bg-surface-container-low transition-colors"
              aria-label="Refresh history"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          {historyError && <p className="text-body-sm text-error mb-3">{historyError}</p>}
          {!historyError && history.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">Nothing sent yet.</p>
          )}

          <ul className="space-y-2 list-none p-0 m-0">
            {history.map((b) => (
              <li key={b.id} className="border border-outline-variant/40 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === b.id ? null : b.id)}
                  className="w-full text-left px-3 py-2 bg-transparent border-none hover:bg-surface-container-low transition-colors"
                >
                  <p className="text-body-sm text-on-surface font-bold truncate">{b.subject}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {formatDate(b.created_at)} · {audienceLabel(b.audience)} ·{' '}
                    {b.sent_count}/{b.recipient_count} delivered
                    {b.failed_count ? ` · ${b.failed_count} failed` : ''}
                  </p>
                </button>
                {openId === b.id && (
                  <div className="px-3 pb-3 pt-1 border-t border-outline-variant/40">
                    <pre className="text-body-sm text-on-surface whitespace-pre-wrap font-body-md m-0">
                      {b.body}
                    </pre>
                    {b.error && (
                      <p className="text-label-sm text-error mt-2">Error: {b.error}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSubject(b.subject);
                        setBody(b.body);
                        setAudience(b.audience);
                        setResult(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="mt-3 px-3 py-1.5 rounded-lg border border-outline-variant bg-transparent text-label-sm text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      Reuse this message
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export default AdminBroadcast;
