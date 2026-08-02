import { getAxios } from './axiosClient';

//
// 1) Create
//
export interface CreateProductTagArgs {
  name:        string;
  slug?:       string;
  description?: string;
}
export async function createProductTag(args: CreateProductTagArgs) {
  const axios = getAxios();
  const { name, slug, description } = args;
  if (!name) throw new Error('createProductTag: falta name');
  const payload: Record<string, any> = { name };
  if (slug)        payload.slug = slug;
  if (description) payload.description = description;
  const res = await axios.post('/products/tags', payload);
  return res.data;
}

//
// 2) Retrieve
//
export interface GetProductTagArgs {
  tagId: number;
}
export async function getProductTag(args: GetProductTagArgs) {
  const axios = getAxios();
  const { tagId } = args;
  if (!tagId) throw new Error('getProductTag: falta tagId');
  const res = await axios.get(`/products/tags/${tagId}`);
  return res.data;
}

//
// 3) List
//
export interface ListProductTagsArgs {
  context?:    'view' | 'edit';
  page?:       number;
  per_page?:   number;
  search?:     string;
  exclude?:    number[];
  include?:    number[];
  offset?:     number;
  order?:      'asc' | 'desc';
  orderby?:    'id' | 'include' | 'name' | 'slug' | 'term_group' | 'description' | 'count';
  hide_empty?: boolean;
  product?:    number;
  slug?:       string;
}
export async function listProductTags(args: ListProductTagsArgs = {}) {
  const axios = getAxios();
  const res = await axios.get('/products/tags', { params: args });
  return res.data;
}

//
// 4) Update
//
export interface UpdateProductTagArgs {
  tagId:       number;
  name?:       string;
  slug?:       string;
  description?: string;
}
export async function updateProductTag(args: UpdateProductTagArgs) {
  const axios = getAxios();
  const { tagId, ...payload } = args;
  if (!tagId) throw new Error('updateProductTag: falta tagId');
  const res = await axios.put(`/products/tags/${tagId}`, payload);
  return res.data;
}

//
// 5) Delete
//
export interface DeleteProductTagArgs {
  tagId: number;
  force?: boolean;
}
export async function deleteProductTag(args: DeleteProductTagArgs) {
  const axios = getAxios();
  const { tagId, force = true } = args;
  if (!tagId) throw new Error('deleteProductTag: falta tagId');
  const res = await axios.delete(
    `/products/tags/${tagId}`,
    { params: { force } }
  );
  return res.data;
}

//
// 6) Batch
//
export interface BatchProductTagsArgs {
  create?: Array<CreateProductTagArgs>;
  update?: Array<UpdateProductTagArgs>;
  delete?: number[];
}
export async function batchProductTags(args: BatchProductTagsArgs) {
  const axios = getAxios();
  const payload: Record<string, any> = {};
  if (args.create) payload.create = args.create;
  if (args.update) payload.update = args.update;
  if (args.delete) payload.delete = args.delete;
  const res = await axios.post('/products/tags/batch', payload);
  return res.data;
}
