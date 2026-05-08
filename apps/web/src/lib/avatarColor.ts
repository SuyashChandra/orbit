// Warm, cozy palette for friend-avatar fallbacks. Picked deterministically
// from a user's id so the same user always gets the same color.
const PALETTE = [
  '#4fb89a', // sage teal (accent)
  '#e6a76d', // honey
  '#d88c8c', // dusty rose
  '#9c8cc9', // soft lavender
  '#7eb5d4', // pale sky
  '#bfb886', // warm olive
  '#c98e7c', // terracotta
  '#8cb88a', // moss
] as const;

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length]!;
}
