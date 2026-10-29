export function ChartDataTable({
  summary,
  caption,
  headers,
  rows,
}: {
  summary: string;
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  if (!rows.length) return null;

  return (
    <details className="mt-2 text-xs">
      <summary className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {summary}
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-secondary text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className="px-3 py-2 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border">
                {row.map((value, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row" className="px-3 py-2 font-medium">
                      {value}
                    </th>
                  ) : (
                    <td key={cellIndex} className="px-3 py-2 tabular-nums">
                      {value}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
