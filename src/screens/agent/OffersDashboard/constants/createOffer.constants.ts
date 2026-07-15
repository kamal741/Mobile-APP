import type { CreateOfferStep } from '../types/createOffer.types';

export const OFFER_STEP_LABELS: Record<CreateOfferStep, { icon: string; title: string; subtitle: string }> = {
  1: { icon: '👤', title: 'Select Client',   subtitle: 'Choose the client for this offer'       },
  2: { icon: '🏠', title: 'Select Property', subtitle: 'Pick the property to make an offer on'  },
  3: { icon: '💰', title: 'Offer Price',     subtitle: 'Set the offer amount and add notes'      },
  4: { icon: '✅', title: 'Review & Submit', subtitle: 'Confirm all details before submitting'   },
};

export const OFFER_STRINGS = {
  SCREEN_TITLE:     'Create Offer',
  CANCEL:           'Cancel',
  NEXT:             'Next →',
  BACK:             '← Back',
  SUBMIT:           'Submit Offer',
  SUBMITTING:       'Submitting…',
  SUCCESS_TITLE:    'Offer Created',
  SUCCESS_MSG:      'Your offer has been created successfully.',
  CONFIRM_TITLE:    'Confirm Offer',
  CONFIRM_MSG:      'Are you sure you want to create this offer?',
  OKAY:             'Okay',
  LABEL_AMOUNT:     'Offer Amount ($)',
  LABEL_NOTES:      'Notes (optional)',
  PLACEHOLDER_AMT:  'e.g. 5000000',
  PLACEHOLDER_NOTE: 'Add any notes for this offer…',
  SEARCH_CLIENT:    'Search clients…',
  SEARCH_PROPERTY:  'Search by address, city, or type…',
  NO_CLIENTS:       'No clients found',
  NO_PROPERTIES:    'No properties found',
  NOTES_MAX:        500,
} as const;

export const TOTAL_STEPS = 4;
