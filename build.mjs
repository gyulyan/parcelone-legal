// Builds the public legal pages for GitHub Pages from src/*.md.
//
//   node build.mjs
//
// Writes index.html, privacy/index.html and terms/index.html next to this
// file. Edit the texts in src/, set UPDATED below, run again, commit.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UPDATED = '15.10.2026';
const root = dirname(fileURLToPath(import.meta.url));

const PAGES = [
  { slug: 'privacy', title: 'Политика за поверителност', source: 'src/privacy.md' },
  { slug: 'terms', title: 'Общи условия', source: 'src/terms.md' },
];

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** **bold** and [text](url); everything else is plain, escaped text. */
function inline(text) {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const external = /^https?:/.test(url);
      return `<a href="${url}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
    });
}

/** The few Markdown shapes the legal texts use: ##, paragraphs, lists, tables. */
function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
    } else if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      const id = text.match(/^(\d+)\./)?.[1];
      html.push(`<h2${id ? ` id="s${id}"` : ''}>${inline(text)}</h2>`);
      i++;
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].slice(1, -1).split('|').map((cell) => cell.trim()));
        i++;
      }
      const [head, , ...body] = rows;
      html.push(
        '<div class="table"><table>',
        `<thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`,
        `<tbody>${body
          .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`)
          .join('')}</tbody>`,
        '</table></div>',
      );
    } else if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) {
        items.push(lines[i].replace(/^(- |\d+\. )/, ''));
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
    } else {
      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !/^(## |\||- |\d+\. )/.test(lines[i])) {
        paragraph.push(lines[i].trim());
        i++;
      }
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }
  }

  return html.join('\n');
}

const LOGO = `<svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#0E1726"/><rect x="14" y="19" width="31" height="31" rx="7" fill="none" stroke="#fff" stroke-width="6.5"/><rect x="37.5" y="9.5" width="16" height="16" rx="4" fill="#FF6B3D" stroke="#0E1726" stroke-width="3.5"/></svg>`;

function page({ title, body, base, current }) {
  const nav = PAGES.map(
    (p) =>
      `<a href="${base}${p.slug}/"${p.slug === current ? ' aria-current="page"' : ''}>${p.title}</a>`,
  ).join('');

  return `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} – ParcelOne</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(LOGO.replace(' aria-hidden="true"', ' xmlns="http://www.w3.org/2000/svg"'))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@600;700&family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}style.css">
</head>
<body>
<header>
  <a class="brand" href="${base}">${LOGO}<span>Parcel<b>One</b></span></a>
  <nav>${nav}</nav>
</header>
<main>
  <h1>${title}</h1>
  ${current ? `<p class="updated">Последна промяна: ${UPDATED}</p>` : ''}
  ${body}
</main>
<footer>© ${new Date().getFullYear()} ParcelOne · ${nav}</footer>
</body>
</html>
`;
}

for (const p of PAGES) {
  const body = markdownToHtml(readFileSync(join(root, p.source), 'utf8'));
  mkdirSync(join(root, p.slug), { recursive: true });
  writeFileSync(join(root, p.slug, 'index.html'), page({ title: p.title, body, base: '../', current: p.slug }));
}

const index = `<p class="lead">ParcelOne – всички твои пратки на едно място.</p>
<ul class="cards">${PAGES.map((p) => `<li><a href="${p.slug}/">${p.title}</a></li>`).join('')}</ul>`;
writeFileSync(join(root, 'index.html'), page({ title: 'Правна информация', body: index, base: '', current: null }));

// Tells GitHub Pages to serve the files as they are (no Jekyll).
writeFileSync(join(root, '.nojekyll'), '');

console.log('Built:', ['index.html', ...PAGES.map((p) => `${p.slug}/index.html`)].join(', '));
