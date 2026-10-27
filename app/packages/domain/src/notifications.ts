export type NotificationCategory = 'critical' | 'social';

export type NotificationKind =
  | 'chat_message'
  | 'support_message'
  | 'system_message'
  | 'post_expiring'
  | 'mark_recipient'
  | 'unmark_recipient'
  | 'auto_removed'
  | 'follow_request'
  | 'follow_started'
  | 'follow_approved'
  | 'task_assigned'
  // FR-RIDE-013, FR-RIDE-019 — ride participant lifecycle + cascade variant.
  | 'ride_request'
  | 'ride_approved'
  | 'ride_rejected'
  | 'ride_participant_cancelled'
  | 'ride_participant_cancelled_by_owner'
  // FR-RIDE-031..033 + FR-RIDE-045 AC4 — active ride transitions.
  | 'ride_started'
  | 'ride_arrived'
  | 'ride_breakdown'
  // FR-RIDE-035 — emergency button.
  | 'ride_emergency'
  // FR-RIDE-037 — ratings prompt.
  | 'ride_rate_prompt'
  // Matching v2 (0420–0423) — automatic offer↔request suggestions + responses.
  | 'match_suggested'
  | 'match_interest'
  | 'match_accepted';

/** Payload attached to every Expo push under `data`. The client reads this on tap. */
export interface PushData {
  category: NotificationCategory;
  kind: NotificationKind;
  notification_id: string;
  /** expo-router pathname, e.g. '/chat/[id]'. */
  route?: string;
  /** route params, e.g. { id: '<chat_id>' }. */
  params?: Record<string, string>;
  /** Convenience field used by the foreground handler to detect chat-active state. */
  chat_id?: string;
}

export interface DeviceRegistration {
  readonly userId: string;
  readonly pushToken: string;
  readonly platform: 'ios' | 'android' | 'web';
}
