import { getAxios } from './axiosClient';

export interface CurrencySettings {
  currency: string;
  symbol: string;
  position: string;
  thousand_sep: string;
  decimal_sep: string;
  num_decimals: number;
}

// El backend (chatbot-backend/src/services/priceFormat.ts) usa esto para
// formatear los precios ANTES de mandárselos al modelo — nunca se le pide
// que adivine el formato, porque ya se vio en producción que asumía
// dólares o un separador de miles ambiguo cuando no tenía este dato.
//
// Dos llamadas porque WooCommerce parte esta info en dos endpoints
// distintos:
// - /settings/general trae la moneda como código ISO (ej. "CRC") y las
//   reglas de separadores/decimales/posición configuradas en ESTA tienda.
// - /data/currencies/current trae el símbolo real (ej. "₡") — usa el mismo
//   mapeo interno que get_woocommerce_currency_symbol() de WooCommerce, no
//   hace falta mantener nosotros una tabla de códigos a símbolos.
export async function getCurrencySettings(): Promise<CurrencySettings> {
  const axios = getAxios();

  const [generalRes, currencyRes] = await Promise.all([
    axios.get('/settings/general'),
    axios.get('/data/currencies/current'),
  ]);

  const general = generalRes.data as { id: string; value: unknown }[];
  const find = (id: string) => general.find((s) => s.id === id)?.value;
  const currency = currencyRes.data as { code?: string; symbol?: string } | undefined;

  return {
    currency: String(find('woocommerce_currency') ?? currency?.code ?? ''),
    symbol: String(currency?.symbol ?? ''),
    position: String(find('woocommerce_currency_pos') ?? 'left'),
    thousand_sep: String(find('woocommerce_price_thousand_sep') ?? ''),
    decimal_sep: String(find('woocommerce_price_decimal_sep') ?? ''),
    num_decimals: Number(find('woocommerce_price_num_decimals') ?? 2),
  };
}
