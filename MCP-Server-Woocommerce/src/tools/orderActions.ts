import { getAxios } from './axiosClient';

export interface SendOrderDetailsArgs {
  /** ID de la orden a la que enviarle los detalles */
  orderId: number;
}

export async function sendOrderDetails(args: SendOrderDetailsArgs) {
  const axios = getAxios();
  const { orderId } = args;
  if (!orderId) {
    throw new Error('sendOrderDetails: falta orderId');
  }

  // POST /wp-json/wc/v3/orders/<id>/actions/send_order_details
  const response = await axios.post(
    `/orders/${orderId}/actions/send_order_details`
  );

  return response.data;
}
