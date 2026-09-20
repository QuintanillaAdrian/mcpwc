import { tenantContext } from '../tenantContext';
import { getToolFunction } from '../tools/toolRegistry';
import { getTenantCredentials } from '../tenantCredentials';
import { createLogger } from '../utils/logger';

const log = createLogger('mcpApis');

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
 * Execute a tool for a specific tenant.
 * Wraps execution in AsyncLocalStorage context so getAxios() returns a
 * tenant-isolated axios instance, preventing cross-tenant credential leakage.
 *
 * @param input - { tenantId, toolName, toolArgs }
 * @returns - { ok, message, result or error }
 */
export async function executeTenant(input: ExecuteTenantInput): Promise<ExecuteTenantResult> {
  const tenant = await getTenantCredentials(input.tenantId);

  if (!tenant) {
    log.warn(`Tenant '${input.tenantId}' no encontrado, sin WooCommerce verificado, o suspendido`);
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
      error: `Tool '${input.toolName}' is not registered. See README.md for the list of available tools.`,
    };
  }

  // Each request runs inside its own AsyncLocalStorage context.
  // getAxios() inside any tool will pick up these credentials without
  // touching the global axios.defaults, preventing race conditions.
  return tenantContext.run(tenant, async () => {
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
