import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import { tenantContext } from '../tenantContext';
import { createLogger } from '../utils/logger';

const log = createLogger('axiosClient');

function createOAuthSigner(consumerKey: string, consumerSecret: string): OAuth {
  return new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string: string, key: string) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
}

/**
 * Returns an axios instance scoped to the current tenant context.
 * Always requires a tenant context — call only from within tenantContext.run().
 * Throws if called outside of a request context (missing tenant credentials).
 *
 * WooCommerce's REST API only accepts Basic Auth when the site is served over
 * HTTPS (is_ssl() === true on the WordPress side). Over plain HTTP it silently
 * ignores Basic Auth and treats the request as anonymous, so non-SSL sites
 * must sign every request with OAuth 1.0a instead.
 */
export function getAxios(): AxiosInstance {
  const creds = tenantContext.getStore();

  if (!creds) {
    throw new Error(
      'getAxios: no tenant context found. Ensure the tool is called from within tenantContext.run().'
    );
  }

  const baseURL = `${creds.siteUrl.replace(/\/$/, '')}/wp-json/wc/v3`;
  const isSecure = /^https:\/\//i.test(creds.siteUrl.trim());

  log.info(
    `getAxios(tenant='${creds.tenantId}') siteUrl='${creds.siteUrl}' -> baseURL='${baseURL}' auth='${isSecure ? 'basic' : 'oauth1.0a'}'`
  );

  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    ...(isSecure
      ? { auth: { username: creds.consumerKey, password: creds.consumerSecret } }
      : {}),
  });

  const oauth = isSecure ? null : createOAuthSigner(creds.consumerKey, creds.consumerSecret);

  instance.interceptors.request.use((config) => {
    const fullUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;

    if (oauth) {
      const oauthParams = oauth.authorize({
        url: fullUrl,
        method: (config.method ?? 'get').toUpperCase(),
        data: config.params ?? {},
      });
      config.params = { ...(config.params ?? {}), ...oauthParams };
    }

    log.info(`--> WC ${(config.method ?? 'get').toUpperCase()} ${fullUrl}`, config.params);
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      log.info(
        `<-- WC ${response.status} ${response.config.baseURL ?? ''}${response.config.url ?? ''}`
      );
      return response;
    },
    (error) => {
      const fullUrl = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
      log.error(
        `<-- WC ${error.response?.status ?? 'NO_RESPONSE'} ${fullUrl}: ${error.message}`,
        error.response?.data
      );
      return Promise.reject(error);
    }
  );

  return instance;
}
