import { getAxios } from './axiosClient';

// 1) Crear atributo
export interface CreateProductAttributeArgs {
  name: string;
  slug?: string;
  type?: string;
  order_by?: 'menu_order' | 'name' | 'name_num' | 'id';
  has_archives?: boolean;
}
export async function createProductAttribute(
  args: CreateProductAttributeArgs
) {
  const axios = getAxios();
  const res = await axios.post('/products/attributes', args);
  return res.data;
}

// 2) Recuperar atributo
export interface GetProductAttributeArgs {
  attributeId: number;
}
export async function getProductAttribute(
  args: GetProductAttributeArgs
) {
  const axios = getAxios();
  const { attributeId } = args;
  if (!attributeId) throw new Error('getProductAttribute: falta attributeId');
  const res = await axios.get(`/products/attributes/${attributeId}`);
  return res.data;
}

// 3) Listar atributos
export interface ListProductAttributesArgs {
  context?: 'view' | 'edit';
  page?: number;
  per_page?: number;
}
export async function listProductAttributes(
  args: ListProductAttributesArgs
) {
  const axios = getAxios();
  const { context = 'view', page = 1, per_page = 10 } = args;
  const res = await axios.get('/products/attributes', {
    params: { context, page, per_page },
  });
  return res.data;
}

// 4) Actualizar atributo
export interface UpdateProductAttributeArgs {
  attributeId: number;
  name?: string;
  slug?: string;
  type?: string;
  order_by?: 'menu_order' | 'name' | 'name_num' | 'id';
  has_archives?: boolean;
}
export async function updateProductAttribute(
  args: UpdateProductAttributeArgs
) {
  const axios = getAxios();
  const { attributeId, ...payload } = args;
  if (!attributeId) throw new Error('updateProductAttribute: falta attributeId');
  const res = await axios.put(
    `/products/attributes/${attributeId}`,
    payload
  );
  return res.data;
}

// 5) Eliminar atributo
export interface DeleteProductAttributeArgs {
  attributeId: number;
  force?: boolean;
}
export async function deleteProductAttribute(
  args: DeleteProductAttributeArgs
) {
  const axios = getAxios();
  const { attributeId, force = true } = args;
  if (!attributeId) throw new Error('deleteProductAttribute: falta attributeId');
  const res = await axios.delete(
    `/products/attributes/${attributeId}`,
    { params: { force } }
  );
  return res.data;
}

// 6) Batch create/update/delete atributos
export interface BatchProductAttributesArgs {
  create?: CreateProductAttributeArgs[];
  update?: UpdateProductAttributeArgs[];
  delete?: number[];
}
export async function batchProductAttributes(
  args: BatchProductAttributesArgs
) {
  const axios = getAxios();
  const { create, update, delete: del } = args;
  const payload: Record<string, any> = {};
  if (create) payload.create = create;
  if (update) payload.update = update;
  if (del)    payload.delete = del;
  const res = await axios.post('/products/attributes/batch', payload);
  return res.data;
}
