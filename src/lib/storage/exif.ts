/**
 * M5-5 — EXIF metadata detection (read-not-write).
 *
 * Brief
 * -----
 * Detects whether a user-selected `File` carries EXIF metadata (camera
 * info, GPS, edited timestamps, etc.) so the Composer can surface a
 * single informational warning toast BEFORE the upload pipeline
 * consumes the bytes. We deliberately DO NOT strip the bytes —
 * DATA-MODEL R-30 ("image 不压缩, 原图保真") is a hard business rule
 * that overrides SPEC NF-SEC-N05's literal "strip before upload"
 * wording. The reconciliation (per S37.0 scope recombination + S38.0
 * M5-5 SPEC review) is:
 *
 *   - Read metadata: yes, full APP1/Exif-0x0 binary walking ✓
 *   - Write metadata: no  ✗ — bytes are uploaded untouched
 *   - Surface to user: yes, single warning toast at the Composer
 *
 * The upload still proceeds. The user is informed of Nook's
 * no-compression posture with a chance to cancel; sending cancels
 * is the user's call, not ours.
 *
 * Why read-only
 * ------------
 * The user-visible policy per F-MSG-02 + Nook-PRODUCT § 2.7 is "原图
 * 保真" (faithful original). Stripping EXIF in the client would be
 * a silent re-encode; users who explicitly preserve their EXIF
 * (photographers archiving RAW metadata) would silently lose it.
 * The right design is to INFORM, not auto-modify. The pre-upload
 * toast pattern also gives users a single, well-understood escape
 * hatch (cancel the send) rather than a hidden "we're stripping
 * your photo" surprise.
 *
 * Why JPEG-only for v1.0
 * ----------------------
 * Covers ~90 % of camera/phone exports. Parsing other formats
 * without a library requires complex state machines:
 *   - PNG: iterates `tEXt`/`iTXt`/`zTXt` chunks in the IHDR chain
 *   - HEIC/HEIF: ISO BMFF meta-box with Exif item-type sub-box
 *   - TIFF: standalone IFD parsing
 *   - WebP: RIFF chunk walk (EXIF + XMP chunks only)
 * These are tractable but non-trivial and are deferred to v1.1+
 * under feature flag. For v1.0 the library-free JPEG APP1/Exif
 * parser is the highest-ROI implementation that catches the
 * dominant case without bloating the bundle.
 *
 * Format coverage is conservative by design — false negatives
 * (PNG with hidden PNG-text metadata) silently miss the warning,
 * which is acceptable per R-30 (we still upload clean bytes).
 * False positives (claiming JPEG has EXIF when it doesn't) are
 * guarded by the strict 0x45/0x78/0x69/0x66/0x00/0x00 magic
 * check below — anything that doesn't match "Exif\0\0" exactly
 * is treated as non-EXIF APP1 (e.g. XMP, ICC).
 *
 * Test coverage: src/lib/storage/exif.test.ts (M5-5 docstring §
 * verification). All 4 happy-path branches + 4 edge cases pinned.
 */

// ===========================================================================
// Constants — JPEG signature bytes
// ===========================================================================

/**
 * JPEG SOI (Start Of Image) marker. Every JPEG file begins with
 * exactly these two bytes (per ITU-T T.81 § B.1). We refuse to
 * even attempt EXIF parsing unless this matches.
 */
const JPEG_SOI = [0xff, 0xd8] as const;

/**
 * JPEG APP1 (Application Segment #1) marker. Per ITU-T T.81 the
 * APPn markers are `0xFF 0xEn`. EXIF specifically uses APP1
 * because the `Exif\0\0` magic — worn as a header inside APP1 —
 * displaces the older JFIF/JFXX convention.
 */
const JPEG_APP1_MARKER = 0xe1;

/**
 * 6-byte "Exif\0\0" magic worn at the start of every genuine
 * EXIF APP1 segment. Strict ASCII bytes — any deviation is treated
 * as a non-EXIF APP1 (most commonly XMP, which uses a different
 * magic: `http://ns.adobe.com/xap/1.0/\0`).
 */
const EXIF_MAGIC = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] as const;

/**
 * How many bytes of the file to scan — most EXIF payloads fit
 * comfortably in the first 64 KB, and limiting the read keeps the
 * detection lightweight (no need to stream the full 50 MB image).
 * Files larger than this scan window: we read the first 64 KB and
 * report results based on what's there. If the EXIF segment is
 * chunked across the boundary (extremely rare for camera-output
 * JPEGs), we report "no EXIF found" — a minor false-negative edge
 * case acceptable per the format coverage note above.
 *
 * 64 KB is well under the 50 MB MAX_ATTACHMENT_BYTES ceiling, so
 * the worst-case memory overhead is also bounded.
 */
const EXIF_SCAN_BYTES = 64 * 1024;

/**
 * JPEG standalone markers (no payload). Encountering these in a
 * marker scan means we step past them and continue segment-iteration.
 *   - RSTn (D0..D7) within entropy-coded data are skipped at the
 *     SOS-end boundary, but pre-SOS they don't normally appear
 *   - SOI (D8) only appears at offset 0
 *   - EOI (D9) terminates the image
 *   - TEM (01) is rare but encountered in some subroutines
 */
const JPEG_STANDALONE_MARKERS = new Set<number>([
  0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9,
]);

/**
 * JPEG SOS (Start Of Scan) marker. After this we are in entropy-coded
 * compressed data and can't iterate further segments without a
 * proper entropy decoder. We terminate scan here regardless of
 * whether EXIF was found (so a full JPEG with EXIF APP1 FOLLOWED BY
 * entropy-coded data still reports correctly).
 */
const JPEG_SOS_MARKER = 0xda;

// ===========================================================================
// Types
// ===========================================================================

/**
 * Result of `detectExif()`. We carry the `source` field so that
 * debug/telemetry flows can distinguish "we haven't read the
 * buffer" (extension short-circuit) from "we read the buffer and
 * confirmed EXIF" (APP1 + magic match) from "we read the buffer
 * and found no EXIF" (graceful coverage gap acknowledgment).
 *
 * For Compose wire-up only `hasExif` is read; the `sources` array
 * is for future v1.1 multi-format coverage (PNG text chunks, HEIC
 * meta boxes, etc.) so the API shape does not need to churn.
 */
export interface ExifDetectionResult {
  /**
   * True iff the file carries metadata we consider "EXIF" for the
   * purposes of the warning toast. False on:
   *   - non-image files (extension+MIME whitespace mismatch)
   *   - non-JPEG images (PNG / HEIC / TIFF / WebP / SVG)
   *   - JPEG without an APP1/Exif-0x0 segment within first 64 KB
   *   - JPEG with APP1 segments but no genuine "Exif\0\0" magic
   *   - truncated / corrupted JPEG (graceful no-finding)
   */
  hasExif: boolean;
  /**
   * Tag(s) of detected metadata channels. Empty when hasExif is
   * false. Used by future format coverage to add entries like:
   *   - 'jpeg_app1' — APP1/Exif match (v1.0 only this)
   *   - 'png_text_chunk' — planned v1.1
   *   - 'heic_meta_box' — planned v1.1
   *   - 'tiff_ifd' — planned v1.1
   */
  sources: ReadonlyArray<'jpeg_app1'>;
}

// ===========================================================================
// Public surface
// ===========================================================================

/**
 * Structural file-type check — cheap short-circuit before reading.
 *
 * Returns true if the file looks like a JPEG that MIGHT contain
 * EXIF. Used as a pre-flight to skip the buffer read for entirely
 * implausible formats (text PDFs, PNGs, HEICs in v1.0 scope, etc.).
 *
 * The check is "looks like" rather than "definitely" — we still
 * verify JPEG SOI magic from the buffer to avoid false-positives
 * from mislabeled files dropped onto the input.
 */
function looksLikeJpeg(file: File): boolean {
  if (file.type === 'image/jpeg') return true;
  // Some browsers omit .type when the OS didn't tag the file; fall
  // back to extension. Accept both .jpg and .jpeg.
  return /\.jpe?g$/i.test(file.name);
}

/**
 * Detect EXIF metadata on a `File`. Pure function — no network,
 * no side effects, no global state. Reads at most the first 64 KB
 * of the file via the standard `Blob.prototype.arrayBuffer()` (no
 * library required; `Blob` includes `File` since the Blob class).
 *
 * @returns `{ hasExif: boolean, sources: ['jpeg_app1' | ...] }`
 *          Safe to `await`; never throws (errors are coerced to
 *          a "no EXIF" finding by the outer catch below).
 */
export async function detectExif(file: File): Promise<ExifDetectionResult> {
  try {
    if (!looksLikeJpeg(file)) {
      return { hasExif: false, sources: [] };
    }
    const slice = file.slice(0, EXIF_SCAN_BYTES);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (hasExifInJpegBytes(bytes)) {
      return { hasExif: true, sources: ['jpeg_app1'] };
    }
    return { hasExif: false, sources: [] };
  } catch {
    // Defensive — any failure (corrupt file, locked chrome
    // profile, quota on the buffer read, etc.) is treated as
    // "no EXIF detected" so the upload proceeds uninstrumented.
    // Per SPEC § 6 BF E3, "EXIF strip 失败 → fallback，仍上传
    // 像素" — we apply that fallback at the detect layer (the
    // string metadata is informational; never blocking).
    return { hasExif: false, sources: [] };
  }
}

// ===========================================================================
// Internal — JPEG parser
// ===========================================================================

/**
 * Walk a JPEG byte buffer segment-by-segment looking for an APP1
 * segment whose first 6 bytes (post-length) match "Exif\0\0".
 *
 * Implementation notes:
 *   - We walk until `bytes.length` is exhausted OR we hit SOS
 *     (entropy-coded data begins; nothing structured past here).
 *   - Multiple APP1 segments are possible (e.g. Exif + XMP coexisting
 *     in some cameras). We scan past non-EXIF APP1 to keep walking.
 *   - Length encoding per ITU-T T.81 § B.1.4: 2-byte big-endian
 *     INCLUDING the 2 length bytes themselves. So a segment with
 *     `len = 8` consumes 8 bytes after the marker byte.
 *   - Standalone markers (RSTn / SOI / EOI / TEM / etc.) have no
 *     length; we step past them without reading bytes.
 *
 * Returns true on the first EXIF match, false otherwise (including
 * malformed lengths, truncated buffers, and SOS-terminated scans).
 */
function hasExifInJpegBytes(bytes: Uint8Array): boolean {
  // Need at least SOI (2 bytes) for any meaningful parse.
  if (bytes.length < 2) return false;

  // Check the SOI marker — every JPEG begins with 0xFFD8.
  if (bytes[0] !== JPEG_SOI[0] || bytes[1] !== JPEG_SOI[1]) {
    return false;
  }

  let offset = 2;
  while (offset < bytes.length) {
    // Skip 0xFF padding bytes. Per ITU-T T.81, JPEG markers start
    // with 0xFF and any subsequent 0xFF bytes before the marker
    // code are fillers (for byte-alignment on some encoders).
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset++;
    }
    if (offset >= bytes.length) return false;

    const marker = bytes[offset]!;
    offset++;

    // Standalone markers — no payload, continue scanning.
    if (JPEG_STANDALONE_MARKERS.has(marker)) continue;

    // SOS — entropy-coded data follows; structured segments end here.
    if (marker === JPEG_SOS_MARKER) return false;

    // All other markers carry a 2-byte big-endian length prefix
    // followed by (length - 2) bytes of payload.
    if (offset + 2 > bytes.length) return false;
    const segmentLength = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      // Malformed length or truncated buffer. Treat as "no EXIF
      // found in what we could read".
      return false;
    }

    if (marker === JPEG_APP1_MARKER && segmentLength >= 2 + EXIF_MAGIC.length) {
      // APP1 found with room for the Exif magic. Read 6 bytes
      // starting at `offset + 2` (past the length bytes).
      let isExifMagic = true;
      for (let i = 0; i < EXIF_MAGIC.length; i++) {
        if (bytes[offset + 2 + i] !== EXIF_MAGIC[i]) {
          isExifMagic = false;
          break;
        }
      }
      if (isExifMagic) return true;
      // Non-EXIF APP1 (e.g. XMP) — keep scanning in case more
      // APP1 segments follow.
    }

    offset += segmentLength;
  }

  return false;
}
