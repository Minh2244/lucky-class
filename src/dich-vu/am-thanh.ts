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

  // Tiếng vịt kêu "Cạp! Cạp!" vui nhộn cho trò Đua Vịt
  public phatTiengVitKeu() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const baseFreq = 310 + Math.random() * 65;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.42, now + 0.045);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.78, now + 0.14);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(3.2, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Fallback
    }
  }

  // Tiếng mô-tơ càng gắp thú bông
  public phatTiengCangGap() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(420, now + 0.14);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Fallback
    }
  }

  // Tiếng tuột càng rơi thú bông ("Ối!")
  public phatTiengTuotCang() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.28);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.30);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.30);
    } catch {
      // Fallback
    }
  }

  // Tiếng đập nứt vỏ trứng rồng & sấm sét
  public phatTiengNutTrung() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.20);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.20);
    } catch {
      // Fallback
    }
  }

  // Tiếng tích tắc đồng hồ bom hẹn giờ (tăng cao độ khi sắp nổ)
  public phatTiengBomTick(khanCap: boolean = false) {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const freq = khanCap ? 980 : 680;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Fallback
    }
  }

  // Tiếng nổ "BÙM!" vui nhộn khi bom hẹn giờ hết giờ
  public phatTiengBomNo() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.45);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
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
