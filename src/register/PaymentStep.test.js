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

test('offers all three ways to settle the fee', () => {
  renderStep();
  expect(screen.getByRole('button', { name: /pay now — card/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /pay now — bank transfer/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /pay later/i })).toBeInTheDocument();
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

  userEvent.click(screen.getByRole('button', { name: /pay later/i }));
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
