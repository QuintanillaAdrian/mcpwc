import { getAxios } from './axiosClient';

export interface RefundLineItem {
  id: number;
  refund_total: number;
  refund_tax?: Array<{
    id: number;
    refund_total: number;
  }>;
}

export interface CreateOrderRefundArgs {
  orderId: number;
  amount?: string;
  reason?: string;
  api_refund?: boolean;
  api_restock?: boolean;
  line_items?: RefundLineItem[];
  meta_data?: Array<{ key: string; value?: any }>;
}

export async function createOrderRefund(args: CreateOrderRefundArgs) {
  const axios = getAxios();
  const {
    orderId,
    amount,
    reason,
    api_refund = true,
    api_restock = true,
    line_items,
    meta_data,
  } = args;
  if (!orderId) throw new Error('createOrderRefund: falta orderId');

  const payload: Record<string, any> = {
    api_refund,
    api_restock,
  };
  if (amount)      payload.amount = amount;
  if (reason)      payload.reason = reason;
  if (line_items)  payload.line_items = line_items;
  if (meta_data)   payload.meta_data = meta_data;

  const res = await axios.post(
    `/orders/${orderId}/refunds`,
    payload
  );
  return res.data;
}

export interface GetOrderRefundArgs {
  orderId: number;
  refundId: number;
}

export async function getOrderRefund(args: GetOrderRefundArgs) {
  const axios = getAxios();
  const { orderId, refundId } = args;
  if (!orderId)  throw new Error('getOrderRefund: falta orderId');
  if (!refundId) throw new Error('getOrderRefund: falta refundId');

  const res = await axios.get(
    `/orders/${orderId}/refunds/${refundId}`
  );
  return res.data;
}

export interface ListOrderRefundsArgs {
  orderId: number;
  context?: 'view' | 'edit';
  page?: number;
  per_page?: number;
}

export async function listOrderRefunds(args: ListOrderRefundsArgs) {
  const axios = getAxios();
  const { orderId, context = 'view', page = 1, per_page = 10 } = args;
  if (!orderId) throw new Error('listOrderRefunds: falta orderId');

  const res = await axios.get(
    `/orders/${orderId}/refunds`,
    { params: { context, page, per_page } }
  );
  return res.data;
}

export interface DeleteOrderRefundArgs {
  orderId: number;
  refundId: number;
  force?: boolean;
}

export async function deleteOrderRefund(args: DeleteOrderRefundArgs) {
  const axios = getAxios();
  const { orderId, refundId, force = true } = args;
  if (!orderId)  throw new Error('deleteOrderRefund: falta orderId');
  if (!refundId) throw new Error('deleteOrderRefund: falta refundId');

  const res = await axios.delete(
    `/orders/${orderId}/refunds/${refundId}`,
    { params: { force } }
  );
  return res.data;
}
