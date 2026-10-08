import express from 'express';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import { createConvertRouter } from './routes/convert.js';
import openapi from './openapi.js';

export function createApp({ renderPdf } = {}) {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));
  app.get('/api/openapi.json', (req, res) => res.json(openapi));
  app.get('/api-doc', (req, res) => res.redirect('/api-docs/'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'Markdown to PDF API 文件',
    swaggerOptions: { validatorUrl: null },
  }));
  app.use(createConvertRouter(renderPdf));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'JSON 請求不可超過 10 MiB' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON 格式錯誤' });
    if (err.status === 415) return res.status(415).json({ error: '不支援的內容編碼或字元集' });
    console.error(err);
    res.status(500).json({ error: '伺服器發生錯誤，請稍後再試' });
  });
  return app;
}

export default createApp();
