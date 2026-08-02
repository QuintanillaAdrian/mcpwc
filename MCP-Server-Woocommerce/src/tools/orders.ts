import { getAxios } from './axiosClient';

export interface ListOrdersArgs {
  per_page?: number;
  page?: number;
  search?: string;
  after?: string;
  before?: string;
  modified_after?: string;
  modified_before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: string;
  parent?: number[];
  parent_exclude?: number[];
  status?: string[];
  customer?: number;
  product?: number;
  dp?: number;
  created_via?: string[];
}

export async function listOrders(args: ListOrdersArgs = {}) {
  const axios = getAxios();
  const response = await axios.get('/orders', { params: args });
  return response.data;
}

export interface GetOrderArgs {
  orderId: number;
}

export async function getOrder(args: GetOrderArgs) {
  const axios = getAxios();
  const { orderId } = args;
  if (orderId == null) throw new Error('getOrder: falta orderId');
  const response = await axios.get(`/orders/${orderId}`);
  return response.data;
}

export async function createOrder(args: Record<string, any>) {
  const axios = getAxios();
  // args debe contener al menos billing, shipping, line_items, payment_method, etc.
  const response = await axios.post('/orders', args);
  return response.data;
}

export interface UpdateOrderArgs {
  orderId: number;
  data: Record<string, any>;
}

export async function updateOrder(args: UpdateOrderArgs) {
  const axios = getAxios();
  const { orderId, data } = args;
  if (orderId == null) throw new Error('updateOrder: falta orderId');
  const response = await axios.put(`/orders/${orderId}`, data);
  return response.data;
}

export interface DeleteOrderArgs {
  orderId: number;
  force?: boolean;
}

export async function deleteOrder(args: DeleteOrderArgs) {
  const axios = getAxios();
  const { orderId, force = false } = args;
  if (orderId == null) throw new Error('deleteOrder: falta orderId');
  const response = await axios.delete(`/orders/${orderId}`, {
    params: { force }
  });
  return response.data;
}
