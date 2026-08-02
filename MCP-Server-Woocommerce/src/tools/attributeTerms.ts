import { getAxios } from './axiosClient';

// 1) Crear tÃ©rmino de atributo
export interface CreateAttributeTermArgs {
  attributeId: number;
  name:        string;
  slug?:       string;
  description?: string;
  menu_order?: number;
}
export async function createProductAttributeTerm(args: CreateAttributeTermArgs) {
  const axios = getAxios();
  const { attributeId, ...payload } = args;
  if (!attributeId) throw new Error('createProductAttributeTerm: falta attributeId');
  const res = await axios.post(`/products/attributes/${attributeId}/terms`, payload);
  return res.data;
}

// 2) Obtener tÃ©rmino de atributo
export interface GetAttributeTermArgs {
  attributeId: number;
  termId:      number;
}
export async function getProductAttributeTerm(args: GetAttributeTermArgs) {
  const axios = getAxios();
  const { attributeId, termId } = args;
  if (!attributeId) throw new Error('getProductAttributeTerm: falta attributeId');
  if (!termId)      throw new Error('getProductAttributeTerm: falta termId');
  const res = await axios.get(`/products/attributes/${attributeId}/terms/${termId}`);
  return res.data;
}

// 3) Listar tÃ©rminos de atributo
export interface ListAttributeTermsArgs {
  attributeId: number;
  context?:    'view' | 'edit';
  page?:       number;
  per_page?:   number;
  search?:     string;
  exclude?:    number[];
  include?:    number[];
  order?:      'asc' | 'desc';
  orderby?:    string;
  hide_empty?: boolean;
  parent?:     number;
  product?:    number;
  slug?:       string;
}
export async function listProductAttributeTerms(args: ListAttributeTermsArgs) {
  const axios = getAxios();
  const { attributeId, ...params } = args;
  if (!attributeId) throw new Error('listProductAttributeTerms: falta attributeId');
  const res = await axios.get(
    `/products/attributes/${attributeId}/terms`,
    { params }
  );
  return res.data;
}

// 4) Actualizar tÃ©rmino de atributo
export interface UpdateAttributeTermArgs extends Partial<CreateAttributeTermArgs> {
  attributeId: number;
  termId:      number;
}
export async function updateProductAttributeTerm(args: UpdateAttributeTermArgs) {
  const axios = getAxios();
  const { attributeId, termId, ...payload } = args;
  if (!attributeId) throw new Error('updateProductAttributeTerm: falta attributeId');
  if (!termId)      throw new Error('updateProductAttributeTerm: falta termId');
  const res = await axios.put(
    `/products/attributes/${attributeId}/terms/${termId}`,
    payload
  );
  return res.data;
}

// 5) Borrar tÃ©rmino de atributo
export interface DeleteAttributeTermArgs {
  attributeId: number;
  termId:      number;
  force?:      boolean;
}
export async function deleteProductAttributeTerm(args: DeleteAttributeTermArgs) {
  const axios = getAxios();
  const { attributeId, termId, force = true } = args;
  if (!attributeId) throw new Error('deleteProductAttributeTerm: falta attributeId');
  if (!termId)      throw new Error('deleteProductAttributeTerm: falta termId');
  const res = await axios.delete(
    `/products/attributes/${attributeId}/terms/${termId}`,
    { params: { force } }
  );
  return res.data;
}

// 6) Batch de tÃ©rminos de atributo
export interface BatchAttributeTermsArgs {
  attributeId: number;
  create?:     CreateAttributeTermArgs[];
  update?:     UpdateAttributeTermArgs[];
  delete?:     number[];
}
export async function batchProductAttributeTerms(args: BatchAttributeTermsArgs) {
  const axios = getAxios();
  const { attributeId, create, update, delete: del } = args;
  if (!attributeId) throw new Error('batchProductAttributeTerms: falta attributeId');
  const payload: Record<string, any> = {};
  if (create) payload.create = create.map(c => ({ ...c, attributeId: undefined }));
  if (update) payload.update = update.map(u => ({ ...u, attributeId: undefined }));
  if (del)    payload.delete = del;
  const res = await axios.post(
    `/products/attributes/${attributeId}/terms/batch`,
    payload
  );
  return res.data;
}
