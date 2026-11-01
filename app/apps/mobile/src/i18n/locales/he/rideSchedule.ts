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

// The rides feed on the hub (D75): offers and requests by departure, grouped by day.
export const rideFeed = {
  group: { today: 'היום', tomorrow: 'מחר', later: 'בהמשך' },
  seatsLeft: 'מקומות פנויים: {{count}}',
  full: 'אין מקומות פנויים',
  passengers: 'נוסעים: {{count}}',
  meetingPoints: 'נקודות איסוף: {{count}}',
  empty: 'אין כרגע נסיעות קרובות. אפשר לפרסם נסיעה או בקשה.',
  error: 'לא הצלחנו לטעון את הנסיעות. משכו למטה כדי לנסות שוב.',
} as const;
