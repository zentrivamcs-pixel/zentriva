import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MembershipForm from './MembershipForm';
import SkillForm from './SkillForm';
import PaymentStep from './PaymentStep';
import { Icon } from './RegisterFields';
import { generateReference } from './registerData';
import { LOGO_SRC } from '../shared/Logo';
import { getTier } from '../shared/membershipTiers';
import { publicApi } from '../shared/api';
import { isValidPhone } from '../shared/phoneValidation';
import { uploadImage } from '../shared/uploadFile';
import { PAYSTACK_ENABLED } from '../shared/paymentConfig';
import { useSeo, routeMeta } from '../shared/seo';
import './register.css';

const WHATSAPP_GROUP_URL = process.env.REACT_APP_WHATSAPP_GROUP_URL;
const PAYSTACK_PUBLIC_KEY = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

const EMPTY_MEMBER = {
  fullName: '',
  gender: '',
  phoneNumber: '',
  email: '',
  passportPhotoUrl: '',
  password: '',
  confirmPassword: '',
  consent: false,
};

// The registration page: membership sign-up and skill-training applications
// side by side. The long business/professional questionnaire it replaced is
// still available at /register/full and is linked from the footer.
function RegisterPage() {
  useSeo(routeMeta('/register'));

  // Flat registration fee — every new signup is the 'standard' tier.
  const tier = getTier('standard');
  const feeNaira = tier.priceNaira;

  // 'forms' — the two modules. 'review' — Review & Pay, after the membership
  // form validates but before any money changes hands. 'done' — thank you.
  const [step, setStep] = useState('forms');
  const [values, setValues] = useState(EMPTY_MEMBER);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [passport, setPassport] = useState({ uploading: false, error: '' });
  const [bankProof, setBankProof] = useState({ url: '', uploading: false, error: '' });

  // Kept after a successful save so the thank-you screen can show what
  // happens next — which differs per payment method.
  const [outcome, setOutcome] = useState(null); // { reference, method }
  // Set when the payment went through (or proof was uploaded) but saving the
  // registration failed: the reference must stay on screen until the retry
  // succeeds or the member has written it down.
  const [saveFailure, setSaveFailure] = useState(null);
  const [referenceCopied, setReferenceCopied] = useState(false);

  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Paystack's inline script is only needed here, so it's injected on mount
  // rather than shipped in index.html on every page. Readiness is tracked in
  // state because the script loads asynchronously and, on a misconfigured
  // deployment, may never load at all — in which case the card option is
  // disabled but bank transfer and pay later still work.
  const [paystackReady, setPaystackReady] = useState(!!window.PaystackPop);
  useEffect(() => {
    if (window.PaystackPop) {
      setPaystackReady(true);
      return;
    }
    const existing = document.getElementById('paystack-inline-js');
    const script = existing || document.createElement('script');
    if (!existing) {
      script.id = 'paystack-inline-js';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', () => setPaystackReady(true));
    script.addEventListener('error', () => setPaystackReady(false));
  }, []);

  const canPayWithCard = PAYSTACK_ENABLED && paystackReady && !!PAYSTACK_PUBLIC_KEY;

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handlePassportPick = async (file) => {
    setPassport({ uploading: true, error: '' });
    try {
      const url = await uploadImage(file, 'passports');
      handleChange('passportPhotoUrl', url);
      setPassport({ uploading: false, error: '' });
    } catch (err) {
      setPassport({ uploading: false, error: err.message || 'Upload failed. Please try again.' });
    }
  };

  const handleBankProofPick = async (file) => {
    setBankProof((prev) => ({ ...prev, uploading: true, error: '' }));
    try {
      const url = await uploadImage(file, 'payment-proofs');
      setBankProof({ url, uploading: false, error: '' });
    } catch (err) {
      setBankProof((prev) => ({ ...prev, uploading: false, error: err.message || 'Upload failed. Please try again.' }));
    }
  };

  const fail = (message) => {
    setError(message);
    showToast(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validates the membership form and moves to Review & Pay. Nothing is saved
  // and no money moves here.
  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');

    if (!values.fullName.trim()) return fail('Please enter your full name.');
    if (!values.gender) return fail('Please select your gender.');
    if (!isValidPhone(values.phoneNumber)) {
      return fail('Please enter a valid phone number, including the country code if outside Nigeria (e.g. +234 801 234 5678).');
    }
    if (!values.email.trim()) return fail('Please enter your email address.');
    if (!values.passportPhotoUrl) return fail('Please upload your passport photograph.');
    if (values.password.length < 8) return fail('Your portal password must be at least 8 characters.');
    if (values.password !== values.confirmPassword) return fail('Your password and its confirmation do not match.');
    if (!values.consent) return fail('Please accept the directory consent to continue.');

    setSubmitting(true);
    // One account per email — checked BEFORE payment so nobody pays (or
    // uploads proof) only to be told their email is already registered. Fails
    // open on a network error: the server enforces uniqueness again on save.
    try {
      const { registered } = await publicApi('/api/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email: values.email }),
      });
      if (registered) {
        setSubmitting(false);
        return fail('This email is already registered with Zentriva. Log in to the Member Portal instead, or contact support if you think this is a mistake.');
      }
    } catch {
      // Check unavailable — continue; the save endpoint still enforces it.
    }

    setSubmitting(false);
    setStep('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return undefined;
  };

  const buildMemberData = (reference, method, proofUrl) => ({
    full_name: values.fullName.trim(),
    gender: values.gender,
    phone_number: values.phoneNumber.trim(),
    email: values.email.trim(),
    passport_photo_url: values.passportPhotoUrl,
    consent: values.consent,
    membership_tier: tier.key,
    payment_reference: reference,
    payment_method: method,
    payment_proof_url: proofUrl || undefined,
    // Sent over HTTPS and hashed server-side; the plaintext is never stored.
    password: values.password,
  });

  // Saves the registration. Only reached once a payment path has been chosen:
  // a successful Paystack charge, an uploaded transfer proof, or an explicit
  // "pay later".
  const submitMember = async (reference, method, proofUrl) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildMemberData(reference, method, proofUrl)),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      setValues(EMPTY_MEMBER);
      setBankProof({ url: '', uploading: false, error: '' });
      setSaveFailure(null);
      setOutcome({ reference, method });
      setStep('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSaveFailure({ reference, method, proofUrl, message: err.message });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayWithCard = () => {
    if (!canPayWithCard) return;
    setSubmitting(true);
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: values.email,
      amount: feeNaira * 100, // Paystack expects kobo
      currency: 'NGN',
      metadata: {
        full_name: values.fullName,
        phone_number: values.phoneNumber,
        membership_tier: tier.key,
      },
      callback: (response) => { submitMember(response.reference, 'paystack', null); },
      onClose: () => { setSubmitting(false); },
    });
    handler.openIframe();
  };

  const handleSubmitBankTransfer = () => {
    if (!bankProof.url) return;
    submitMember(generateReference('BT'), 'bank_transfer', bankProof.url);
  };

  const handlePayLater = () => {
    submitMember(generateReference('PL'), 'pay_later', null);
  };

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(saveFailure.reference);
      setReferenceCopied(true);
      setTimeout(() => setReferenceCopied(false), 2000);
    } catch {
      // Clipboard denied — the reference is still on screen to copy by hand.
    }
  };

  const startOver = () => {
    setStep('forms');
    setOutcome(null);
    setError('');
  };

  return (
    <div className="register-page">
      {/* Ambient background */}
      <div className="bg-layer" aria-hidden="true">
        <img src={`${process.env.PUBLIC_URL}/images/hero-bg.jpg`} alt="" className="bg-mockup" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="bg-shimmer" />
      </div>

      <div className="coop-card">
        <div className="logo-header">
          <img src={LOGO_SRC} alt="Zentriva Cooperative logo" />
          <div className="brand-text">
            <span className="coop-name">ZENTRIVA</span>
            <span className="coop-tagline">
              <Icon name="groups" /> Multipurpose Cooperative · Stronger Together
            </span>
          </div>
        </div>

        {error && step === 'forms' && (
          <p className="form-error" role="alert">
            <Icon name="error" /> {error}
          </p>
        )}

        <div className="forms-grid">
          {step === 'forms' && (
            <>
              <MembershipForm
                values={values}
                onChange={handleChange}
                onSubmit={handleContinue}
                submitting={submitting}
                feeNaira={feeNaira}
                passport={passport}
                onPassportPick={handlePassportPick}
              />
              <SkillForm onToast={showToast} />
            </>
          )}

          {step === 'review' && !saveFailure && (
            <PaymentStep
              summary={values}
              feeNaira={feeNaira}
              canPayWithCard={canPayWithCard}
              cardDisabledReason="Card payment is on hold for now — please use bank transfer or pay later."
              submitting={submitting}
              onPayWithCard={handlePayWithCard}
              onSubmitBankTransfer={handleSubmitBankTransfer}
              onPayLater={handlePayLater}
              onBack={() => setStep('forms')}
              bankProof={bankProof}
              onBankProofPick={handleBankProofPick}
            />
          )}

          {/* Money moved (or proof was uploaded) but the save failed — a
              persistent recovery screen, never a dismissable alert. */}
          {saveFailure && (
            <div className="form-module is-panel success-panel">
              <div className="success-icon" aria-hidden="true">⚠️</div>
              <h2><Icon name="warning" /> One more step</h2>
              <p className="success-text">
                {saveFailure.method === 'paystack'
                  ? `Your payment of ₦${feeNaira.toLocaleString()} was received, but saving your registration failed (${saveFailure.message}). Your money is safe.`
                  : `Your submission reached us, but saving your registration failed (${saveFailure.message}).`}
              </p>
              <div className="reference-chip">
                {saveFailure.reference}
                <button
                  type="button"
                  className="text-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={handleCopyReference}
                >
                  {referenceCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="success-text">
                Try again below — you will not be charged twice. If it keeps
                failing, contact us with the reference above and we'll complete
                your registration by hand.
              </p>
              <div className="success-actions">
                <button
                  type="button"
                  className="btn-submit"
                  disabled={submitting}
                  onClick={() => submitMember(saveFailure.reference, saveFailure.method, saveFailure.proofUrl)}
                >
                  <Icon name="refresh" /> {submitting ? 'Retrying…' : 'Retry submission'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && outcome && (
            <div className="form-module is-panel success-panel">
              <div className="success-icon" aria-hidden="true">🎉</div>
              <h2><Icon name="celebration" /> Thank you!</h2>

              {outcome.method === 'bank_transfer' && (
                <p className="success-text">
                  We've received your transfer proof — your registration is
                  <strong> pending review</strong>. Check your inbox for a
                  verification email and confirm your address; once an admin
                  approves your payment you'll be able to{' '}
                  <a href="/member">log in to the Member Portal</a>.
                </p>
              )}

              {outcome.method === 'pay_later' && (
                <p className="success-text">
                  You're registered. Your profile carries a{' '}
                  <strong>Pending Payment</strong> tag until the ₦
                  {feeNaira.toLocaleString()} registration fee reaches us — the
                  Billing page in your portal shows how to settle it. Check
                  your inbox for a verification email first, then{' '}
                  <a href="/member">log in to the Member Portal</a>.
                </p>
              )}

              {outcome.method === 'paystack' && (
                <p className="success-text">
                  Your payment is confirmed. Check your inbox for a
                  verification email, then{' '}
                  <a href="/member">log in to the Member Portal</a> with your
                  email and the password you chose.
                </p>
              )}

              <div className="reference-chip">{outcome.reference}</div>

              <div className="success-actions">
                {WHATSAPP_GROUP_URL && (
                  <a
                    className="whatsapp-link"
                    href={WHATSAPP_GROUP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="forum" /> Join our WhatsApp group
                  </a>
                )}
                <button type="button" className="btn-ghost" onClick={startOver}>
                  <Icon name="person_add" /> Register someone else
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="privacy-footer">
          <Icon name="verified_user" />
          <span>Your information is safe with us.</span>
          <small>We value your privacy and will never share your details.</small>
        </div>

        <div className="page-links">
          <a href="/" className="btn-back">
            <Icon name="arrow_back" /> Go back to website
          </a>
          <Link to="/register/full" className="text-link">
            Prefer the full business &amp; professional directory form?
          </Link>
        </div>
      </div>

      <div className={`register-toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">
        {toast && (
          <>
            <Icon name="info" />
            <span>{toast}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default RegisterPage;
