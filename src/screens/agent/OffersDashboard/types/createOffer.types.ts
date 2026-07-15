// ─── CreateOffer Multi-Step Types ───────────────────────────────────────────

import type { ClientHistoryProperty } from '../../../../lib/offersApi';

export type { ClientHistoryProperty };

export interface OfferClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  clientType?: string;
}

// OfferProperty kept in case it's used elsewhere in the app,
// but CreateOfferFormState now uses ClientHistoryProperty instead.
export interface OfferProperty {
  id: number;
  address: string;
  city: string;
  province?: string;
  price: number | null;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
}

export interface CreateOfferFormState {
  selectedClient:   OfferClient | null;
  selectedProperty: ClientHistoryProperty | null; // ← was OfferProperty | null
  amount:           string;
  notes:            string;
}

export interface CreateOfferAmountErrors {
  amount?: string;
  notes?: string;
}

export type CreateOfferStep = 1 | 2 | 3 | 4;

export const OFFER_STEPS: { id: CreateOfferStep; title: string }[] = [
  { id: 1, title: 'Client' },
  { id: 2, title: 'Property' },
  { id: 3, title: 'Price' },
  { id: 4, title: 'Review' },
];


