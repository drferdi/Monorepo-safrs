// Geometry and spring for the sidebar submenu, after lab.xevrion.dev/lab/sidebar-submenu.
// Rows are a fixed height so the tree is one drawn path rather than measured.
export const SUBMENU_ROW = 34;
export const SUBMENU_TITLE = 40;
const TRUNK = 4;
const BEND = 6;
const REACH = 12;

export const rowMiddle = (index: number) => index * SUBMENU_ROW + SUBMENU_ROW / 2;
export const branchPath = (y: number) => `M${TRUNK} ${y - BEND} Q${TRUNK} ${y} ${TRUNK + BEND} ${y} H${REACH}`;
export const litPath = (y: number) => `M${TRUNK} 0 V${y - BEND} Q${TRUNK} ${y} ${TRUNK + BEND} ${y} H${REACH}`;
export function treePath(count: number): string {
  if (!count) return "";
  return [`M${TRUNK} 0 V${rowMiddle(count - 1) - BEND}`, ...Array.from({ length: count }, (_, i) => branchPath(rowMiddle(i)))].join(" ");
}

// The reference's spring (visualDuration 0.35 s, bounce 0.12), with stiffness and damping derived as motion does.
function createSpring(visualDuration: number, bounce: number) {
  const omega = (2 * Math.PI) / (visualDuration * 1.2);
  const zeta = Math.min(1, Math.max(0.05, 1 - bounce));
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  const at = (t: number) => t <= 0 ? 0 : 1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + (zeta * omega / damped) * Math.sin(damped * t));
  let duration = visualDuration;
  while (Math.abs(1 - at(duration)) > 0.0005 || Math.abs(1 - at(duration + 0.016)) > 0.0005) duration += 0.004;
  return { at, duration };
}
export const spring = createSpring(0.35, 0.12);
// The same curve for CSS transitions (the section bar).
export const springEasing = `linear(${Array.from({ length: 21 }, (_, i) => spring.at((i / 20) * spring.duration).toFixed(4)).join(", ")})`;
