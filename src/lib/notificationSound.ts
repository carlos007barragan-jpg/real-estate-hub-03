// Pre-generate a short chime as a WAV file in base64
// This approach is more reliable than Web Audio API for background notifications
function generateChimeWav(): string {
  const sampleRate = 22050;
  const duration = 0.4;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Generate two-tone chime
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope1 = Math.max(0, 1 - t / 0.3) * 0.3;
    const envelope2 = t > 0.1 ? Math.max(0, 1 - (t - 0.1) / 0.3) * 0.25 : 0;
    const sample = Math.sin(2 * Math.PI * 830 * t) * envelope1 +
                   Math.sin(2 * Math.PI * 1100 * t) * envelope2;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(binary);
}

let chimeDataUrl: string | null = null;

export function playNotificationChime() {
  try {
    if (!chimeDataUrl) {
      chimeDataUrl = generateChimeWav();
    }
    const audio = new Audio(chimeDataUrl);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Browser blocked autoplay - this is expected if user hasn't interacted yet
    });
  } catch (e) {
    // Silently fail
  }
}
