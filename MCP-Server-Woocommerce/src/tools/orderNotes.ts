import { getAxios } from './axiosClient';

export interface CreateOrderNoteArgs {
  orderId: number;
  note: string;
  customer_note?: boolean;
  added_by_user?: boolean;
}

export async function createOrderNote(args: CreateOrderNoteArgs) {
  const axios = getAxios();
  const { orderId, note, customer_note = false, added_by_user = false } = args;
  if (!orderId) throw new Error('createOrderNote: falta orderId');
  if (!note)    throw new Error('createOrderNote: falta note');

  const payload = {
    note,
    customer_note,
    added_by_user,
  };

  const res = await axios.post(
    `/orders/${orderId}/notes`,
    payload
  );
  return res.data;
}

export interface GetOrderNoteArgs {
  orderId: number;
  noteId: number;
}

export async function getOrderNote(args: GetOrderNoteArgs) {
  const axios = getAxios();
  const { orderId, noteId } = args;
  if (!orderId) throw new Error('getOrderNote: falta orderId');
  if (!noteId)  throw new Error('getOrderNote: falta noteId');

  const res = await axios.get(
    `/orders/${orderId}/notes/${noteId}`
  );
  return res.data;
}

export interface ListOrderNotesArgs {
  orderId: number;
  context?: 'view' | 'edit';
  type?: 'any' | 'customer' | 'internal';
}

export async function listOrderNotes(args: ListOrderNotesArgs) {
  const axios = getAxios();
  const { orderId, context = 'view', type = 'any' } = args;
  if (!orderId) throw new Error('listOrderNotes: falta orderId');

  const res = await axios.get(
    `/orders/${orderId}/notes`,
    { params: { context, type } }
  );
  return res.data;
}

export interface DeleteOrderNoteArgs {
  orderId: number;
  noteId: number;
  force?: boolean;
}

export async function deleteOrderNote(args: DeleteOrderNoteArgs) {
  const axios = getAxios();
  const { orderId, noteId, force = true } = args;
  if (!orderId) throw new Error('deleteOrderNote: falta orderId');
  if (!noteId)  throw new Error('deleteOrderNote: falta noteId');

  const res = await axios.delete(
    `/orders/${orderId}/notes/${noteId}`,
    { params: { force } }
  );
  return res.data;
}
