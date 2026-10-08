const errorResponse = description => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
});

export default {
  openapi: '3.0.3',
  info: {
    title: 'Markdown to PDF API',
    version: '1.0.0',
    description: '上傳 UTF-8 Markdown 檔案或傳送 JSON，直接下載 PDF（支援 LaTeX）。上傳檔案上限為 10 MiB，JSON 請求上限為 10 MiB。此 API 無需 API key。',
  },
  servers: [{ url: '/', description: '目前伺服器' }],
  tags: [{ name: 'Convert', description: 'Markdown 轉換與下載' }],
  paths: {
    '/api/convert': {
      post: {
        tags: ['Convert'],
        operationId: 'convertMarkdown',
        summary: '上傳 Markdown 並下載 PDF',
        description: 'multipart/form-data：以 file 欄位上傳一個 .md 或 .markdown 檔案，可用 filename 指定 PDF 名稱；未指定時沿用上傳檔名。application/json：傳入 markdown 與選填的 filename；預設名稱為 document.pdf。自動補上 .pdf，並將檔名中的路徑與不合法字元替換為底線。檔名最多 200 UTF-8 bytes。成功回應為 PDF 二進位檔，可在 Try it out 的回應中下載。',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                additionalProperties: false,
                properties: {
                  file: { type: 'string', format: 'binary', description: 'UTF-8 的 .md 或 .markdown 檔案（最多 10 MiB）' },
                  filename: { type: 'string', description: 'PDF 檔名，最多 200 UTF-8 bytes；可省略 .pdf', example: '報告.pdf' },
                },
              },
            },
            'application/json': {
              schema: { $ref: '#/components/schemas/ConversionRequest' },
              example: { markdown: '# Hello\n\n這是 API 產生的 PDF。', filename: '報告.pdf' },
            },
          },
        },
        responses: {
          200: {
            description: 'PDF 檔案，可直接儲存或下載',
            headers: {
              'Content-Disposition': { description: 'attachment；filename* 提供 UTF-8 編碼的下載檔名', schema: { type: 'string' } },
            },
            content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
          },
          400: errorResponse('缺少檔案、空白 Markdown、無效副檔名或 UTF-8、檔名過長、上傳欄位錯誤，或 JSON 格式錯誤'),
          413: errorResponse('Markdown 檔案或 JSON 請求超過 10 MiB'),
          415: errorResponse('Content-Type、內容編碼或字元集不支援'),
          500: errorResponse('PDF 轉換失敗'),
        },
      },
    },
  },
  components: {
    schemas: {
      ConversionRequest: {
        type: 'object',
        required: ['markdown'],
        properties: {
          markdown: { type: 'string', minLength: 1, description: '非空白的 Markdown 內容' },
          filename: { type: 'string', description: 'PDF 檔名，最多 200 UTF-8 bytes；預設 document.pdf' },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: { error: { type: 'string', example: 'Markdown 內容不可為空' } },
      },
    },
  },
};
