import React, { useState } from 'react';
import { Icon, PhotoUpload } from './RegisterFields';
import { BANK_TRANSFER_DETAILS } from '../shared/paymentConfig';

// Review & Confirm. Reached only after the membership form validates — no money
// moves, and nothing is saved, until a method is chosen here.
//
// Paying is not a condition of joining, so "pay later" leads the list and is
// selected by default: a member can complete registration with nothing to hand
// over, and the unpaid fee is carried as a debt that both the member's portal
// and the admin dashboard show until it is settled. The two pay-now paths
// follow for anyone who would rather clear it immediately.
//
//   pay later     — register now, owe the fee; the account works but carries
//                   a "Pending Payment" tag until it is settled.
//   card          — Paystack; the account is active immediately.
//   bank transfer — upload proof; an admin approves before login works.
function PaymentStep({
  summary, feeNaira, canPayWithCard, cardDisabledReason, submitting,
  onPayWithCard, onSubmitBankTransfer, onPayLater, onBack,
  bankProof, onBankProofPick,
}) {
  // Deliberately not conditional on canPayWithCard. Registering without paying
  // is the path we want to be effortless, so it stays pre-selected whether or
  // not card payments happen to be switched on.
  const [method, setMethod] = useState('pay_later');

  return (
    <div className="form-module is-panel">
      <h2><Icon name="receipt_long" /> Review &amp; Confirm</h2>
      <p className="module-intro">
        Confirm your details below. You can join without paying today — settle
        the registration fee now if you'd like, or later from your portal.
      </p>

      <div className="summary-box">
        <strong>{summary.fullName}</strong><br />
        {summary.email} · {summary.phoneNumber}
        {summary.wantsTraining && summary.skill && (
          <>
            <br />
            <span className="summary-training">
              <Icon name="school" /> Training requested: {summary.skill}
            </span>
          </>
        )}
        <div className="summary-fee">
          <span>Registration fee <small>(one-time)</small></span>
          <span>₦{feeNaira.toLocaleString()}</span>
        </div>
      </div>

      <div className="pay-options">
        <button
          type="button"
          className={`pay-option ${method === 'pay_later' ? 'is-selected' : ''}`}
          onClick={() => setMethod('pay_later')}
          disabled={submitting}
        >
          <span className="pay-option-title">
            <Icon name="schedule" /> Pay later
            <span className="pay-option-badge">No payment now</span>
          </span>
          <span className="pay-option-note">
            Finish registering without paying. Your profile is tagged
            <strong> Pending Payment</strong> until we receive the fee.
          </span>
        </button>

        <button
          type="button"
          className={`pay-option ${method === 'paystack' ? 'is-selected' : ''}`}
          onClick={() => setMethod('paystack')}
          disabled={!canPayWithCard || submitting}
        >
          <span className="pay-option-title"><Icon name="credit_card" /> Pay now — Card</span>
          <span className="pay-option-note">
            {canPayWithCard
              ? 'Instant activation. Log in to the portal as soon as you verify your email.'
              : cardDisabledReason}
          </span>
        </button>

        <button
          type="button"
          className={`pay-option ${method === 'bank_transfer' ? 'is-selected' : ''}`}
          onClick={() => setMethod('bank_transfer')}
          disabled={submitting}
        >
          <span className="pay-option-title"><Icon name="account_balance" /> Pay now — Bank transfer</span>
          <span className="pay-option-note">
            Transfer the fee and upload your receipt. An admin approves it
            before your portal login opens.
          </span>
        </button>
      </div>

      {method === 'pay_later' && (
        <div className="pay-panel">
          <p className="pending-callout">
            <Icon name="pending_actions" />
            <span>
              Your registration is saved right away and you can use the member
              portal once you verify your email — but your profile will show a
              <strong> Pending Payment</strong> tag, and your membership card
              and directory listing stay provisional until the ₦
              {feeNaira.toLocaleString()} fee reaches us. Your Billing page in
              the portal shows how to pay.
            </span>
          </p>
          <button type="button" className="btn-submit" onClick={onPayLater} disabled={submitting}>
            <Icon name="how_to_reg" />
            {submitting ? 'Submitting…' : 'Register now, pay later'}
          </button>
        </div>
      )}

      {method === 'paystack' && canPayWithCard && (
        <div className="pay-panel">
          <button type="button" className="btn-submit" onClick={onPayWithCard} disabled={submitting}>
            <Icon name="credit_card" />
            {submitting ? 'Processing…' : `Pay ₦${feeNaira.toLocaleString()} with Card`}
          </button>
        </div>
      )}

      {method === 'bank_transfer' && (
        <div className="pay-panel">
          <p className="module-intro">
            Transfer ₦{feeNaira.toLocaleString()} to the account below, then
            upload your proof of payment.
          </p>
          <div className="bank-details">
            Bank: <strong>{BANK_TRANSFER_DETAILS.bankName}</strong><br />
            Account Number: <strong>{BANK_TRANSFER_DETAILS.accountNumber}</strong><br />
            Account Name: <strong>{BANK_TRANSFER_DETAILS.accountName}</strong>
          </div>

          <PhotoUpload
            id="bank-proof"
            label="Proof of Payment"
            icon="receipt"
            buttonLabel="Upload receipt"
            hint="Screenshot or photo of the transfer receipt. JPEG/PNG/WebP, max 5MB."
            url={bankProof.url}
            uploading={bankProof.uploading}
            error={bankProof.error}
            onPick={onBankProofPick}
          />

          <button
            type="button"
            className="btn-submit"
            onClick={onSubmitBankTransfer}
            disabled={!bankProof.url || bankProof.uploading || submitting}
          >
            <Icon name="send" />
            {submitting ? 'Submitting…' : "I've made the transfer — Submit for Review"}
          </button>
        </div>
      )}

      <button type="button" className="btn-ghost" onClick={onBack} disabled={submitting}>
        <Icon name="arrow_back" /> Back to edit my details
      </button>
    </div>
  );
}

export default PaymentStep;
