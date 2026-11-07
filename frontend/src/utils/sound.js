/**
 * Trình phát âm báo đơn hàng mới.
 * Dùng WAV blob + HTMLAudioElement thay vì Web Audio API trực tiếp
 * để tránh bị Chrome chặn bởi Autoplay Policy khi gọi từ setInterval.
 */

// ─── Tạo WAV blob chứa chime 2 nốt bằng OfflineAudioContext ───────────────
let chimeAudioEl = null;      // HTMLAudioElement được tái sử dụng
let chimeObjectUrl = null;    // Object URL của blob WAV
let isAudioUnlocked = false;  // Trình duyệt đã cho phép phát chưa

/**
 * Render chime thành WAV blob dùng OfflineAudioContext (không bị chặn autoplay
 * vì chỉ render, không phát trực tiếp).
 */
async function buildChimeBlob() {
  const sampleRate = 44100;
  const duration = 1.1; // giây
  const offCtx = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);

  const playTone = (freq, start, dur, vol) => {
    const osc = offCtx.createOscillator();
    const gain = offCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(offCtx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playTone(659.25, 0,    0.45, 0.28);   // E5
  playTone(880.00, 0.16, 0.80, 0.35);   // A5
  playTone(1318.5, 0.18, 0.90, 0.14);   // E6 (bội âm)

  const rendered = await offCtx.startRendering();

  // Chuyển AudioBuffer → WAV PCM 16-bit
  const pcm = rendered.getChannelData(0);
  const numSamples = pcm.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Khởi tạo và preload audio element (chạy 1 lần khi module load).
 * Không phát — chỉ chuẩn bị sẵn để `play()` nhanh sau này.
 */
async function initChimeAudio() {
  try {
    const blob = await buildChimeBlob();
    chimeObjectUrl = URL.createObjectURL(blob);
    chimeAudioEl = new Audio(chimeObjectUrl);
    chimeAudioEl.preload = "auto";
    chimeAudioEl.volume = 1.0;
    // Tải vào bộ nhớ
    chimeAudioEl.load();
  } catch (err) {
    console.warn("[Sound] Không thể khởi tạo âm thanh:", err);
  }
}

// Chạy ngay khi module load
if (typeof window !== "undefined") {
  initChimeAudio();
}

// ─── Unlock: user cần click 1 lần để trình duyệt cho phép autoplay ─────────
if (typeof window !== "undefined") {
  const unlock = async () => {
    if (isAudioUnlocked || !chimeAudioEl) return;
    try {
      // Play silent rồi pause ngay để "unlock" audio context của trình duyệt
      chimeAudioEl.volume = 0;
      await chimeAudioEl.play();
      chimeAudioEl.pause();
      chimeAudioEl.currentTime = 0;
      chimeAudioEl.volume = 1.0;
      isAudioUnlocked = true;
    } catch {
      // Chưa unlock được — sẽ thử lại lần sau
    }
  };

  ["click", "mousedown", "pointerdown", "touchstart", "keydown"].forEach((evt) => {
    window.addEventListener(evt, unlock, { once: false, passive: true, capture: true });
  });
}

// ─── Xuất hàm public ────────────────────────────────────────────────────────

/**
 * Kiểm tra trạng thái bật/tắt âm thanh lưu trong localStorage.
 * Mặc định: BẬT (true) nếu chưa có cài đặt.
 */
export function isOrderSoundEnabled() {
  try {
    const val = localStorage.getItem("cf_order_sound");
    return val === null ? true : val === "1" || val === "true";
  } catch {
    return true;
  }
}

/**
 * Lưu trạng thái bật/tắt âm thanh.
 */
export function setOrderSoundEnabled(enabled) {
  try {
    localStorage.setItem("cf_order_sound", enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent("cf_order_sound_change", { detail: { enabled } }));
  } catch {}
}

/**
 * Phát âm chuông báo đơn mới.
 * Dùng HTMLAudioElement (đáng tin cậy hơn Web Audio API với autoplay policy).
 */
export function playOrderSound() {
  if (!isOrderSoundEnabled()) return;

  if (!chimeAudioEl) {
    console.warn("[Sound] Audio element chưa sẵn sàng.");
    return;
  }

  // Reset về đầu nếu đang phát dở
  chimeAudioEl.currentTime = 0;
  chimeAudioEl.volume = 1.0;

  const playPromise = chimeAudioEl.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      // Trình duyệt chặn autoplay — cần user gesture trước
      console.warn("[Sound] Chưa được phép phát âm. User cần click vào trang trước.", err.message);
    });
  }
}
