import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

const pdf = Buffer.from('%PDF-1.4\nAPI test PDF\n%%EOF');
const rendered = [];
let server;
let baseUrl;

before(async () => {
  server = createApp({ renderPdf: async markdown => {
    rendered.push(markdown);
    return pdf;
  } }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
});

function upload(content, name = 'example.md', filename) {
  const body = new FormData();
  body.append('file', new Blob([content], { type: 'text/markdown' }), name);
  if (filename !== undefined) body.append('filename', filename);
  return body;
}

function post(body, headers, path = '/api/convert') {
  return fetch(`${baseUrl}${path}`, { method: 'POST', body, headers });
}

async function expectError(response, status) {
  assert.equal(response.status, status);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(typeof (await response.json()).error, 'string');
}

test('multipart upload returns PDF bytes and preserves the UTF-8 source filename', async () => {
  const response = await post(upload('\uFEFF# 中文報告\n\n$E = mc^2$', '中文報告.MARKDOWN'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(response.headers.get('content-disposition'), /attachment;/);
  assert.ok(response.headers.get('content-disposition').endsWith(encodeURIComponent('中文報告.pdf')));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  assert.equal(rendered.at(-1), '# 中文報告\n\n$E = mc^2$');
});

test('filename can override the upload name and is sanitized', async () => {
  const response = await post(upload('# Test', 'input.md', '../報告.pdf'));
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('content-disposition').endsWith(encodeURIComponent('.._報告.pdf')));
  await response.arrayBuffer();
});

test('JSON conversion supports the API and existing frontend route', async () => {
  for (const path of ['/api/convert', '/convert']) {
    const response = await post(JSON.stringify({ markdown: '# JSON' }), { 'Content-Type': 'application/json' }, path);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-disposition').endsWith('document.pdf'));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  }
});

test('uploads at the documented file size and filename limits are accepted', async () => {
  const response = await post(upload(Buffer.alloc(10 * 1024 * 1024, 65), 'limit.md', 'a'.repeat(200)));
  assert.equal(response.status, 200);
  assert.equal(Buffer.byteLength(rendered.at(-1)), 10 * 1024 * 1024);
  assert.ok(response.headers.get('content-disposition').endsWith(`${'a'.repeat(200)}.pdf`));
  await response.arrayBuffer();
});

test('invalid multipart uploads are rejected before PDF rendering', async t => {
  const missing = new FormData();
  missing.append('filename', 'report');
  const wrongField = new FormData();
  wrongField.append('markdown', new Blob(['# Test']), 'test.md');
  const multiple = upload('# One');
  multiple.append('file', new Blob(['# Two']), 'two.md');
  const unknownField = upload('# Test');
  unknownField.append('other', 'value');
  const duplicate = upload('# Test', 'test.md', 'one');
  duplicate.append('filename', 'two');
  const cases = [
    ['missing file', missing, 400],
    ['empty file', upload(''), 400],
    ['blank file', upload(' \n\t'), 400],
    ['unsupported extension', upload('# Test', 'file.txt'), 400],
    ['invalid UTF-8', upload(Buffer.from([0xff, 0xfe])), 400],
    ['binary content', upload(Buffer.from([0, 1, 2])), 400],
    ['wrong file field', wrongField, 400],
    ['multiple files', multiple, 400],
    ['unknown field', unknownField, 400],
    ['duplicate filename', duplicate, 400],
    ['long filename', upload('# Test', 'test.md', '報'.repeat(67)), 400],
    ['large file', upload(Buffer.alloc(10 * 1024 * 1024 + 1, 65)), 413],
  ];
  for (const [name, body, status] of cases) {
    await t.test(name, async () => {
      const count = rendered.length;
      await expectError(await post(body), status);
      assert.equal(rendered.length, count);
    });
  }
});

test('invalid JSON, large JSON, unsupported media and malformed multipart return JSON errors', async t => {
  const cases = [
    ['empty object', '{}', 'application/json', 400],
    ['blank markdown', '{"markdown":"  "}', 'application/json', 400],
    ['wrong markdown type', '{"markdown":123}', 'application/json', 400],
    ['wrong filename type', '{"markdown":"# Test","filename":123}', 'application/json', 400],
    ['long filename', JSON.stringify({ markdown: '# Test', filename: '報'.repeat(67) }), 'application/json', 400],
    ['broken JSON', '{broken', 'application/json', 400],
    ['large JSON', JSON.stringify({ markdown: 'a'.repeat(10 * 1024 * 1024) }), 'application/json', 413],
    ['plain text', '# Test', 'text/plain', 415],
    ['no boundary', 'broken', 'multipart/form-data', 400],
    ['incomplete multipart', '--test\r\n', 'multipart/form-data; boundary=test', 400],
  ];
  for (const [name, body, contentType, status] of cases) {
    await t.test(name, async () => {
      const count = rendered.length;
      await expectError(await post(body, { 'Content-Type': contentType }), status);
      assert.equal(rendered.length, count);
    });
  }
});

test('existing batch export still produces a ZIP download', async () => {
  const response = await post(JSON.stringify({ documents: [{ markdown: '# One' }, { markdown: '# Two' }] }), {
    'Content-Type': 'application/json',
  }, '/convert-batch');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/zip');
  const zip = Buffer.from(await response.arrayBuffer());
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.ok(zip.includes(Buffer.from('document_1.pdf')));
  assert.ok(zip.includes(Buffer.from('document_2.pdf')));
});

test('PDF failures return a JSON error without internal details', async t => {
  t.mock.method(console, 'error', () => {});
  const failing = createApp({ renderPdf: async () => { throw new Error('internal rendering detail'); } }).listen(0, '127.0.0.1');
  await once(failing, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${failing.address().port}/api/convert`, {
      method: 'POST', body: upload('# Test'),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: '轉換失敗，請稍後再試' });
  } finally {
    await new Promise(resolve => failing.close(resolve));
  }
});

test('Swagger docs, local assets, alias and OpenAPI specification are served', async () => {
  const response = await fetch(`${baseUrl}/api-docs/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /swagger-ui/);
  for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-init.js']) {
    const response = await fetch(`${baseUrl}/api-docs/${asset}`);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).length > 0);
  }
  const alias = await fetch(`${baseUrl}/api-doc`, { redirect: 'manual' });
  assert.equal(alias.status, 302);
  assert.equal(alias.headers.get('location'), '/api-docs/');
  const spec = await (await fetch(`${baseUrl}/api/openapi.json`)).json();
  assert.equal(spec.openapi, '3.0.3');
  const operation = spec.paths['/api/convert'].post;
  assert.ok(operation.requestBody.content['multipart/form-data']);
  assert.ok(operation.requestBody.content['application/json']);
  assert.ok(operation.responses['200'].content['application/pdf']);
});

test('real renderer converts an uploaded Markdown file into PDF', {
  skip: !process.env.RUN_PDF_SMOKE_TEST,
  timeout: 90000,
}, async () => {
  const actual = createApp().listen(0, '127.0.0.1');
  await once(actual, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${actual.address().port}/api/convert`, {
      method: 'POST', body: upload('# API 測試\n\n上傳 Markdown，下載 PDF。\n\n$E = mc^2$'),
    });
    assert.equal(response.status, 200, response.status === 200 ? undefined : await response.text());
    const content = Buffer.from(await response.arrayBuffer());
    assert.equal(content.subarray(0, 5).toString(), '%PDF-');
    assert.ok(content.length > 1000);
    assert.ok(content.subarray(-100).includes(Buffer.from('%%EOF')));
  } finally {
    await new Promise(resolve => actual.close(resolve));
  }
});
