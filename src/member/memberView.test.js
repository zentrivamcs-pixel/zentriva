import { buildMemberView, membershipIdYear } from './memberView';

describe('membershipIdYear', () => {
  it('reads the trailing year out of a membership number', () => {
    expect(membershipIdYear('ZNTR-1042-EXE-2026')).toBe(2026);
  });

  it('returns null for IDs with no embedded year', () => {
    expect(membershipIdYear('ZNTR-1042')).toBeNull();
    expect(membershipIdYear('')).toBeNull();
    expect(membershipIdYear(undefined)).toBeNull();
  });
});

describe('buildMemberView — ID-year / Member-Since / Date-Issued reconciliation', () => {
  const baseMember = {
    id: 42,
    full_name: 'Ada Okafor',
    membership_category: 'Executive Member',
    membership_tier: 'standard',
    created_at: '2026-07-17 10:00:00',
  };

  let warnSpy;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('does not warn when the ID year matches the registration year', () => {
    const view = buildMemberView({ ...baseMember, membership_id: 'ZNTR-1042-EXE-2026' });
    expect(view.memberSince).toBe('2026');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns when the ID year and the registration year disagree', () => {
    const view = buildMemberView({ ...baseMember, membership_id: 'ZNTR-1042-EXE-2025' });
    expect(view.memberSince).toBe('2026');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/ID year \(2025\).*registration year \(2026\)/s);
  });

  it('renders Date Issued and Next Renewal in the same "MMM D, YYYY" format', () => {
    const view = buildMemberView({ ...baseMember, membership_id: 'ZNTR-1042-EXE-2026' });
    const dateFormat = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
    expect(view.issuedDate).toBe('Jul 17, 2026');
    expect(view.issuedDate).toMatch(dateFormat);
    expect(view.nextRenewal).toMatch(dateFormat);
  });
});
