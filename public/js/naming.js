export function pdfName(value = 'document') {
  const name = String(value).trim().replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '_').replace(/[. ]+$/g, '');
  return `${name || 'document'}.pdf`;
}

export function batchNames(count, { name = 'document', format = '{name}_{index}', sequence = 'number', start = 1, padding = 1 } = {}) {
  if (!['number', 'upper', 'lower'].includes(sequence)) throw new Error('請選擇有效的序號類型');
  if (!Number.isSafeInteger(start) || start < 1 || start > 1000000) throw new Error('起始序號須為 1 到 1000000');
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) throw new Error('數字位數須為 1 到 10');
  if (typeof format !== 'string' || !format.includes('{index}') || /\{(?!name\}|index\})[^}]*\}/.test(format)) throw new Error('格式須包含 {index}，可使用 {name} 與 {index}');
  const names = Array.from({ length: count }, (_, i) => {
    let n = start + i;
    let index = '';
    if (sequence === 'number') index = String(n).padStart(padding, '0');
    else {
      while (n > 0) { n--; index = String.fromCharCode(65 + n % 26) + index; n = Math.floor(n / 26); }
      if (sequence === 'lower') index = index.toLowerCase();
    }
    return pdfName(format.replaceAll('{name}', String(name)).replaceAll('{index}', index));
  });
  if (names.some(n => byteLength(n) > 200)) throw new Error('檔名過長，請縮短名稱或格式');
  if (new Set(names.map(n => n.toLowerCase())).size !== names.length) throw new Error('格式產生重複檔名，請調整格式');
  return names;
}
function byteLength(value) { return new TextEncoder().encode(value).length; }
