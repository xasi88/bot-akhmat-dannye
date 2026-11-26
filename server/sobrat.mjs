// Собирает данные всех турниров Ахмата в один файл для экрана: dannye/akhmat.json.
// Запуск: node server/sobrat.mjs [папка]. Источник не прочитался: берём запасной
// или прошлые данные и пишем об этом в поле «preduprezhdeniya».
import fs from 'node:fs';
import path from 'node:path';
import { sobratRpl } from './istochniki/matchtv.mjs';
import { sobratRplEspn } from './istochniki/espn.mjs';
import { sobratKubok } from './istochniki/rfs.mjs';

export const AHMAT = 'Ахмат';
const sAhmatom = (m) => m.doma === AHMAT || m.vgostyah === AHMAT;
const kogda = (m) => `${m.data}T${m.vremya ?? '00:00'}`;

export function proveritRpl(r) {
  if (r.tablica.length !== 16) throw new Error(`в таблице РПЛ ${r.tablica.length} команд`);
  if (!r.tablica.some((t) => t.komanda === AHMAT)) throw new Error('в таблице РПЛ нет Ахмата');
  if (r.matchi.filter(sAhmatom).length < 20) throw new Error('мало матчей Ахмата в РПЛ');
  return r;
}

export function proveritKubok(k) {
  if (!k.matchi.some(sAhmatom)) throw new Error('в Кубке нет матчей Ахмата');
  return k;
}

export function sobratDannye({ rpl, kubok, istochnikRpl, preduprezhdeniya = [], seychas = new Date() }) {
  const matchi = [...rpl.matchi.filter(sAhmatom), ...kubok.matchi.filter(sAhmatom)]
    .sort((a, b) => kogda(a).localeCompare(kogda(b)));
  const sygrany = matchi.filter((m) => m.schet);
  const vperedi = matchi.filter((m) => !m.schet);
  const gruppa = kubok.gruppy.find((g) => g.komandy.some((c) => c.komanda === AHMAT)) ?? null;
  const svoi = (spisok) => spisok.map((i) => ({ ...i, ahmat: i.komanda === AHMAT }));
  return {
    obnovleno: seychas.toISOString(),
    istochniki: { rpl: istochnikRpl, kubok: 'РФС' },
    preduprezhdeniya,
    sleduyushchiy: vperedi[0] ?? null,
    poslednie: sygrany.slice(-5).reverse(),
    matchi,
    rpl: {
      tablica: rpl.tablica,
      statistika: {
        bombardiry: svoi(rpl.statistika.bombardiry),
        assistenty: svoi(rpl.statistika.assistenty),
        glyas: svoi(rpl.statistika.glyas),
      },
    },
    kubok: { gruppa, gruppy: kubok.gruppy },
  };
}

async function glavnaya() {
  const papka = process.argv[2] ?? 'dannye';
  const fayl = path.join(papka, 'akhmat.json');
  const proshlye = fs.existsSync(fayl) ? JSON.parse(fs.readFileSync(fayl, 'utf8')) : null;
  const preduprezhdeniya = [];

  let rpl, istochnikRpl = 'Матч ТВ';
  try {
    rpl = proveritRpl(await sobratRpl());
  } catch (e) {
    preduprezhdeniya.push(`Матч ТВ: ${e.message}. Взяли ESPN.`);
    rpl = proveritRpl(await sobratRplEspn());
    istochnikRpl = 'ESPN';
  }

  let kubok;
  try {
    kubok = proveritKubok(await sobratKubok());
  } catch (e) {
    if (!proshlye) throw e;
    preduprezhdeniya.push(`РФС: ${e.message}. Кубок из прошлых данных.`);
    kubok = { matchi: proshlye.matchi.filter((m) => m.turnir === 'Кубок России'), gruppy: proshlye.kubok.gruppy };
  }

  const dannye = sobratDannye({ rpl, kubok, istochnikRpl, preduprezhdeniya });
  fs.mkdirSync(papka, { recursive: true });
  fs.writeFileSync(fayl, JSON.stringify(dannye, null, 1));
  console.log(`Готово: ${fayl}. РПЛ: ${istochnikRpl}. Матчей Ахмата: ${dannye.matchi.length}.`);
  for (const p of preduprezhdeniya) console.log(`Внимание: ${p}`);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('sobrat.mjs')) {
  glavnaya().catch((e) => { console.error(`Ошибка: ${e.message}`); process.exit(1); });
}
