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

function TermsOfService() {
  return (
    <LegalPage title="Terms of Service" updated="July 17, 2026">
      <P>
        These Terms of Service ("Terms") govern membership of Zentriva
        Multipurpose Cooperative Society ("Zentriva") and use of the Zentriva
        website and member portal. By registering as a member or using the
        portal, you agree to these Terms.
      </P>

      <H>Membership</H>
      <ul>
        <LI>Membership is open to individuals who complete the registration form, pay the applicable annual fee for their chosen tier, and are accepted by the cooperative.</LI>
        <LI>Membership runs for one year from the date of registration and is renewable on payment of the then-current annual fee.</LI>
        <LI>The information you submit at registration must be accurate. Keeping your contact details current is your responsibility (you can update most details in the member portal).</LI>
      </ul>

      <H>Fees and Payments</H>
      <ul>
        <LI>Annual membership fees are displayed on the website for each tier and are payable in Nigerian Naira through Paystack.</LI>
        <LI>A registration is only confirmed once the payment is verified. If a payment succeeds but the registration fails to save, keep your payment reference and contact support — your payment remains valid and will not be charged twice.</LI>
        <LI>Fees are generally non-refundable once membership benefits have been made available, except where required by law or decided by the cooperative's leadership.</LI>
      </ul>

      <H>Member Directory and Conduct</H>
      <ul>
        <LI>The member directory exists for networking, referrals, and community support between members. By consenting at registration, you agree that other logged-in members can see the professional and business details you provided.</LI>
        <LI>You may use other members' contact details only for legitimate cooperative purposes — not for spam, unrelated marketing, or resale.</LI>
        <LI>Members must treat each other with respect. Fraudulent, abusive, or unlawful conduct toward other members may lead to suspension or termination of membership.</LI>
      </ul>

      <H>Member Portal Accounts</H>
      <ul>
        <LI>Portal accounts are activated with the email and payment reference from your registration. You are responsible for keeping your password confidential and for activity that happens under your account.</LI>
        <LI>Tell us immediately if you believe your account has been accessed without authorization.</LI>
      </ul>

      <H>Membership Cards</H>
      <P>
        Digital and printed membership cards remain the property of Zentriva
        Multipurpose Cooperative Society, identify the named holder only, are
        not transferable, and must be surrendered on request or upon exit from
        the organisation.
      </P>

      <H>Liability</H>
      <P>
        Zentriva facilitates connections, training, and community programs but
        is not a party to private transactions between members. Members deal
        with each other at their own discretion and risk. To the maximum extent
        permitted by law, Zentriva is not liable for losses arising from
        member-to-member dealings.
      </P>

      <H>Changes and Termination</H>
      <P>
        We may update these Terms from time to time; the date at the top shows
        the latest revision, and significant changes will be communicated to
        members. Zentriva may suspend or terminate membership for breach of
        these Terms, in line with the cooperative's constitution and bylaws.
      </P>

      <H>Governing Law</H>
      <P>These Terms are governed by the laws of the Federal Republic of Nigeria.</P>
    </LegalPage>
  );
}

export default TermsOfService;
