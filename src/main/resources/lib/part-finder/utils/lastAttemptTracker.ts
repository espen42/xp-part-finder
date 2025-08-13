import { Operation } from "/lib/part-finder/utils/plannedOperations";

export type LastAttemptTracker = { componentPath: string | null; operation: Operation | null };

// For tracing and reporting errors
export const getLastAttemptTracker = (): LastAttemptTracker => ({
  componentPath: null,
  operation: null,
});
