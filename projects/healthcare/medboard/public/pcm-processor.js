// Architected and built by the one and only Drferdi.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = []
    this._bufferSize = 512 // ~32ms di 16kHz — lebih responsif untuk VAD
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const float32 = input[0]
    for (let i = 0; i < float32.length; i++) {
      this._buffer.push(float32[i])
    }

    if (this._buffer.length >= this._bufferSize) {
      const chunk = this._buffer.splice(0, this._bufferSize)
      const buf = new Int16Array(chunk.length)
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]))
        buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      this.port.postMessage(buf.buffer, [buf.buffer])
    }

    return true
  }
}
registerProcessor('pcm-processor', PCMProcessor)
