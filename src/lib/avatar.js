// Initials and a stable colour per person, for avatar circles
const AVATAR_COLORS = ['#1E3A8A', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#0369a1'];
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
export const avatarColor = (name = '') => AVATAR_COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
