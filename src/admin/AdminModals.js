import React, { useState } from 'react';
import {
  DETAIL_SECTIONS, EDIT_FIELDS, formatValue,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS,
} from './adminHelpers';

export function AdminViewModal({ member, onClose, onEdit, onResetAccount, onApprovePayment, onRejectPayment, onEditPayment }) {
  const paymentStatus = PAYMENT_STATUS_LABELS[member.payment_status];
  const isPending = member.payment_status === 'pending_review';
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
          {/* Payment verification — bank-transfer registrations start
              pending_review and need an admin decision before the member can
              log in. Paystack registrations are already 'paid' by the time
              they reach this modal. Always shown (even for legacy rows with
              no payment_method) so the details can be corrected from here. */}
          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-label-md font-bold text-on-surface">Payment</p>
                <p className="text-label-sm text-on-surface-variant capitalize">
                  {member.payment_method ? member.payment_method.replace('_', ' ') : 'No method recorded'}
                </p>
                <p className="text-label-sm text-on-surface-variant font-mono">
                  {member.payment_reference || 'No reference'}
                </p>
              </div>
              {paymentStatus && (
                <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${paymentStatus.className}`}>
                  {paymentStatus.label}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {member.passport_photo_url && (
                <a
                  href={member.passport_photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-label-sm text-primary hover:underline"
                >
                  View ID Photo
                </a>
              )}
              {member.payment_proof_url && (
                <a
                  href={member.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-label-sm text-primary hover:underline"
                >
                  View Payment Proof
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={onApprovePayment}
                    className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-sm hover:opacity-90 transition-opacity"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={onRejectPayment}
                    className="px-3 py-1.5 border border-error/40 text-error rounded-lg text-label-sm hover:bg-error/10 transition-colors bg-transparent"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onEditPayment}
                className="px-3 py-1.5 border border-outline-variant text-primary rounded-lg text-label-sm hover:bg-surface-container-lowest transition-colors bg-transparent flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit payment details
              </button>
            </div>
          </div>

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

// Hand-editing of a member's payment record: status, method, and reference.
// Separate from the profile Edit modal because these three fields are saved
// through their own endpoint (POST /api/members/:id/payment) — the generic
// member PUT deliberately can't touch payment state.
export function AdminPaymentModal({ member, saving, error, onSave, onClose }) {
  const [form, setForm] = useState({
    payment_status: member.payment_status || 'pending_review',
    payment_method: member.payment_method || 'bank_transfer',
    payment_reference: member.payment_reference || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const selectClass =
    'w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none';

  return (
    <div
      className="fixed inset-0 bg-on-background/50 flex items-center justify-center z-50 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">Edit Payment</h2>
            <p className="text-label-sm text-on-surface-variant">{member.full_name}</p>
          </div>
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

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && <p className="text-error text-label-sm" role="alert">{error}</p>}

            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1" htmlFor="payment-status">
                Payment Status
              </label>
              <select
                id="payment-status"
                name="payment_status"
                value={form.payment_status}
                onChange={handleChange}
                className={selectClass}
              >
                {PAYMENT_STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1" htmlFor="payment-method">
                Payment Method
              </label>
              <select
                id="payment-method"
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
                className={selectClass}
              >
                {PAYMENT_METHOD_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1" htmlFor="payment-reference">
                Payment Reference
              </label>
              <input
                id="payment-reference"
                type="text"
                name="payment_reference"
                value={form.payment_reference}
                onChange={handleChange}
                className={`${selectClass} font-mono`}
              />
              <p className="text-label-sm text-outline mt-1">
                The member uses this with their email to activate their portal account, so it must stay
                unique and can't be left blank.
              </p>
            </div>

            <p className="text-label-sm text-outline border-t border-outline-variant/40 pt-3">
              Saving here does not email the member — use Approve or Reject on a pending bank transfer
              when they should be notified. Setting the status to Paid lets them log in.
            </p>
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
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
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
