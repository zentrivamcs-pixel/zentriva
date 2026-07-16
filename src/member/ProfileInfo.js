import React, { useRef, useState } from 'react';
import ImagePlaceholder from '../shared/ImagePlaceholder';
import { initialProfile, verifications } from './profileData';
import { useProfile } from './ProfileContext';

function ProfileInfo() {
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const { avatarSrc, setAvatarSrc } = useProfile();
  const fileInputRef = useRef(null);

  const handleFieldChange = (field) => (e) => {
    setProfile((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleToggle = (field) => () => {
    setProfile((prev) => ({ ...prev, [field]: !prev[field] }));
    setSavedProfile((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSavedProfile(profile);
    setEditing(false);
  };

  const handleDiscard = () => {
    setProfile(savedProfile);
    setEditing(false);
  };

  return (
    <>
      <div className="mb-10">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Profile Management</h2>
        <p className="font-body-md text-body-md text-secondary">
          Manage your personal identity, contact details, and public presence within the Zentriva
          network.
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
                    alt={`${savedProfile.fullName}'s profile photo`}
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
                  aria-label="Change profile photo"
                  className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                </button>
              </div>
              <h3 className="font-headline-md text-headline-md text-primary">{savedProfile.fullName}</h3>
              <p className="font-label-md text-label-md text-secondary mb-4">{savedProfile.role}</p>
              <div className="flex items-center gap-2 px-3 py-1 bg-tertiary-container/10 text-on-tertiary-container rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
                <span className="font-label-sm text-label-sm">Active since {savedProfile.memberSince}</span>
              </div>
              <div className="w-full pt-6 border-t border-outline-variant space-y-4">
                <div className="flex justify-between items-center text-label-md">
                  <span className="text-secondary">Completion</span>
                  <span className="text-primary font-bold">{savedProfile.completionPercent}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${savedProfile.completionPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h4 className="font-label-md text-label-md font-bold text-primary mb-4">Verification Status</h4>
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
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Full Legal Name
                  </label>
                  <input
                    className="w-full bg-background border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    type="text"
                    value={profile.fullName}
                    disabled={!editing}
                    onChange={handleFieldChange('fullName')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Cooperative Role / Job Title
                  </label>
                  <input
                    className="w-full bg-background border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    type="text"
                    value={profile.jobTitle}
                    disabled={!editing}
                    onChange={handleFieldChange('jobTitle')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-background border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      type="email"
                      value={profile.email}
                      disabled={!editing}
                      onChange={handleFieldChange('email')}
                    />
                    {profile.emailVerified && (
                      <span
                        className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-tertiary-container text-sm"
                        style={{ fontVariationSettings: '"FILL" 1' }}
                        title="Verified"
                      >
                        verified
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Phone Number
                  </label>
                  <input
                    className="w-full bg-background border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    type="tel"
                    value={profile.phone}
                    disabled={!editing}
                    onChange={handleFieldChange('phone')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface-variant block">
                  Professional Biography
                </label>
                <textarea
                  className="w-full bg-background border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  rows="4"
                  maxLength={500}
                  value={profile.bio}
                  disabled={!editing}
                  onChange={handleFieldChange('bio')}
                />
                <p className="text-right font-label-sm text-label-sm text-secondary">
                  {profile.bio.length} / 500 characters
                </p>
              </div>

              <div className="pt-6 border-t border-outline-variant">
                <h5 className="font-label-md text-label-md font-bold text-primary mb-6">
                  Privacy &amp; Visibility
                </h5>
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="font-label-md text-label-md text-primary">Cooperative Directory Listing</p>
                      <p className="font-label-sm text-label-sm text-secondary">
                        Allow other premium members to find your profile
                      </p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        checked={profile.directoryListing}
                        onChange={handleToggle('directoryListing')}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="font-label-md text-label-md text-primary">Show Activity Status</p>
                      <p className="font-label-sm text-label-sm text-secondary">
                        Display when you are online in the portal
                      </p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        checked={profile.showActivityStatus}
                        onChange={handleToggle('showActivityStatus')}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </div>
                  </label>
                </div>
              </div>

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
                    className="px-8 py-2.5 font-label-md text-label-md bg-primary text-white rounded-lg shadow-md hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    Save Profile Changes
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
