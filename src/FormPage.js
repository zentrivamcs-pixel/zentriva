import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTier, MEMBERSHIP_TIERS } from './shared/membershipTiers';
import { publicApi } from './shared/api';
import { isValidPhone } from './shared/phoneValidation';

// WhatsApp community group invite link (set in .env.local).
const WHATSAPP_GROUP_URL = process.env.REACT_APP_WHATSAPP_GROUP_URL;

// Paystack public key (set in .env.local). The registration fee is driven by
// the ?tier= query param (set when arriving from a membership tier CTA).
const PAYSTACK_PUBLIC_KEY = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

// Date of Birth is collected as three plain <select>s instead of a native
// <input type="date"> — the browser's built-in date picker popup can't be
// restyled to match the rest of the form, so it looks jarring next to it.
const DOB_MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];
const DOB_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const DOB_CURRENT_YEAR = new Date().getFullYear();
const DOB_YEARS = Array.from({ length: 100 }, (_, i) => String(DOB_CURRENT_YEAR - 13 - i));

const initialFormData = {
  // Personal Information
  fullName: '',
  gender: '',
  membershipCategory: '',
  dateOfBirth: '',
  phoneNumber: '',
  whatsappNumber: '',
  email: '',

  // Employment Status
  employmentStatus: [],
  profession: '',
  companyName: '',
  jobTitle: '',
  workDescription: '',

  // Business Information
  ownsBusiness: '',
  businessName: '',
  businessType: '',
  productsServices: '',
  businessLocation: '',
  businessPhone: '',
  socialMedia: '',
  yearsInBusiness: '',

  // Skills & Expertise - Checkboxes
  skills: [],
  otherSkills: '',

  // Products & Services Needed
  servicesNeeded: [],
  otherServicesNeeded: '',

  // Referral & Collaboration
  offerDiscounts: '',
  discountDetails: '',
  openToPartnerships: '',
  willingToMentor: '',
  availableToSpeak: '',

  // Employment Opportunities
  employsStaff: '',

  // Zentriva Business Network Category
  offerCategory: [],
  otherCategory: '',

  // Member portal account
  password: '',
  confirmPassword: '',

  // Consent
  consent: false,

  // Additional Comments
  additionalComments: ''
};

function FormPage() {
  const [searchParams] = useSearchParams();
  // The ?tier= query param (set by the homepage tier CTAs) picks the initial
  // tier, but it stays changeable on the form itself.
  const [tierKey, setTierKey] = useState(() => getTier(searchParams.get('tier')).key);
  const tier = getTier(tierKey);
  const REGISTRATION_FEE_NAIRA = tier.priceNaira;

  const [formData, setFormData] = useState(initialFormData);
  const [dobParts, setDobParts] = useState({ day: '', month: '', year: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');
  // Set when payment succeeded but the registration failed to save — the
  // reference must stay visible so the member can recover or retry.
  const [saveFailure, setSaveFailure] = useState(null);
  const [referenceCopied, setReferenceCopied] = useState(false);
  // Kept after a successful save so the thank-you screen can show it — the
  // member needs it to activate their portal account.
  const [lastReference, setLastReference] = useState('');

  // Paystack's inline script is only needed on this page, so it's injected
  // here instead of shipping in index.html on every page of the site.
  useEffect(() => {
    if (window.PaystackPop || document.getElementById('paystack-inline-js')) return;
    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleDobPartChange = (part) => (e) => {
    const nextParts = { ...dobParts, [part]: e.target.value };
    setDobParts(nextParts);
    const { day, month, year } = nextParts;
    setFormData((prevData) => ({
      ...prevData,
      dateOfBirth: day && month && year ? `${year}-${month}-${day}` : '',
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMultiSelect = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: checked
        ? [...prevData[name], value]
        : prevData[name].filter(item => item !== value)
    }));
  };

  // Prepare data for the API (snake_case columns)
  const buildMemberData = (paymentReference) => {
    return {
        full_name: formData.fullName,
        gender: formData.gender,
        membership_category: formData.membershipCategory,
        date_of_birth: formData.dateOfBirth || null,
        phone_number: formData.phoneNumber,
        whatsapp_number: formData.whatsappNumber || null,
        email: formData.email,
        employment_status: formData.employmentStatus || [],
        profession: formData.profession || null,
        company_name: formData.companyName || null,
        job_title: formData.jobTitle || null,
        work_description: formData.workDescription || null,
        owns_business: formData.ownsBusiness || null,
        business_name: formData.businessName || null,
        business_type: formData.businessType || null,
        products_services: formData.productsServices || null,
        business_location: formData.businessLocation || null,
        business_phone: formData.businessPhone || null,
        social_media: formData.socialMedia || null,
        years_in_business: formData.yearsInBusiness || null,
        skills: formData.skills || [],
        other_skills: formData.otherSkills || null,
        services_needed: formData.servicesNeeded || [],
        other_services_needed: formData.otherServicesNeeded || null,
        offer_discounts: formData.offerDiscounts || null,
        discount_details: formData.discountDetails || null,
        open_to_partnerships: formData.openToPartnerships || null,
        willing_to_mentor: formData.willingToMentor || null,
        available_to_speak: formData.availableToSpeak || null,
        employs_staff: formData.employsStaff || null,
        offer_category: formData.offerCategory || [],
        other_category: formData.otherCategory || null,
        consent: formData.consent || false,
        additional_comments: formData.additionalComments || null,
        membership_tier: tier.key,
        payment_reference: paymentReference,
        // Sent over HTTPS and hashed server-side before storage — the
        // plaintext is never persisted anywhere.
        password: formData.password
      };
  };

  // Saves the submission — only reached after Paystack confirms payment.
  const submitMember = async (paymentReference) => {
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildMemberData(paymentReference))
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }

      // Success! Reset the form and show the thank-you / WhatsApp screen.
      setFormData(initialFormData);
      setSaveFailure(null);
      setLastReference(paymentReference);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting form:', error);
      // The money was taken but the record didn't save. Never hide the
      // reference behind a dismissable alert — keep it on screen until
      // the retry succeeds or the member writes it down.
      setSaveFailure({ reference: paymentReference, message: error.message });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(saveFailure.reference);
      setReferenceCopied(true);
      setTimeout(() => setReferenceCopied(false), 2000);
    } catch {
      // Clipboard denied — the reference is still visible to copy manually.
    }
  };

  const handleRetrySave = () => {
    setSubmitting(true);
    submitMember(saveFailure.reference);
  };

  // Triggers the Paystack checkout; the form is only saved once payment succeeds.
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Checkbox groups can't use the native `required` attribute (it would
    // demand every box) — enforce "at least one" here before taking payment.
    if (formData.employmentStatus.length === 0) {
      setValidationError('Please select at least one option under "Current Status" in the Employment section.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!isValidPhone(formData.phoneNumber)) {
      setValidationError('Please enter a valid phone number for the "Phone Number" field, including the country code if outside Nigeria (e.g. +234 801 234 5678).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (formData.whatsappNumber && !isValidPhone(formData.whatsappNumber)) {
      setValidationError('Please enter a valid WhatsApp number, including the country code if outside Nigeria.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (formData.businessPhone && !isValidPhone(formData.businessPhone)) {
      setValidationError('Please enter a valid Business Phone Number, including the country code if outside Nigeria.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (formData.password.length < 8) {
      setValidationError('Your portal password must be at least 8 characters (see "Member Portal Account").');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Your portal password and its confirmation do not match (see "Member Portal Account").');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationError('');

    if (!PAYSTACK_PUBLIC_KEY || !window.PaystackPop) {
      alert('❌ Payment could not be loaded. Please check your connection and try again, or contact the administrator.');
      return;
    }

    setSubmitting(true);

    // One account per email — check BEFORE charging, so nobody pays only to
    // find out their email is already registered. Fail-open on network
    // errors: the server enforces uniqueness again at save time.
    try {
      const { registered } = await publicApi('/api/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email }),
      });
      if (registered) {
        setSubmitting(false);
        setValidationError(
          'This email is already registered with Zentriva. Log in to the Member Portal instead — or contact support if you think this is a mistake.'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } catch {
      // Check unavailable — continue; the save endpoint still enforces it.
    }

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: formData.email,
      amount: REGISTRATION_FEE_NAIRA * 100, // Paystack expects kobo.
      currency: 'NGN',
      metadata: { full_name: formData.fullName, phone_number: formData.phoneNumber, membership_tier: tier.key },
      callback: (response) => {
        submitMember(response.reference);
      },
      onClose: () => {
        setSubmitting(false);
      }
    });
    handler.openIframe();
  };

  if (submitted) {
    return (
      <div className="form-container">
        <div className="success-screen">
          <div className="success-icon">🎉</div>
          <h1>Thank You!</h1>
          <p className="success-message">
            Your application has been submitted successfully. Join our community
            WhatsApp group to stay connected with other members.
          </p>

          {lastReference && (
            <div className="reference-note">
              <p>
                Your member account is ready — <a href="/member">log in to the
                Member Portal</a> with your email address and the password you
                chose. Your payment reference is <strong>{lastReference}</strong>;
                keep it for your records.
              </p>
            </div>
          )}

          {WHATSAPP_GROUP_URL ? (
            <a
              className="whatsapp-button"
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="whatsapp-icon">💬</span> Join our WhatsApp Group
            </a>
          ) : (
            <p className="whatsapp-missing">
              (WhatsApp group link not configured yet — set <code>REACT_APP_WHATSAPP_GROUP_URL</code> in <code>.env.local</code>.)
            </p>
          )}

          <button
            type="button"
            className="submit-another-button"
            onClick={() => setSubmitted(false)}
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  // Payment went through but the registration failed to save — show a
  // persistent recovery screen instead of losing the reference in an alert.
  if (saveFailure) {
    return (
      <div className="form-container">
        <div className="success-screen">
          <div className="success-icon">⚠️</div>
          <h1>Payment received — one more step</h1>
          <p className="success-message">
            Your payment of ₦{REGISTRATION_FEE_NAIRA.toLocaleString()} was received, but saving your
            registration failed ({saveFailure.message}). Your money is safe.
          </p>
          <div className="reference-note error">
            <p>
              Your payment reference: <strong>{saveFailure.reference}</strong>
            </p>
            <button type="button" className="copy-reference-button" onClick={handleCopyReference}>
              {referenceCopied ? '✓ Copied' : 'Copy reference'}
            </button>
          </div>
          <p className="success-message">
            Try submitting again below — your payment will not be charged twice.
            If it keeps failing, contact us with the reference above and we'll
            complete your registration manually.
          </p>
          <button
            type="button"
            className="submit-another-button"
            onClick={handleRetrySave}
            disabled={submitting}
          >
            {submitting ? 'Retrying…' : 'Retry submission'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h1>🏛️ Zentriva Business & Professional Directory</h1>
      <p className="subtitle">Help us build a community of support and collaboration</p>

      {/* Tier selection — pre-set by the homepage CTA, changeable here */}
      <div className="tier-selector" role="radiogroup" aria-label="Membership tier">
        {Object.values(MEMBERSHIP_TIERS).map((t) => (
          <label
            key={t.key}
            className={`tier-option ${tierKey === t.key ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="membershipTier"
              value={t.key}
              checked={tierKey === t.key}
              onChange={() => setTierKey(t.key)}
            />
            <span className="tier-option-name">{t.name}</span>
            <span className="tier-option-price">₦{t.priceNaira.toLocaleString()}/yr</span>
          </label>
        ))}
      </div>

      {validationError && (
        <p className="form-validation-error" role="alert">⚠️ {validationError}</p>
      )}

      <form onSubmit={handleSubmit}>

        {/* SECTION 1: Personal Information */}
        <div className="form-section">
          <h2>📋 Personal Information</h2>

          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label>Gender *</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={formData.gender === 'Male'}
                  onChange={handleChange}
                  required
                />
                Male
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={formData.gender === 'Female'}
                  onChange={handleChange}
                />
                Female
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Membership Category *</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="membershipCategory"
                  value="Executive Member"
                  checked={formData.membershipCategory === 'Executive Member'}
                  onChange={handleChange}
                  required
                />
                Executive Member
              </label>
              <label>
                <input
                  type="radio"
                  name="membershipCategory"
                  value="Non-Executive Member"
                  checked={formData.membershipCategory === 'Non-Executive Member'}
                  onChange={handleChange}
                />
                Non-Executive Member
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <div className="dob-row">
              <select
                aria-label="Day"
                value={dobParts.day}
                onChange={handleDobPartChange('day')}
              >
                <option value="">Day</option>
                {DOB_DAYS.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <select
                aria-label="Month"
                value={dobParts.month}
                onChange={handleDobPartChange('month')}
              >
                <option value="">Month</option>
                {DOB_MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <select
                aria-label="Year"
                value={dobParts.year}
                onChange={handleDobPartChange('year')}
              >
                <option value="">Year</option>
                {DOB_YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                placeholder="0801 234 5678 or +234 801 234 5678"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp Number</label>
              <input
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="0801 234 5678 or +234 801 234 5678"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* SECTION 2: Employment / Profession Information */}
        <div className="form-section">
          <h2>💼 Employment / Profession Information</h2>

          <div className="form-group">
            <label>Current Status *</label>
            <div className="checkbox-group">
              {['Employed', 'Self-Employed', 'Business Owner', 'Freelancer', 'Student', 'Retired', 'Unemployed'].map(status => (
                <label key={status}>
                  <input
                    type="checkbox"
                    name="employmentStatus"
                    value={status}
                    checked={formData.employmentStatus.includes(status)}
                    onChange={handleMultiSelect}
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Profession / Occupation</label>
            <input
              type="text"
              name="profession"
              value={formData.profession}
              onChange={handleChange}
              placeholder="e.g., Accountant, Teacher, Engineer"
            />
          </div>

          <div className="form-group">
            <label>Company/Organization Name (if employed)</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Company name"
            />
          </div>

          <div className="form-group">
            <label>Job Title</label>
            <input
              type="text"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              placeholder="Your job title"
            />
          </div>

          <div className="form-group">
            <label>Brief Description of What You Do</label>
            <textarea
              name="workDescription"
              value={formData.workDescription}
              onChange={handleChange}
              rows="4"
              placeholder="Describe your work, role, or daily responsibilities..."
            />
          </div>
        </div>

        {/* SECTION 3: Business Information */}
        <div className="form-section">
          <h2>🏢 Business Information</h2>

          <div className="form-group">
            <label>Do you own or operate a business? *</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="ownsBusiness"
                  value="Yes"
                  checked={formData.ownsBusiness === 'Yes'}
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="ownsBusiness"
                  value="No"
                  checked={formData.ownsBusiness === 'No'}
                  onChange={handleChange}
                />
                No
              </label>
            </div>
          </div>

          {formData.ownsBusiness === 'Yes' && (
            <>
              <div className="form-group">
                <label>Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Your business name"
                />
              </div>

              <div className="form-group">
                <label>Type of Business</label>
                <input
                  type="text"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  placeholder="e.g., Retail, Service, Manufacturing"
                />
              </div>

              <div className="form-group">
                <label>Products or Services Offered</label>
                <textarea
                  name="productsServices"
                  value={formData.productsServices}
                  onChange={handleChange}
                  rows="3"
                  placeholder="List your products or services..."
                />
              </div>

              <div className="form-group">
                <label>Business Location</label>
                <input
                  type="text"
                  name="businessLocation"
                  value={formData.businessLocation}
                  onChange={handleChange}
                  placeholder="Address or area"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Business Phone Number</label>
                  <input
                    type="tel"
                    name="businessPhone"
                    value={formData.businessPhone}
                    onChange={handleChange}
                    placeholder="0801 234 5678 or +234 801 234 5678"
                  />
                </div>

                <div className="form-group">
                  <label>Social Media Handles / Website</label>
                  <input
                    type="text"
                    name="socialMedia"
                    value={formData.socialMedia}
                    onChange={handleChange}
                    placeholder="Instagram, Facebook, website URL"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Years in Business</label>
                <select
                  name="yearsInBusiness"
                  value={formData.yearsInBusiness}
                  onChange={handleChange}
                >
                  <option value="">Select years</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1 – 3 years">1 – 3 years</option>
                  <option value="4 – 7 years">4 – 7 years</option>
                  <option value="More than 7 years">More than 7 years</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* SECTION 4: Skills & Expertise */}
        <div className="form-section">
          <h2>🔧 Skills & Expertise</h2>

          <div className="form-group">
            <label>What professional skills do you possess? (Check all that apply)</label>
            <div className="skills-grid">
              {[
                'Accounting', 'Architecture', 'Building Construction', 'Carpentry',
                'Catering', 'Cloud Engineering', 'Computer Repairs', 'Data Analysis',
                'Digital Marketing', 'Electrical Installation', 'Event Planning',
                'Fashion Design', 'Graphic Design', 'Hairdressing', 'Health & Fitness',
                'Human Resources', 'Interior Design', 'Legal Services', 'Photography',
                'Plumbing', 'Printing', 'Programming / Software Development',
                'Project Management', 'Real Estate', 'Social Media Management',
                'Solar Installation', 'Teaching / Training', 'Transportation / Logistics',
                'Videography', 'Web Design'
              ].map(skill => (
                <label key={skill}>
                  <input
                    type="checkbox"
                    name="skills"
                    value={skill}
                    checked={formData.skills.includes(skill)}
                    onChange={handleMultiSelect}
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Other Skills or Certifications</label>
            <textarea
              name="otherSkills"
              value={formData.otherSkills}
              onChange={handleChange}
              rows="3"
              placeholder="List any other skills or certifications not mentioned above..."
            />
          </div>
        </div>

        {/* SECTION 5: Products & Services Needed */}
        <div className="form-section">
          <h2>🛍️ Products & Services Needed</h2>

          <div className="form-group">
            <label>What products or services do you frequently need? (Check all that apply)</label>
            <div className="services-grid">
              {[
                'Building Materials', 'Catering Services', 'Cleaning Services',
                'Clothing & Fashion', 'Computer Services', 'Electrical Services',
                'Event Services', 'Financial Services', 'Fitness Services',
                'Graphic Design', 'Legal Services', 'Logistics & Delivery',
                'Medical Services', 'Printing', 'Real Estate Services',
                'Software Development', 'Solar Installation', 'Transportation',
                'Web Design'
              ].map(service => (
                <label key={service}>
                  <input
                    type="checkbox"
                    name="servicesNeeded"
                    value={service}
                    checked={formData.servicesNeeded.includes(service)}
                    onChange={handleMultiSelect}
                  />
                  {service}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Other Services Needed</label>
            <input
              type="text"
              name="otherServicesNeeded"
              value={formData.otherServicesNeeded}
              onChange={handleChange}
              placeholder="Any other services you need?"
            />
          </div>
        </div>

        {/* SECTION 6: Referral & Collaboration */}
        <div className="form-section">
          <h2>🤝 Referral & Collaboration</h2>

          <div className="form-group">
            <label>Are you willing to offer discounts or special packages to Zentriva members?</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="offerDiscounts"
                  value="Yes"
                  checked={formData.offerDiscounts === 'Yes'}
                  onChange={handleChange}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="offerDiscounts"
                  value="No"
                  checked={formData.offerDiscounts === 'No'}
                  onChange={handleChange}
                />
                No
              </label>
            </div>
          </div>

          {formData.offerDiscounts === 'Yes' && (
            <div className="form-group">
              <label>Specify discount details</label>
              <textarea
                name="discountDetails"
                value={formData.discountDetails}
                onChange={handleChange}
                rows="2"
                placeholder="What discount or package can you offer?"
              />
            </div>
          )}

          <div className="form-group">
            <label>Are you open to partnerships with other Zentriva members?</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="openToPartnerships"
                  value="Yes"
                  checked={formData.openToPartnerships === 'Yes'}
                  onChange={handleChange}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="openToPartnerships"
                  value="No"
                  checked={formData.openToPartnerships === 'No'}
                  onChange={handleChange}
                />
                No
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Are you willing to mentor younger members in your field?</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="willingToMentor"
                  value="Yes"
                  checked={formData.willingToMentor === 'Yes'}
                  onChange={handleChange}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="willingToMentor"
                  value="No"
                  checked={formData.willingToMentor === 'No'}
                  onChange={handleChange}
                />
                No
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Are you available to speak during career/business development programs?</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="availableToSpeak"
                  value="Yes"
                  checked={formData.availableToSpeak === 'Yes'}
                  onChange={handleChange}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="availableToSpeak"
                  value="No"
                  checked={formData.availableToSpeak === 'No'}
                  onChange={handleChange}
                />
                No
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 7: Employment Opportunities */}
        <div className="form-section">
          <h2>👥 Employment Opportunities</h2>

          <div className="form-group">
            <label>Do you currently employ staff?</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="employsStaff"
                  value="Yes"
                  checked={formData.employsStaff === 'Yes'}
                  onChange={handleChange}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="employsStaff"
                  value="No"
                  checked={formData.employsStaff === 'No'}
                  onChange={handleChange}
                />
                No
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 8: Zentriva Business Network */}
        <div className="form-section">
          <h2>🌐 Zentriva Business Network</h2>

          <div className="form-group">
            <label>Which category best describes what you can offer to Zentriva members? (Check all that apply)</label>
            <div className="checkbox-group">
              {[
                'Products', 'Professional Services', 'Skilled Trade Services',
                'Employment Opportunities', 'Training & Mentorship', 'Consultancy',
                'Business Partnerships', 'Investments'
              ].map(category => (
                <label key={category}>
                  <input
                    type="checkbox"
                    name="offerCategory"
                    value={category}
                    checked={formData.offerCategory.includes(category)}
                    onChange={handleMultiSelect}
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Other Category</label>
            <input
              type="text"
              name="otherCategory"
              value={formData.otherCategory}
              onChange={handleChange}
              placeholder="Any other category?"
            />
          </div>
        </div>

        {/* SECTION 9: Member Portal Account */}
        <div className="form-section">
          <h2>🔐 Member Portal Account</h2>

          <p className="section-hint">
            Choose a password for the Zentriva Member Portal. After payment,
            you can log in right away with your email address and this
            password to access your digital membership ID, the member
            directory, and your billing history.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repeat your password"
              />
            </div>
          </div>
        </div>

        {/* SECTION 10: Consent */}
        <div className="form-section">
          <h2>📝 Consent</h2>

          <div className="form-group checkbox-group consent-group">
            <label>
              <input
                type="checkbox"
                name="consent"
                checked={formData.consent}
                onChange={handleChange}
                required
              />
              I consent to the use of the information provided in this form for the creation of a Zentriva Business and Professional Directory, which may be shared among Zentriva members for networking, referrals, business opportunities, and community support. *
            </label>
          </div>
        </div>

        {/* SECTION 11: Additional Comments */}
        <div className="form-section">
          <h2>💬 Additional Comments</h2>

          <div className="form-group">
            <textarea
              name="additionalComments"
              value={formData.additionalComments}
              onChange={handleChange}
              rows="4"
              placeholder="Any additional comments or information you'd like to share..."
            />
          </div>
        </div>

        <p className="payment-notice">
          💳 Your {tier.name} tier registration fee of ₦{REGISTRATION_FEE_NAIRA.toLocaleString()} is
          collected via Paystack before your application is submitted.
        </p>

        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? 'Processing…' : `📤 Pay ₦${REGISTRATION_FEE_NAIRA.toLocaleString()} & Submit`}
        </button>
      </form>
    </div>
  );
}

export default FormPage;
