// Resolves which cluster folders under exams/ a script should process.
import fs from 'node:fs';

/** Every subfolder of examsDir, or just the one named on the command line. */
export function selectClusters(examsDir: string, arg: string | undefined): string[] {
  const all = fs
    .readdirSync(examsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (!arg) return all;
  if (!all.includes(arg)) {
    console.error(`Unknown cluster "${arg}". Folders in exams/: ${all.join(', ')}`);
    process.exit(1);
  }
  return [arg];
}

export function pdfsIn(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort();
}
