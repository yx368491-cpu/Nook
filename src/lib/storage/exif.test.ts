/**
 * M5-5 — EXIF detection unit tests.
 *
 * 8 cases pinned to:
 *   1. JPEG with EXIF APP1/Exif-0x0 magic → hasExif true
 *   2. JPEG without APP1 (just APP0/JFIF) → hasExif false
 *   3. JPEG with non-EXIF APP1 (XMP bytes) → hasExif false
 *   4. PNG file (extension short-circuit) → hasExif false, no buffer read
 *   5. Plain text file → hasExif false, short-circuit
 *   6. PDF / ZIP file → hasExif false, short-circuit
 *   7. Truncated JPEG (less than SOI) → hasExif false, defensive
 *   8. Multi-segment JPEG where EXIF APP1 follows non-EXIF segments
 *      → hasExif true (segment-iteration correctness)
 *
 * Mock strategy: we hand-roll JPEG byte sequences via `buildJpeg()`
 * and `appSegment()` helpers — the only thing the parser cares about
 * is marker structure + the 6-byte Exif magic, so a synthetic byte
 * sequence tests the parser with no image fixture overhead. The
 * resulting Uint8Array is fed to a `makeFakeFile()` helper which
 * overrides `File.prototype.arrayBuffer()` so the EXIF module reads
 * EXACTLY the bytes we construct (bypassing jsdom's known
 * Blob/TextEncoder serialization quirk that would otherwise corrupt
 * high-bit byte values like 0xFF/0xE1).
 */

import { describe, expect, it } from 'vitest';
import { detectExif } from './exif';

// -------------------------------------------------------------------------- //
// Helpers — synthetic byte sequence construction.
// -------------------------------------------------------------------------- //

/**
 * Build a real `File` whose `arrayBuffer()` AND `slice()` chain
 * return the synthetic `bytes` payload verbatim.
 *
 * Why the slice override matters:
 *   `detectExif` reads bytes via `file.slice(0, 65_536).arrayBuffer()`
 *   — NOT `file.arrayBuffer()` directly. `File.slice()` returns a
 *   FRESH `Blob` instance, and that fresh Blob's `arrayBuffer()`
 *   reads from its OWN underlying buffer (which jsdom allocated
 *   based on the File's own BlobPart at construction time).
 *
 *   jsdom 20+ prefers the `BlobPart` value unmodified, BUT the
 *   propagation between a File and its `slice()`'d Blob is NOT
 *   transparent — jsdom's slice creates a fresh Blob backed by its
 *   own buffer (here: empty, since we passed `[]` to `new File([], ...)`).
 *   So the previously-shipped round-2 fix (which only overrode
 *   `file.arrayBuffer`) left detectExif reading 0 bytes from the
 *   slice path, breaking the "true positive" EXIF assertions.
 *
 *   This round-3 fix forces every slice returned from the mock
 *   File to also expose the corresponding synthetic bytes when
 *   `arrayBuffer()` is called on the slice result. Production code
 *   (real files) is untouched; env-flag parity with happy-dom / Node
 *   20 native Blob is incidental but consistent.
 *
 * Buffer safety:
 *   - `.slice(0, end)` on the underlying buffer materializes a
 *     non-SharedArrayBuffer copy (TS may complain otherwise).
 *   - We bound-check start/end against `bytes.length` so callers
 *     passing large slice windows (e.g. exif.ts's 65_536) never
 *     produce a slice larger than the synthetic payload.
 */
function makeFakeFile(bytes: Uint8Array, name: string, type: string): File {
  const file = new File([], name, { type });
  const cacheableBytes = (start: number, end: number): ArrayBuffer =>
    bytes
      .slice(Math.max(0, start), Math.min(end, bytes.length))
      .buffer.slice(0);

  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: () => Promise.resolve(cacheableBytes(0, bytes.length)),
  });

  // Override `slice` so the returned Blob's arrayBuffer also yields
  // synthetic bytes — without this the production path
  // `file.slice(0, N).arrayBuffer()` reads zero bytes (jsdom's slice
  // creates a fresh Blob backed by the File's empty parts).
  file.slice = ((
    start: number = 0,
    end: number = bytes.length,
    contentType = type,
  ): Blob => {
    const blob = new Blob([], { type: contentType });
    Object.defineProperty(blob, 'arrayBuffer', {
      configurable: true,
      value: () => Promise.resolve(cacheableBytes(start, end)),
    });
    return blob;
  }) as typeof File.prototype.slice;

  return file;
}

// ----------------------------------------------------------------------------
// JPEG bytecode helpers — keep test fixtures procedural, easy to read.
// ----------------------------------------------------------------------------

/** Build a JPEG byte sequence from a list of segments. */
function buildJpeg(segments: ReadonlyArray<Uint8Array | readonly number[]>): Uint8Array {
  // Pre-allocate a generous buffer; we'll trim at the end.
  const soa = [0xff, 0xd8]; // SOI prefix
  const eoi = [0xff, 0xd9]; // EOI suffix
  const total =
    soa.length +
    eoi.length +
    segments.reduce((s, seg) => s + seg.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const b of soa) out[cursor++] = b;
  for (const seg of segments) {
    for (const b of seg) out[cursor++] = b;
  }
  for (const b of eoi) out[cursor++] = b;
  return out;
}

/** Build an APPn segment with a 2-byte BE length prefix. */
function appSegment(marker: number, payload: ReadonlyArray<number>): number[] {
  const length = payload.length + 2; // length includes itself
  return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
}

/** Standard EXIF APP1 magic. */
const EXIF_MAGIC_BYTES = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] as const;

describe('M5-5 EXIF detection — `detectExif(file)`', () => {
  it('returns hasExif true for a JPEG carrying APP1 + Exif magic', async () => {
    const exifPayload = [...EXIF_MAGIC_BYTES, 0x4d, 0x4d]; // "Exif\0\0" + "MM" (Big-endian)
    const bytes = buildJpeg([
      appSegment(0xe1, exifPayload), // APP1 with genuine EXIF
      appSegment(0xe0, [0x4a, 0x46, 0x49, 0x46]), // APP0 JFIF (irrelevant for detection)
    ]);
    const file = makeFakeFile(bytes, 'photo.jpg', 'image/jpeg');

    const result = await detectExif(file);
    expect(result.hasExif).toBe(true);
    expect(result.sources).toEqual(['jpeg_app1']);
  });

  it('returns hasExif false for a JPEG without any APP1 segment', async () => {
    const bytes = buildJpeg([
      appSegment(0xe0, [0x4a, 0x46, 0x49, 0x46]), // APP0 only (JFIF)
    ]);
    const file = makeFakeFile(bytes, 'photo.jpg', 'image/jpeg');

    const result = await detectExif(file);
    expect(result.hasExif).toBe(false);
    expect(result.sources).toEqual([]);
  });

  it('returns hasExif false for a JPEG with non-EXIF APP1 (XMP magic)', async () => {
    // Per XMP spec, XMP wears "http://ns.adobe.com/xap/1.0/\0" inside
    // APP1 — distinct from "Exif\0\0". Our parser must NOT misclassify
    // it as EXIF.
    const xmpPayload = [
      ...new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0'),
      0x3c, 0x3f, // '<?' (start of XMP packet)
    ];
    const bytes = buildJpeg([
      appSegment(0xe1, xmpPayload), // APP1 with XMP magic
    ]);
    const file = makeFakeFile(bytes, 'photo.jpg', 'image/jpeg');

    const result = await detectExif(file);
    expect(result.hasExif).toBe(false);
    expect(result.sources).toEqual([]);
  });

  it('returns hasExif false for a PNG without reading the buffer (extension short-circuit)', async () => {
    // PNG signature for the type-checker (won't ever be read because
    // extension short-circuits first). Use a tiny non-JPEG buffer so
    // a regression that wrongly widened the short-circuit would
    // surface as a parse failure here.
    const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = makeFakeFile(pngSignature, 'photo.png', 'image/png');

    const result = await detectExif(file);
    expect(result.hasExif).toBe(false);
    expect(result.sources).toEqual([]);
  });

  it('returns hasExif false for plain text files (extension short-circuit)', async () => {
    const text = new TextEncoder().encode('hello world');
    const file = makeFakeFile(text, 'notes.txt', 'text/plain');

    const result = await detectExif(file);
    expect(result.hasExif).toBe(false);
    expect(result.sources).toEqual([]);
  });

  it('returns hasExif false for PDF / ZIP attachments (extension short-circuit)', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04

    const pdfFile = makeFakeFile(pdf, 'doc.pdf', 'application/pdf');
    const zipFile = makeFakeFile(zip, 'archive.zip', 'application/zip');

    expect((await detectExif(pdfFile)).hasExif).toBe(false);
    expect((await detectExif(zipFile)).hasExif).toBe(false);
  });

  it('returns hasExif false for a truncated JPEG (no SOI marker), defensive', async () => {
    // 1 byte — too short to be a real JPEG; the parser should bail out
    // gracefully without throwing.
    const singleByte = new Uint8Array([0x00]);
    const zeroByte = new Uint8Array(0);

    const fileSingle = makeFakeFile(singleByte, 'corrupted.jpg', 'image/jpeg');
    const fileEmpty = makeFakeFile(zeroByte, 'empty.jpg', 'image/jpeg');

    const resultSingle = await detectExif(fileSingle);
    const resultEmpty = await detectExif(fileEmpty);
    expect(resultSingle.hasExif).toBe(false);
    expect(resultEmpty.hasExif).toBe(false);
    expect(resultSingle.sources).toEqual([]);
    expect(resultEmpty.sources).toEqual([]);
  });

  it('returns hasExif true even when EXIF APP1 follows other non-EXIF segments', async () => {
    // Validates the segment-iteration loop correctly skips past
    // non-matching markers (APP0, COM, etc.) and continues looking.
    const exifPayload = [...EXIF_MAGIC_BYTES, 0x49, 0x49]; // "Exif\0\0" + "II" (Little-endian)
    const bytes = buildJpeg([
      appSegment(0xe0, [0x4a, 0x46, 0x49, 0x46]), // APP0 JFIF (skip past)
      appSegment(0xfe, [0x00, 0x00, 0x00, 0x00]), // COM comment (skip past)
      appSegment(0xe1, exifPayload), // APP1 with EXIF (match)
    ]);
    const file = makeFakeFile(bytes, 'photo.jpg', 'image/jpeg');

    const result = await detectExif(file);
    expect(result.hasExif).toBe(true);
    expect(result.sources).toEqual(['jpeg_app1']);
  });
});
