import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { decrypt } from './utils/crypto';
import { createLogger } from './utils/logger';
import type { TenantCredentials } from './tenantContext';

const log = createLogger('tenantCredentials');

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
const doc = DynamoDBDocumentClient.from(client);

interface TenantWoocommerceItem {
  tenant_id: string;
  consumer_key_enc: string;
  consumer_secret_enc: string;
  wc_api_url: string;
}

interface TenantItem {
  tenant_id: string;
  status: string;
}

// El MCP arma él mismo /wp-json/wc/v3 (ver tools/axiosClient.ts) — wc_api_url
// tal como lo guarda el backend ya trae ese path, así que acá se recorta al
// origin. Mismo criterio que utils/url.ts del backend (toSiteOrigin), sin
// compartir código entre los dos repos por una función de una línea.
function toSiteOrigin(url: string): string {
  return new URL(url).origin;
}

/**
 * Lee las credenciales de WooCommerce de un tenant directo de DynamoDB —
 * sin caché ni Map en memoria, una lectura fresca por ejecución de tool.
 *
 * Reemplaza al Map en memoria + bootstrap.ts + lazy-load que existían
 * cuando el MCP corría fuera de AWS (DigitalOcean) y no tenía forma de
 * leer DynamoDB por IAM — tenía que pedirle los datos al backend por HTTP.
 * Ahora que el MCP vive en la misma cuenta, lee la fuente real directo: el
 * backend sigue siendo el único que ESCRIBE tenant_woocommerce (Paso 2 del
 * onboarding, rotación de credenciales), esto solo lee.
 *
 * null si el tenant no existe, no tiene WooCommerce verificado, o está
 * suspendido — los tres casos se tratan igual en executeTenant().
 */
export async function getTenantCredentials(tenantId: string): Promise<TenantCredentials | null> {
  const wcTable = process.env.DYNAMO_TABLE_TENANT_WOOCOMMERCE;
  const tenantsTable = process.env.DYNAMO_TABLE_TENANTS;
  if (!wcTable || !tenantsTable) {
    throw new Error('DYNAMO_TABLE_TENANT_WOOCOMMERCE / DYNAMO_TABLE_TENANTS no configuradas');
  }

  const [wcRes, tenantRes] = await Promise.all([
    doc.send(new GetCommand({ TableName: wcTable, Key: { tenant_id: tenantId } })),
    doc.send(new GetCommand({ TableName: tenantsTable, Key: { tenant_id: tenantId } })),
  ]);

  const wcItem = wcRes.Item as TenantWoocommerceItem | undefined;
  const tenantItem = tenantRes.Item as TenantItem | undefined;

  if (!wcItem || !tenantItem || tenantItem.status === 'suspended') {
    log.warn(`Tenant '${tenantId}' no encontrado, sin WooCommerce verificado, o suspendido`);
    return null;
  }

  return {
    tenantId,
    siteUrl: toSiteOrigin(wcItem.wc_api_url),
    consumerKey: decrypt(wcItem.consumer_key_enc),
    consumerSecret: decrypt(wcItem.consumer_secret_enc),
  };
}
