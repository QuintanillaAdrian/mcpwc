/**
 * Central registry that maps tool names (camelCase) to their implementation
 * functions. Used by executeTenant() to dispatch HTTP multi-tenant calls.
 *
 * Each function is typed as (args: any) => Promise<any> to allow a generic
 * dispatch layer. The underlying implementations are fully typed.
 */

import * as attributeTerms from './attributeTerms';
import * as categories from './categories';
import * as coupons from './coupons';
import * as customers from './customers';
import * as customFields from './customFields';
import * as orderActions from './orderActions';
import * as orderNotes from './orderNotes';
import * as orderRefunds from './orderRefunds';
import * as orders from './orders';
import * as productAttributes from './productAttributes';
import * as productReviews from './productReviews';
import * as products from './products';
import * as productTags from './productTags';
import * as refunds from './refunds';
import * as reports from './reports';
import * as settings from './settings';
import * as shippingClasses from './shippingClasses';
import * as variations from './variations';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolFn = (args: any) => Promise<any>;

const registry = new Map<string, ToolFn>([
  // Coupons
  ['listCoupons', coupons.listCoupons],
  ['getCoupon', coupons.getCoupon],
  ['createCoupon', coupons.createCoupon],
  ['updateCoupon', coupons.updateCoupon],
  ['deleteCoupon', coupons.deleteCoupon],

  // Orders
  ['listOrders', orders.listOrders],
  ['getOrder', orders.getOrder],
  ['createOrder', orders.createOrder],
  ['updateOrder', orders.updateOrder],
  ['deleteOrder', orders.deleteOrder],

  // Order Notes
  ['createOrderNote', orderNotes.createOrderNote],
  ['getOrderNote', orderNotes.getOrderNote],
  ['listOrderNotes', orderNotes.listOrderNotes],
  ['deleteOrderNote', orderNotes.deleteOrderNote],

  // Order Refunds
  ['createOrderRefund', orderRefunds.createOrderRefund],
  ['getOrderRefund', orderRefunds.getOrderRefund],
  ['listOrderRefunds', orderRefunds.listOrderRefunds],
  ['deleteOrderRefund', orderRefunds.deleteOrderRefund],

  // Order Actions
  ['sendOrderDetails', orderActions.sendOrderDetails],

  // Products
  ['listProducts', products.listProducts],
  ['createProduct', products.createProduct],
  ['getProduct', products.getProduct],
  ['updateProduct', products.updateProduct],
  ['deleteProduct', products.deleteProduct],

  // Product Variations
  ['createProductVariation', variations.createProductVariation],
  ['getProductVariation', variations.getProductVariation],
  ['listProductVariations', variations.listProductVariations],
  ['updateProductVariation', variations.updateProductVariation],
  ['deleteProductVariation', variations.deleteProductVariation],
  ['batchProductVariations', variations.batchProductVariations],

  // Product Categories
  ['createProductCategory', categories.createProductCategory],
  ['getProductCategory', categories.getProductCategory],
  ['listProductCategories', categories.listProductCategories],
  ['updateProductCategory', categories.updateProductCategory],
  ['deleteProductCategory', categories.deleteProductCategory],
  ['batchProductCategories', categories.batchProductCategories],

  // Product Tags
  ['createProductTag', productTags.createProductTag],
  ['getProductTag', productTags.getProductTag],
  ['listProductTags', productTags.listProductTags],
  ['updateProductTag', productTags.updateProductTag],
  ['deleteProductTag', productTags.deleteProductTag],
  ['batchProductTags', productTags.batchProductTags],

  // Product Attributes
  ['createProductAttribute', productAttributes.createProductAttribute],
  ['getProductAttribute', productAttributes.getProductAttribute],
  ['listProductAttributes', productAttributes.listProductAttributes],
  ['updateProductAttribute', productAttributes.updateProductAttribute],
  ['deleteProductAttribute', productAttributes.deleteProductAttribute],
  ['batchProductAttributes', productAttributes.batchProductAttributes],

  // Product Attribute Terms
  ['createProductAttributeTerm', attributeTerms.createProductAttributeTerm],
  ['getProductAttributeTerm', attributeTerms.getProductAttributeTerm],
  ['listProductAttributeTerms', attributeTerms.listProductAttributeTerms],
  ['updateProductAttributeTerm', attributeTerms.updateProductAttributeTerm],
  ['deleteProductAttributeTerm', attributeTerms.deleteProductAttributeTerm],
  ['batchProductAttributeTerms', attributeTerms.batchProductAttributeTerms],

  // Product Reviews
  ['createProductReview', productReviews.createProductReview],
  ['getProductReview', productReviews.getProductReview],
  ['listProductReviews', productReviews.listProductReviews],
  ['updateProductReview', productReviews.updateProductReview],
  ['deleteProductReview', productReviews.deleteProductReview],
  ['batchProductReviews', productReviews.batchProductReviews],

  // Customers
  ['listCustomers', customers.listCustomers],
  ['getCustomer', customers.getCustomer],
  ['createCustomer', customers.createCustomer],
  ['updateCustomer', customers.updateCustomer],
  ['deleteCustomer', customers.deleteCustomer],

  // Custom Fields
  ['getProductCustomFieldNames', customFields.getProductCustomFieldNames],

  // Settings
  ['getCurrencySettings', settings.getCurrencySettings],

  // Refunds
  ['listRefunds', refunds.listRefunds],

  // Reports
  ['listReports', reports.listReports],
  ['getSalesReport', reports.getSalesReport],
  ['getTopSellersReport', reports.getTopSellersReport],
  ['getCouponsTotals', reports.getCouponsTotals],
  ['getCustomersTotals', reports.getCustomersTotals],
  ['getOrdersTotals', reports.getOrdersTotals],
  ['getProductsTotals', reports.getProductsTotals],
  ['getReviewsTotals', reports.getReviewsTotals],
  ['getCategoriesTotals', reports.getCategoriesTotals],
  ['getTagsTotals', reports.getTagsTotals],
  ['getAttributesTotals', reports.getAttributesTotals],

  // Shipping Classes
  ['createShippingClass', shippingClasses.createShippingClass],
  ['getShippingClass', shippingClasses.getShippingClass],
  ['listShippingClasses', shippingClasses.listShippingClasses],
  ['updateShippingClass', shippingClasses.updateShippingClass],
  ['deleteShippingClass', shippingClasses.deleteShippingClass],
  ['batchShippingClasses', shippingClasses.batchShippingClasses],
]);

/**
 * Returns the tool function registered under the given name, or undefined.
 */
export function getToolFunction(name: string): ToolFn | undefined {
  return registry.get(name);
}
