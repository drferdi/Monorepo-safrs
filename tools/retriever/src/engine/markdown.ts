import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export function createTurndownInstance(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    bulletListMarker: '-'
  });

  // Preserve pre and code blocks with language tags
  turndown.addRule('preCode', {
    filter: (node) => node.nodeName === 'PRE',
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const codeElement = element.querySelector('code');
      let lang = '';
      if (codeElement) {
        const cls = codeElement.getAttribute('class') || '';
        const match = cls.match(/language-([a-zA-Z0-9_-]+)/);
        if (match) lang = match[1];
      }
      const rawText = element.textContent || '';
      return `\n\n\`\`\`${lang}\n${rawText.trim()}\n\`\`\`\n\n`;
    }
  });

  return turndown;
}

export interface ExtractedDocument {
  title: string;
  url: string;
  markdown: string;
  wordCount: number;
}

export function htmlToCleanMarkdown(html: string, url: string = ''): ExtractedDocument {
  const $ = cheerio.load(html);

  // Extract Title
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Untitled Tech Document';

  // Remove junk, ads, navigations, sidebars, cookie notices
  $(
    'nav, header, footer, script, style, noscript, svg, iframe, form, button, ' +
    '.cookie-banner, .cookie-consent, .advertisement, .ads, .sidebar, ' +
    '#sidebar, .menu, .table-of-contents, .toc, [role="navigation"]'
  ).remove();

  // Try to find the primary content container
  let container = $('article, main, .markdown-body, .documentation, #content, [role="main"]').first();
  if (!container || container.length === 0) {
    container = $('body');
  }

  const cleanedHtml = container.html() || '';
  const turndown = createTurndownInstance();
  const rawMarkdown = turndown.turndown(cleanedHtml);

  // Frontmatter header
  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `source_url: "${url}"`,
    `scraped_at: "${new Date().toISOString()}"`,
    'engine: "Sentra Tech Scraper (Dual HTTrack + Markdown)"',
    '---',
    '',
    `# ${title}`,
    '',
    rawMarkdown
  ].join('\n');

  const words = rawMarkdown.trim().split(/\s+/).filter(Boolean).length;

  return {
    title,
    url,
    markdown: frontmatter,
    wordCount: words
  };
}

export async function convertHtmlFolderToMarkdown(
  inputDir: string,
  outputDir: string
): Promise<{ convertedCount: number; totalWords: number }> {
  await fs.mkdir(outputDir, { recursive: true });
  let convertedCount = 0;
  let totalWords = 0;

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'hts-cache' || fullPath === outputDir) continue;
        await walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.htm'))) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          // Skip HTTrack auto-generated mirror index wrapper
          if (
            content.includes('Local index - HTTrack Website Copier') ||
            content.includes('Index of locally available sites')
          ) {
            continue;
          }

          const doc = htmlToCleanMarkdown(content, fullPath);
          const relPath = path.relative(inputDir, fullPath);
          const safeName = relPath.replace(/[/\\]/g, '_').replace(/\.html?$/i, '') + '.md';
          const destPath = path.join(outputDir, safeName);
          await fs.writeFile(destPath, doc.markdown, 'utf-8');
          convertedCount++;
          totalWords += doc.wordCount;
        } catch {
          // ignore corrupted or binary files
        }
      }
    }
  }

  await walk(inputDir);
  return { convertedCount, totalWords };
}
