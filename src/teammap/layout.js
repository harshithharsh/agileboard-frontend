// Layout for the Team Map, centred on (0, 0): the project in the middle, squads in a column on its
// left and right (balanced by size, in straight columns), and each squad's members in an aligned
// list on the outer side of the squad, names pointing outwards, like an org mind-map.

export const SQUAD_COLORS = ['#3b82f6', '#db2777', '#10b981', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ef4444', '#14b8a6', '#a855f7', '#f97316'];

const ROW = 40; // vertical space per member
const SQUAD_MIN = 110; // vertical space for a squad with few members
const SQUAD_GAP = 36;
const SQUAD_X = 280; // project centre → squad column
const MEMBER_DX = 175; // squad centre → member column (straight, aligned edge)
const textWidth = (s) => s.length * 7; // 13px Inter, close enough for layout
export const SQUAD_W = 150, SQUAD_H = 52, CORE_W = 170, CORE_H = 64;

const blockHeight = (s) => Math.max(SQUAD_MIN, s.members.length * ROW);

export function layoutMap(project) {
  // Split squads into a left and a right column with about the same height (keeps the original order)
  const left = [], right = [];
  let hl = 0, hr = 0;
  project.squads.forEach((s, i) => {
    const h = blockHeight(s) + SQUAD_GAP;
    if (hl <= hr) { left.push({ s, i }); hl += h; } else { right.push({ s, i }); hr += h; }
  });

  let minX = -140, maxX = 140, minY = -140, maxY = 140;
  const grow = (x1, y1, x2, y2) => {
    minX = Math.min(minX, x1); maxX = Math.max(maxX, x2); minY = Math.min(minY, y1); maxY = Math.max(maxY, y2);
  };

  const place = (column, side) => {
    const total = column.reduce((n, { s }) => n + blockHeight(s) + SQUAD_GAP, -SQUAD_GAP);
    let top = -total / 2;
    return column.map(({ s, i }) => {
      const h = blockHeight(s);
      const y = top + h / 2;
      top += h + SQUAD_GAP;
      const x = side * SQUAD_X; // squads of one side in a straight column
      const color = SQUAD_COLORS[i % SQUAD_COLORS.length];
      grow(x - 80, y - 80, x + 80, y + 80);

      // Project → squad: an S-curve from the project's side to the squad's inner side
      const from = { x: side * CORE_W / 2, y: Math.max(-20, Math.min(20, y * 0.1)) };
      const to = { x: x - side * SQUAD_W / 2, y };
      const link = `M${from.x},${from.y} C${from.x + side * 110},${from.y} ${to.x - side * 110},${to.y} ${to.x},${to.y}`;

      const k = s.members.length;
      const members = s.members.map((m, j) => {
        const dy = (j - (k - 1) / 2) * ROW;
        const mx = x + side * MEMBER_DX;
        const my = y + dy;
        const clean = m.name.replace(/\s+/g, ' ').trim();
        const short = clean.length > 22 ? `${clean.slice(0, 21)}…` : clean;
        const pill = textWidth(short) + 32; // chip: dot + name
        const leftward = side < 0; // names point away from the project
        const dot = { x: 0, y: 0 }; // chips are anchored at their end facing the squad
        const start = { x: x + side * SQUAD_W / 2, y };
        const ex = mx;
        const link2 = `M${start.x},${start.y} C${start.x + side * 60},${start.y} ${ex - side * 60},${my} ${ex},${my}`;
        grow(leftward ? mx - pill : mx, my - 18, leftward ? mx : mx + pill, my + 18);
        return { id: m.id, personId: m.id, squadId: s.id, name: m.name, short, x: mx, y: my, pill, left: leftward, dot, link: link2 };
      });
      return { id: s.id, squadId: s.id, name: s.name, kind: s.kind, members, color, x, y, link };
    });
  };

  const squads = [...place(left, -1), ...place(right, 1)];
  const pad = 36;
  return {
    squads,
    ring: 170,
    minX: minX - pad, minY: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2,
  };
}
