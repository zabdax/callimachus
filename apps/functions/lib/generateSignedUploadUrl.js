import { randomUUID } from 'node:crypto';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
admin.initializeApp();
const FIVE_MINUTES_MS = 5 * 60 * 1000;
function contentTypeToExt(ct) {
    switch (ct) {
        case 'image/png': return '.png';
        case 'image/jpeg': return '.jpg';
        case 'image/webp': return '.webp';
        case 'image/gif': return '.gif';
        default: return '';
    }
}
async function innerHandler(request) {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'Sign in first.');
    const { uid } = request.auth;
    const { contentType, fileExt } = request.data;
    if (!contentType || !contentType.startsWith('image/')) {
        throw new HttpsError('invalid-argument', 'contentType must be an image/* MIME type.');
    }
    const ext = fileExt ?? contentTypeToExt(contentType);
    const filename = `${randomUUID()}${ext}`;
    const path = `paymentRequests/${uid}/${filename}`;
    const expires = Date.now() + FIVE_MINUTES_MS;
    const url = await admin.storage().bucket().file(path).getSignedUrl({
        version: 'v4',
        action: 'write',
        expires,
        contentType,
    });
    return { url, path, expires };
}
export const generateSignedUploadUrl = onCall(innerHandler);
// Unit-test entry point. Mirrors the sessionStart pattern.
generateSignedUploadUrl.run = (data, ctx) => innerHandler({ data: data.data ?? data, auth: ctx.auth });
