/** Earliest segment/circle intersection, preventing fast projectiles tunneling. */
export function segmentCircleHit(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, radius: number): number | null {
  const fx = x1 - cx;
  const fy = y1 - cy;
  const c = fx * fx + fy * fy - radius * radius;
  if (c <= 0) return 0;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
