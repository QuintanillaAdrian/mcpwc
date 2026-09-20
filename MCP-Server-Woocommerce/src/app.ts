import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createLogger } from './utils/logger';
import { executeTenant, ExecuteTenantInput } from './api/mcpApis';

// La app de Express en sí, sin arrancar ningún servidor — la usan tanto
// server.ts (desarrollo local, con app.listen()) como lambda.ts (producción,
// envuelta con serverless-http), mismo criterio que chatbot-backend/src/app.ts.
const app = express();
const log = createLogger('api');

app.use(express.json());

const API_TOKEN = process.env.API_TOKEN || 'default-token-change-in-production';

// Campos que nunca deben salir en texto plano en los logs
const SENSITIVE_FIELDS = new Set(['consumerKey', 'consumerSecret', 'password', 'token']);

function redactBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_FIELDS.has(key)) {
      clone[key] = clone[key] ? '***redacted***' : clone[key];
    }
  }
  return clone;
}

// Log de entrada/salida de cada request, con duración y status code
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  log.info(`--> ${req.method} ${req.originalUrl}`, {
    headers: {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      authorization: req.headers.authorization ? '***present***' : undefined,
    },
    body: redactBody(req.body),
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const line = `<-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`;
    if (res.statusCode >= 500) {
      log.error(line);
    } else if (res.statusCode >= 400) {
      log.warn(line);
    } else {
      log.info(line);
    }
  });

  next();
});

/**
 * GET /health
 * Chequeo de salud SIN autenticación — se registra antes de
 * `app.use(validateBearerToken)` a propósito, para quedar fuera de esa
 * protección. Lo usa la plataforma donde corra esto para saber si el
 * proceso está vivo, sin necesitar el API_TOKEN.
 *
 * Ya no reporta un conteo de tenants: al no haber Map en memoria (las
 * credenciales se leen directo de DynamoDB en cada /mcp/execute, ver
 * tenantCredentials.ts), no hay nada que "estar cargado" acá.
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

// Middleware para validar Bearer token
const validateBearerToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    log.warn(`Auth rechazado en ${req.method} ${req.originalUrl}: falta header Authorization`);
    res.status(401).json({
      ok: false,
      message: 'Missing Authorization header',
    });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    log.warn(`Auth rechazado en ${req.method} ${req.originalUrl}: formato de Authorization inválido`);
    res.status(401).json({
      ok: false,
      message: 'Invalid Authorization format. Use: Bearer <token>',
    });
    return;
  }

  if (token !== API_TOKEN) {
    log.warn(`Auth rechazado en ${req.method} ${req.originalUrl}: token inválido`);
    res.status(403).json({
      ok: false,
      message: 'Invalid token',
    });
    return;
  }

  next();
};

// Aplicar validación a todas las rutas protegidas
app.use(validateBearerToken);

/**
 * POST /mcp/execute
 * Execute a tool for a specific tenant.
 * Lee las credenciales de WooCommerce de ese tenant directo de DynamoDB
 * (ver tenantCredentials.ts), ejecuta la tool, y las descarta al terminar.
 *
 * Request body: { tenantId: string, toolName: string, toolArgs: Record<string, any> }
 * Response: { ok: boolean, message: string, result?: any, error?: string }
 */
app.post('/mcp/execute', async (req: Request, res: Response) => {
  try {
    const { tenantId, toolName, toolArgs } = req.body ?? {};

    if (!tenantId || tenantId.trim().length === 0) {
      log.warn('POST /mcp/execute rechazado: tenantId es requerido');
      res.status(400).json({
        ok: false,
        message: 'tenantId is required',
      });
      return;
    }

    if (!toolName || toolName.trim().length === 0) {
      log.warn(`POST /mcp/execute rechazado (tenant=${tenantId}): toolName es requerido`);
      res.status(400).json({
        ok: false,
        message: 'toolName is required',
      });
      return;
    }

    if (!toolArgs || typeof toolArgs !== 'object') {
      log.warn(`POST /mcp/execute rechazado (tenant=${tenantId}, tool=${toolName}): toolArgs debe ser un objeto`);
      res.status(400).json({
        ok: false,
        message: 'toolArgs must be an object',
      });
      return;
    }

    const input: ExecuteTenantInput = {
      tenantId,
      toolName,
      toolArgs,
    };

    log.info(`Ejecutando tool='${toolName}' para tenant='${tenantId}'`, toolArgs);

    const result = await executeTenant(input);

    if (!result.ok) {
      log.error(`Tool '${toolName}' falló para tenant '${tenantId}': ${result.error ?? result.message}`);
      res.status(400).json(result);
      return;
    }

    log.info(`Tool '${toolName}' ejecutada correctamente para tenant '${tenantId}'`);
    res.status(200).json(result);
  } catch (error: any) {
    log.error('POST /mcp/execute lanzó una excepción no controlada', error?.stack ?? error?.message ?? error);
    res.status(500).json({
      ok: false,
      message: error?.message || 'Internal server error',
    });
  }
});

export default app;
