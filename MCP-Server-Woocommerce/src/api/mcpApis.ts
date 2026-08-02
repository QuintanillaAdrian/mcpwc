import { z } from 'zod';
import { tenantContext } from '../tenantContext';
import { getToolFunction } from '../tools/toolRegistry';
import { fetchTenant } from '../bootstrap';
import { createLogger } from '../utils/logger';

const log = createLogger('mcpApis');

export const registerRoute = {
  method: 'POST' as const,
  path: '/mcp/register' as const,
};

export const updateTenantRoute = {
  method: 'PUT' as const,
  path: '/mcp/tenant/:id' as const,
};

export const registerTenantSchema = z.object({
  tenantId: z.string().min(1),
  siteUrl: z.string().optional(),
  consumerKey: z.string().optional(),
  consumerSecret: z.string().optional(),
});

export type RegisterTenantInput = z.infer<typeof registerTenantSchema>;

export type RegisterTenantResult = {
  ok: boolean;
  message: string;
  tenantId?: string;
};

export type UpdateTenantInput = {
  id: string;
  data: RegisterTenantInput;
};

export type UpdateTenantResult = {
  ok: boolean;
  message: string;
  tenant?: TenantRecord;
};

export type TenantRecord = RegisterTenantInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type DeleteTenantResult = {
  ok: boolean;
  message: string;
};

export type ExecuteTenantInput = {
  tenantId: string;
  toolName: string;
  toolArgs: Record<string, any>;
};

export type ExecuteTenantResult = {
  ok: boolean;
  message: string;
  result?: any;
  error?: string;
};

/**
 * In-memory tenant registry. Acts as a transient cache.
 * Credentials are loaded, used per-request, and discarded.
 * NOT a persistent data store.
 */
const tenantStore = new Map<string, TenantRecord>();

export function getTenantById(id: string): TenantRecord | null {
  const tenant = tenantStore.get(id);
  return tenant ? { ...tenant } : null;
}

/**
 * Cantidad de tenants cargados en memoria ahora mismo — solo el número,
 * nunca los datos. Pensado para la ruta /health de server.ts: sirve para
 * confirmar de un vistazo si bootstrapTenants() cargó algo al arrancar,
 * sin exponer credenciales ni tener que ir a revisar logs.
 */
export function getTenantCount(): number {
  return tenantStore.size;
}

export function registerTenant(input: RegisterTenantInput): RegisterTenantResult {
  const now = new Date().toISOString();
  const tenantId = input.tenantId;

  // Prevent duplicate registration
  if (tenantStore.has(tenantId)) {
    return {
      ok: false,
      message: `Tenant ${tenantId} already registered`,
    };
  }

  tenantStore.set(tenantId, {
    id: tenantId,
    ...input,
    createdAt: now,
    updatedAt: now,
  });

  return {
    ok: true,
    message: 'Tenant registered successfully',
    tenantId,
  };
}

export function updateTenant(input: UpdateTenantInput): UpdateTenantResult {
  const current = tenantStore.get(input.id);

  if (!current) {
    return {
      ok: false,
      message: 'Tenant not found',
    };
  }

  const updated: TenantRecord = {
    ...current,
    ...input.data,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };

  tenantStore.set(updated.id, updated);

  return {
    ok: true,
    message: 'Tenant updated successfully',
    tenant: { ...updated },
  };
}

/**
 * Delete a tenant from the in-memory registry.
 * Used when the backend deactivates a tenant.
 */
export function deleteTenant(tenantId: string): DeleteTenantResult {
  if (!tenantStore.has(tenantId)) {
    return {
      ok: false,
      message: 'Tenant not found',
    };
  }

  tenantStore.delete(tenantId);

  return {
    ok: true,
    message: 'Tenant deleted successfully',
  };
}

/**
 * Execute a tool for a specific tenant.
 * Wraps execution in AsyncLocalStorage context so getAxios() returns a
 * tenant-isolated axios instance, preventing cross-tenant credential leakage.
 *
 * @param input - { tenantId, toolName, toolArgs }
 * @returns - { ok, message, result or error }
 */
export async function executeTenant(input: ExecuteTenantInput): Promise<ExecuteTenantResult> {
  let tenant = tenantStore.get(input.tenantId);

  // Lazy-load: si no está en memoria, intenta cargarlo desde el backend
  if (!tenant) {
    log.info(`Tenant '${input.tenantId}' no está en memoria, intentando lazy-load desde el backend`);
    tenant = await fetchTenant(input.tenantId) ?? undefined;
  }

  if (!tenant) {
    log.warn(`Tenant '${input.tenantId}' no encontrado (ni en memoria ni en el backend)`);
    return {
      ok: false,
      message: 'Tenant not found',
      error: `Tenant ${input.tenantId} is not registered`,
    };
  }

  const toolFn = getToolFunction(input.toolName);
  if (!toolFn) {
    log.warn(`Tool '${input.toolName}' no está registrada (tenant='${input.tenantId}')`);
    return {
      ok: false,
      message: 'Tool not found',
      error: `Tool '${input.toolName}' is not registered. Use listToolNames() to see available tools.`,
    };
  }

  if (!tenant.siteUrl || !tenant.consumerKey || !tenant.consumerSecret) {
    log.warn(`Tenant '${input.tenantId}' tiene credenciales incompletas`);
    return {
      ok: false,
      message: 'Tenant credentials incomplete',
      error: `Tenant ${input.tenantId} is missing siteUrl, consumerKey or consumerSecret`,
    };
  }

  const credentials = {
    tenantId: tenant.id,
    siteUrl: tenant.siteUrl,
    consumerKey: tenant.consumerKey,
    consumerSecret: tenant.consumerSecret,
  };

  // Each request runs inside its own AsyncLocalStorage context.
  // getAxios() inside any tool will pick up these credentials without
  // touching the global axios.defaults, preventing race conditions.
  return tenantContext.run(credentials, async () => {
    try {
      const result = await toolFn(input.toolArgs);
      return {
        ok: true,
        message: `Tool '${input.toolName}' executed successfully for tenant '${input.tenantId}'`,
        result,
      };
    } catch (err: any) {
      // Log detallado (incluye respuesta de WooCommerce si el error viene de axios)
      const wcResponse = err?.response?.data;
      log.error(
        `Tool '${input.toolName}' falló para tenant '${input.tenantId}': ${err?.message ?? err}`,
        wcResponse ?? err?.stack
      );
      return {
        ok: false,
        message: `Tool '${input.toolName}' failed for tenant '${input.tenantId}'`,
        error: err?.message ?? String(err),
      };
    }
  });
}

/**
 * Get status of a specific tenant (alias for getTenantById with wrapped response)
 */
export function statusTenant(tenantId: string): ExecuteTenantResult {
  const tenant = getTenantById(tenantId);

  if (!tenant) {
    return {
      ok: false,
      message: 'Tenant not found',
      error: `Tenant ${tenantId} is not registered`,
    };
  }

  return {
    ok: true,
    message: 'Tenant is registered and ready',
    result: tenant,
  };
}
