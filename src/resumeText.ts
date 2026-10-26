const MAX_TEXT_LENGTH = 20_000;

export async function extractResumeText(fileName: string, data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let text = '';

  if (/\.pdf$/i.test(fileName)) {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const rows: { y: number; x: number; text: string }[] = [];
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        let row = rows.find(candidate => Math.abs(candidate.y - y) < 2.5);
        if (!row) {
          row = { y, x, text: '' };
          rows.push(row);
        }
        row.x = Math.min(row.x, x);
        row.text += `${row.text ? ' ' : ''}${item.str.trim()}`;
      }
      pages.push(rows.sort((a, b) => b.y - a.y || a.x - b.x).map(row => row.text).join('\n'));
      if (pages.join('\n').length >= MAX_TEXT_LENGTH) break;
    }
    text = pages.join('\n');
  } else if (/\.docx$/i.test(fileName)) {
    const { default: mammoth } = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
    text = result.value;
  }

  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}
