/**
 * @file theme/types.ts
 * @description Consolidated domain types for the app.
 *              Import from '@/theme' — never import this file directly.
 */

import React from 'react';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PageDto<T> {
  content: T[];
}

// ─── Client ───────────────────────────────────────────────────────────────────

export type ClientType  = 'buyer' | 'renter' | '';
export type FilterType  = 'all'   | 'buyer'  | 'renter';

export interface Client {
  id:               string;
  firstName:        string;
  lastName:         string;
  email:            string;
  phone?:           string;
  clientType?:      ClientType;
  toursCount?:      number;
  shortlistedCount?: number;
  offersCount?:     number;
  rejectedCount?:   number;
}

export interface AddClientPayload {
  firstName:  string;
  lastName:   string;
  email:      string;
  clientType: string;
}

// ─── Client Profile ───────────────────────────────────────────────────────────

export interface ClientHistorySummary {
  totalTours:  number;
  totalOffers: number;
}

export interface ClientHistory {
  summary?: ClientHistorySummary;
}

export interface ClientProfileStats {
  totalTours:      number;
  totalShortlists: number;
  totalOffers:     number;
}

export interface ProfileMenuItem {
  key:           string;
  label:         string;
  route:         string;
  badge?:        number;
  showStarBadge?: boolean;
  icon:          React.ReactNode;
}

// ─── Agent / API shapes ───────────────────────────────────────────────────────

export interface AgentClientApiItem {
  id:          number;
  email?:      string | null;
  phoneE164?:  string | null;
  firstName?:  string | null;
  lastName?:   string | null;
}

// ─── Property ─────────────────────────────────────────────────────────────────

export interface Property {
  id:           string;
  address:      string;
  city:         string;
  province:     string;
  postalCode:   string;
  propertyType: string;
  bedrooms:     number;
  bathrooms:    number;
  price:        number;
  imageUrl?:    string;
}

export interface SelectedProperty extends Property {
  scheduledTime:      string;
  estimatedDuration:  number;
}

// ─── Alert / Modal ────────────────────────────────────────────────────────────

export interface AlertButton {
  text:     string;
  onPress?: () => void;
  style?:   string;
}

export interface AlertModalState {
  visible:  boolean;
  title:    string;
  message:  string;
  buttons:  AlertButton[];
}
