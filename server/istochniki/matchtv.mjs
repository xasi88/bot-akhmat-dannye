// РПЛ с Матч ТВ: таблица, календарь, бомбардиры и ассистенты.
import { tekst, strokiTablic, chislo, skachat } from './html.mjs';

const OSNOVA = 'https://matchtv.ru/football/rpl';

export function razobratTablicu(html) {
  return strokiTablic(html)
    .filter((s) => s.team && s.played)
    .map((s, i) => ({
      mesto: chislo(s.place ?? s.rank ?? s.position) ?? i + 1,
      komanda: s.team,
      igry: chislo(s.played),
      pobedy: chislo(s.won),
      nichi: chislo(s.drawn ?? s.draw ?? s.draws),
      porazheniya: chislo(s.lost ?? s.lose ?? s.losses),
      zabito: chislo(s.goalsFor),
      propushcheno: chislo(s.goalsAgainst),
      ochki: chislo(s.points ?? s.pts),
    }));
}

// Календарь: туры (<h3>Тур N</h3>), дни (id="date_ГГГГ-ММ-ДД...") и карточки матчей.
// Дату берём из заголовка дня: дата в адресе матча бывает старой (перенос).
export function razobratKalendar(html) {
  const matchi = [];
  const tury = html.split(/<h3[^>]*>\s*Тур\s+/).slice(1);
  for (const kusok of tury) {
    const tur = chislo(kusok.slice(0, 4));
    const karty = kusok.split('m-tournament-game-base-carcass');
    let den = null;
    for (let i = 0; i < karty.length; i++) {
      const karta = karty[i];
      if (i > 0) {
        const ssylka = karta.match(/href="\/football\/rpl\/(\d+)-[a-z0-9-]+?-(\d{2})-(\d{2})-(\d{4})"/);
        if (ssylka) dobavit(karta, ssylka, tur, den, matchi);
      }
      const dni = [...karta.matchAll(/id="date_(\d{4}-\d{2}-\d{2})/g)];
      if (dni.length) den = dni[dni.length - 1][1];
    }
  }
  return matchi;
}

function dobavit(karta, ssylka, tur, den, matchi) {
  const komandy = [...karta.matchAll(/m-tournament-game-participant__title">([^<]+)</g)].map((m) => tekst(m[1]));
  if (komandy.length < 2) return;
  const scheta = [...karta.matchAll(/participant-score-block__score">\s*(\d+)\s*</g)].map((m) => Number(m[1]));
  const vremya = karta.match(/<time[^>]*dateTime="(\d{2}:\d{2})"/i);
  const [, id, dd, mm, yyyy] = ssylka;
  matchi.push({
    id: `rpl-${id}`,
    turnir: 'РПЛ',
    etap: tur ? `${tur} тур` : '',
    data: den ?? `${yyyy}-${mm}-${dd}`,
    vremya: vremya ? vremya[1] : null,
    doma: komandy[0],
    vgostyah: komandy[1],
    schet: scheta.length === 2 ? scheta : null,
  });
}

// Три таблицы по 10 строк: голы, передачи, гол+пас.
// Ячейка игрока: имя в alt фотографии, после имени название команды.
export function razobratStatistiku(html) {
  const stroki = strokiTablic(html).filter((s) => s.person);
  const igrok = (s) => {
    const imya = ((s._person.match(/alt="Фотография игрока ([^"]+)"/) ?? [])[1] ?? s.person).trim();
    const komanda = ((s._person.match(/alt="Логотип команды ([^"]+)"/) ?? [])[1] ?? '').trim();
    return { imya, komanda };
  };
  stroki.forEach((s) => Object.assign(s, igrok(s)));
  const kto = (s) => ({ imya: s.imya, komanda: s.komanda });
  const bombardiry = stroki.filter((s) => s.goalsCount !== undefined)
    .map((s) => ({ ...kto(s), goly: chislo(s.goalsCount), penalti: chislo(s.penaltyCount) }));
  const assistenty = stroki.filter((s) => s.assistsCount !== undefined)
    .map((s) => ({ ...kto(s), peredachi: chislo(s.assistsCount) }));
  const glyas = stroki.filter((s) => s.points !== undefined)
    .map((s) => ({ ...kto(s), ochki: chislo(s.points) }));
  return { bombardiry, assistenty, glyas };
}

export async function sobratRpl() {
  const [t, k, s] = await Promise.all([
    skachat(`${OSNOVA}/table`),
    skachat(`${OSNOVA}/calendar`),
    skachat(`${OSNOVA}/stats`),
  ]);
  return { tablica: razobratTablicu(t), matchi: razobratKalendar(k), statistika: razobratStatistiku(s) };
}
