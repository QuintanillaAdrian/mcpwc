# MCP Server — WooCommerce

Servidor HTTP multi-tenant para WooCommerce. Expone 84 herramientas de la API REST de WooCommerce, diseñado para ser consumido desde un backend que usa la **Anthropic API** (tool use) con múltiples tiendas en paralelo.

---

## Arquitectura

```
npm start
    │
    ▼
bootstrapTenants()  ←  GET /api/internal/tenants/active  (backend)
    │                       └─ descifra credenciales AES-256-GCM
    │                       └─ carga tenantStore en memoria
    ▼
app.listen(3001)

         Tu backend (Anthropic API)
                 │
                 ▼ POST /mcp/execute  { tenantId, toolName, toolArgs }
          src/server.ts  (Express HTTP)
                 │
                 ▼
          src/api/mcpApis.ts
                 │
          tenantStore.get(tenantId)
                 │
          ┌──────┴──────────────────────────────┐
          │ encontrado                           │ no encontrado
          ▼                                     ▼
   usa credenciales              GET /api/internal/tenants/:id  (lazy-load)
   del registro                       └─ descifra → registra → continúa
          │                                     │
          └──────────────┬──────────────────────┘
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

---

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `API_TOKEN` | Bearer token para autenticar todas las llamadas al servidor | — |
| `API_PORT` | Puerto del servidor Express | `3001` |
| `BACKEND_INTERNAL_URL` | URL base del backend que expone los endpoints internos | — |
| `BACKEND_INTERNAL_TOKEN` | Bearer token para las llamadas internas al backend | — |
| `ENCRYPTION_KEY` | Clave AES-256-GCM en hex (64 chars = 32 bytes) compartida con el backend | — |

Generar claves seguras:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Instalación y arranque

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

### `POST /mcp/register` — Registrar tenant

Registra una nueva tienda WooCommerce. El `tenantId` es obligatorio y debe ser único.

```json
// Request
{
  "tenantId": "tienda-a",
  "siteUrl": "https://tienda-a.com",
  "consumerKey": "ck_xxx",
  "consumerSecret": "cs_xxx"
}

// Response 201
{
  "ok": true,
  "message": "Tenant registered successfully",
  "tenantId": "tienda-a"
}
```

---

### `PUT /mcp/tenant/:id` — Actualizar tenant

Actualiza parcialmente las credenciales de un tenant ya registrado.

```json
// Request — PUT /mcp/tenant/tienda-a
{
  "siteUrl": "https://nueva-url.com"
}

// Response 200
{
  "ok": true,
  "message": "Tenant updated successfully",
  "tenant": { ... }
}
```

---

### `GET /mcp/tenant/:id/status` — Estado del tenant

Devuelve los datos registrados de un tenant.

```json
// Response 200
{
  "ok": true,
  "message": "Tenant found",
  "tenant": {
    "id": "tienda-a",
    "tenantId": "tienda-a",
    "siteUrl": "https://tienda-a.com",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### `DELETE /mcp/tenant/:id` — Eliminar tenant

Elimina el tenant del registro en memoria.

```json
// Response 200
{
  "ok": true,
  "message": "Tenant deleted successfully"
}
```

---

### `POST /mcp/execute` — Ejecutar herramienta

Ejecuta cualquiera de las 84 herramientas disponibles en nombre de un tenant.

```json
// Request
{
  "tenantId": "tienda-a",
  "toolName": "listProducts",
  "toolArgs": { "per_page": 5, "page": 1 }
}

// Response 200
{
  "ok": true,
  "message": "Tool 'listProducts' executed successfully for tenant 'tienda-a'",
  "result": [ ... ]
}
```

**Herramientas disponibles por categoría:**

| Categoría | Herramientas |
|---|---|
| Productos | `listProducts`, `createProduct`, `getProduct`, `updateProduct`, `deleteProduct` |
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

### Bootstrap al arranque
Al iniciar, el servidor llama a `GET /api/internal/tenants/active` en el backend y carga todos los tenants activos en memoria. Si el backend no está disponible, el servidor arranca igual y los tenants se pueden cargar manualmente.

### Lazy-load on-demand
Si llega un request para un `tenantId` que no está en memoria, el servidor intenta cargarlo automáticamente desde `GET /api/internal/tenants/:id`. Si el backend responde 404, retorna `Tenant not found`. Dos requests simultáneas para el mismo tenant nuevo usan la misma promesa en vuelo — el backend solo recibe una llamada.

### Registro manual (sin backend)
Siempre disponible vía `POST /mcp/register` para desarrollo local o tenants puntuales.

---

## Credenciales cifradas

El backend almacena `consumerKey` y `consumerSecret` cifrados en PostgreSQL. Al responder al MCP, los envía todavía cifrados. El MCP los descifra con `ENCRYPTION_KEY` (AES-256-GCM).

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

## Endpoints internos requeridos en el backend

El backend debe exponer estos dos endpoints protegidos con `BACKEND_INTERNAL_TOKEN`:

### `GET /api/internal/tenants/active`
Retorna todos los tenants activos:
```json
[
  {
    "tenantId": "tienda-a",
    "siteUrl": "https://tienda-a.com",
    "consumerKey": "<base64 cifrado>",
    "consumerSecret": "<base64 cifrado>"
  }
]
```

### `GET /api/internal/tenants/:tenantId`
Retorna un tenant específico (mismo formato). Responde `404` si no existe.

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
├── server.ts             # Servidor Express HTTP + arranque con bootstrap
├── bootstrap.ts          # bootstrapTenants() y fetchTenant() lazy-load
├── tenantContext.ts      # AsyncLocalStorage con TenantCredentials por request
├── api/
│   ├── index.ts          # Re-exporta mcpApis.ts
│   └── mcpApis.ts        # Lógica de registro y ejecución de tenants
├── utils/
│   └── crypto.ts         # decrypt() AES-256-GCM
└── tools/
    ├── axiosClient.ts    # getAxios(): instancia axios aislada por tenant
    ├── toolRegistry.ts   # Mapa nombre → función (84 herramientas)
    ├── products.ts
    ├── orders.ts
    ├── categories.ts
    └── ...               # 14 archivos más
```

Crear tokens: console.log(require('crypto').randomBytes(32).toString('hex'))