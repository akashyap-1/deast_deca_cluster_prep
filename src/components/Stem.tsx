// Renders a question stem. Lines of the form "| a | b |" (from tables in the PDF) become an HTML table.

export function parseStem(text: string): ({ kind: 'text'; text: string } | { kind: 'table'; rows: string[][] })[] {
  const blocks: ({ kind: 'text'; text: string } | { kind: 'table'; rows: string[][] })[] = [];
  for (const line of text.split('\n')) {
    const isRow = line.startsWith('| ') && line.endsWith(' |');
    const last = blocks[blocks.length - 1];
    if (isRow) {
      const cells = line.slice(2, -2).split(' | ');
      if (last?.kind === 'table') last.rows.push(cells);
      else blocks.push({ kind: 'table', rows: [cells] });
    } else blocks.push({ kind: 'text', text: line });
  }
  return blocks;
}

export function Stem({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[1.075rem] leading-relaxed font-medium sm:text-xl sm:leading-relaxed">
      {parseStem(text).map((b, i) =>
        b.kind === 'text' ? (
          <p key={i}>{b.text}</p>
        ) : (
          <div key={i} className="-mx-1 overflow-x-auto px-1 pb-1">
            <table className="min-w-full border-collapse text-[0.8125rem] leading-snug font-normal tabular-nums sm:text-sm">
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r} className={r === 0 ? 'bg-slate-50 font-semibold dark:bg-slate-800/60' : ''}>
                    {row.map((c, j) => (
                      <td key={j} className="border border-slate-200 px-2 py-1.5 whitespace-nowrap dark:border-slate-700">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}
