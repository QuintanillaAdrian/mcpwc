import { getAxios } from './axiosClient';

/** Descriptor genÃ©rico de reporte */
export interface ReportDescriptor {
  slug: string
  description: string
}

/** 1) Listar todos los reportes disponibles */
export async function listReports(): Promise<ReportDescriptor[]> {
  const axios = getAxios();
  const res = await axios.get('/reports')
  return res.data
}

/** ParÃ¡metros comunes para periodos y fechas */
export interface ReportDateArgs {
  context?: 'view' | 'edit'
  period?:  'week' | 'month' | 'last_month' | 'year'
  date_min?: string
  date_max?: string
}

/** 2) Reporte de ventas */
export async function getSalesReport(args: ReportDateArgs) {
  const axios = getAxios();
  const res = await axios.get('/reports/sales', { params: args })
  return res.data
}

/** 3) Top sellers */
export async function getTopSellersReport(args: ReportDateArgs) {
  const axios = getAxios();
  const res = await axios.get('/reports/top_sellers', { params: args })
  return res.data
}

/** 4) Totales de cupones */
export async function getCouponsTotals() {
  const axios = getAxios();
  const res = await axios.get('/reports/coupons/totals')
  return res.data
}

/** 5) Totales de clientes */
export async function getCustomersTotals() {
  const axios = getAxios();
  const res = await axios.get('/reports/customers/totals')
  return res.data
}

/** 6) Totales de Ã³rdenes */
export async function getOrdersTotals() {
  const axios = getAxios();
  const res = await axios.get('/reports/orders/totals')
  return res.data
}

/** 7) Totales de productos */
export async function getProductsTotals() {
  const axios = getAxios();
  const res = await axios.get('/reports/products/totals')
  return res.data
}

/** 8) Totales de reseÃ±as */
export async function getReviewsTotals() {
  const axios = getAxios();
  const res = await axios.get('/reports/reviews/totals')
  return res.data
}

/** 9) Totales de categorÃ­as */
export async function getCategoriesTotals() {
  const axios = getAxios();
  const res = await axios.get('/reports/categories/totals')
  return res.data
}

/** 10) Totales de etiquetas */
export async function getTagsTotals() {
  const axios = getAxios();
  const res = await axios.get('/reports/tags/totals')
  return res.data
}

/** 11) Totales de atributos */
export async function getAttributesTotals() {
  const axios = getAxios();
  const res = await axios.get('/reports/attributes/totals')
  return res.data
}
