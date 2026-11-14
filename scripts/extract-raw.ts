// Dumps the positioned text of every PDF in exams/<cluster>/ into scratch/raw/<cluster>/*.txt.
// Each line is printed as "[x] segment  ||  [x] segment" so column layouts are visible.
// Usage: npm run extract-raw            (every cluster folder)
//        npm run extract-raw -- marketing (one cluster)
import fs from 'node:fs';
import path from 'node:path';
import { readPdfPages } from './lib/pdf-lines.ts';
import { pdfsIn, selectClusters } from './lib/clusters.ts';

const root = path.resolve(import.meta.dirname, '..');
const examsDir = path.join(root, 'exams');

for (const cluster of selectClusters(examsDir, process.argv[2])) {
  const inDir = path.join(examsDir, cluster);
  const outDir = path.join(root, 'scratch', 'raw', cluster);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`== ${cluster}`);
  for (const f of pdfsIn(inDir)) {
    const pages = await readPdfPages(path.join(inDir, f));
    let out = '';
    let chars = 0;
    for (const p of pages) {
      out += `\n===== PAGE ${p.number} (${p.width.toFixed(0)}x${p.height.toFixed(0)}) =====\n`;
      for (const l of p.lines) {
        const t = l.segments.map((s) => `[${String(Math.round(s.x)).padStart(3)}] ${s.text}`).join('  ||  ');
        chars += l.segments.reduce((n, s) => n + s.text.length, 0);
        out += t + '\n';
      }
    }
    fs.writeFileSync(path.join(outDir, f.replace(/\.pdf$/i, '.txt')), out);
    console.log(`  ${f}: ${pages.length} pages, ${chars} chars${chars < 1000 ? '  <-- possibly image-only' : ''}`);
  }
}
