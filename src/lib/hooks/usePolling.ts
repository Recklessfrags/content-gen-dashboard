import { useEffect, useRef } from "react";

type PollingTimer = ReturnType<typeof setInterval>;
type SetPollingInterval = (callback: () => void, intervalMs: number) => PollingTimer;
type ClearPollingInterval = (timer: PollingTimer) => void;

type PollingSchedulerOptions = {
  intervalMs: number;
  run: () => Promise<void> | void;
  setIntervalFn?: SetPollingInterval;
  clearIntervalFn?: ClearPollingInterval;
};

export function createPollingScheduler({
  intervalMs,
  run,
  setIntervalFn = setInterval as SetPollingInterval,
  clearIntervalFn = clearInterval as ClearPollingInterval,
}: PollingSchedulerOptions) {
  let active = false;
  let inFlight = false;
  let interval: PollingTimer | null = null;

  const tick = () => {
    if (inFlight) return;
    inFlight = true;
    void Promise.resolve(run()).finally(() => {
      inFlight = false;
    });
  };

  const stop = () => {
    active = false;
    if (interval !== null) {
      clearIntervalFn(interval);
      interval = null;
    }
  };

  const start = () => {
    if (active) return;
    active = true;
    tick();
    interval = setIntervalFn(tick, intervalMs);
  };

  return {
    setActive(nextActive: boolean) {
      if (nextActive) start();
      else stop();
    },
    tick,
    cleanup: stop,
  };
}

export function usePolling(
  fn: () => Promise<void> | void,
  { enabled, intervalMs }: { enabled: boolean; intervalMs: number },
) {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const scheduler = createPollingScheduler({
      intervalMs,
      run: () => fnRef.current(),
    });
    const syncActive = () => {
      scheduler.setActive(enabled && document.visibilityState !== "hidden");
    };

    syncActive();
    document.addEventListener("visibilitychange", syncActive);

    return () => {
      document.removeEventListener("visibilitychange", syncActive);
      scheduler.cleanup();
    };
  }, [enabled, intervalMs]);
}
