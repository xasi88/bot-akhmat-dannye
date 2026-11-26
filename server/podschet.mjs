// Подсчёты из календаря: таблицы «Дома» и «В гостях», форма команд, сетка плей-офф Кубка.
// Без сети и файлов: проверяется тестами.

const kogda = (m) => `${m.data}T${m.vremya ?? '00:00'}`;

function pustaya(komanda) {
  return { komanda, igry: 0, pobedy: 0, nichi: 0, porazheniya: 0, zabito: 0, propushcheno: 0, ochki: 0 };
}

function zapisat(t, my, oni) {
  t.igry += 1; t.zabito += my; t.propushcheno += oni;
  if (my > oni) { t.pobedy += 1; t.ochki += 3; } else if (my === oni) { t.nichi += 1; t.ochki += 1; } else t.porazheniya += 1;
}

const poryadok = (a, b) => b.ochki - a.ochki
  || (b.zabito - b.propushcheno) - (a.zabito - a.propushcheno)
  || b.zabito - a.zabito || a.komanda.localeCompare(b.komanda, 'ru');

// gde: 'doma' или 'vgostyah'. Считаем только сыгранные матчи.
export function tablicaGde(matchi, gde) {
  const t = new Map();
  for (const m of matchi) {
    if (!m.schet) continue;
    const komanda = gde === 'doma' ? m.doma : m.vgostyah;
    if (!t.has(komanda)) t.set(komanda, pustaya(komanda));
    const [my, oni] = gde === 'doma' ? m.schet : [m.schet[1], m.schet[0]];
    zapisat(t.get(komanda), my, oni);
  }
  return [...t.values()].sort(poryadok).map((s, i) => ({ mesto: i + 1, ...s }));
}

// Форма: итоги 5 последних матчей каждой команды, от старого к новому.
export function forma(matchi, skolko = 5) {
  const f = {};
  const sygrany = matchi.filter((m) => m.schet).sort((a, b) => kogda(a).localeCompare(kogda(b)));
  for (const m of sygrany) {
    const [d, g] = m.schet;
    for (const [komanda, my, oni] of [[m.doma, d, g], [m.vgostyah, g, d]]) {
      (f[komanda] ??= []).push(my > oni ? 'pobeda' : my < oni ? 'porazh' : 'nichya');
    }
  }
  for (const k of Object.keys(f)) f[k] = f[k].slice(-skolko);
  return f;
}

// Плей-офф Кубка по путям. etapy: все этапы со страницы РФС по порядку, даже без матчей.
// Пара: две команды и их матчи (один или два). Победитель известен, когда все матчи сыграны.
export function plejoff(matchi, etapy) {
  const puti = [];
  for (const { put, etap } of etapy) {
    if (!/^Плей-офф/.test(etap)) continue;
    let p = puti.find((x) => x.put === put);
    if (!p) puti.push(p = { put, etapy: [] });
    const svoi = matchi.filter((m) => m.put === put && m.etap === etap).sort((a, b) => kogda(a).localeCompare(kogda(b)));
    const pary = [];
    for (const m of svoi) {
      const klyuch = [m.doma, m.vgostyah].sort().join('|');
      let para = pary.find((x) => x.klyuch === klyuch);
      if (!para) pary.push(para = { klyuch, komandy: [m.doma, m.vgostyah], matchi: [] });
      para.matchi.push({ data: m.data, vremya: m.vremya, doma: m.doma, vgostyah: m.vgostyah, schet: m.schet, penalti: m.penalti ?? null });
    }
    p.etapy.push({ nazvanie: etap.replace(/^Плей-офф,\s*/, ''), pary: pary.map(({ klyuch, ...x }) => ({ ...x, pobeditel: pobeditel(x) })) });
  }
  return puti;
}

// Сумма двух матчей, при равенстве пенальти последнего матча.
export function pobeditel(para) {
  if (!para.matchi.length || para.matchi.some((m) => !m.schet)) return null;
  const [a, b] = para.komandy;
  let ga = 0, gb = 0;
  for (const m of para.matchi) {
    ga += m.doma === a ? m.schet[0] : m.schet[1];
    gb += m.doma === b ? m.schet[0] : m.schet[1];
  }
  if (ga !== gb) return ga > gb ? a : b;
  const posl = para.matchi[para.matchi.length - 1];
  if (!posl.penalti) return null;
  const [pd, pg] = posl.penalti;
  return pd > pg ? posl.doma : posl.vgostyah;
}
