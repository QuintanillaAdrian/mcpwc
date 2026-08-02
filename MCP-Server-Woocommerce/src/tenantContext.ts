import { AsyncLocalStorage } from 'async_hooks';

export type TenantCredentials = {
  tenantId: string;
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

/**
 * AsyncLocalStorage that carries tenant credentials for the duration
 * of a single HTTP request. Each concurrent request has its own isolated store.
 */
export const tenantContext = new AsyncLocalStorage<TenantCredentials>();
