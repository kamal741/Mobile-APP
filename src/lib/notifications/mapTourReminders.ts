import { queryClient } from '@/lib/queryClient';
import { fromZonedTime } from 'date-fns-tz';
import { scheduleTourNotification } from './tourReminder';

const AGENT_TOURS_QUERY_KEY = ['/api/agent/v1/agent/tours'];
const CLIENT_TOURS_QUERY_KEY = ['/api/client/v1/client/tours'];
const SOURCE_TIME_ZONE = 'America/Toronto'; // matches useTourReminders.ts convention
const MAX_REMINDERS = 5; // only schedule locally for the nearest N upcoming tours

interface TourRecord {
  id: string;
  clientDisplayName?: string; // present on agent tours, absent on client tours
  startTime: string;
  status: string;
}

function parseTourStartTime(startTime: string): Date {
  const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(startTime);
  return hasOffset ? new Date(startTime) : fromZonedTime(startTime, SOURCE_TIME_ZONE);
}

function getToursFromCache(): TourRecord[] | undefined {
  return (
    queryClient.getQueryData<TourRecord[]>(AGENT_TOURS_QUERY_KEY) ??
    queryClient.getQueryData<TourRecord[]>(CLIENT_TOURS_QUERY_KEY)
  );
}

function buildReminderLabel(tour: TourRecord): string {
  // Agent tours include the client's name; client tours don't (and don't need to).
  return tour.clientDisplayName
    ? `Your tour with ${tour.clientDisplayName} starts in 30 minutes`
    : `Your tour starts in 30 minutes`;
}

export async function scheduleClosestTourReminder() {
  const tours = getToursFromCache();

  if (!tours || tours.length === 0) {
    console.log('[mapTourReminders] No tours in cache yet');
    return;
  }

  const now = Date.now();

  const upcomingScheduled = tours
    .filter((tour) => tour.status === 'scheduled')
    .map((tour) => ({ ...tour, parsedStart: parseTourStartTime(tour.startTime) }))
    .filter((tour) => !isNaN(tour.parsedStart.getTime()))
    .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())
    .find((tour) => tour.parsedStart.getTime() - 30 * 60 * 1000 > now);

  if (!upcomingScheduled) {
    console.log('[mapTourReminders] No upcoming scheduled tour to remind about');
    return;
  }

  const reminderDate = new Date(upcomingScheduled.parsedStart.getTime() - 30 * 60 * 1000);

  console.log(
    '[mapTourReminders] Closest tour:',
    upcomingScheduled.id,
    'startTime:',
    upcomingScheduled.parsedStart.toString()
  );

  await scheduleTourNotification(
    reminderDate,
    buildReminderLabel(upcomingScheduled),
    upcomingScheduled.id
  );
}

export async function scheduleAllTourReminders() {
  const tours = getToursFromCache();

  if (!tours || tours.length === 0) {
    console.log('[mapTourReminders] No tours in cache yet');
    return;
  }

  const now = Date.now();

  const upcomingScheduled = tours
    .filter((tour) => tour.status === 'scheduled')
    .map((tour) => ({ ...tour, parsedStart: parseTourStartTime(tour.startTime) }))
    .filter((tour) => !isNaN(tour.parsedStart.getTime()))
    .filter((tour) => tour.parsedStart.getTime() - 30 * 60 * 1000 > now)
    .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())
    .slice(0, MAX_REMINDERS);

  if (upcomingScheduled.length === 0) {
    console.log('[mapTourReminders] No upcoming scheduled tours to remind about');
    return;
  }

  console.log(`[mapTourReminders] Scheduling reminders for ${upcomingScheduled.length} upcoming tours (capped at ${MAX_REMINDERS})`);

  for (const tour of upcomingScheduled) {
    const reminderDate = new Date(tour.parsedStart.getTime() - 30 * 60 * 1000);
    await scheduleTourNotification(reminderDate, buildReminderLabel(tour), tour.id);
  }
}












// import { queryClient } from '@/lib/queryClient';
// import { fromZonedTime } from 'date-fns-tz';
// import { scheduleTourNotification } from './tourReminder';

// const TOURS_QUERY_KEY = ['/api/agent/v1/agent/tours'];
// const SOURCE_TIME_ZONE = 'America/Toronto'; // matches useTourReminders.ts convention
// const MAX_REMINDERS = 5; // only schedule locally for the nearest N upcoming tours

// interface AgentTour {
//   id: string;
//   clientDisplayName: string;
//   startTime: string;
//   status: string;
// }

// function parseTourStartTime(startTime: string): Date {
//   const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(startTime);
//   return hasOffset ? new Date(startTime) : fromZonedTime(startTime, SOURCE_TIME_ZONE);
// }

// export async function scheduleClosestTourReminder() {
//   const tours = queryClient.getQueryData<AgentTour[]>(TOURS_QUERY_KEY);

//   if (!tours || tours.length === 0) {
//     console.log('[mapTourReminders] No tours in cache yet');
//     return;
//   }

//   const now = Date.now();

//   const upcomingScheduled = tours
//     .filter((tour) => tour.status === 'scheduled')
//     .map((tour) => ({ ...tour, parsedStart: parseTourStartTime(tour.startTime) }))
//     .filter((tour) => !isNaN(tour.parsedStart.getTime()))
//     .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())
//     .find((tour) => tour.parsedStart.getTime() - 30 * 60 * 1000 > now);

//   if (!upcomingScheduled) {
//     console.log('[mapTourReminders] No upcoming scheduled tour to remind about');
//     return;
//   }

//   const reminderDate = new Date(upcomingScheduled.parsedStart.getTime() - 30 * 60 * 1000);

//   console.log(
//     '[mapTourReminders] Closest tour:',
//     upcomingScheduled.id,
//     upcomingScheduled.clientDisplayName,
//     'startTime:',
//     upcomingScheduled.parsedStart.toString()
//   );

//   await scheduleTourNotification(
//     reminderDate,
//     `Your tour with ${upcomingScheduled.clientDisplayName} starts in 30 minutes`,
//     upcomingScheduled.id
//   );
// }

// // Schedules a reminder for each of the nearest MAX_REMINDERS upcoming scheduled tours.
// export async function scheduleAllTourReminders() {
//   const tours = queryClient.getQueryData<AgentTour[]>(TOURS_QUERY_KEY);

//   if (!tours || tours.length === 0) {
//     console.log('[mapTourReminders] No tours in cache yet');
//     return;
//   }

//   const now = Date.now();

//   const upcomingScheduled = tours
//     .filter((tour) => tour.status === 'scheduled')
//     .map((tour) => ({ ...tour, parsedStart: parseTourStartTime(tour.startTime) }))
//     .filter((tour) => !isNaN(tour.parsedStart.getTime()))
//     .filter((tour) => tour.parsedStart.getTime() - 30 * 60 * 1000 > now)
//     .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())
//     .slice(0, MAX_REMINDERS); // only the nearest few — see reliability note

//   if (upcomingScheduled.length === 0) {
//     console.log('[mapTourReminders] No upcoming scheduled tours to remind about');
//     return;
//   }

//   console.log(`[mapTourReminders] Scheduling reminders for ${upcomingScheduled.length} upcoming tours (capped at ${MAX_REMINDERS})`);

//   for (const tour of upcomingScheduled) {
//     const reminderDate = new Date(tour.parsedStart.getTime() - 30 * 60 * 1000);

//     await scheduleTourNotification(
//       reminderDate,
//       `Your tour with ${tour.clientDisplayName} starts in 30 minutes`,
//       tour.id
//     );
//   }
// }
