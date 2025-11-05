/**
 * Ejecuta una promesa con un timeout. Si la promesa no se resuelve
 * dentro del tiempo especificado, se rechaza con un TimeoutError.
 *
 * @param promise - La promesa a ejecutar
 * @param timeoutMs - Tiempo máximo de espera en milisegundos (default: 15000ms = 15s)
 * @param timeoutMessage - Mensaje de error personalizado
 * @returns La promesa con timeout aplicado
 */
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

/**
 * Error personalizado para timeouts
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Verifica si un error es un TimeoutError
 */
export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError || error?.name === 'TimeoutError';
}

/**
 * Verifica si un error es relacionado a la red/conexión
 */
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
