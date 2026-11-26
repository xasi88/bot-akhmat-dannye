// Кубок России с официального сайта РФС: матчи по этапам и таблицы групп.
import { tekst, chislo, skachat } from './html.mjs';

const KALENDAR = 'https://rfs.ru/cup2027';
const TABLICY = 'https://rfs.ru/cup2027/tables';

// Страница из 18 блоков: первые 9 «Путь РПЛ», остальные «Путь регионов».
// У блока описание (Групповой этап, Плей-офф, Раунд N) и подпись (Тур 1, 1/8 финала).
export function razobratKalendar(html) {
  const matchi = [];
  // Раздел пути (<h4 class="calendar__title">): сначала список всех этапов
  // (calendar-table__description: title и text), потом блоки матчей в том же порядке.
  for (const razdel of html.split('calendar__title">').slice(1)) {
    const put = tekst(razdel.slice(0, razdel.indexOf('<')));
    const etapy = razdel.split('calendar-table__description').slice(1).map((d) => {
      const kusok = d.split('calendar-table__main')[0].slice(0, 400);
      const nazv = tekst((kusok.match(/calendar-table__title">([^<]*)</) ?? [])[1] ?? '');
      const podpis = tekst((kusok.match(/calendar-table__text">([^<]*)</) ?? [])[1] ?? '');
      return [nazv, podpis].filter(Boolean).join(', ');
    });
    razdel.split('calendar-table__main').slice(1).forEach((blok, nomer) => {
      razobratBlok(blok, put, etapy[nomer] ?? '', matchi);
    });
  }
  return matchi;
}

function razobratBlok(blok, put, etap, matchi) {
  {
    for (const karta of blok.split('calendar-table__match').slice(1)) {
      const id = (karta.match(/\/cup\/tournament\/match\/(\d+)/) ?? [])[1];
      const data = karta.match(/data-day="(\d{2})"\s+data-month="(\d{2})"\s+data-year="(\d{4})"/);
      if (!id || !data) continue;
      const vremya = (tekst((karta.match(/calendar-table__time[^>]*>([\s\S]*?)<\//) ?? [])[1] ?? '').match(/(\d{1,2}:\d{2})/) ?? [])[1] ?? null;
      const imena = [...karta.matchAll(/calendar-table__team-name">([^<]*)</g)].map((m) => tekst(m[1]));
      const goly = [...karta.matchAll(/calendar-table__score">([^<]*)</g)].map((m) => tekst(m[1]));
      const penalti = [...karta.matchAll(/calendar-table__penalty">([^<]*)</g)].map((m) => tekst(m[1]));
      if (imena.length < 2) continue;
      const sygran = goly.length === 2 && goly.every((g) => /^\d+$/.test(g));
      matchi.push({
        id: `kubok-${id}`,
        turnir: 'Кубок России',
        put,
        etap,
        data: `${data[3]}-${data[2]}-${data[1]}`,
        vremya: vremya ? vremya.padStart(5, '0') : null,
        doma: imena[0],
        vgostyah: imena[1],
        schet: sygran ? goly.map(Number) : null,
        penalti: penalti.length === 2 && penalti.every((p) => /^\d+$/.test(p)) ? penalti.map(Number) : null,
      });
    }
  }
}

// Таблицы групп: колонки И, В, ВП, П, ПП, М, О.
export function razobratGruppy(html) {
  const gruppy = [];
  for (const kusok of html.split('<table').slice(1)) {
    const nazvanie = tekst((kusok.match(/table-title">([^<]+)</) ?? [])[1] ?? '');
    if (!/^Группа/.test(nazvanie)) continue;
    const komandy = [];
    for (const tr of kusok.split('</thead>')[1]?.split('<tr').slice(1) ?? []) {
      const imya = tekst((tr.match(/js-stub-name">([^<]+)</) ?? [])[1] ?? '');
      const z = [...tr.matchAll(/table-value">([^<]*)</g)].map((m) => tekst(m[1]));
      if (!imya || z.length < 7) continue;
      const [zab, prop] = z[5].split('-').map(Number);
      komandy.push({
        mesto: komandy.length + 1, komanda: imya, igry: chislo(z[0]),
        pobedy: chislo(z[1]), pobedyPen: chislo(z[2]), porazheniya: chislo(z[3]), porazheniyaPen: chislo(z[4]),
        zabito: zab, propushcheno: prop, ochki: chislo(z[6]),
      });
    }
    if (komandy.length) gruppy.push({ nazvanie, komandy });
  }
  return gruppy;
}

export async function sobratKubok() {
  const [k, t] = await Promise.all([skachat(KALENDAR), skachat(TABLICY)]);
  return { matchi: razobratKalendar(k), gruppy: razobratGruppy(t) };
}
