import { pdfName, batchNames } from './naming.js';
import { downloadExport } from './download.js';

export function initBatchExport() {
  const batchInput = document.getElementById('batchInput');
  const batchBtn = document.getElementById('batchBtn');
  const batchStatus = document.getElementById('batchStatus');
  const controls = ['batchName', 'sequence', 'start', 'padding', 'format'].map(id => document.getElementById(id));
  let files = [];
  let busy = false;
  function options() {
    return { name: controls[0].value, sequence: controls[1].value, start: Number(controls[2].value), padding: Number(controls[3].value), format: controls[4].value };
  }
  function preview() {
    const list = document.getElementById('fileList');
    list.replaceChildren();
    controls[3].disabled = controls[1].value !== 'number';
    try {
      if (files.length > 50) throw new Error('每次最多選取 50 個檔案');
      const names = batchNames(files.length || 1, options());
      for (let i = 0; i < (files.length || 1); i++) {
        const item = document.createElement('li');
        item.textContent = files.length ? `${files[i].name} → ${names[i]}` : `檔名預覽：${names[i]}`;
        list.appendChild(item);
      }
      batchStatus.textContent = files.length ? `已選取 ${files.length} 個檔案` : '請選取要匯出的 Markdown 檔案';
      batchStatus.classList.remove('error');
      batchBtn.disabled = busy || !files.length;
    } catch (err) {
      batchStatus.textContent = err.message;
      batchStatus.classList.add('error');
      batchBtn.disabled = true;
    }
  }
  batchInput.addEventListener('change', () => { files = Array.from(batchInput.files); preview(); });
  controls.forEach(control => control.addEventListener('input', preview));
  batchBtn.addEventListener('click', async () => {
    const selected = [...files], naming = options();
    busy = true;
    batchBtn.disabled = true;
    batchInput.disabled = true;
    controls.forEach(control => { control.disabled = true; });
    batchStatus.textContent = `正在轉換 ${selected.length} 份文件，請稍候…`;
    batchStatus.classList.remove('error');
    try {
      const documents = await Promise.all(selected.map(async file => {
        const markdown = await file.text();
        if (!markdown.trim()) throw new Error(`${file.name} 的內容不可為空`);
        return { markdown };
      }));
      await downloadExport('/convert-batch', { documents, naming }, pdfName(naming.name).replace(/\.pdf$/, '.zip'));
      batchStatus.textContent = `已完成 ${selected.length} 份 PDF，ZIP 已下載！`;
    } catch (err) {
      batchStatus.textContent = err.message;
      batchStatus.classList.add('error');
    } finally {
      busy = false;
      batchBtn.disabled = false;
      batchInput.disabled = false;
      controls.forEach(control => { control.disabled = false; });
      controls[3].disabled = controls[1].value !== 'number';
    }
  });
  preview();
}
