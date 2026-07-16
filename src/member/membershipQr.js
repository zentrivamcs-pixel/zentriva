// The verification payload encoded into every membership QR code — kept in
// one place so the on-screen card and the exported/printed card always
// encode the same thing.
export function buildMembershipQrValue(member) {
  return [
    'ZENTRIVA MEMBERSHIP',
    `ID: ${member.membershipId}`,
    `Name: ${member.fullName}`,
    `Tier: ${member.tierLabel}`,
  ].join('\n');
}
