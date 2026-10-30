// Dịch vụ âm thanh sử dụng Web Audio API (hoạt động offline, không cần tải tệp ngoài)

class TrinhQuanLyAmThanh {
  private ctx: AudioContext | null = null;
  private daBat: boolean = true;

  constructor() {
    // Khởi tạo AudioContext khi có tương tác người dùng
  }

  private layContext(): AudioContext | null {
    if (!this.daBat) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public datTrangThaiAmThanh(bat: boolean) {
    this.daBat = bat;
  }

  public dangBat(): boolean {
    return this.daBat;
  }

  // Tiếng kim gõ nhẹ khi vòng quay qua từng ô hoặc chuyển hộp
  public phatTiengTick() {
    const ctx = this.layContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Bỏ qua lỗi audio nếu trình duyệt hạn chế
    }
  }

  // Tiếng mở hộp bí ẩn thần bí
  public phatTiengMoHop() {
    const ctx = this.layContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const nots = [330, 392, 494, 587, 659, 784];
      nots.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.3);
      });
    } catch {
      // Audio fallback
    }
  }

  // Tiếng nhạc chiến thắng / chúc mừng khi kết quả xuất hiện
  public phatTiengChucMung() {
    const ctx = this.layContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Hợp âm chiến thắng rực rỡ C major -> G -> C (octave cao)
      const giaiDieu = [
        { f: 523.25, t: 0.0, d: 0.15 }, // C5
        { f: 659.25, t: 0.12, d: 0.15 }, // E5
        { f: 783.99, t: 0.24, d: 0.2 },  // G5
        { f: 1046.50, t: 0.40, d: 0.6 }, // C6 kéo dài
      ];

      giaiDieu.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + note.t);

        gain.gain.setValueAtTime(0, now + note.t);
        gain.gain.linearRampToValueAtTime(0.3, now + note.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.t);
        osc.stop(now + note.t + note.d);
      });
    } catch {
      // Audio fallback
    }
  }

  // Tiếng nảy bi Plinko / mồi câu
  public plinkoNay() {
    this.phatTiengTick();
  }

  // Tiếng động vật bật nhảy qua rào
  public dongVatNhay() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Fallback
    }
  }

  // Alias âm thanh chiến thắng
  public chienThang() {
    this.phatTiengChucMung();
  }
}

export const amThanh = new TrinhQuanLyAmThanh();
