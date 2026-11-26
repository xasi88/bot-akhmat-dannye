// Общие помощники для разбора HTML без сторонних библиотек.

const ZNAKI = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&laquo;': '«', '&raquo;': '»' };

export function tekst(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, (z) => ZNAKI[z] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Строки таблиц Матч ТВ: у каждой ячейки класс m-table-body-cell--key-<имя>.
export function strokiTablic(html) {
  const stroki = [];
  for (const kusok of html.split(/<tr[\s>]/).slice(1)) {
    const tr = kusok.split('</tr>')[0];
    const stroka = {};
    const re = /m-table-body-cell--key-([A-Za-z_]+)[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = re.exec(tr))) {
      stroka[m[1]] = tekst(m[2]);
      stroka[`_${m[1]}`] = m[2];
    }
    if (Object.keys(stroka).length) stroki.push(stroka);
  }
  return stroki;
}

export function chislo(s) {
  const n = Number(String(s ?? '').replace(/[^\d\-+]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export async function skachat(url, { popytki = 2 } = {}) {
  let oshibka;
  for (let i = 0; i < popytki; i++) {
    try {
      const otvet = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (bot-akhmat)', 'Accept-Language': 'ru' },
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
      });
      if (!otvet.ok) throw new Error(`${url}: ответ ${otvet.status}`);
      return await otvet.text();
    } catch (e) {
      oshibka = e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error(`${url}: ${oshibka.message}${oshibka.cause ? ` (${oshibka.cause.code ?? oshibka.cause.message})` : ''}`);
}
