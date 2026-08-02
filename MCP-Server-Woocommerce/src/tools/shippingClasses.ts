import { getAxios } from './axiosClient';

// 1) Create
export interface CreateShippingClassArgs {
  name:        string;
  slug?:       string;
  description?: string;
}
export async function createShippingClass(args: CreateShippingClassArgs) {
  const axios = getAxios();
  const { name, slug, description } = args;
  if (!name) throw new Error('createShippingClass: falta name');
  const payload: Record<string, any> = { name };
  if (slug)        payload.slug = slug;
  if (description) payload.description = description;
  const res = await axios.post('/products/shipping_classes', payload);
  return res.data;
}

// 2) Retrieve
export interface GetShippingClassArgs {
  shippingClassId: number;
}
export async function getShippingClass(args: GetShippingClassArgs) {
  const axios = getAxios();
  const { shippingClassId } = args;
  if (!shippingClassId) throw new Error('getShippingClass: falta shippingClassId');
  const res = await axios.get(`/products/shipping_classes/${shippingClassId}`);
  return res.data;
}

// 3) List
export interface ListShippingClassesArgs {
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
export async function listShippingClasses(args: ListShippingClassesArgs = {}) {
  const axios = getAxios();
  const res = await axios.get('/products/shipping_classes', { params: args });
  return res.data;
}

// 4) Update
export interface UpdateShippingClassArgs {
  shippingClassId: number;
  name?:           string;
  slug?:           string;
  description?:    string;
}
export async function updateShippingClass(args: UpdateShippingClassArgs) {
  const axios = getAxios();
  const { shippingClassId, ...payload } = args;
  if (!shippingClassId) throw new Error('updateShippingClass: falta shippingClassId');
  const res = await axios.put(`/products/shipping_classes/${shippingClassId}`, payload);
  return res.data;
}

// 5) Delete
export interface DeleteShippingClassArgs {
  shippingClassId: number;
  force?:          boolean;
}
export async function deleteShippingClass(args: DeleteShippingClassArgs) {
  const axios = getAxios();
  const { shippingClassId, force = true } = args;
  if (!shippingClassId) throw new Error('deleteShippingClass: falta shippingClassId');
  const res = await axios.delete(
    `/products/shipping_classes/${shippingClassId}`,
    { params: { force } }
  );
  return res.data;
}

// 6) Batch
export interface BatchShippingClassesArgs {
  create?: Array<Partial<CreateShippingClassArgs>>;
  update?: Array<Partial<UpdateShippingClassArgs>>;
  delete?: number[];
}
export async function batchShippingClasses(args: BatchShippingClassesArgs) {
  const axios = getAxios();
  const payload: Record<string, any> = {};
  if (args.create) payload.create = args.create;
  if (args.update) payload.update = args.update;
  if (args.delete) payload.delete = args.delete;
  const res = await axios.post('/products/shipping_classes/batch', payload);
  return res.data;
}
