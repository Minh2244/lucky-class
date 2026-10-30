// Hiệu ứng pháo hoa giấy Confetti chào mừng học sinh may mắn

interface HatPhaoHoa {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

export function banPhaoHoa(canvas: HTMLCanvasElement, durationMs: number = 3000) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const mauSac = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#eab308'];
  const hatList: HatPhaoHoa[] = [];
  const soLuong = 150;

  for (let i = 0; i < soLuong; i++) {
    const goc = (Math.random() * Math.PI) / 2 + Math.PI / 4; // Bắn từ hai bên hoặc giữa
    const luc = Math.random() * 12 + 8;
    const batDauTrai = Math.random() > 0.5;

    hatList.push({
      x: batDauTrai ? canvas.width * 0.2 : canvas.width * 0.8,
      y: canvas.height * 0.6,
      vx: (batDauTrai ? 1 : -1) * Math.cos(goc) * luc + (Math.random() - 0.5) * 4,
      vy: -Math.sin(goc) * luc - Math.random() * 4,
      color: mauSac[Math.floor(Math.random() * mauSac.length)],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1
    });
  }

  const startTime = performance.now();

  function animate(currentTime: number) {
    if (!ctx) return;
    const elapsed = currentTime - startTime;
    if (elapsed > durationMs) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    hatList.forEach(hat => {
      hat.x += hat.vx;
      hat.y += hat.vy;
      hat.vy += 0.25; // Trọng lực
      hat.vx *= 0.98; // Kháng gió
      hat.rotation += hat.rotationSpeed;

      if (elapsed > durationMs * 0.7) {
        hat.opacity = Math.max(0, 1 - (elapsed - durationMs * 0.7) / (durationMs * 0.3));
      }

      ctx.save();
      ctx.translate(hat.x, hat.y);
      ctx.rotate(hat.rotation);
      ctx.globalAlpha = hat.opacity;
      ctx.fillStyle = hat.color;
      ctx.fillRect(-hat.size / 2, -hat.size / 2, hat.size, hat.size * 0.6);
      ctx.restore();
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
