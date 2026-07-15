import type { CreateOfferAmountErrors } from '../types/createOffer.types';
import { OFFER_STRINGS } from '../constants/createOffer.constants';

export function validateOfferAmount(
  amount: string,
  notes: string,
): CreateOfferAmountErrors {
  const errors: CreateOfferAmountErrors = {};
  const parsed = Number(amount.trim());

  if (!amount.trim()) {
    errors.amount = 'Offer amount is required.';
  } else if (isNaN(parsed) || parsed <= 0) {
    errors.amount = 'Enter a valid amount greater than 0.';
  } else if (parsed > 1_000_000_000) {
    errors.amount = 'Amount exceeds the maximum allowed.';
  }

  if (notes.length > OFFER_STRINGS.NOTES_MAX) {
    errors.notes = `Notes must be under ${OFFER_STRINGS.NOTES_MAX} characters.`;
  }

  return errors;
}

export function hasErrors(e: CreateOfferAmountErrors): boolean {
  return Object.keys(e).length > 0;
}

export function formatIndianPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  return value.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}
