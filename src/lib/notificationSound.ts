function generateChimeWav(): string {
  const sampleRate = 22050;
  const duration = 0.4;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

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
let unlockedAudio: HTMLAudioElement | null = null;

// Call this once on any user interaction to "unlock" audio playback
function ensureAudioUnlocked() {
  if (unlockedAudio) return;
  if (!chimeDataUrl) chimeDataUrl = generateChimeWav();
  unlockedAudio = new Audio(chimeDataUrl);
  unlockedAudio.volume = 0;
  unlockedAudio.play().then(() => {
    unlockedAudio!.pause();
    unlockedAudio!.currentTime = 0;
    unlockedAudio!.volume = 0.5;
  }).catch(() => {});
}

// Auto-unlock on first user interaction
if (typeof window !== "undefined") {
  const unlock = () => {
    ensureAudioUnlocked();
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("click", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock);
}

export function playNotificationChime() {
  try {
    if (!chimeDataUrl) chimeDataUrl = generateChimeWav();
    
    if (unlockedAudio) {
      unlockedAudio.currentTime = 0;
      unlockedAudio.volume = 0.5;
      unlockedAudio.play().catch(() => {});
    } else {
      const audio = new Audio(chimeDataUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  } catch (e) {
    // Silently fail
  }
}
