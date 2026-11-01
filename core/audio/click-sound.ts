/**
 * Single place to configure button click sounds for the whole app.
 *
 * Change `src` to swap the file (local under `public/` or any HTTPS URL).
 * Add `data-no-click-sound` on a button to skip the sound for that element.
 */
export const CLICK_SOUND = {
  /** Master switch for all button click sounds */
  enabled: true,
  /**
   * Audio source:
   * - Local: "/sounds/button-click.mp3" (in `public/sounds/`)
   * - Or any direct HTTPS .mp3/.wav URL
   * - `null` → built-in soft click (Web Audio)
   */
  src: "/sounds/button-click.mp3" as string | null,
  /** 0–1 */
  volume: 0.4,
} as const;

let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = CLICK_SOUND.src;
  if (!src) return null;
  if (!audioEl || audioEl.src !== new URL(src, window.location.origin).href) {
    audioEl = new Audio(src);
    audioEl.preload = "auto";
  }
  audioEl.volume = Math.max(0, Math.min(1, CLICK_SOUND.volume));
  return audioEl;
}

function playBuiltInClick() {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, CLICK_SOUND.volume * 0.45),
    now + 0.005
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

/** Play the configured button click sound (safe to call from any click handler). */
export function playButtonClickSound(): void {
  if (!CLICK_SOUND.enabled || typeof window === "undefined") return;

  try {
    const el = getAudioElement();
    if (el) {
      el.currentTime = 0;
      void el.play().catch(() => {
        playBuiltInClick();
      });
      return;
    }
    playBuiltInClick();
  } catch {
    // Ignore autoplay / audio errors so clicks never break UI
  }
}

function isClickableButton(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest(
    "button, [role='button'], [data-slot='button'], input[type='button'], input[type='submit']"
  );
  if (!el) return false;
  if (el.hasAttribute("data-no-click-sound")) return false;
  if (el instanceof HTMLButtonElement && el.disabled) return false;
  if (el.getAttribute("aria-disabled") === "true") return false;
  return true;
}

/** Capture-phase listener so every button in the app clicks with sound. */
export function installGlobalButtonClickSound(): () => void {
  if (typeof window === "undefined") return () => {};

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (!isClickableButton(event.target)) return;
    playButtonClickSound();
  };

  document.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}
