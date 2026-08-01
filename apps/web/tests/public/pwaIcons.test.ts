import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPng(rel: string): Buffer {
  return readFileSync(resolve(__dirname, '../../public', rel));
}

describe('PWA icons', () => {
  it('icon-192.png exists and is a valid PNG', () => {
    const path = 'icons/icon-192.png';
    expect(existsSync(resolve(__dirname, '../../public', path))).toBe(true);
    const buf = readPng(path);
    expect(buf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  });

  it('icon-512.png exists and is a valid PNG', () => {
    const path = 'icons/icon-512.png';
    expect(existsSync(resolve(__dirname, '../../public', path))).toBe(true);
    const buf = readPng(path);
    expect(buf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  });

  it('icon-192.png is exactly 192x192', () => {
    const buf = readPng('icons/icon-192.png');
    // IHDR is at offset 8, width at 8, height at 12 (both UInt32BE)
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    expect(w).toBe(192);
    expect(h).toBe(192);
  });

  it('icon-512.png is exactly 512x512', () => {
    const buf = readPng('icons/icon-512.png');
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    expect(w).toBe(512);
    expect(h).toBe(512);
  });
});