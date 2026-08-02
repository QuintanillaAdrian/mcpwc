import { getAxios } from './axiosClient';

export interface VariationAttribute {
  id: number;
  option: string;
}

export interface ImageData {
  id: number;
}

export interface Dimensions {
  length?: string;
  width?: string;
  height?: string;
}

// 1) Crear variaciÃ³n
export interface CreateVariationArgs {
  productId: number;
  regular_price?: string;
  sale_price?: string;
  sku?: string;
  description?: string;
  status?: 'draft' | 'pending' | 'private' | 'publish';
  virtual?: boolean;
  downloadable?: boolean;
  download_limit?: number;
  download_expiry?: number;
  tax_status?: string;
  tax_class?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  backorders?: 'no' | 'notify' | 'yes';
  weight?: string;
  dimensions?: Dimensions;
  shipping_class?: string;
  image?: ImageData;
  attributes?: VariationAttribute[];
  menu_order?: number;
  meta_data?: Array<{ key: string; value?: any }>;
}
export async function createProductVariation(args: CreateVariationArgs) {
  const axios = getAxios();
  const { productId, ...payload } = args;
  if (!productId) throw new Error('createProductVariation: falta productId');
  const res = await axios.post(`/products/${productId}/variations`, payload);
  return res.data;
}

// 2) Obtener variaciÃ³n
export interface GetVariationArgs {
  productId: number;
  variationId: number;
}
export async function getProductVariation(args: GetVariationArgs) {
  const axios = getAxios();
  const { productId, variationId } = args;
  if (!productId) throw new Error('getProductVariation: falta productId');
  if (!variationId) throw new Error('getProductVariation: falta variationId');
  const res = await axios.get(`/products/${productId}/variations/${variationId}`);
  return res.data;
}

// 3) Listar variaciones
export interface ListVariationsArgs {
  productId: number;
  page?: number;
  per_page?: number;
  context?: 'view' | 'edit';
}
export async function listProductVariations(args: ListVariationsArgs) {
  const axios = getAxios();
  const { productId, page = 1, per_page = 10, context = 'view' } = args;
  if (!productId) throw new Error('listProductVariations: falta productId');
  const res = await axios.get(`/products/${productId}/variations`, {
    params: { page, per_page, context }
  });
  return res.data;
}

// 4) Actualizar variaciÃ³n
export interface UpdateVariationArgs extends Partial<CreateVariationArgs> {
  productId: number;
  variationId: number;
}
export async function updateProductVariation(args: UpdateVariationArgs) {
  const axios = getAxios();
  const { productId, variationId, ...payload } = args;
  if (!productId)   throw new Error('updateProductVariation: falta productId');
  if (!variationId) throw new Error('updateProductVariation: falta variationId');
  const res = await axios.put(
    `/products/${productId}/variations/${variationId}`,
    payload
  );
  return res.data;
}

// 5) Borrar variaciÃ³n
export interface DeleteVariationArgs {
  productId: number;
  variationId: number;
  force?: boolean;
}
export async function deleteProductVariation(args: DeleteVariationArgs) {
  const axios = getAxios();
  const { productId, variationId, force = true } = args;
  if (!productId)   throw new Error('deleteProductVariation: falta productId');
  if (!variationId) throw new Error('deleteProductVariation: falta variationId');
  const res = await axios.delete(
    `/products/${productId}/variations/${variationId}`,
    { params: { force } }
  );
  return res.data;
}

// 6) Batch variaciones
export interface BatchVariationsArgs {
  productId: number;
  create?: CreateVariationArgs[];
  update?: UpdateVariationArgs[];
  delete?: number[];
}
export async function batchProductVariations(args: BatchVariationsArgs) {
  const axios = getAxios();
  const { productId, create, update, delete: del } = args;
  if (!productId) throw new Error('batchProductVariations: falta productId');
  const payload: Record<string, any> = {};
  if (create) payload.create = create.map(c => ({ ...c, productId: undefined }));
  if (update) payload.update = update.map(u => ({ ...u, productId: undefined }));
  if (del)    payload.delete = del;
  const res = await axios.post(
    `/products/${productId}/variations/batch`,
    payload
  );
  return res.data;
}
