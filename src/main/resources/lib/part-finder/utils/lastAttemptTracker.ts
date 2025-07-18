export type LastAttemptTracker = { componentPath: string | null }

// For tracing and reporting errors
export const getLastAttemptTracker = (): LastAttemptTracker => ({
  componentPath: null
})
