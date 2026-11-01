// FR-POST-001 AC6 — strings of the unified create form (category picker, request / offer,
// listing-form copy). Field and option labels live in donations.marketplaceFields.ts.
export const postUnifiedCreateEn = {
  unifiedCreate: {
    categoryLabel: 'Category',
    categories: {
      items: 'Items',
      rides: 'Rides',
      food: 'Food',
      housing: 'Housing',
      time: 'Time',
    },
    request: 'Request',
    offer: 'Offer',
    cityLabel: 'City',
    pickDate: 'Pick a date and time',
    amountPlaceholder: 'Up to ₪{{max}}',
    inMinutes: { 30: 'In 30 min', 60: 'In 1 hour' },
    duration: { 30: '30 min', 60: '1 hour', 120: '2 hours', 180: '3 hours', 240: '4 hours' },
    titlePlaceholder: {
      rides: 'e.g. Ride from Lod to Tel Aviv',
      food: 'e.g. Tray of homemade pasta',
      housing: 'e.g. Spare room for the weekend',
      time: 'e.g. Help with groceries',
    },
    noPermission: {
      housing: {
        title: 'Housing posts need ID verification',
        body: 'To keep hosts and guests safe, a hosting offer or request is published only after both sides verify their ID. Verification is coming soon — meanwhile you can browse the housing world’s info and links.',
      },
      default: {
        title: 'You cannot post here right now',
        body: 'Your account cannot publish in this world yet. If you think this is a mistake, contact us from Settings.',
      },
    },
    errors: {
      titleRequired: 'Please write a title (at least 2 characters)',
      fieldRequired: 'Please fill in: {{field}}',
      cityRequired: 'Please pick a city',
      loadFailed: 'We could not load the form. Check your connection and try again.',
    },
  },
} as const;
