import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  defParamCharset: 'utf8',
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 1,
    // Busboy marks fields as truncated when they reach this limit.
    // Leave one extra byte so the handler can accept exactly 200 bytes.
    fieldSize: 201,
    fieldNameSize: 100,
    parts: 3,
  },
}).single('file');

export function parseConversionRequest(req, res, next) {
  if (req.is('application/json')) return next();
  if (!req.is('multipart/form-data')) {
    return res.status(415).json({ error: '請使用 multipart/form-data 或 application/json' });
  }

  upload(req, res, err => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Markdown 檔案不可超過 10 MiB' });
      if (err.code === 'LIMIT_FIELD_VALUE') return res.status(400).json({ error: '檔名不可超過 200 bytes' });
      return res.status(400).json({ error: '上傳格式錯誤：請使用 file 欄位上傳一個檔案，並只提供選填的 filename 欄位' });
    }
    if (!req.file) return res.status(400).json({ error: '請使用 file 欄位上傳 Markdown 檔案' });
    if (!/\.(md|markdown)$/i.test(req.file.originalname)) {
      return res.status(400).json({ error: '只接受 .md 或 .markdown 檔案' });
    }
    if (Object.keys(req.body).some(key => key !== 'filename')) {
      return res.status(400).json({ error: '上傳只接受 file 與 filename 欄位' });
    }

    let markdown;
    try {
      markdown = new TextDecoder('utf-8', { fatal: true }).decode(req.file.buffer);
    } catch {
      return res.status(400).json({ error: 'Markdown 檔案須使用 UTF-8 編碼' });
    }
    if (markdown.includes('\0')) return res.status(400).json({ error: 'Markdown 檔案須為文字內容' });
    req.body = {
      markdown,
      filename: req.body.filename ?? req.file.originalname.replace(/\.(md|markdown)$/i, ''),
    };
    next();
  });
}
