// Ported from Human Atlas (MIT, © 2026 ashemag, licence in LICENSE-human-atlas.txt): https://github.com/slorksmo/Human-Atlas

/** The server may send a .gz chunk as a compressed response or as a plain gzip file. Fetch has
 * already undone Content-Encoding, so look at the payload to avoid decoding twice. */
export async function decodeModelResponse(response: Response, expectedBytes: number): Promise<ArrayBuffer> {
  if (!response.ok) throw new Error('Satu berkas anatomi tidak bisa dimuat.')
  const payload = await response.arrayBuffer()
  const signature = new Uint8Array(payload, 0, Math.min(2, payload.byteLength))
  const gzip = signature[0] === 0x1f && signature[1] === 0x8b
  const buffer = gzip
    ? await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    : payload
  if (buffer.byteLength !== expectedBytes) throw new Error('Satu berkas anatomi tidak lengkap. Muat ulang atlas.')
  return buffer
}
