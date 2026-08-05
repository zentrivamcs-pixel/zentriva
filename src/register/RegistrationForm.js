import React from 'react';
import { Field, GenderPicker, PhotoUpload, Icon } from './RegisterFields';
import { TRAINING_SKILLS, SKILL_AGE_MIN, SKILL_AGE_MAX } from './registerData';

// One registration form, three sections.
//
// This replaced two separate modules sitting side by side — "Become a Member"
// and "Learn a Skill" — which each asked for full name, gender, phone and
// email. Anyone who wanted both filled their details twice and paid attention
// to which column they were in. The details are now collected once at the top
// and the two paths become sections of a single submission: membership is what
// registering means, and training is an optional add-on covered by the same
// one-time fee.
function RegistrationForm({
  values, onChange, onSubmit, submitting, feeNaira,
  passport, onPassportPick,
}) {
  const set = (field) => (e) => onChange(field, e.target.value);

  return (
    <div className="form-module is-panel">
      <h2><Icon name="person_add" /> Join Zentriva</h2>
      <p className="module-intro">
        Fill in your details once. Membership gives you the member network,
        support for member ventures, and access to our training programmes —
        add a skill below if you want one, at no extra cost.
      </p>

      <div className="fee-banner">
        <Icon name="payments" />
        <span>
          <strong>₦{feeNaira.toLocaleString()} one-time registration fee.</strong>{' '}
          Paid once when you join — whether or not you add skill training.
        </span>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <section className="form-section">
          <h3 className="section-title">
            <Icon name="badge" /> Your details
          </h3>

          <div className="field-grid">
            <div className="full-span">
              <Field id="reg-name" label="Full Name" icon="person">
                <input
                  id="reg-name"
                  type="text"
                  value={values.fullName}
                  onChange={set('fullName')}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </Field>
            </div>

            <GenderPicker
              name="regGender"
              value={values.gender}
              onChange={(gender) => onChange('gender', gender)}
            />

            <Field
              id="reg-age"
              label="Age"
              icon="calendar_month"
              hint={values.wantsTraining ? 'Required for training applications.' : 'Optional.'}
            >
              <input
                id="reg-age"
                type="number"
                value={values.age}
                onChange={set('age')}
                placeholder={`${SKILL_AGE_MIN}–${SKILL_AGE_MAX}`}
                min={SKILL_AGE_MIN}
                max={SKILL_AGE_MAX}
              />
            </Field>

            <Field id="reg-phone" label="Phone Number" icon="call">
              <input
                id="reg-phone"
                type="tel"
                value={values.phoneNumber}
                onChange={set('phoneNumber')}
                placeholder="0801 234 5678 or +234 801 234 5678"
                autoComplete="tel"
                required
              />
            </Field>

            <Field id="reg-email" label="Email Address" icon="mail">
              <input
                id="reg-email"
                type="email"
                value={values.email}
                onChange={set('email')}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3 className="section-title">
            <Icon name="card_membership" /> Membership
          </h3>

          <PhotoUpload
            id="reg-passport"
            label="Passport Photograph"
            icon="badge"
            buttonLabel="Choose photo"
            hint="Clear passport, national ID, or driver's licence photo — it goes on your membership card. JPEG/PNG/WebP, max 5MB."
            url={values.passportPhotoUrl}
            uploading={passport.uploading}
            error={passport.error}
            onPick={onPassportPick}
          />

          <div className="field-grid">
            <Field id="reg-password" label="Portal Password" icon="lock">
              <input
                id="reg-password"
                type="password"
                value={values.password}
                onChange={set('password')}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>

            <Field id="reg-password-confirm" label="Confirm Password" icon="lock_reset">
              <input
                id="reg-password-confirm"
                type="password"
                value={values.confirmPassword}
                onChange={set('confirmPassword')}
                placeholder="Repeat your password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
          </div>

          <div className="form-group">
            <label className="consent-row" htmlFor="reg-consent">
              <input
                id="reg-consent"
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
        </section>

        <section className="form-section is-optional">
          <h3 className="section-title">
            <Icon name="school" /> Skill training
            <span className="section-badge">Optional</span>
          </h3>
          <p className="module-intro">
            Training is open to every member. Pick a trade and our team will call
            you with the next intake dates — there is nothing more to pay.
          </p>

          <div className="form-group">
            <label className="consent-row" htmlFor="reg-wants-training">
              <input
                id="reg-wants-training"
                type="checkbox"
                checked={values.wantsTraining}
                onChange={(e) => onChange('wantsTraining', e.target.checked)}
              />
              <span>Yes, I want to learn a skill.</span>
            </label>
          </div>

          {values.wantsTraining && (
            <Field id="reg-skill" label="Which skill do you want to learn?" icon="handyman">
              <div className="select-wrapper">
                <select id="reg-skill" value={values.skill} onChange={set('skill')}>
                  <option value="" disabled>Select a skill</option>
                  {TRAINING_SKILLS.map((skill) => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
                <Icon name="expand_more" />
              </div>
            </Field>
          )}
        </section>

        <button type="submit" className="btn-submit" disabled={submitting}>
          <Icon name="arrow_forward" />
          {submitting
            ? 'Please wait…'
            : `Continue to Payment · ₦${feeNaira.toLocaleString()}`}
        </button>
      </form>

      <div className="note-safe">
        <Icon name="lock" /> Your details are sent over an encrypted connection and never sold.
      </div>
    </div>
  );
}

export default RegistrationForm;
