class AudioManager {
  current: HTMLAudioElement | null = null;
  audios: Set<HTMLAudioElement> = new Set();
  maxVolume = 0.35; // slightly lower overall volume
  fadeInterval = 60; // ms per fade step
  enabled = true;

  cacheBust(src: string) {
    return src + (src.includes('?') ? '&' : '?') + 'cb=' + Date.now();
  }

  // transitionTo: switch to `src`, fading out existing audio over `fadeOutMs` (default 3000ms)
  // and fading in the new audio over `fadeInMs` (default 1200ms).
  async transitionTo(src: string, opts?: { fadeOutMs?: number; fadeInMs?: number }) {
    if (!this.enabled) return;
    const fadeOutMs = opts?.fadeOutMs ?? 3000;
    const fadeInMs = opts?.fadeInMs ?? 1200;

    const old = this.current;
    if (old) {
      // Start fade out immediately in the background to avoid blocking
      this.fadeOut(old, fadeOutMs);
      if (this.current === old) this.current = null;
    }

    const busted = this.cacheBust(src);
    const audio = new Audio(busted);
    audio.loop = true;
    audio.volume = 0;
    
    this.current = audio;
    this.audios.add(audio);

    try {
      await audio.play();
    } catch (e) {
      console.warn("Audio play blocked by browser policy until user interaction:", e);
    }

    // Fade in over fadeInMs
    try {
      const steps = Math.max(1, Math.ceil(fadeInMs / this.fadeInterval));
      const stepAmount = this.maxVolume / steps;
      let vol = 0;
      const iv = setInterval(() => {
        if (!this.audios.has(audio) || this.current !== audio) { 
          clearInterval(iv); 
          return; 
        }
        if (vol < this.maxVolume) {
          vol = Math.min(vol + stepAmount, this.maxVolume);
          try { audio.volume = vol; } catch (e) {}
        } else {
          clearInterval(iv);
        }
      }, Math.max(10, Math.floor(fadeInMs / steps)));
    } catch (e) {
      try { audio.volume = this.maxVolume; } catch (e) {}
    }
  }

  // fadeOut: gracefully reduce `audio.volume` to 0 over `fadeMs` then pause/remove src
  fadeOut(audio: HTMLAudioElement, fadeMs = 3000) {
    return new Promise<void>((resolve) => {
      try {
        if (audio.paused) {
          try { 
            audio.pause();
            audio.removeAttribute('src'); 
            audio.load();
          } catch (e) {}
          this.audios.delete(audio);
          resolve();
          return;
        }

        const steps = Math.max(1, Math.ceil(fadeMs / this.fadeInterval));
        let vol = audio.volume;
        const stepAmount = vol / steps;
        const intervalMs = Math.max(10, Math.floor(fadeMs / steps));

        const fadeOut = setInterval(() => {
          try {
            if (vol > stepAmount + 0.001) {
              vol = Math.max(0, vol - stepAmount);
              audio.volume = vol;
            } else {
              clearInterval(fadeOut);
              try { audio.pause(); } catch (e) {}
              try { 
                audio.removeAttribute('src'); 
                audio.load();
              } catch (e) {}
              this.audios.delete(audio);
              resolve();
            }
          } catch (e) {
            clearInterval(fadeOut);
            try { audio.pause(); } catch (e) {}
            try { 
              audio.removeAttribute('src'); 
              audio.load();
            } catch (e) {}
            this.audios.delete(audio);
            resolve();
          }
        }, intervalMs);
      } catch (e) {
        try { audio.pause(); } catch (e) {}
        try { 
          audio.removeAttribute('src'); 
          audio.load();
        } catch (e) {}
        this.audios.delete(audio);
        resolve();
      }
    });
  }

  // stop: fade out current audio over `fadeMs` (defaults to 3000ms). Returns when complete.
  async stop(fadeMs = 3000) {
    if (!this.current) return;
    const old = this.current;
    this.current = null;
    await this.fadeOut(old, fadeMs);
  }

  setEnabled(flag: boolean) {
    this.enabled = flag;
    if (!flag) {
      this.stop(500); // quick fade when disabling
    }
  }

  preload(src: string) {
    try {
      const a = new Audio(this.cacheBust(src));
      a.preload = 'auto';
    } catch (e) {}
  }

  // Explicit memory leak teardown
  destroy() {
    this.current = null;
    for (const audio of this.audios) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (e) {}
    }
    this.audios.clear();
  }
}

const audioManager = new AudioManager();
export default audioManager;
