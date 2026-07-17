import { buildMembershipQrValue } from './membershipQr';

// The QR code is what a verifier scans; the printed ID number, name, and
// tier are what they see on the card. If these ever diverge, a scan would
// "verify" different biodata than what's printed.
describe('buildMembershipQrValue', () => {
  const member = {
    membershipId: 'ZNTR-1042-EXE-2026',
    fullName: 'Ada Okafor',
    tierLabel: 'Executive Member',
  };

  it('encodes exactly the ID number printed on the card', () => {
    expect(buildMembershipQrValue(member)).toContain(`ID: ${member.membershipId}`);
  });

  it('encodes exactly the name printed on the card', () => {
    expect(buildMembershipQrValue(member)).toContain(`Name: ${member.fullName}`);
  });

  it('encodes exactly the tier printed on the card', () => {
    expect(buildMembershipQrValue(member)).toContain(`Tier: ${member.tierLabel}`);
  });

  it('changes when the printed ID number changes', () => {
    const other = { ...member, membershipId: 'ZNTR-9999-MBR-2026' };
    expect(buildMembershipQrValue(member)).not.toEqual(buildMembershipQrValue(other));
  });
});
