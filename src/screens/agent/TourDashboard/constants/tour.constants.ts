export const TOUR_STEPS = [
  { id: 1, title: 'Client',     description: 'Select a client'   },
  { id: 2, title: 'Properties', description: 'Choose properties' },
  { id: 3, title: 'Schedule',   description: 'Date & time'       },
  { id: 4, title: 'Review',     description: 'Confirm & create'  },
] as const;

export const DEFAULT_PROPERTY_DURATION = 30;
export const DEFAULT_START_TIME = '09:00';
export const CLIENT_PAGE_SIZE = 200;
