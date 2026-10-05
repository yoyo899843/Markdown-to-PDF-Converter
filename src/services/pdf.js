import path from 'path';
import { fileURLToPath } from 'url';
import { mdToPdf } from 'md-to-pdf';
import katexExtension from 'marked-katex-extension';

const __dirname = fileURLToPath(new URL('../../', import.meta.url));

// Must match the "katex" version pinned in package.json, so the CDN stylesheet
// (fonts + glyphs) lines up with what marked-katex-extension rendered server-side.
const KATEX_VERSION = '0.16.47';
const KATEX_STYLESHEET = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
const DEFAULT_MARKDOWN_STYLESHEET = path.join(__dirname, 'node_modules/md-to-pdf/markdown.css');

export async function renderPdf(markdown) {
  const pdf = await mdToPdf({ content: markdown }, {
    stylesheet: [DEFAULT_MARKDOWN_STYLESHEET, KATEX_STYLESHEET],
    marked_extensions: [katexExtension({ throwOnError: false, nonStandard: true })],
    launch_options: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });
  return Buffer.from(pdf.content);
}

