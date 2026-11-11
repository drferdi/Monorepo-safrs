// ANSI TrueColor Theme for Sentra Terminal (macOS Cyber Neon style)
const ESC = '\x1b[';

export const Colors = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,

  // Foreground TrueColor
  cyan: `${ESC}38;2;0;235;255m`,
  mint: `${ESC}38;2;0;255;170m`,
  blue: `${ESC}38;2;60;140;255m`,
  purple: `${ESC}38;2;170;90;255m`,
  yellow: `${ESC}38;2;255;210;60m`,
  red: `${ESC}38;2;255;70;90m`,
  gray: `${ESC}38;2;110;125;145m`,
  white: `${ESC}38;2;240;245;255m`,
  dark: `${ESC}38;2;40;48;60m`,

  // Traffic lights
  trafficRed: `${ESC}38;2;255;95;86m●${ESC}0m`,
  trafficYellow: `${ESC}38;2;255;189;46m●${ESC}0m`,
  trafficGreen: `${ESC}38;2;39;201;63m●${ESC}0m`,

  // Backgrounds
  bgCard: `${ESC}48;2;15;22;32m`,
  bgBar: `${ESC}48;2;25;35;50m`,
  bgCyan: `${ESC}48;2;0;180;220m${ESC}38;2;0;0;0m`,
  bgMint: `${ESC}48;2;0;200;120m${ESC}38;2;0;0;0m`
};

export class SentraTerminal {
  static clear(): void {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1bc');
    }
  }

  static renderHeader(title: string = 'SENTRA WEB HARVESTER', subtitle: string = 'Enterprise Tech Web Archiver & Offline Harvester'): void {
    const C = Colors;
    console.log('');
    console.log(`${C.blue}╭─ ${C.trafficRed} ${C.trafficYellow} ${C.trafficGreen}  ${C.white}${C.bold}${title}${C.reset} ${C.dim}─ macOS Terminal Suite${C.reset} ${C.blue}${'─'.repeat(24)}╮${C.reset}`);
    console.log(`${C.blue}│${C.reset}  ${C.mint}${C.bold}Aldebaran-AImee-Audrey-Del${C.reset} ${C.dim}│ Gafferverse Supernode v2026-2027${C.reset}${' '.repeat(16)}${C.blue}│${C.reset}`);
    console.log(`${C.blue}│${C.reset}  ${C.gray}Core Engine : ${C.cyan}C:\\Program Files\\WinHTTrack\\httrack.exe ${C.mint}[Turbo Active]${C.reset}${' '.repeat(6)}${C.blue}│${C.reset}`);
    console.log(`${C.blue}│${C.reset}  ${C.gray}Features    : ${C.white}Modern Chrome Spoofing • Tech MIME Filters • Markdown LLM${C.reset} ${C.blue}│${C.reset}`);
    console.log(`${C.blue}╰${'─'.repeat(75)}╯${C.reset}`);
    console.log('');
  }

  static renderCard(title: string, items: { label: string; value: string; color?: string }[]): void {
    const C = Colors;
    console.log(`${C.blue}╭─ ${C.cyan}${title} ${C.blue}${'─'.repeat(Math.max(4, 72 - title.length))}╮${C.reset}`);
    for (const item of items) {
      const color = item.color || C.white;
      const labelPad = item.label.padEnd(18, ' ');
      console.log(`${C.blue}│${C.reset}  ${C.dim}${labelPad}:${C.reset} ${color}${item.value}${C.reset}`);
    }
    console.log(`${C.blue}╰${'─'.repeat(75)}╯${C.reset}`);
    console.log('');
  }

  static progressBar(percent: number, width: number = 26): string {
    const C = Colors;
    const clamped = Math.min(100, Math.max(0, percent));
    const filled = Math.round((width * clamped) / 100);
    const empty = width - filled;
    const bar = `${C.mint}${'█'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset}`;
    return `[${bar}] ${C.yellow}${clamped.toFixed(1)}%${C.reset}`;
  }

  static stepBadge(step: number, total: number, label: string, status: string = 'RUNNING'): void {
    const C = Colors;
    const stepStr = `${C.blue}[${C.cyan}${step.toString().padStart(2, '0')}/${total.toString().padStart(2, '0')}${C.blue}]${C.reset}`;
    const statusColor = status === 'DONE' ? C.mint : status === 'SKIP' ? C.yellow : status === 'FAIL' ? C.red : C.cyan;
    const statusBadge = `[${statusColor}${status.padEnd(7, ' ')}${C.reset}]`;
    console.log(`  ${stepStr} ${statusBadge} ${C.white}${label}${C.reset}`);
  }

  static logInfo(msg: string): void {
    const C = Colors;
    console.log(`  ${C.blue}ℹ${C.reset} ${C.gray}${msg}${C.reset}`);
  }

  static logSuccess(msg: string): void {
    const C = Colors;
    console.log(`  ${C.mint}✔${C.reset} ${C.mint}${C.bold}${msg}${C.reset}`);
  }

  static logWarning(msg: string): void {
    const C = Colors;
    console.log(`  ${C.yellow}⚠${C.reset} ${C.yellow}${msg}${C.reset}`);
  }

  static logError(msg: string): void {
    const C = Colors;
    console.log(`  ${C.red}✖${C.reset} ${C.red}${C.bold}${msg}${C.reset}`);
  }
}
