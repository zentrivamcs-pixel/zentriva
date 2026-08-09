import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentStep from './PaymentStep';

const baseProps = {
  summary: { fullName: 'Ada Obi', email: 'ada@example.com', phoneNumber: '+2348012345678' },
  feeNaira: 5000,
  canPayWithCard: false,
  cardDisabledReason: 'Card payment is on hold for now.',
  submitting: false,
  onPayWithCard: jest.fn(),
  onSubmitBankTransfer: jest.fn(),
  onPayLater: jest.fn(),
  onBack: jest.fn(),
  bankProof: { url: '', uploading: false, error: '' },
  onBankProofPick: jest.fn(),
};

const renderStep = (props = {}) => render(<PaymentStep {...baseProps} {...props} />);

// The pay-later option and its submit button both contain the words "pay
// later", and pay later is the default so both are on screen at once —
// anchoring at the start of the accessible name picks out the option itself.
const payLaterOption = () => screen.getByRole('button', { name: /^pay later/i });

test('offers all three ways to settle the fee', () => {
  renderStep();
  expect(screen.getByRole('button', { name: /pay now — card/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /pay now — bank transfer/i })).toBeInTheDocument();
  expect(payLaterOption()).toBeInTheDocument();
});

// Joining does not require paying, so the option that asks for nothing up
// front is the one already chosen when the step opens — a member who just
// keeps going registers without paying rather than having to find the option.
test('pay later is selected by default', () => {
  renderStep();
  expect(payLaterOption()).toHaveClass('is-selected');
  expect(screen.getByRole('button', { name: /register now, pay later/i })).toBeInTheDocument();
});

// Selecting a pay-now method must actually leave the default behind, or the
// member would be shown a card/transfer panel while pay later stayed active.
test('choosing a pay-now method deselects pay later', () => {
  renderStep();
  userEvent.click(screen.getByRole('button', { name: /pay now — bank transfer/i }));
  expect(payLaterOption()).not.toHaveClass('is-selected');
  expect(screen.queryByRole('button', { name: /register now, pay later/i })).not.toBeInTheDocument();
});

// Paystack is switched off in paymentConfig while card payments are on hold —
// the option has to be visibly unavailable rather than silently doing nothing.
test('the card option is disabled when Paystack is unavailable', () => {
  renderStep();
  expect(screen.getByRole('button', { name: /pay now — card/i })).toBeDisabled();
  expect(screen.getByText(/card payment is on hold/i)).toBeInTheDocument();
});

test('choosing pay later explains the pending tag before submitting', () => {
  const onPayLater = jest.fn();
  renderStep({ onPayLater });

  userEvent.click(payLaterOption());
  // The consequence is spelled out before the member commits, not after.
  expect(screen.getByText(/membership card and directory listing stay provisional/i))
    .toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /register now, pay later/i }));
  expect(onPayLater).toHaveBeenCalledTimes(1);
});

// The transfer can't be submitted for review until proof is attached —
// otherwise an admin gets a registration with nothing to verify.
test('bank transfer cannot be submitted without proof', () => {
  const onSubmitBankTransfer = jest.fn();
  const { rerender } = renderStep({ onSubmitBankTransfer });

  userEvent.click(screen.getByRole('button', { name: /pay now — bank transfer/i }));
  const submit = screen.getByRole('button', { name: /submit for review/i });
  expect(submit).toBeDisabled();

  rerender(
    <PaymentStep
      {...baseProps}
      onSubmitBankTransfer={onSubmitBankTransfer}
      bankProof={{ url: 'https://blob.example.com/payment-proofs/receipt.jpg', uploading: false, error: '' }}
    />
  );
  userEvent.click(screen.getByRole('button', { name: /submit for review/i }));
  expect(onSubmitBankTransfer).toHaveBeenCalledTimes(1);
});
