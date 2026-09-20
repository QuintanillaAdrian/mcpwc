# MCP Server — WooCommerce

Servidor HTTP multi-tenant para WooCommerce. Expone 84 herramientas de la API REST de WooCommerce, diseñado para ser consumido desde un backend que usa la **Anthropic API** (tool use) con múltiples tiendas en paralelo.

---

## Arquitectura

Corre como Lambda en AWS (desplegado desde `infra-stack.ts` del repo
`chatbot-backend`, junto con el resto del pipeline). No mantiene ningún
registro de tenants en memoria — cada ejecución de tool lee la credencial
fresca directo de DynamoDB, sin caché:

```
Tu backend (Anthropic API / Bedrock tool-use)
        │
        ▼ POST /mcp/execute  { tenantId, toolName, toolArgs }
 src/app.ts  (Express, vía lambda.ts + serverless-http)
        │
        ▼
 src/api/mcpApis.ts → executeTenant()
        │
        ▼
 src/tenantCredentials.ts → getTenantCredentials(tenantId)
        │
        ├─ GetItem tenant_woocommerce  (DynamoDB, por IAM)
        ├─ GetItem tenants             (DynamoDB, chequea status !== suspended)
        └─ decrypt() con ENCRYPTION_KEY compartida (AES-256-GCM)
        │
        ▼
 tenantContext.run(credentials, ...)
        │
        ▼
 src/tools/*.ts  (84 funciones)
        │
 getAxios()  →  instancia axios aislada por tenant
        │
        ▼
 WooCommerce REST API
```

El backend (`chatbot-backend`) sigue siendo el único que **escribe**
`tenant_woocommerce` (Paso 2 del onboarding, rotación de credenciales) — el
MCP solo lee, con permiso IAM de solo lectura sobre esa tabla y sobre
`tenants`. No hay ningún paso de "registrar" o "avisarle" al MCP: en cuanto
el backend guarda credenciales nuevas, el próximo `/mcp/execute` ya las ve.

---

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `API_TOKEN` | Bearer token para autenticar todas las llamadas al servidor | — |
| `API_PORT` | Puerto del servidor Express (solo desarrollo local, `npm run dev`) | `3001` |
| `ENCRYPTION_KEY` | Clave AES-256-GCM en hex (64 chars = 32 bytes) compartida con el backend | — |
| `DYNAMO_TABLE_TENANTS` | Nombre de la tabla DynamoDB `tenants` (para el chequeo de `status`) | — |
| `DYNAMO_TABLE_TENANT_WOOCOMMERCE` | Nombre de la tabla DynamoDB `tenant_woocommerce` | — |
| `AWS_REGION` | Región de DynamoDB. En Lambda la inyecta AWS solo, no hace falta seteala | `us-east-2` |

En producción (Lambda) estas variables las setea `infra-stack.ts` del repo
`chatbot-backend` automáticamente al desplegar — no hay que tocarlas a mano
ahí. Solo hacen falta en un `.env` local para correr `npm run dev` contra
las tablas reales (requiere credenciales de AWS configuradas localmente,
`aws configure`, con permiso de lectura sobre esas dos tablas).

Generar claves seguras:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Instalación y arranque

Esto es para desarrollo local. En producción no se corre `npm start` en
ningún hosting — se despliega como Lambda con `npx cdk deploy` desde
`chatbot-backend/infra` (ver `McpFunction` en `infra-stack.ts` de ese repo),
que empaqueta `src/lambda.ts` directo con esbuild.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores reales

# 3. Compilar y arrancar
npm run build
npm start
```

Para desarrollo sin compilar:

```bash
npm run dev
```

---

## API HTTP — Endpoints

Todos los endpoints requieren el header:

```
Authorization: Bearer <API_TOKEN>
```

### `GET /health` — Chequeo de salud

Sin autenticación. Devuelve `{ ok: true }` si el proceso está vivo.

---

### `POST /mcp/execute` — Ejecutar herramienta

Ejecuta cualquiera de las 84 herramientas disponibles en nombre de un tenant.

```json
// Request
{
  "tenantId": "tienda-a",
  "toolName": "listProducts",
  "toolArgs": { "search": "pijama", "category": 17, "min_price": "5000", "max_price": "20000", "per_page": 5, "page": 1 }
}

// Response 200
{
  "ok": true,
  "message": "Tool 'listProducts' executed successfully for tenant 'tienda-a'",
  "result": { "products": [ ... ], "total": 3, "totalPages": 1 }
}
```

`listProducts` es la única tool de listado que devuelve un objeto (`{products, total, totalPages}`)
en vez de un array plano — `total`/`totalPages` salen de los headers reales de WooCommerce
(`X-WP-Total`/`X-WP-TotalPages`), no del body, así quien llama sabe si la página que recibió es
todo el catálogo o una fracción de uno más grande. Filtros soportados: `search` (nombre/descripción,
texto libre), `category` (id numérico — resolvelo antes con `listProductCategories`, no acepta el
nombre), `min_price`/`max_price` (rango de precio, combinables entre sí y con los anteriores).

**Herramientas disponibles por categoría:**

| Categoría | Herramientas |
|---|---|
| Productos | `listProducts` (`search`/`category`/`min_price`/`max_price`/`per_page`/`page`), `createProduct`, `getProduct`, `updateProduct`, `deleteProduct` |
| Variaciones | `createProductVariation`, `getProductVariation`, `listProductVariations`, `updateProductVariation`, `deleteProductVariation`, `batchProductVariations` |
| Categorías | `createProductCategory`, `getProductCategory`, `listProductCategories`, `updateProductCategory`, `deleteProductCategory`, `batchProductCategories` |
| Etiquetas | `createProductTag`, `getProductTag`, `listProductTags`, `updateProductTag`, `deleteProductTag`, `batchProductTags` |
| Atributos | `createProductAttribute`, `getProductAttribute`, `listProductAttributes`, `updateProductAttribute`, `deleteProductAttribute`, `batchProductAttributes` |
| Términos de atributo | `createProductAttributeTerm`, `getProductAttributeTerm`, `listProductAttributeTerms`, `updateProductAttributeTerm`, `deleteProductAttributeTerm`, `batchProductAttributeTerms` |
| Reseñas | `createProductReview`, `getProductReview`, `listProductReviews`, `updateProductReview`, `deleteProductReview`, `batchProductReviews` |
| Pedidos | `listOrders`, `getOrder`, `createOrder`, `updateOrder`, `deleteOrder` |
| Notas de pedido | `createOrderNote`, `getOrderNote`, `listOrderNotes`, `deleteOrderNote` |
| Reembolsos de pedido | `createOrderRefund`, `getOrderRefund`, `listOrderRefunds`, `deleteOrderRefund` |
| Acciones de pedido | `sendOrderDetails` |
| Cupones | `listCoupons`, `getCoupon`, `createCoupon`, `updateCoupon`, `deleteCoupon` |
| Clientes | `listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer` |
| Clases de envío | `createShippingClass`, `getShippingClass`, `listShippingClasses`, `updateShippingClass`, `deleteShippingClass`, `batchShippingClasses` |
| Reembolsos | `listRefunds` |
| Reportes | `listReports`, `getSalesReport`, `getTopSellersReport`, `getCouponsTotals`, `getCustomersTotals`, `getOrdersTotals`, `getProductsTotals`, `getReviewsTotals`, `getCategoriesTotals`, `getTagsTotals`, `getAttributesTotals` |
| Campos personalizados | `getProductCustomFieldNames` |

---

## Carga de tenants

No hay registro ni caché de tenants — cada `POST /mcp/execute` llama a
`getTenantCredentials(tenantId)` (`src/tenantCredentials.ts`), que lee
`tenant_woocommerce` y `tenants` directo de DynamoDB por IAM y descifra las
credenciales en el momento. Si el tenant no existe, no tiene WooCommerce
verificado, o está suspendido, devuelve `Tenant not found`.

Esto reemplaza al diseño anterior (Map en memoria + `bootstrapTenants()` al
arrancar + lazy-load vía HTTP al backend), que existía porque el MCP corría
fuera de AWS (DigitalOcean App Platform) y no tenía forma de leer DynamoDB
por IAM. Ahora que vive en la misma cuenta, lee la fuente real directo, sin
una copia que se pueda desactualizar.

---

## Credenciales cifradas

El backend cifra `consumerKey`/`consumerSecret` antes de guardarlos en
`tenant_woocommerce` (DynamoDB). El MCP los lee tal cual (todavía cifrados)
y los descifra él mismo con `ENCRYPTION_KEY` (AES-256-GCM) — la misma clave
en los dos lados, nunca viaja el texto plano por fuera de esos dos procesos.

Formato del campo cifrado (producido por el backend):
```
base64( iv[12 bytes] + authTag[16 bytes] + ciphertext )
```

Ejemplo para cifrar desde Node.js en el backend:
```javascript
const { createCipheriv, randomBytes } = require('crypto');

function encrypt(text, keyHex) {
  const key = Buffer.from(keyHex, 'hex');       // 32 bytes
  const iv  = randomBytes(12);                  // 12 bytes GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();          // 16 bytes
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}
```

---

## Aislamiento de credenciales (AsyncLocalStorage)

`axios.defaults` es un singleton global — si dos requests corren en paralelo para tenants distintos, se pisarían las credenciales. La solución usa `AsyncLocalStorage` de Node.js:

```
Request tenant-A ──→  tenantContext.run(credsA, () => toolFn())
                            └── getAxios() crea instancia con credsA  ✓

Request tenant-B ──→  tenantContext.run(credsB, () => toolFn())
                            └── getAxios() crea instancia con credsB  ✓
```

Cada request lleva sus credenciales en su propia "mochila" async. `getAxios()` lanza error si se llama fuera de un contexto de tenant.

---


```
src/
├── app.ts                 # Express app (rutas + middleware), sin arrancar servidor
├── server.ts               # Entry point de desarrollo local (npm run dev) — app.listen()
├── lambda.ts               # Entry point de producción (Lambda) — serverless-http(app)
├── tenantCredentials.ts    # getTenantCredentials(): lee DynamoDB directo, sin caché
├── tenantContext.ts        # AsyncLocalStorage con TenantCredentials por request
├── api/
│   ├── index.ts             # Re-exporta mcpApis.ts
│   └── mcpApis.ts           # executeTenant(): ejecuta una tool para un tenant
├── utils/
│   ├── crypto.ts             # decrypt() AES-256-GCM
│   └── logger.ts
└── tools/
    ├── axiosClient.ts       # getAxios(): instancia axios aislada por tenant
    ├── toolRegistry.ts      # Mapa nombre → función (84 herramientas)
    ├── products.ts
    ├── orders.ts
    ├── categories.ts
    └── ...                  # 14 archivos más
```

Crear tokens: console.log(require('crypto').randomBytes(32).toString('hex'))