// scripts/actualizar-datos.mjs
// Node 20 nativo: fetch + Intl + fs/promises (sin dependencias externas)
import { writeFile } from 'node:fs/promises';

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
if (!TOKEN) throw new Error('Falta FOOTBALL_DATA_TOKEN en las variables de entorno');

const BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'WC'; // Codigo del Mundial en football-data.org

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': TOKEN }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.substring(0, 200)}`);
  }
  return res.json();
}

const fmt = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit'
});

const raw = await fetchJson(`/competitions/${COMPETITION}/matches`);

const data = {
  actualizadoEn: fmt.format(new Date()),
  totalPartidos: raw.count ?? 0,
  partidos: (raw.matches ?? []).map(m => ({
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    stage: m.stage,
    homeTeam: { id: m.homeTeam?.id, name: m.homeTeam?.name, shortName: m.homeTeam?.shortName },
    awayTeam: { id: m.awayTeam?.id, name: m.awayTeam?.name, shortName: m.awayTeam?.shortName },
    score: m.score
  }))
};

await writeFile('data.json', JSON.stringify(data, null, 2), 'utf8');
console.log(`data.json actualizado: ${data.actualizadoEn} | ${data.totalPartidos} partidos`);
