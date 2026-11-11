export type ScrapeProfileId =
  | 'tech-docs'
  | 'ai-research'
  | 'github-repos'
  | 'full-mirror'
  | 'warc-archive'
  | 'markdown-only';

export interface ProfileDefinition {
  id: ScrapeProfileId;
  name: string;
  tagline: string;
  depth: number;
  maxConnections: number;
  robotsBypass: boolean;
  rewriteLinks: boolean;
  createSearchIndex: boolean;
  createWarc: boolean;
  includeMimes: string[];
  excludeMimes: string[];
  excludePatterns: string[];
  userAgent: string;
}

export interface ScrapeOptions {
  url: string;
  profile: ScrapeProfileId;
  depth?: number;
  outputDir?: string;
  maxConnections?: number;
  bypassRobots?: boolean;
  extractMarkdown?: boolean;
  warc?: boolean;
  quiet?: boolean;
  smoke?: boolean;
}

export interface TelemetryEvent {
  kind: 'start' | 'progress' | 'file' | 'stats' | 'done' | 'error';
  message: string;
  url?: string;
  file?: string;
  bytes?: number;
  speedKbps?: number;
  elapsedSec?: number;
}
