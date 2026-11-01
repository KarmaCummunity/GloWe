// English — ride quick publish: departure, estimated end and seats (spec 05 §5.3 step 1, D75, S46).
export const rideSchedule = {
  departure: 'Departure',
  arrival: 'Estimated end',
  arrivalPlaceholder: 'Suggested from the route',
  arrivalHint: 'Suggested from the distance — you can change it.',
  shortcut: {
    in30: 'In 30 min',
    in60: 'In 1 hour',
    tomorrow0700: 'Tomorrow 07:00',
  },
  seats: 'Free seats',
  fewerSeats: 'Fewer seats',
  moreSeats: 'More seats',
  publishAgain: 'Publish this ride again',
} as const;

// The shared date + time field (sheet actions).
export const dateTimeField = {
  done: 'Done',
  cancel: 'Cancel',
} as const;

// The rides feed on the hub (D75): offers and requests by departure, grouped by day.
export const rideFeed = {
  group: { today: 'Today', tomorrow: 'Tomorrow', later: 'Later' },
  seatsLeft: 'Free seats: {{count}}',
  full: 'No free seats',
  passengers: 'Passengers: {{count}}',
  meetingPoints: 'Pickup points: {{count}}',
  empty: 'No upcoming rides right now. You can publish a ride or a request.',
  error: "We couldn't load the rides. Pull down to try again.",
} as const;

// Saved routes (D74): follow a route and hear about new rides on it.
export const rideRoutes = {
  follow: 'Notify me about rides on this route',
  wantsLabel: 'Notify me about',
  wants: { offers: 'Ride offers', requests: 'Ride requests' },
  daysLabel: 'Which days? (none — every day)',
  weekday: { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' },
  hoursLabel: 'Which hours?',
  anyHour: 'Any hour',
  window: { morning: 'Morning (06–10)', midday: 'Midday (10–15)', evening: 'Evening (15–21)' },
  save: 'Save route',
  saved: "Route saved. We'll let you know when a matching ride is published.",
  saveError: "We couldn't save the route. Please try again.",
  mine: 'My routes',
  remove: 'Remove',
  removeError: "We couldn't remove the route. Please try again.",
} as const;
