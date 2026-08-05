import React, { useState } from 'react';
import { Field, GenderPicker, Icon } from './RegisterFields';
import { TRAINING_SKILLS, SKILL_AGE_MIN, SKILL_AGE_MAX } from './registerData';
import { isValidPhone } from '../shared/phoneValidation';
import { publicApi } from '../shared/api';

const EMPTY = { fullName: '', gender: '', age: '', phoneNumber: '', email: '', skill: '' };

// "Learn a Skill" — an application for one of the training programmes. This
// is not a membership: no fee is charged and no portal account is created, so
// it saves on its own (POST /api/skills) without touching the payment flow.
function SkillForm({ onToast }) {
  const [values, setValues] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const set = (field) => (e) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!values.fullName.trim()) return setError('Please enter your full name.');
    if (!values.gender) return setError('Please select your gender.');
    const age = Number.parseInt(values.age, 10);
    if (!Number.isInteger(age) || age < SKILL_AGE_MIN || age > SKILL_AGE_MAX) {
      return setError(`Please enter a valid age between ${SKILL_AGE_MIN} and ${SKILL_AGE_MAX}.`);
    }
    if (!isValidPhone(values.phoneNumber)) {
      return setError('Please enter a valid phone number, including the country code if outside Nigeria.');
    }
    if (!values.skill) return setError('Please choose the skill you want to learn.');

    setSubmitting(true);
    try {
      await publicApi('/api/skills', {
        method: 'POST',
        body: JSON.stringify({
          full_name: values.fullName.trim(),
          gender: values.gender,
          age,
          phone_number: values.phoneNumber.trim(),
          email: values.email.trim(),
          skill: values.skill,
        }),
      });
      setValues(EMPTY);
      setSubmitted(true);
      onToast('Skill training request sent — we will call you.');
    } catch (err) {
      setError(err.message || 'Could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-module">
        <h2><Icon name="school" /> Learn a Skill</h2>
        <div className="success-panel">
          <div className="success-icon" aria-hidden="true">🎓</div>
          <p className="success-text">
            Your training request has been received. A member of the Zentriva
            team will call the number you gave us with the next intake dates.
          </p>
          <button type="button" className="btn-ghost" onClick={() => setSubmitted(false)}>
            <Icon name="add" /> Send another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-module">
      <h2><Icon name="school" /> Learn a Skill</h2>
      <p className="module-intro">
        Tell us about yourself and the trade you want to learn. Training is open
        to members and non-members alike — no payment is needed to apply.
      </p>

      {error && (
        <p className="form-error" role="alert">
          <Icon name="error" /> {error}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Field id="skill-name" label="Full Name" icon="person">
          <input
            id="skill-name"
            type="text"
            value={values.fullName}
            onChange={set('fullName')}
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />
        </Field>

        <GenderPicker
          name="skillGender"
          value={values.gender}
          onChange={(gender) => setValues((prev) => ({ ...prev, gender }))}
        />

        <Field id="skill-age" label="Age" icon="calendar_month">
          <input
            id="skill-age"
            type="number"
            value={values.age}
            onChange={set('age')}
            placeholder="Enter your age"
            min={SKILL_AGE_MIN}
            max={SKILL_AGE_MAX}
            required
          />
        </Field>

        <Field id="skill-phone" label="Phone Number" icon="call">
          <input
            id="skill-phone"
            type="tel"
            value={values.phoneNumber}
            onChange={set('phoneNumber')}
            placeholder="0801 234 5678 or +234 801 234 5678"
            autoComplete="tel"
            required
          />
        </Field>

        <Field id="skill-email" label="Email Address (optional)" icon="mail">
          <input
            id="skill-email"
            type="email"
            value={values.email}
            onChange={set('email')}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field id="skill-choice" label="What skill do you want to learn?" icon="handyman">
          <div className="select-wrapper">
            <select id="skill-choice" value={values.skill} onChange={set('skill')} required>
              <option value="" disabled>Select a skill</option>
              {TRAINING_SKILLS.map((skill) => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
            <Icon name="expand_more" />
          </div>
        </Field>

        <button type="submit" className="btn-submit" disabled={submitting}>
          <Icon name="send" />
          {submitting ? 'Sending…' : 'Submit Information'}
        </button>
      </form>

      <div className="note-safe">
        <Icon name="lock" /> Your data is confidential and never sold.
      </div>
    </div>
  );
}

export default SkillForm;
