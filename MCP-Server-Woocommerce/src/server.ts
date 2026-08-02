import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { bootstrapTenants } from './bootstrap';
import { createLogger } from './utils/logger';
import {
  registerTenant,
  updateTenant,
  deleteTenant,
  executeTenant,
  statusTenant,
  getTenantById,
  getTenantCount,
  registerTenantSchema,
  RegisterTenantInput,
  ExecuteTenantInput,
} from './api/mcpApis';

const app = express();
const log = createLogger('api');

app.use(express.json());

// PORT es la variable que la mayoría de plataformas (DigitalOcean App
// Platform, Heroku, Render, etc.) inyectan solas para decirle a la app en
// qué puerto tiene que escuchar. Antes este servidor solo leía API_PORT,
// una variable propia — funcionaba, pero obligaba a configurarla a mano en
// cada plataforma nueva para que coincidiera. Ahora PORT tiene prioridad
// si la plataforma la define; si no (ej. corriendo local con Docker), cae
// a API_PORT como antes, y por último al 3001 de siempre. No rompe nada
// de lo que ya tenías configurado.
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
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
 * protección. Lo usa la plataforma donde corra esto (DigitalOcean App
 * Platform, etc.) para saber si el proceso está vivo, sin necesitar el
 * API_TOKEN.
 *
 * tenantsLoaded es solo un número (nunca los datos de los tenants) — de
 * un vistazo confirma si bootstrapTenants() cargó algo al arrancar, sin
 * tener que ir a mirar logs.
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, tenantsLoaded: getTenantCount() });
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
 * POST /mcp/register
 * Register a new multi-tenant MCP instance with credentials.
 * The backend controls the tenantId; MCP only stores it in memory.
 * Credentials are used per-request and never persisted to disk.
 *
 * Request body: { tenantId: string, siteUrl?: string, consumerKey?: string, consumerSecret?: string }
 * Response: { ok: boolean, message: string, tenantId?: string }
 */
app.post('/mcp/register', (req: Request, res: Response) => {
  try {
    const input = registerTenantSchema.parse(req.body ?? {});

    if (!input.tenantId || input.tenantId.trim().length === 0) {
      log.warn('POST /mcp/register rechazado: tenantId vacío o ausente');
      res.status(400).json({
        ok: false,
        message: 'tenantId is required and must not be empty',
      });
      return;
    }

    if (!input.siteUrl) {
      log.warn(`POST /mcp/register rechazado (tenant=${input.tenantId}): falta siteUrl`);
      res.status(400).json({
        ok: false,
        message: 'siteUrl is required',
      });
      return;
    }

    if (!input.consumerKey && !input.consumerSecret) {
      log.warn(`POST /mcp/register rechazado (tenant=${input.tenantId}): faltan credenciales`);
      res.status(400).json({
        ok: false,
        message: 'Either consumerKey or consumerSecret is required',
      });
      return;
    }

    const result = registerTenant(input);
    if (!result.ok) {
      log.warn(`POST /mcp/register falló (tenant=${input.tenantId}): ${result.message}`);
    } else {
      log.info(`Tenant '${input.tenantId}' registrado correctamente`);
    }
    res.status(201).json(result);
  } catch (error: any) {
    log.error('POST /mcp/register lanzó una excepción', error?.message ?? error);
    res.status(400).json({
      ok: false,
      message: error?.message || 'Invalid request body',
    });
  }
});

/**
 * PUT /mcp/tenant/:id
 * Update existing tenant credentials. Does not change the tenant ID.
 * Used when WooCommerce site credentials change.
 *
 * Request body: { siteUrl?: string, consumerKey?: string, consumerSecret?: string }
 * Response: { ok: boolean, message: string, tenant?: TenantRecord }
 */
app.put('/mcp/tenant/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id.trim().length === 0) {
      log.warn('PUT /mcp/tenant/:id rechazado: id vacío o ausente');
      res.status(400).json({
        ok: false,
        message: 'Tenant ID is required',
      });
      return;
    }

    // For updates, tenantId should not be in body; it's in the URL param
    const updateSchema = registerTenantSchema.omit({ tenantId: true });
    const input = updateSchema.parse(req.body ?? {});

    const result = updateTenant({
      id,
      data: {
        tenantId: id,
        ...input,
      } as RegisterTenantInput,
    });

    if (!result.ok) {
      log.warn(`PUT /mcp/tenant/${id} falló: ${result.message}`);
      res.status(404).json(result);
      return;
    }

    log.info(`Tenant '${id}' actualizado correctamente`);
    res.status(200).json(result);
  } catch (error: any) {
    log.error(`PUT /mcp/tenant/${req.params.id} lanzó una excepción`, error?.message ?? error);
    res.status(400).json({
      ok: false,
      message: error?.message || 'Invalid request body',
    });
  }
});

/**
 * GET /mcp/tenant/:id/status
 * Check if a tenant is registered and retrieve its current credentials.
 *
 * Response: { ok: boolean, message: string, tenant?: TenantRecord }
 */
app.get('/mcp/tenant/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id.trim().length === 0) {
      log.warn('GET /mcp/tenant/:id/status rechazado: id vacío o ausente');
      res.status(400).json({
        ok: false,
        message: 'Tenant ID is required',
      });
      return;
    }

    const tenant = getTenantById(id);

    if (!tenant) {
      log.warn(`GET /mcp/tenant/${id}/status: tenant no encontrado`);
      res.status(404).json({
        ok: false,
        message: 'Tenant not found',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Tenant found',
      tenant,
    });
  } catch (error: any) {
    log.error(`GET /mcp/tenant/${req.params.id}/status lanzó una excepción`, error?.message ?? error);
    res.status(500).json({
      ok: false,
      message: error?.message || 'Internal server error',
    });
  }
});

/**
 * DELETE /mcp/tenant/:id
 * Deactivate and remove a tenant from the in-memory registry.
 * Called when the backend deactivates a tenant.
 *
 * Response: { ok: boolean, message: string }
 */
app.delete('/mcp/tenant/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id.trim().length === 0) {
      log.warn('DELETE /mcp/tenant/:id rechazado: id vacío o ausente');
      res.status(400).json({
        ok: false,
        message: 'Tenant ID is required',
      });
      return;
    }

    const result = deleteTenant(id);

    if (!result.ok) {
      log.warn(`DELETE /mcp/tenant/${id} falló: ${result.message}`);
      res.status(404).json(result);
      return;
    }

    log.info(`Tenant '${id}' eliminado correctamente`);
    res.status(200).json(result);
  } catch (error: any) {
    log.error(`DELETE /mcp/tenant/${req.params.id} lanzó una excepción`, error?.message ?? error);
    res.status(500).json({
      ok: false,
      message: error?.message || 'Internal server error',
    });
  }
});

/**
 * POST /mcp/execute
 * Execute a tool for a specific tenant.
 * Loads credentials from tenant registry, executes tool, discards credentials.
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

// Arranque: carga tenants desde el backend y luego escucha peticiones
(async () => {
  await bootstrapTenants();
  app.listen(PORT, () => {
    console.log(`HTTP API server listening on http://localhost:${PORT}`);
  });
})();
