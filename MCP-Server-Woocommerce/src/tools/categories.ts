import { getAxios } from './axiosClient';

// 1) Crear categorÃ­a
export interface CreateCategoryArgs {
  name:        string;
  slug?:       string;
  parent?:     number;
  description?: string;
  display?:    'default' | 'products' | 'subcategories' | 'both';
  image?:      { id: number } | { src: string };
  menu_order?: number;
}
export async function createProductCategory(args: CreateCategoryArgs) {
  const axios = getAxios();
  if (!args.name) throw new Error('createProductCategory: falta name');
  const res = await axios.post('/products/categories', args);
  return res.data;
}

// 2) Obtener categorÃ­a
export interface GetCategoryArgs {
  categoryId: number;
}
export async function getProductCategory(args: GetCategoryArgs) {
  const axios = getAxios();
  const { categoryId } = args;
  if (!categoryId) throw new Error('getProductCategory: falta categoryId');
  const res = await axios.get(`/products/categories/${categoryId}`);
  return res.data;
}

// 3) Listar categorÃ­as
export interface ListCategoriesArgs {
  context?:   'view' | 'edit';
  page?:      number;
  per_page?:  number;
  search?:    string;
  exclude?:   number[];
  include?:   number[];
  order?:     'asc' | 'desc';
  orderby?:   string;
  hide_empty?: boolean;
  parent?:    number;
  slug?:      string;
}
export async function listProductCategories(args: ListCategoriesArgs = {}) {
  const axios = getAxios();
  const res = await axios.get('/products/categories', { params: args });
  return res.data;
}

// 4) Actualizar categorÃ­a
export interface UpdateCategoryArgs extends Partial<CreateCategoryArgs> {
  categoryId: number;
}
export async function updateProductCategory(args: UpdateCategoryArgs) {
  const axios = getAxios();
  const { categoryId, ...payload } = args;
  if (!categoryId) throw new Error('updateProductCategory: falta categoryId');
  const res = await axios.put(`/products/categories/${categoryId}`, payload);
  return res.data;
}

// 5) Borrar categorÃ­a
export interface DeleteCategoryArgs {
  categoryId: number;
  force?:     boolean;
}
export async function deleteProductCategory(args: DeleteCategoryArgs) {
  const axios = getAxios();
  const { categoryId, force = true } = args;
  if (!categoryId) throw new Error('deleteProductCategory: falta categoryId');
  const res = await axios.delete(`/products/categories/${categoryId}`, { params: { force } });
  return res.data;
}

// 6) Batch categorÃ­as
export interface BatchCategoriesArgs {
  create?: CreateCategoryArgs[];
  update?: UpdateCategoryArgs[];
  delete?: number[];
}
export async function batchProductCategories(args: BatchCategoriesArgs) {
  const axios = getAxios();
  const payload: Record<string, any> = {};
  if (args.create) payload.create = args.create;
  if (args.update) payload.update = args.update;
  if (args.delete) payload.delete = args.delete;
  const res = await axios.post('/products/categories/batch', payload);
  return res.data;
}
