import { NewspaperArticleInput, NewspaperTemplateInput, prepareNewspaperPdfData } from './newspaperPdfTemplate';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function downloadBlobOnWeb(blob: Blob, fileName: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function renderInteractiveNewspaperHtml(input: NewspaperTemplateInput): string {
  const prepared = prepareNewspaperPdfData(input);
  const articles = prepared.sections.flatMap((section) => section.articles);
  const data = articles.map((article) => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    content: article.content,
    category: article.categoryDisplayName,
    source: article.source,
    date: article.date,
    imageUrl: article.imageUrl || '',
  }));

  const cards = articles.map((article, index) => `
    <button class="card ${index === 0 ? 'card-lead' : ''}" data-id="${escapeHtml(article.id)}">
      ${article.imageUrl ? `<img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title)}" />` : '<div class="placeholder"></div>'}
      <span class="category">${escapeHtml(article.categoryDisplayName)}</span>
      <strong>${escapeHtml(article.title)}</strong>
      <small>${escapeHtml(article.source)} | ${escapeHtml(article.date)}</small>
      <em>Haberi oku</em>
    </button>
  `).join('');

  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(prepared.newspaperName)}</title>
    <style>
      :root { color-scheme: light; --ink: #171717; --muted: #666; --paper: #fffdf7; --line: #ddd0bd; --accent: #8a1f11; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #e9e1d3; color: var(--ink); font-family: Georgia, 'Times New Roman', serif; }
      .paper { width: min(1180px, calc(100% - 28px)); margin: 24px auto; background: var(--paper); padding: 28px; box-shadow: 0 18px 60px rgba(0,0,0,.18); }
      header { border-bottom: 4px double var(--ink); text-align: center; padding-bottom: 16px; margin-bottom: 22px; }
      h1 { margin: 0; font-size: clamp(42px, 7vw, 86px); line-height: .9; letter-spacing: -2px; }
      .sub { margin-top: 10px; font: 700 12px/1.4 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
      .card { appearance: none; border: 1px solid var(--line); background: #fff; text-align: left; padding: 0; cursor: pointer; display: flex; flex-direction: column; min-height: 280px; transition: transform .16s ease, box-shadow .16s ease; }
      .card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.12); }
      .card-lead { grid-column: span 2; grid-row: span 2; }
      .card img, .placeholder { width: 100%; height: 180px; object-fit: cover; background: #d8d2c8; display: block; }
      .card-lead img, .card-lead .placeholder { height: 360px; }
      .card span, .card strong, .card small, .card em { margin-left: 14px; margin-right: 14px; }
      .category { margin-top: 14px; color: var(--accent); font: 900 11px/1 system-ui, sans-serif; letter-spacing: 1.3px; text-transform: uppercase; }
      strong { margin-top: 8px; font-size: 22px; line-height: 1.08; }
      .card-lead strong { font-size: 34px; }
      small { margin-top: 10px; color: var(--muted); font: 700 11px/1.4 system-ui, sans-serif; text-transform: uppercase; }
      em { margin-top: auto; margin-bottom: 14px; color: var(--accent); font: 900 12px/1 system-ui, sans-serif; text-transform: uppercase; font-style: normal; }
      .modal { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.55); }
      .modal.open { display: flex; }
      .dialog { width: min(860px, 100%); max-height: 88vh; overflow: auto; background: var(--paper); border: 1px solid var(--line); box-shadow: 0 20px 80px rgba(0,0,0,.35); }
      .dialog img { width: 100%; max-height: 420px; object-fit: cover; display: block; }
      .dialog-body { padding: 26px; }
      .dialog h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 52px); line-height: .98; }
      .dialog p { font-size: 17px; line-height: 1.65; margin: 0 0 14px; }
      .close { position: sticky; top: 0; float: right; margin: 12px; border: 0; background: var(--ink); color: #fff; border-radius: 999px; width: 38px; height: 38px; cursor: pointer; font-size: 20px; }
      @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } .card-lead { grid-column: span 1; grid-row: span 1; } .card-lead img, .card-lead .placeholder { height: 220px; } }
    </style>
  </head>
  <body>
    <main class="paper">
      <header>
        <h1>${escapeHtml(prepared.newspaperName)}</h1>
        <div class="sub">Interactive Edition | ${escapeHtml(prepared.displayDate)} | ${articles.length} haber</div>
      </header>
      <section class="grid">${cards}</section>
    </main>
    <div class="modal" id="modal" role="dialog" aria-modal="true">
      <article class="dialog">
        <button class="close" id="close" aria-label="Kapat">&times;</button>
        <div id="modalContent"></div>
      </article>
    </div>
    <script>
      const articles = ${safeJson(data)};
      const modal = document.getElementById('modal');
      const modalContent = document.getElementById('modalContent');
      const closeButton = document.getElementById('close');
      function escapeText(value) {
        return String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
      }
      function openArticle(id) {
        const article = articles.find((item) => item.id === id);
        if (!article) return;
        const paragraphs = String(article.content || '').split(/\\n+/).filter(Boolean).map((p) => '<p>' + escapeText(p) + '</p>').join('');
        modalContent.innerHTML =
          (article.imageUrl ? '<img src="' + article.imageUrl + '" alt="">' : '') +
          '<div class="dialog-body"><span class="category">' + escapeText(article.category) + '</span>' +
          '<h2>' + escapeText(article.title) + '</h2>' +
          '<small>' + escapeText(article.source) + ' | ' + escapeText(article.date) + '</small>' +
          '<div style="height:18px"></div>' + paragraphs + '</div>';
        modal.classList.add('open');
      }
      document.querySelectorAll('.card').forEach((card) => card.addEventListener('click', () => openArticle(card.dataset.id)));
      closeButton.addEventListener('click', () => modal.classList.remove('open'));
      modal.addEventListener('click', (event) => { if (event.target === modal) modal.classList.remove('open'); });
      window.addEventListener('keydown', (event) => { if (event.key === 'Escape') modal.classList.remove('open'); });
    </script>
  </body>
</html>`;
}

export async function exportInteractiveNewspaperHtml(input: NewspaperTemplateInput): Promise<void> {
  const html = renderInteractiveNewspaperHtml(input);
  const fileName = `${(input.newspaperName || 'smart-newspaper').replace(/\s+/g, '-').toLowerCase()}-interactive.html`;

  if (typeof Blob !== 'undefined') {
    downloadBlobOnWeb(new Blob([html], { type: 'text/html;charset=utf-8' }), fileName);
    return;
  }

  throw new Error('Interactive HTML export is only available on web.');
}

export function mapArticleInputsForInteractiveExport(articles: NewspaperArticleInput[]) {
  return articles;
}
