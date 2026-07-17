import React from 'react';
import LegalPage from './LegalPage';

const H = ({ children }) => (
  <h2 className="font-headline-md text-headline-md text-primary mt-10 mb-3">{children}</h2>
);
const P = ({ children }) => (
  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-4">{children}</p>
);
const LI = ({ children }) => (
  <li className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-2 ml-5 list-disc">
    {children}
  </li>
);

function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" updated="July 17, 2026">
      <P>
        This Privacy Policy explains how Zentriva Multipurpose Cooperative
        Society ("Zentriva", "we", "us") collects, uses, and protects your
        personal information when you register as a member and use the
        Zentriva website and member portal.
      </P>

      <H>Information We Collect</H>
      <P>When you register, we collect the information you provide on the registration form, including:</P>
      <ul>
        <LI>Identity and contact details — full name, gender, date of birth, phone and WhatsApp numbers, and email address.</LI>
        <LI>Professional details — employment status, profession, employer, job title, and a description of your work.</LI>
        <LI>Business details — business name, type, products or services, location, business phone, social media handles, and years in business.</LI>
        <LI>Skills, services you need, and how you'd like to collaborate with other members (mentorship, partnerships, discounts, speaking).</LI>
        <LI>Payment records — the amount, date, status, and Paystack reference of your membership payments. Card details are processed by Paystack and never reach our servers.</LI>
      </ul>

      <H>How We Use Your Information</H>
      <ul>
        <LI>
          <strong>Member directory:</strong> with your consent (the checkbox on the registration form),
          your name, professional, and business details are shared with other logged-in Zentriva members
          in the member directory for networking, referrals, business opportunities, and community support.
        </LI>
        <LI><strong>Membership administration:</strong> verifying payments, issuing your membership ID, managing renewals, and contacting you about your membership.</LI>
        <LI><strong>Community programs:</strong> matching members to training, mentorship, and events based on the interests you indicated.</LI>
      </ul>
      <P>We do not sell your personal information or share it with third parties for advertising.</P>

      <H>Payments</H>
      <P>
        Membership payments are processed by Paystack. We receive confirmation
        of your payment (amount, status, reference) but never see or store your
        card number. Paystack's own privacy policy applies to the payment step.
      </P>

      <H>Cookies and Local Storage</H>
      <P>
        The member portal stores a session token and your profile photo in your
        browser's local storage so you stay signed in between visits. We do not
        use advertising or tracking cookies.
      </P>

      <H>Data Security</H>
      <P>
        Member records are stored in an access-controlled database. Portal and
        admin access require authentication, passwords are stored as salted
        cryptographic hashes, and payments are verified server-side with
        Paystack before a registration is accepted.
      </P>

      <H>Your Rights</H>
      <P>
        You may request a copy of the information we hold about you, ask us to
        correct it, or ask us to remove your details from the member directory
        or delete your record entirely. Contact us using the address below and
        we will respond as quickly as we can.
      </P>

      <H>Changes to This Policy</H>
      <P>
        If we change this policy, we will update the date at the top of this
        page and, for significant changes, notify members by email or through
        the member portal.
      </P>
    </LegalPage>
  );
}

export default PrivacyPolicy;
