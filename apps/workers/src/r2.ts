import type { R2Signer } from './handlers/generateSignedUploadUrl';

/**
 * In Cloudflare Workers, R2 is bound as `env.SCREENSHOTS` (per wrangler.toml).
 * For unit tests we inject a stub via __setR2SignerForTests.
 *
 * R2's S3-compatible API uses presigned URLs. The signing key comes from
 * the R2 bucket's API token. In Workers, `env.SCREENSHOTS.createPresignedUrl()`
 * is the canonical helper.
 */

declare global {
  // eslint-disable-next-line no-var
  var __r2SignerOverride: R2Signer | undefined;
}

export const r2Signer: R2Signer = {
  async signPutUrl(path: string, contentType: string, expires: number): Promise<string> {
    const override = (globalThis as { __r2SignerOverride?: R2Signer }).__r2SignerOverride;
    if (override) return override.signPutUrl(path, contentType, expires);
    // Production path: Cloudflare R2 binding creates a presigned URL.
    // The actual binding is `env.SCREENSHOTS` and would be invoked as:
    //   const r2 = (env as { SCREENSHOTS: R2Bucket }).SCREENSHOTS;
    //   return await r2.createPresignedUrl({ method: 'PUT', path, expires });
    // We avoid importing the binding here so the same module works in
    // unit tests (no env). Session 8 wires env in.
    return `https://r2.example/${path}?expires=${expires}&type=${encodeURIComponent(contentType)}`;
  },
};

export function __setR2SignerForTests(s: R2Signer): void {
  (globalThis as { __r2SignerOverride: R2Signer }).__r2SignerOverride = s;
}