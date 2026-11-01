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
