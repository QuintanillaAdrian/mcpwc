// src/tools/productReviews.ts
import { getAxios } from './axiosClient';

/**
 * 1) Crear un review
 */
export interface CreateReviewArgs {
  product_id:     number
  review:         string
  reviewer:       string
  reviewer_email: string
  rating:         number
  status?:        'approved' | 'hold' | 'spam' | 'unspam' | 'trash' | 'untrash'
  verified?:      boolean
}
export async function createProductReview(args: CreateReviewArgs) {
  const axios = getAxios();
  const { product_id, review, reviewer, reviewer_email, rating, status, verified } = args
  if (!product_id)     throw new Error('createProductReview: falta product_id')
  if (!review)         throw new Error('createProductReview: falta review')
  if (!reviewer)       throw new Error('createProductReview: falta reviewer')
  if (!reviewer_email) throw new Error('createProductReview: falta reviewer_email')
  if (rating == null)  throw new Error('createProductReview: falta rating')

  const payload: Record<string, any> = { product_id, review, reviewer, reviewer_email, rating }
  if (status)   payload.status   = status
  if (verified) payload.verified = verified

  const res = await axios.post('/products/reviews', payload)
  return res.data
}

/**
 * 2) Recuperar un review
 */
export interface GetReviewArgs {
  reviewId: number
}
export async function getProductReview(args: GetReviewArgs) {
  const axios = getAxios();
  const { reviewId } = args
  if (!reviewId) throw new Error('getProductReview: falta reviewId')
  const res = await axios.get(`/products/reviews/${reviewId}`)
  return res.data
}

/**
 * 3) Listar reviews
 */
export interface ListReviewsArgs {
  context?:          'view' | 'edit'
  page?:             number
  per_page?:         number
  search?:           string
  after?:            string
  before?:           string
  exclude?:          number[]
  include?:          number[]
  offset?:           number
  order?:            'asc' | 'desc'
  orderby?:          'date' | 'date_gmt' | 'id' | 'slug' | 'include' | 'product'
  reviewer?:         number[]
  reviewer_exclude?: number[]
  reviewer_email?:   string[]
  product?:          number[]
  status?:           'all' | 'hold' | 'approved' | 'spam' | 'trash'
}
export async function listProductReviews(args: ListReviewsArgs = {}) {
  const axios = getAxios();
  const res = await axios.get('/products/reviews', { params: args })
  return res.data
}

/**
 * 4) Actualizar un review
 */
export interface UpdateReviewArgs extends Partial<CreateReviewArgs> {
  reviewId: number
}
export async function updateProductReview(args: UpdateReviewArgs) {
  const axios = getAxios();
  const { reviewId, ...payload } = args
  if (!reviewId) throw new Error('updateProductReview: falta reviewId')
  const res = await axios.put(`/products/reviews/${reviewId}`, payload)
  return res.data
}

/**
 * 5) Eliminar un review
 */
export interface DeleteReviewArgs {
  reviewId: number
  force?:   boolean
}
export async function deleteProductReview(args: DeleteReviewArgs) {
  const axios = getAxios();
  const { reviewId, force = true } = args
  if (!reviewId) throw new Error('deleteProductReview: falta reviewId')
  const res = await axios.delete(`/products/reviews/${reviewId}`, { params: { force } })
  return res.data
}

/**
 * 6) Batch create/update/delete reviews
 */
export interface BatchReviewsArgs {
  create?: CreateReviewArgs[]
  update?: UpdateReviewArgs[]
  delete?: number[]
}
export async function batchProductReviews(args: BatchReviewsArgs) {
  const axios = getAxios();
  const payload: Record<string, any> = {}
  if (args.create) payload.create = args.create
  if (args.update) payload.update = args.update
  if (args.delete) payload.delete = args.delete
  const res = await axios.post('/products/reviews/batch', payload)
  return res.data
}
