// Mints a Google OAuth2 access token from your service-account JSON.
// Usage: node scripts/src/mint-firebase-token.mjs <path-to-sa.json>
import fs from 'node:fs';
import crypto from 'node:crypto';

const saPath = process.argv[2] ?? 'C:/Users/MIT/.config/hsc-tracker/sa.json';
let sa;
try {
  sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
} catch (e) {
  console.error(`FAIL: cannot read service-account JSON at ${saPath}: ${(e).message}`);
  console.error('Hint: pass the path explicitly — node scripts/src/mint-firebase-token.mjs ~/.config/hsc-tracker/sa.json');
  process.exit(1);
}
for (const field of ['client_email', 'private_key']) {
  if (!sa[field] || typeof sa[field] !== 'string') {
    console.error(`FAIL: service-account JSON is missing ${field}. GCP_SA_JSON_BASE64 must be base64 of the full SA JSON file.`);
    process.exit(1);
  }
}

const now = Math.floor(Date.now() / 1000);
const header = { alg: 'RS256', typ: 'JWT' };
const payload = {
  iss: sa.client_email,
  scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = crypto.createSign('RSA-SHA256');
sign.update(b64(header) + '.' + b64(payload));
const sig = sign.sign(sa.private_key, 'base64url');
const jwt = b64(header) + '.' + b64(payload) + '.' + sig;

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt,
}).catch((e) => {
  console.error(`FAIL: network error reaching oauth2.googleapis.com: ${e.message}`);
  process.exit(1);
});
const j = await res.json().catch(() => ({}));
if (j.access_token) {
  console.log('TOKEN:' + j.access_token);
  console.error('expires in', j.expires_in, 'seconds');
} else {
  console.error('FAIL: token endpoint did not return access_token:', JSON.stringify(j));
  console.error('Hint: check SA client_email, key revocation, and datastore/cloud-platform scopes.');
  process.exit(1);
}