import { describe, expect, it, vi } from "vitest";
import { createPollingScheduler } from "@/lib/hooks/usePolling";

describe("createPollingScheduler", () => {
  it("fires immediately on activation and starts one interval", async () => {
    const run = vi.fn();
    const setIntervalFn = vi.fn((callback: () => void) => {
      return 7 as unknown as ReturnType<typeof setInterval>;
    });
    const clearIntervalFn = vi.fn();
    const scheduler = createPollingScheduler({
      intervalMs: 5000,
      run,
      setIntervalFn,
      clearIntervalFn,
    });

    scheduler.setActive(true);
    scheduler.setActive(true);
    await Promise.resolve();
    setIntervalFn.mock.calls[0][0]();

    expect(run).toHaveBeenCalledTimes(2);
    expect(setIntervalFn).toHaveBeenCalledTimes(1);
    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  it("skips ticks while a previous poll is still in flight", async () => {
    let resolvePoll = () => {};
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePoll = resolve;
        }),
    );
    const scheduler = createPollingScheduler({
      intervalMs: 5000,
      run,
      setIntervalFn: vi.fn(() => 1 as unknown as ReturnType<typeof setInterval>),
      clearIntervalFn: vi.fn(),
    });

    scheduler.setActive(true);
    scheduler.tick();
    scheduler.tick();
    expect(run).toHaveBeenCalledTimes(1);

    resolvePoll?.();
    await Promise.resolve();
    scheduler.tick();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("clears the interval on deactivation and cleanup", () => {
    const clearIntervalFn = vi.fn();
    const scheduler = createPollingScheduler({
      intervalMs: 5000,
      run: vi.fn(),
      setIntervalFn: vi.fn(() => 42 as unknown as ReturnType<typeof setInterval>),
      clearIntervalFn,
    });

    scheduler.setActive(true);
    scheduler.setActive(false);
    scheduler.cleanup();

    expect(clearIntervalFn).toHaveBeenCalledTimes(1);
    expect(clearIntervalFn).toHaveBeenCalledWith(42);
  });
});
