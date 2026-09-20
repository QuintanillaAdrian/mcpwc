import { getAxios } from './axiosClient';

export interface ListProductsArgs {
  per_page?: number;
  page?: number;
  // Búsqueda por nombre/descripción — WooCommerce ya lo soporta nativo en su
  // REST API (?search=), pero antes no se lo pasábamos al pedido real.
  search?: string;
  // Filtro por categoría (id numérico de WooCommerce, no el nombre) — hay
  // que resolverlo antes con listProductCategories. Sin esto, un cliente
  // preguntando por "calzado" no encontraba nada si ningún producto tenía
  // esa palabra literal en el nombre (search no alcanza para eso).
  category?: number;
  // Rango de precio — mismos nombres que la REST API nativa de WooCommerce,
  // se pasan tal cual.
  min_price?: string;
  max_price?: string;
  // Filtro por atributo (ej. "¿tienen esto en talle 41?"). `attribute` es el
  // SLUG de la taxonomía (ej. "pa_talle", no "Talle") — hay que resolverlo
  // antes con listProductAttributes. `attribute_term` es el id numérico del
  // valor puntual (ej. el id de "41" dentro de "Talle") — se resuelve con
  // listProductAttributeTerms. Mismos nombres que la REST API nativa de
  // WooCommerce, se pasan tal cual.
  attribute?: string;
  attribute_term?: number;
}

export interface CreateProductArgs {
  name: string;
  type?: 'simple' | 'grouped' | 'external' | 'variable';
  regular_price?: string;
  description?: string;
  short_description?: string;
  sku?: string;
  price?: string;
  sale_price?: string;
  categories?: { id: number }[];
  images?: { id?: number; src?: string }[];
  [key: string]: any; // Para pasar cualquier campo adicional
}

export interface GetProductArgs {
  productId: number;
}

export interface UpdateProductArgs {
  productId: number;
  data: Partial<CreateProductArgs>;
}

export interface DeleteProductArgs {
  productId: number;
  force?: boolean;
}

export async function listProducts(args: ListProductsArgs = {}) {
  const axios = getAxios();
  const res = await axios.get('/products', {
    params: {
      per_page: args.per_page || 10,
      page: args.page || 1,
      search: args.search,
      category: args.category,
      min_price: args.min_price,
      max_price: args.max_price,
      attribute: args.attribute,
      attribute_term: args.attribute_term,
    }
  });
  // WooCommerce manda el total real del catálogo en estos headers (no en el
  // body) — sin esto, quien llama no tiene forma de saber si la página que
  // recibió es todo el catálogo o una fracción de uno mucho más grande.
  return {
    products: res.data,
    total: Number(res.headers['x-wp-total'] ?? res.data.length),
    totalPages: Number(res.headers['x-wp-totalpages'] ?? 1),
  };
}

export async function createProduct(args: CreateProductArgs) {
  const axios = getAxios();
  const res = await axios.post('/products', args);
  return res.data;
}

export async function getProduct(args: GetProductArgs) {
  const axios = getAxios();
  const res = await axios.get(`/products/${args.productId}`);
  return res.data;
}

export async function updateProduct(args: UpdateProductArgs) {
  const axios = getAxios();
  const res = await axios.put(
    `/products/${args.productId}`,
    args.data
  );
  return res.data;
}

export async function deleteProduct(args: DeleteProductArgs) {
  const axios = getAxios();
  const res = await axios.delete(
    `/products/${args.productId}`,
    { params: { force: args.force ?? true } }
  );
  return res.data;
}
