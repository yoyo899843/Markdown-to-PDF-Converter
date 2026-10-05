import { pdfName } from './naming.js';
import { downloadExport } from './download.js';

export function initSingleExport() {
  const markdownInput = document.getElementById('markdownInput');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  const status = document.getElementById('status');

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    markdownInput.value = await file.text();
    document.getElementById('filename').value = file.name.replace(/\.(md|markdown)$/i, '');
    status.textContent = `已載入：${file.name}`;
    status.classList.remove('error');
  });

  convertBtn.addEventListener('click', async () => {
    const markdown = markdownInput.value;
    const filename = document.getElementById('filename').value;
    if (!markdown.trim()) {
      status.textContent = '請先輸入 Markdown 內容';
      status.classList.add('error');
      return;
    }

    convertBtn.disabled = true;
    status.textContent = '轉換中...';
    status.classList.remove('error');

    try {
      await downloadExport('/convert', { markdown, filename }, pdfName(filename));

      status.textContent = '轉換完成！';
      status.classList.remove('error');
    } catch (err) {
      status.textContent = err.message;
      status.classList.add('error');
    } finally {
      convertBtn.disabled = false;
    }
  });
}
