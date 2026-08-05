import React from 'react';
import { Field, GenderPicker, PhotoUpload, Icon } from './RegisterFields';

// "Become a Member" — the short membership registration. Deliberately asks
// for the minimum needed to create an account and a membership card: the long
// business/professional questionnaire still lives at /register/full and can be
// completed later from the member portal.
function MembershipForm({
  values, onChange, onSubmit, submitting, feeNaira,
  passport, onPassportPick,
}) {
  const set = (field) => (e) => onChange(field, e.target.value);

  return (
    <div className="form-module">
      <h2><Icon name="person_add" /> Become a Member</h2>
      <p className="module-intro">
        Join the cooperative and enjoy the benefits — training, the member
        network, and support for member ventures. Registration is{' '}
        <strong>₦{feeNaira.toLocaleString()}/year</strong>.
      </p>

      <form onSubmit={onSubmit} noValidate>
        <Field id="member-name" label="Full Name" icon="person">
          <input
            id="member-name"
            type="text"
            value={values.fullName}
            onChange={set('fullName')}
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />
        </Field>

        <GenderPicker
          name="memberGender"
          value={values.gender}
          onChange={(gender) => onChange('gender', gender)}
        />

        <Field id="member-phone" label="Phone Number" icon="call">
          <input
            id="member-phone"
            type="tel"
            value={values.phoneNumber}
            onChange={set('phoneNumber')}
            placeholder="0801 234 5678 or +234 801 234 5678"
            autoComplete="tel"
            required
          />
        </Field>

        <Field id="member-email" label="Email Address" icon="mail">
          <input
            id="member-email"
            type="email"
            value={values.email}
            onChange={set('email')}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>

        <PhotoUpload
          id="member-passport"
          label="Passport Photograph"
          icon="badge"
          buttonLabel="Choose photo"
          hint="Clear passport, national ID, or driver's licence photo — it goes on your membership card. JPEG/PNG/WebP, max 5MB."
          url={values.passportPhotoUrl}
          uploading={passport.uploading}
          error={passport.error}
          onPick={onPassportPick}
        />

        <Field id="member-password" label="Portal Password" icon="lock">
          <input
            id="member-password"
            type="password"
            value={values.password}
            onChange={set('password')}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        <Field id="member-password-confirm" label="Confirm Password" icon="lock_reset">
          <input
            id="member-password-confirm"
            type="password"
            value={values.confirmPassword}
            onChange={set('confirmPassword')}
            placeholder="Repeat your password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        <div className="form-group">
          <label className="consent-row" htmlFor="member-consent">
            <input
              id="member-consent"
              type="checkbox"
              checked={values.consent}
              onChange={(e) => onChange('consent', e.target.checked)}
            />
            <span>
              I consent to my details being included in the Zentriva member
              directory and shared with other members for networking, referrals,
              and business opportunities. See the{' '}
              <a href="/privacy" target="_blank" rel="noreferrer">privacy policy</a>.
            </span>
          </label>
        </div>

        <button type="submit" className="btn-submit" disabled={submitting}>
          <Icon name="arrow_forward" />
          {submitting ? 'Please wait…' : 'Continue to Payment'}
        </button>
      </form>

      <div className="note-safe">
        <Icon name="lock" /> Your details are sent over an encrypted connection.
      </div>
    </div>
  );
}

export default MembershipForm;
