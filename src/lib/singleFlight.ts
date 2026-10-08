/**
 * Wraps an async action so a second call made while the first is still
 * running is ignored (resolves to undefined). Prevents double submissions
 * such as taking two conversations with a double click.
 */
export function singleFlight<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R | undefined> {
  let running: Promise<R> | null = null;
  return (...args: A) => {
    if (running) return Promise.resolve(undefined);
    running = fn(...args);
    return running.finally(() => {
      running = null;
    });
  };
}
