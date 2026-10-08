import { Router } from 'express';
import { pdfName, batchNames } from '../../public/js/naming.js';
import { renderPdf } from '../services/pdf.js';
import { createZip } from '../services/zip.js';
import { parseConversionRequest } from '../middleware/upload.js';

function attachment(name) {
  return `attachment; filename="download.${name.endsWith('.zip') ? 'zip' : 'pdf'}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))}`;
}

export function createConvertRouter(render = renderPdf) {
  const router = Router();

  const convert = async (req, res) => {
    const { markdown, filename } = req.body ?? {};
    if (typeof markdown !== 'string' || !markdown.trim()) return res.status(400).json({ error: 'Markdown 內容不可為空' });
    if (filename !== undefined && (typeof filename !== 'string' || Buffer.byteLength(filename) > 200)) return res.status(400).json({ error: '檔名須為文字且不可超過 200 bytes' });
    try {
      const content = await render(markdown);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': attachment(pdfName(filename)) });
      res.send(content);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '轉換失敗，請稍後再試' });
    }
  };

  router.post('/convert', convert);
  router.post('/api/convert', parseConversionRequest, convert);

  router.post('/convert-batch', async (req, res) => {
    const { documents, naming } = req.body ?? {};
    if (!Array.isArray(documents) || !documents.length || documents.length > 50 || documents.some(d => !d || typeof d.markdown !== 'string' || !d.markdown.trim())) {
      return res.status(400).json({ error: '請提供 1 到 50 份非空白 Markdown 文件' });
    }
    let names;
    try { names = batchNames(documents.length, naming); }
    catch (err) { return res.status(400).json({ error: err.message }); }
    try {
      const entries = [];
      for (let i = 0; i < documents.length; i++) {
        entries.push({ name: names[i], content: await render(documents[i].markdown) });
      }
      const archiveName = pdfName(naming?.name).replace(/\.pdf$/, '.zip');
      res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': attachment(archiveName) });
      res.send(createZip(entries));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `批次轉換失敗：${err.message}` });
    }
  });

  return router;
}

export default createConvertRouter();
