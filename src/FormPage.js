import React, { useState } from 'react';

// WhatsApp community group invite link (set in .env.local).
const WHATSAPP_GROUP_URL = process.env.REACT_APP_WHATSAPP_GROUP_URL;

const initialFormData = {
  // Personal Information
  fullName: '',
  gender: '',
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

  // Church Business Network Category
  offerCategory: [],
  otherCategory: '',

  // Consent
  consent: false,

  // Additional Comments
  additionalComments: ''
};

function FormPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Prepare data for the API (snake_case columns)
      const memberData = {
        full_name: formData.fullName,
        gender: formData.gender,
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
        additional_comments: formData.additionalComments || null
      };

      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData)
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }

      // Success! Reset the form and show the thank-you / WhatsApp screen.
      setFormData(initialFormData);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="form-container">
      <h1>🏛️ Church Business & Professional Directory</h1>
      <p className="subtitle">Help us build a community of support and collaboration</p>

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
            <label>Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
            />
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
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp Number</label>
              <input
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="(555) 123-4567"
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
                    placeholder="Business phone"
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
            <label>Are you willing to offer discounts or special packages to church members?</label>
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
            <label>Are you open to partnerships with other church members?</label>
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

        {/* SECTION 8: Church Business Network */}
        <div className="form-section">
          <h2>⛪ Church Business Network</h2>

          <div className="form-group">
            <label>Which category best describes what you can offer to church members? (Check all that apply)</label>
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

        {/* SECTION 9: Consent */}
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
              I consent to the use of the information provided in this form for the creation of a Church Business and Professional Directory, which may be shared among church members for networking, referrals, business opportunities, and community support. *
            </label>
          </div>
        </div>

        {/* SECTION 10: Additional Comments */}
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

        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? 'Submitting...' : '📤 Submit Application'}
        </button>
      </form>
    </div>
  );
}

export default FormPage;
