import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { mdToPdf } from 'md-to-pdf';
import katexExtension from 'marked-katex-extension';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Must match the "katex" version pinned in package.json, so the CDN stylesheet
// (fonts + glyphs) lines up with what marked-katex-extension rendered server-side.
const KATEX_VERSION = '0.16.47';
const KATEX_STYLESHEET = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
const DEFAULT_MARKDOWN_STYLESHEET = path.join(__dirname, 'node_modules/md-to-pdf/markdown.css');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/convert', async (req, res) => {
  const { markdown } = req.body ?? {};

  if (typeof markdown !== 'string' || !markdown.trim()) {
    return res.status(400).json({ error: 'Markdown 內容不可為空' });
  }

  try {
    const pdf = await mdToPdf(
      { content: markdown },
      {
        // Passing a custom `stylesheet` replaces md-to-pdf's default array, so
        // the default GitHub-like theme has to be listed alongside KaTeX's CSS.
        stylesheet: [DEFAULT_MARKDOWN_STYLESHEET, KATEX_STYLESHEET],
        marked_extensions: [katexExtension({ throwOnError: false, nonStandard: true })],
        launch_options: {
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"',
    });
    res.send(Buffer.from(pdf.content));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `轉換失敗：${err.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`md-to-pdf web listening on port ${PORT}`));
