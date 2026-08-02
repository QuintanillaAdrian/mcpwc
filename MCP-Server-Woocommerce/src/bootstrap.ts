import axios from 'axios';
import { registerTenant, getTenantById, TenantRecord } from './api/mcpApis';
import { decrypt } from './utils/crypto';

/**
 * Respuesta esperada del backend en GET /api/internal/tenants/active
 * El backend desencripta desde su PostgreSQL y envía los campos
 * consumerKey y consumerSecret cifrados con AES-256-GCM (ENCRYPTION_KEY compartida).
 */
interface RemoteTenant {
  tenantId:       string;
  siteUrl:        string;
  consumerKey:    string; // cifrado en AES-256-GCM
  consumerSecret: string; // cifrado en AES-256-GCM
}

/**
 * Llama al backend para obtener los tenants activos y los registra
 * en el tenantStore en memoria.
 *
 * - Si BACKEND_INTERNAL_URL no está definida, se omite (útil en desarrollo local).
 * - Si el backend falla, el error se loguea pero el servidor arranca igual
 *   (los tenants se pueden registrar manualmente vía POST /mcp/register).
 */
export async function bootstrapTenants(): Promise<void> {
  const backendUrl   = process.env.BACKEND_INTERNAL_URL;
  const backendToken = process.env.BACKEND_INTERNAL_TOKEN;

  if (!backendUrl) {
    console.warn('[bootstrap] BACKEND_INTERNAL_URL no definida — se omite la carga inicial de tenants');
    return;
  }

  try {
    const response = await axios.get<RemoteTenant[]>(
      `${backendUrl.replace(/\/$/, '')}/api/internal/tenants/active`,
      {
        headers: {
          'Authorization': `Bearer ${backendToken}`,
          'Content-Type':  'application/json',
        },
        timeout: 10_000,
      }
    );

    const tenants: RemoteTenant[] = response.data;

    if (!Array.isArray(tenants)) {
      throw new Error('La respuesta del backend no es un array');
    }

    let loaded = 0;
    for (const tenant of tenants) {
      const result = registerTenant({
        tenantId:       tenant.tenantId,
        siteUrl:        tenant.siteUrl,
        consumerKey:    decrypt(tenant.consumerKey),
        consumerSecret: decrypt(tenant.consumerSecret),
      });

      if (result.ok) {
        loaded++;
      } else {
        console.warn(`[bootstrap] Tenant omitido (${tenant.tenantId}): ${result.message}`);
      }
    }

    console.log(`[bootstrap] ${loaded}/${tenants.length} tenants cargados correctamente`);

  } catch (err: any) {
    console.error('[bootstrap] Error al cargar tenants desde el backend:', err?.message ?? err);
    console.warn('[bootstrap] El servidor arranca sin tenants precargados');
  }
}

/**
 * Lazy-load: intenta cargar un tenant específico desde el backend cuando
 * no se encuentra en el registro en memoria.
 *
 * Llama a GET /api/internal/tenants/:tenantId
 * Retorna el TenantRecord si lo encontró y registró, null si no existe.
 *
 * Manejo de concurrencia: usa un Map de promesas en vuelo para que dos
 * requests simultáneas del mismo tenantId no generen dos llamadas al backend.
 */
const inFlight = new Map<string, Promise<TenantRecord | null>>();

export async function fetchTenant(tenantId: string): Promise<TenantRecord | null> {
  // Si ya hay una llamada en vuelo para este tenantId, espera la misma
  if (inFlight.has(tenantId)) {
    return inFlight.get(tenantId)!;
  }

  const promise = _doFetchTenant(tenantId).finally(() => {
    inFlight.delete(tenantId);
  });

  inFlight.set(tenantId, promise);
  return promise;
}

async function _doFetchTenant(tenantId: string): Promise<TenantRecord | null> {
  const backendUrl   = process.env.BACKEND_INTERNAL_URL;
  const backendToken = process.env.BACKEND_INTERNAL_TOKEN;

  if (!backendUrl) {
    return null;
  }

  try {
    const response = await axios.get<RemoteTenant>(
      `${backendUrl.replace(/\/$/, '')}/api/internal/tenants/${encodeURIComponent(tenantId)}`,
      {
        headers: { 'Authorization': `Bearer ${backendToken}` },
        timeout: 8_000,
      }
    );

    const remote = response.data;

    registerTenant({
      tenantId:       remote.tenantId,
      siteUrl:        remote.siteUrl,
      consumerKey:    decrypt(remote.consumerKey),
      consumerSecret: decrypt(remote.consumerSecret),
    });

    const loaded = getTenantById(remote.tenantId);
    console.log(`[bootstrap] Tenant '${tenantId}' cargado on-demand`);
    return loaded;

  } catch (err: any) {
    // 404 del backend = tenant no existe
    if (err?.response?.status === 404) {
      console.warn(`[bootstrap] Tenant '${tenantId}' no encontrado en el backend`);
      return null;
    }
    console.error(`[bootstrap] Error al cargar tenant '${tenantId}':`, err?.message ?? err);
    return null;
  }
}
