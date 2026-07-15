import { Property, RouteStats } from '../types';

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: '1',
    address: '123 Oak Street',
    price: '$450,000',
    beds: 3,
    baths: 2,
    distanceLabel: '2 mi from Agent Address',
    eta: '10:00',
    startTime: '10:00 A',
    viewingMin: 30,
  },
  {
    id: '2',
    address: '456 Elm Avenue',
    price: '$525,000',
    beds: 4,
    baths: 3,
    distanceLabel: '4.2 mi from previous stop',
    eta: '10:15',
    startTime: '10:15 A',
    viewingMin: 30,
    conflict: 'warning',
    conflictLabel: 'Tight buffer +5 min',
  },
  {
    id: '3',
    address: '789 Pine Road',
    price: '$385,000',
    beds: 2,
    baths: 2,
    distanceLabel: '8.3 mi total route distance',
    eta: '10:35',
    startTime: '10:35 A',
    viewingMin: 30,
    conflict: 'critical',
    conflictLabel: 'Late arrival risk',
  },
];

export const MOCK_ROUTE_STATS: RouteStats = {
  totalDistance: '12.5 mi',
  totalTime: '~45 min',
  stops: 3,
  driveTime: '45m',
  viewingTime: '90m',
  startPoint: 'Agent Address',
};

export const START_POINT_OPTIONS = [
  'Agent Address',
  'Current Location',
  'Add Address',
] as const;

export const SORT_OPTIONS = ['Distance', 'Time'] as const;

export const VIEWING_DURATIONS = [15, 30, 45, 60] as const;