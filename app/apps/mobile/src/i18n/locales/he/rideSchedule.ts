// Hebrew — ride quick publish: departure, estimated end and seats (spec 05 §5.3 step 1, D75, S46).
export const rideSchedule = {
  departure: 'שעת יציאה',
  arrival: 'סיום משוער',
  arrivalPlaceholder: 'יוצע לפי המסלול',
  arrivalHint: 'הצעה לפי המרחק — אפשר לשנות.',
  shortcut: {
    in30: 'בעוד חצי שעה',
    in60: 'בעוד שעה',
    tomorrow0700: 'מחר ב-07:00',
  },
  seats: 'מקומות פנויים',
  fewerSeats: 'פחות מקומות',
  moreSeats: 'יותר מקומות',
  publishAgain: 'פרסום הנסיעה שוב',
} as const;

// The shared date + time field (sheet actions).
export const dateTimeField = {
  done: 'אישור',
  cancel: 'ביטול',
} as const;
