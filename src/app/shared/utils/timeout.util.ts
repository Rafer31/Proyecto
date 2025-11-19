export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  timeoutMessage: string = 'La operación está tomando más tiempo del esperado'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(timeoutMessage)), timeoutMs)
    ),
  ]);
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError || error?.name === 'TimeoutError';
}

export function isNetworkError(error: any): boolean {
  if (isTimeoutError(error)) return true;

  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    error?.name === 'NetworkError' ||
    error?.code === 'NETWORK_ERROR'
  );
}
