import { Fragment } from "react";

/**
 * Small, safe Markdown renderer for client docs: headings, lists, checkboxes,
 * quotes, rules, **bold**, *italic*, `code` and [links](url). It builds React
 * nodes (never raw HTML), so pasted content can't inject markup.
 */
export function Markdown({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? "mt-6 text-xl font-semibold" : level === 2 ? "mt-5 text-lg font-semibold" : "mt-4 font-semibold";
      const Tag = (`h${level + 1}` as "h2" | "h3" | "h4");
      blocks.push(<Tag key={key++} className={cls}>{inline(h[2])}</Tag>);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-4 border-border" />);
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-primary/50 pl-3 text-muted-foreground">
          {quote.map((q, j) => (
            <p key={j}>{inline(q)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key++} className={ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
          {items.map((it, j) => {
            const task = it.match(/^\[( |x|X)\]\s+(.*)$/);
            return task ? (
              <li key={j} className="list-none -ml-5 flex items-start gap-2">
                <input type="checkbox" checked={task[1] !== " "} readOnly className="mt-1" />
                <span className={task[1] !== " " ? "text-muted-foreground line-through" : ""}>{inline(task[2])}</span>
              </li>
            ) : (
              <li key={j}>{inline(it)}</li>
            );
          })}
        </List>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={key++}>
        {para.map((p, j) => (
          <Fragment key={j}>
            {j ? <br /> : null}
            {inline(p)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="flex flex-col gap-3 text-sm leading-relaxed">{blocks}</div>;
}

function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++} className="rounded bg-muted px-1 font-mono text-xs">{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : `https://${href}`;
      out.push(
        <a key={k++} href={safe} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
          {label}
        </a>,
      );
    } else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
