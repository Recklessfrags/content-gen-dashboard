type RunsHubStatusInput = {
  jobsError: string | null;
  jobsLoading: boolean;
  stepHistoryError: string | null;
  stepHistoryLoading: boolean;
  stepHistoryLoaded: boolean;
};

type RunsHubStatus = {
  error: string | null;
  stepHistoryError: string | null;
  loading: boolean;
};

export function runsHubStatus({
  jobsError,
  jobsLoading,
  stepHistoryError,
  stepHistoryLoading,
  stepHistoryLoaded,
}: RunsHubStatusInput): RunsHubStatus {
  return {
    error: jobsError,
    stepHistoryError,
    loading: jobsLoading || (stepHistoryLoading && !stepHistoryLoaded),
  };
}
