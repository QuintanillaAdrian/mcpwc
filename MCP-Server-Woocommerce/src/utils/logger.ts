/**
 * Logger simple con timestamp y prefijo por módulo.
 * No persiste a archivo; escribe a stdout/stderr para que la plataforma
 * de hosting (o `docker logs`) pueda capturarlo.
 */
function timestamp(): string {
  return new Date().toISOString();
}

function format(scope: string, message: string): string {
  return `[${timestamp()}] [${scope}] ${message}`;
}

export function createLogger(scope: string) {
  return {
    info(message: string, meta?: unknown) {
      console.log(format(scope, message), meta ?? '');
    },
    warn(message: string, meta?: unknown) {
      console.warn(format(scope, message), meta ?? '');
    },
    error(message: string, meta?: unknown) {
      console.error(format(scope, message), meta ?? '');
    },
  };
}
