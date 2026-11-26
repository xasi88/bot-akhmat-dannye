// Запасной источник РПЛ: открытые данные ESPN. Названия команд переводим словарём.
const API = 'https://site.api.espn.com/apis';
const AHMAT_ID = '2991';

export const KOMANDY = {
  'Dinamo Moscow': 'Динамо М', 'Zenit St Petersburg': 'Зенит', 'Spartak Moscow': 'Спартак',
  'Krasnodar': 'Краснодар', 'CSKA Moscow': 'ЦСКА', 'Rostov': 'Ростов', 'Rubin Kazan': 'Рубин',
  'FC Baltika Kaliningrad': 'Балтика', 'Krylia Sovetov': 'Крылья Советов', 'Gazovik Orenburg': 'Оренбург',
  'Akhmat Grozny': 'Ахмат', 'Dynamo Makhachkala': 'Динамо Мх', 'Lokomotiv Moscow': 'Локомотив',
  'Rodina Moscow': 'Родина', 'Akron Tolyatti': 'Акрон', 'Fakel Voronezh': 'Факел',
};
const ru = (imya) => KOMANDY[imya] ?? imya;

async function json(url) {
  const o = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!o.ok) throw new Error(`${url}: ответ ${o.status}`);
  return o.json();
}

// Время ESPN в UTC, у нас московское (UTC+3).
function moskva(iso) {
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000);
  return { data: d.toISOString().slice(0, 10), vremya: d.toISOString().slice(11, 16) };
}

export async function sobratRplEspn() {
  const st = await json(`${API}/v2/sports/soccer/rus.1/standings`);
  const stat = (e, imya) => e.stats.find((s) => s.name === imya)?.value ?? null;
  const tablica = st.children[0].standings.entries.map((e, i) => ({
    mesto: i + 1, komanda: ru(e.team.displayName), igry: stat(e, 'gamesPlayed'),
    pobedy: stat(e, 'wins'), nichi: stat(e, 'ties'), porazheniya: stat(e, 'losses'),
    zabito: stat(e, 'pointsFor'), propushcheno: stat(e, 'pointsAgainst'), ochki: stat(e, 'points'),
  }));
  const matchi = [];
  for (const chast of ['', '?fixture=true']) {
    const r = await json(`${API}/site/v2/sports/soccer/rus.1/teams/${AHMAT_ID}/schedule${chast}`);
    for (const ev of r.events ?? []) {
      const c = ev.competitions[0];
      const doma = c.competitors.find((x) => x.homeAway === 'home');
      const gosti = c.competitors.find((x) => x.homeAway === 'away');
      const sygran = c.status?.type?.completed;
      matchi.push({
        id: `rpl-espn-${ev.id}`, turnir: 'РПЛ', etap: '', ...moskva(ev.date),
        doma: ru(doma.team.displayName), vgostyah: ru(gosti.team.displayName),
        schet: sygran ? [Number(doma.score?.value ?? doma.score), Number(gosti.score?.value ?? gosti.score)] : null,
      });
    }
  }
  return { tablica, matchi, statistika: { bombardiry: [], assistenty: [], glyas: [] } };
}
