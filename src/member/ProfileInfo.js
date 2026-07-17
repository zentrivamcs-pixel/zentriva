import React, { useMemo, useRef, useState } from 'react';
import ImagePlaceholder from '../shared/ImagePlaceholder';
import { useProfile } from './ProfileContext';
import { useMemberAuth } from './MemberAuthContext';
import { memberApi } from '../shared/api';
import { isValidPhone } from '../shared/phoneValidation';

// The profile fields a member can edit about themselves. Keys match the
// PROFILE_EDITABLE_FIELDS the API accepts on PUT /api/me.
const EDITABLE_FIELDS = [
  'phone_number', 'whatsapp_number', 'profession', 'job_title', 'company_name',
  'work_description', 'business_name', 'business_location', 'social_media',
];

const fieldValue = (member, field) => member[field] || '';

const inputClass =
  'w-full bg-background border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed';

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="font-label-md text-label-md text-on-surface-variant block">{label}</label>
      {children}
    </div>
  );
}

function ProfileInfo() {
  const { member, view, setMember } = useMemberAuth();
  const { avatarSrc, setAvatarFile, uploading: avatarUploading, error: avatarError } = useProfile();
  const fileInputRef = useRef(null);

  const initialForm = useMemo(() => {
    const form = {};
    EDITABLE_FIELDS.forEach((f) => { form[f] = fieldValue(member, f); });
    return form;
  }, [member]);

  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // Profile completion, from the fields a member can actually fill in.
  const completionPercent = useMemo(() => {
    const filled = EDITABLE_FIELDS.filter((f) => fieldValue(member, f)).length;
    return Math.round((filled / EDITABLE_FIELDS.length) * 100);
  }, [member]);

  const verifications = [
    member.payment_reference && { key: 'payment', label: 'Payment Verified' },
    member.consent && { key: 'consent', label: 'Directory Consent on File' },
    member.has_password && { key: 'account', label: 'Account Activated' },
  ].filter(Boolean);

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    e.target.value = ''; // allow picking the same file again after an error
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (form.phone_number && !isValidPhone(form.phone_number)) {
      setSaveError('Please enter a valid Phone Number, including the country code if outside Nigeria.');
      return;
    }
    if (form.whatsapp_number && !isValidPhone(form.whatsapp_number)) {
      setSaveError('Please enter a valid WhatsApp Number, including the country code if outside Nigeria.');
      return;
    }
    setSaving(true);
    try {
      const updated = await memberApi('/api/me', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setMember(updated);
      setEditing(false);
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setForm(initialForm);
    setSaveError('');
    setEditing(false);
  };

  return (
    <>
      <div className="mb-10">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Profile Management</h2>
        <p className="font-body-md text-body-md text-secondary">
          Manage your contact details and how you appear in the Zentriva member directory.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-4 space-y-gutter">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-surface-container overflow-hidden bg-surface-container">
                  <ImagePlaceholder
                    src={avatarSrc}
                    icon="person"
                    alt={`${view.fullName}'s profile photo`}
                    shape="circle"
                    className="w-full h-full text-[40px]"
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  disabled={avatarUploading}
                  aria-label="Change profile photo"
                  className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-sm">
                    {avatarUploading ? 'hourglass_top' : 'photo_camera'}
                  </span>
                </button>
              </div>
              {avatarError && (
                <p className="font-label-sm text-label-sm text-error mb-2" role="alert">{avatarError}</p>
              )}
              <h3 className="font-headline-md text-headline-md text-primary">{view.fullName}</h3>
              <p className="font-label-md text-label-md text-secondary mb-4">
                {member.profession || view.tierLabel}
              </p>
              <div className="flex items-center gap-2 px-3 py-1 bg-tertiary-container/10 text-on-tertiary-container rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
                <span className="font-label-sm text-label-sm">Member since {view.memberSince}</span>
              </div>
              <div className="w-full pt-6 border-t border-outline-variant space-y-4">
                <div className="flex justify-between items-center text-label-md">
                  <span className="text-secondary">Profile Completion</span>
                  <span className="text-primary font-bold">{completionPercent}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h4 className="font-label-md text-label-md font-bold text-primary mb-4">Membership Status</h4>
            <div className="space-y-3">
              {verifications.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/30"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-on-tertiary-container"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      check_circle
                    </span>
                    <span className="font-label-sm text-label-sm">{v.label}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  <span className="font-label-sm text-label-sm font-mono">{view.membershipId}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-8">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
            <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center">
              <h4 className="font-headline-md text-headline-md text-primary">Personal Information</h4>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="bg-transparent flex items-center gap-2 px-4 py-2 border border-outline text-secondary hover:bg-surface-container transition-colors rounded-lg font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit Details
                </button>
              )}
            </div>

            <form className="p-8 space-y-8" onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <Field label="Full Legal Name">
                  <input className={inputClass} type="text" value={view.fullName} disabled />
                  <p className="font-label-sm text-label-sm text-secondary">
                    Contact support to change your registered name.
                  </p>
                </Field>
                <Field label="Email Address">
                  <input className={inputClass} type="email" value={view.email} disabled />
                  <p className="font-label-sm text-label-sm text-secondary">
                    Your email is your login and can't be changed here.
                  </p>
                </Field>
                <Field label="Phone Number">
                  <input
                    className={inputClass}
                    type="tel"
                    value={form.phone_number}
                    disabled={!editing}
                    onChange={handleFieldChange('phone_number')}
                  />
                </Field>
                <Field label="WhatsApp Number">
                  <input
                    className={inputClass}
                    type="tel"
                    value={form.whatsapp_number}
                    disabled={!editing}
                    onChange={handleFieldChange('whatsapp_number')}
                  />
                </Field>
                <Field label="Profession / Occupation">
                  <input
                    className={inputClass}
                    type="text"
                    value={form.profession}
                    disabled={!editing}
                    onChange={handleFieldChange('profession')}
                  />
                </Field>
                <Field label="Job Title">
                  <input
                    className={inputClass}
                    type="text"
                    value={form.job_title}
                    disabled={!editing}
                    onChange={handleFieldChange('job_title')}
                  />
                </Field>
                <Field label="Company / Organization">
                  <input
                    className={inputClass}
                    type="text"
                    value={form.company_name}
                    disabled={!editing}
                    onChange={handleFieldChange('company_name')}
                  />
                </Field>
                <Field label="Business Name">
                  <input
                    className={inputClass}
                    type="text"
                    value={form.business_name}
                    disabled={!editing}
                    onChange={handleFieldChange('business_name')}
                  />
                </Field>
                <Field label="Business Location">
                  <input
                    className={inputClass}
                    type="text"
                    value={form.business_location}
                    disabled={!editing}
                    onChange={handleFieldChange('business_location')}
                  />
                </Field>
                <Field label="Social Media / Website">
                  <input
                    className={inputClass}
                    type="text"
                    value={form.social_media}
                    disabled={!editing}
                    onChange={handleFieldChange('social_media')}
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface-variant block">
                  What You Do (shown in the member directory)
                </label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows="4"
                  maxLength={500}
                  value={form.work_description}
                  disabled={!editing}
                  onChange={handleFieldChange('work_description')}
                />
                <p className="text-right font-label-sm text-label-sm text-secondary">
                  {(form.work_description || '').length} / 500 characters
                </p>
              </div>

              {saveError && (
                <p className="font-label-sm text-label-sm text-error" role="alert">{saveError}</p>
              )}
              {saved && !editing && (
                <p className="font-label-sm text-label-sm text-on-tertiary-container">
                  Profile updated successfully.
                </p>
              )}

              {editing && (
                <div className="flex justify-end gap-4 pt-6">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="bg-transparent px-6 py-2.5 font-label-md text-label-md text-secondary hover:bg-surface-container rounded-lg transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-2.5 font-label-md text-label-md bg-primary text-white rounded-lg shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Profile Changes'}
                  </button>
                </div>
              )}
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

export default ProfileInfo;
