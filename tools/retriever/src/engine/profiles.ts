import type { ProfileDefinition, ScrapeProfileId } from '../types.js';

// Ultra-Modern User-Agent (Chrome 134 on macOS Sequoia)
export const MODERN_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

export const PROFILES: Record<ScrapeProfileId, ProfileDefinition> = {
  'tech-docs': {
    id: 'tech-docs',
    name: 'Tech Documentation & API Specs',
    tagline: 'Deep recursive crawler for MDN, FastAPI, React, Next.js, Rust, Python, Docker docs',
    depth: 4,
    maxConnections: 8,
    robotsBypass: true,
    rewriteLinks: true,
    createSearchIndex: true,
    createWarc: false,
    includeMimes: ['+*.html', '+*.htm', '+*.css', '+*.js', '+*.json', '+*.md', '+*.png', '+*.jpg', '+*.jpeg', '+*.svg', '+*.webp', '+*.woff2', '+*.glb', '+*.gltf', '+*.bin', '+*.hdr'],
    excludeMimes: ['-mime:video/*', '-mime:audio/*', '-mime:application/zip', '-mime:application/x-tar'],
    excludePatterns: [
      '-*google-analytics.com*',
      '-*googletagmanager.com*',
      '-*doubleclick.net*',
      '-*facebook.com*',
      '-*twitter.com*',
      '-*disqus.com*',
      '-*sentry.io*',
      '-*segment.io*',
      '-*hotjar.com*'
    ],
    userAgent: MODERN_USER_AGENT
  },

  'ai-research': {
    id: 'ai-research',
    name: 'AI Research Papers & Tech Blogs',
    tagline: 'High-signal scraper for arXiv, Dev.to, Medium tech, Substack, research labs',
    depth: 2,
    maxConnections: 6,
    robotsBypass: true,
    rewriteLinks: true,
    createSearchIndex: true,
    createWarc: false,
    includeMimes: ['+*.html', '+*.htm', '+*.pdf', '+*.png', '+*.jpg', '+*.svg', '+*.css'],
    excludeMimes: ['-mime:video/*', '-mime:audio/*'],
    excludePatterns: [
      '-*adservice*',
      '-*ads*',
      '-*analytics*',
      '-*tracker*',
      '-*cookie*'
    ],
    userAgent: MODERN_USER_AGENT
  },

  'github-repos': {
    id: 'github-repos',
    name: 'GitHub Wikis & Code Docs',
    tagline: 'Scrapes repository documentation, wikis, and markdown guides without git history traps',
    depth: 3,
    maxConnections: 4,
    robotsBypass: true,
    rewriteLinks: true,
    createSearchIndex: true,
    createWarc: false,
    includeMimes: ['+*.html', '+*.md', '+*.png', '+*.svg', '+*.css'],
    excludeMimes: ['-mime:video/*', '-mime:application/zip'],
    excludePatterns: [
      '-*/commits/*',
      '-*/commit/*',
      '-*/branches/*',
      '-*/releases/download/*',
      '-*/archive/*'
    ],
    userAgent: MODERN_USER_AGENT
  },

  'full-mirror': {
    id: 'full-mirror',
    name: 'Sovereign 100% Offline Mirror',
    tagline: 'Complete website clone with rewritten relative paths and local search index',
    depth: 5,
    maxConnections: 8,
    robotsBypass: true,
    rewriteLinks: true,
    createSearchIndex: true,
    createWarc: false,
    includeMimes: ['+*'],
    excludeMimes: ['-mime:video/*'],
    excludePatterns: ['-*google-analytics*', '-*doubleclick*'],
    userAgent: MODERN_USER_AGENT
  },

  'warc-archive': {
    id: 'warc-archive',
    name: 'ISO-28500 WARC/WACZ Preservation Container',
    tagline: 'Packages full web crawl into industry-standard archive container for permanent retention',
    depth: 3,
    maxConnections: 6,
    robotsBypass: true,
    rewriteLinks: false,
    createSearchIndex: false,
    createWarc: true,
    includeMimes: ['+*'],
    excludeMimes: [],
    excludePatterns: ['-*doubleclick*'],
    userAgent: MODERN_USER_AGENT
  },

  'markdown-only': {
    id: 'markdown-only',
    name: 'AI Knowledge Base & LLM Markdown Ingestion',
    tagline: 'Extracts clean, ad-free Markdown with syntax-highlighted code blocks for AI / RAG',
    depth: 3,
    maxConnections: 8,
    robotsBypass: true,
    rewriteLinks: false,
    createSearchIndex: false,
    createWarc: false,
    includeMimes: ['+*.html', '+*.htm', '+*.md'],
    excludeMimes: ['-mime:image/*', '-mime:video/*', '-mime:audio/*'],
    excludePatterns: ['-*tracker*', '-*ads*'],
    userAgent: MODERN_USER_AGENT
  }
};
