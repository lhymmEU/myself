export const DASHBOARD_EVENTS = {
  WISH_CREATED: "dashboard:wish_created",
  WISH_UPDATED: "dashboard:wish_updated",
  WISH_DELETED: "dashboard:wish_deleted",
  /** A user verb (confirm/contradict/expand/archive/dismiss/pin/unpin) was recorded. */
  CARD_VERB: "dashboard:card_verb",
  /** Sources changed somewhere — the bento should re-ingest. */
  INGEST_NEEDED: "dashboard:ingest_needed",
} as const;
