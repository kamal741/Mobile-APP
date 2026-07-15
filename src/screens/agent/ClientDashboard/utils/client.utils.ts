import { Client, ClientType, FilterType } from '../types/client.types';

/** Returns uppercase initials for a given first/last name. */
export function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

/** Human-readable label for a ClientType value. */
export function clientTypeLabel(type: ClientType): string {
  if (type === 'buyer')  return 'Buyer';
  if (type === 'renter') return 'Renter';
  return 'Select client type';
}

/** Human-readable label for a FilterType value. */
export function filterTypeLabel(type: FilterType): string {
  if (type === 'buyer')  return 'Buyers';
  if (type === 'renter') return 'Renters';
  return 'All Types';
}

/** Filter + search clients client-side. */
export function filterClients(
  clients: Client[],
  searchQuery: string,
  filterType: FilterType,
): Client[] {
  return clients.filter((client) => {
    const matchesSearch = `${client.firstName} ${client.lastName} ${client.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === 'all' ||
      (client.clientType && client.clientType === filterType);
    return matchesSearch && matchesType;
  });
}

/** Validate add-client form fields. Returns an error message or null. */
export function validateClientForm(
  firstName: string,
  lastName: string,
  email: string,
  clientType: ClientType,
): string | null {
  if (!firstName.trim()) return 'First name is required.';
  if (!lastName.trim())  return 'Last name is required.';
  if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
  if (!clientType) return 'Please select a client type.';
  return null;
}
