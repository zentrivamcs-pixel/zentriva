// Single source of truth for registration payment configuration, read by
// both the registration form and the admin Settings page so the two never
// drift out of sync.

// Card payments are on hold while Paystack is being finalized — bank
// transfer is the only registration path for now. Flip back to true (and
// nothing else) once Paystack is ready to go live again.
export const PAYSTACK_ENABLED = false;

// Bank details shown for the "Pay by Bank Transfer" option.
export const BANK_TRANSFER_DETAILS = {
  bankName: 'Moniepoint',
  accountNumber: '5979635683',
  accountName: "Kafi's Fks Enterprise",
};
