// scripts/actualizar-datos.mjs
// Node 20 nativo: fetch + Intl + fs/promises (sin dependencias externas)
import { writeFile } from 'node:fs/promises';

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
if (!TOKEN) throw new Error('Falta FOOTBALL_DATA_TOKEN en las variables de entorno');

const BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'WC';

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

// Banderas por código ISO de país (emojis)
function flag(code) {
  if (!code) return '';
  const cc = code.toUpperCase();
  // Mapeo de códigos de football-data.org a ISO2
  const MAP = {
    'AND':'AD','ARE':'AE','AFG':'AF','ATG':'AG','AIA':'AI','ALB':'AL','ARM':'AM',
    'AGO':'AO','ATA':'AQ','ARG':'AR','ASM':'AS','AUT':'AT','AUS':'AU','ABW':'AW',
    'ALA':'AX','AZE':'AZ','BIH':'BA','BRB':'BB','BGD':'BD','BEL':'BE','BFA':'BF',
    'BGR':'BG','BHR':'BH','BDI':'BI','BEN':'BJ','BLM':'BL','BMU':'BM','BRN':'BN',
    'BOL':'BO','BES':'BQ','BRA':'BR','BHS':'BS','BTN':'BT','BVT':'BV','BWA':'BW',
    'BLR':'BY','BLZ':'BZ','CAN':'CA','CCK':'CC','COD':'CD','CAF':'CF','COG':'CG',
    'CHE':'CH','CIV':'CI','COK':'CK','CHL':'CL','CMR':'CM','CHN':'CN','COL':'CO',
    'CRI':'CR','CUB':'CU','CPV':'CV','CUW':'CW','CXR':'CX','CYP':'CY','CZE':'CZ',
    'DEU':'DE','DJI':'DJ','DNK':'DK','DMA':'DM','DOM':'DO','DZA':'DZ','ECU':'EC',
    'EST':'EE','EGY':'EG','ESH':'EH','ERI':'ER','ESP':'ES','ETH':'ET','FIN':'FI',
    'FJI':'FJ','FLK':'FK','FSM':'FM','FRO':'FO','FRA':'FR','GAB':'GA','GBR':'GB',
    'GRD':'GD','GEO':'GE','GUF':'GF','GGY':'GG','GHA':'GH','GIB':'GI','GRL':'GL',
    'GMB':'GM','GIN':'GN','GLP':'GP','GNQ':'GQ','GRC':'GR','SGS':'GS','GTM':'GT',
    'GUM':'GU','GNB':'GW','GUY':'GY','HKG':'HK','HMD':'HM','HND':'HN','HRV':'HR',
    'HTI':'HT','HUN':'HU','IDN':'ID','IRL':'IE','ISR':'IL','IMN':'IM','IND':'IN',
    'IOT':'IO','IRQ':'IQ','IRN':'IR','ISL':'IS','ITA':'IT','JEY':'JE','JAM':'JM',
    'JOR':'JO','JPN':'JP','KEN':'KE','KGZ':'KG','KHM':'KH','KIR':'KI','COM':'KM',
    'KNA':'KN','PRK':'KP','KOR':'KR','KWT':'KW','CYM':'KY','KAZ':'KZ','LAO':'LA',
    'LBN':'LB','LCA':'LC','LIE':'LI','LKA':'LK','LBR':'LR','LSO':'LS','LTU':'LT',
    'LUX':'LU','LVA':'LV','LBY':'LY','MAR':'MA','MCO':'MC','MDA':'MD','MNE':'ME',
    'MAF':'MF','MDG':'MG','MHL':'MH','MKD':'MK','MLI':'ML','MMR':'MM','MNG':'MN',
    'MAC':'MO','MNP':'MP','MTQ':'MQ','MRT':'MR','MSR':'MS','MLT':'MT','MUS':'MU',
    'MDV':'MV','MWI':'MW','MEX':'MX','MYS':'MY','MOZ':'MZ','NAM':'NA','NCL':'NC',
    'NER':'NE','NFK':'NF','NGA':'NG','NIC':'NI','NLD':'NL','NOR':'NO','NPL':'NP',
    'NRU':'NR','NIU':'NU','NZL':'NZ','OMN':'OM','PAN':'PA','PER':'PE','PYF':'PF',
    'PNG':'PG','PHL':'PH','PAK':'PK','POL':'PL','SPM':'PM','PCN':'PN','PRI':'PR',
    'PSE':'PS','PRT':'PT','PLW':'PW','PRY':'PY','QAT':'QA','REU':'RE','ROU':'RO',
    'SRB':'RS','RUS':'RU','RWA':'RW','SAU':'SA','SLB':'SB','SYC':'SC','SDN':'SD',
    'SWE':'SE','SGP':'SG','SHN':'SH','SVN':'SI','SJM':'SJ','SVK':'SK','SLE':'SL',
    'SMR':'SM','SEN':'SN','SOM':'SO','SUR':'SR','SSD':'SS','STP':'ST','SLV':'SV',
    'SXM':'SX','SYR':'SY','SWZ':'SZ','TCA':'TC','TCD':'TD','ATF':'TF','TGO':'TG',
    'THA':'TH','TJK':'TJ','TKL':'TK','TLS':'TL','TKM':'TM','TUN':'TN','TON':'TO',
    'TUR':'TR','TTO':'TT','TUV':'TV','TWN':'TW','TZA':'TZ','UKR':'UA','UGA':'UG',
    'UMI':'UM','USA':'US','URY':'UY','UZB':'UZ','VAT':'VA','VCT':'VC','VEN':'VE',
    'VGB':'VG','VIR':'VI','VNM':'VN','VUT':'VU','WLF':'WF','WSM':'WS','YEM':'YE',
    'MYT':'YT','ZAF':'ZA','ZMB':'ZM','ZWE':'ZW',
    'ENG':'GB','SCO':'GB','WAL':'GB','NIR':'GB','KVX':'XK'
  };
  const iso2 = MAP[cc] || cc.slice(0,2);
  if (iso2.length !== 2) return '';
  return String.fromCodePoint(...[...iso2].map(c => 0x1F1E0 - 65 + c.charCodeAt(0)));
}

function isoToDate(utcStr) {
  // "2026-06-11T19:00:00Z" → "2026-06-11"
  return utcStr ? utcStr.slice(0, 10) : '';
}

function isoToTime(utcStr) {
  // "2026-06-11T19:00:00Z" → "19:00" (UTC, el HTML convierte según zona)
  return utcStr ? utcStr.slice(11, 16) : '';
}

function scoreStr(m) {
  if (m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED') {
    const h = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null;
    const a = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null;
    if (h !== null && a !== null) return `${h}-${a}`;
  }
  return '';
}

function winnerSide(m) {
  if (m.status !== 'FINISHED') return '';
  const w = m.score?.winner;
  if (w === 'HOME_TEAM') return 'a';
  if (w === 'AWAY_TEAM') return 'b';
  if (w === 'DRAW') return 'e';
  return '';
}

async function main() {
  const now = new Date().toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  // 1. Fetch todos los partidos
  const matchesData = await fetchJson(`/competitions/${COMPETITION}/matches`);
  const allMatches = matchesData.matches || [];

  // 2. Fetch standings (tabla de posiciones)
  let standingsData = null;
  try {
    standingsData = await fetchJson(`/competitions/${COMPETITION}/standings`);
  } catch(e) {
    console.warn('standings no disponible:', e.message);
  }

  // 3. Fetch scorers
  let scorersData = null;
  try {
    scorersData = await fetchJson(`/competitions/${COMPETITION}/scorers?limit=10`);
  } catch(e) {
    console.warn('scorers no disponible:', e.message);
  }

  // --- Construir grupos ---
  const groupMatches = allMatches.filter(m => m.stage === 'GROUP_STAGE');
  
  // Agrupar por grupo
  const groupMap = {};
  for (const m of groupMatches) {
    const gId = m.group || 'A';
    if (!groupMap[gId]) groupMap[gId] = [];
    groupMap[gId].push(m);
  }

  // Standings por grupo
  const standingsByGroup = {};
  if (standingsData?.standings) {
    for (const s of standingsData.standings) {
      const gId = s.group || s.stage || 'A';
      standingsByGroup[gId] = s.table || [];
    }
  }

  // Construir array de grupos
  const gruposArr = Object.entries(groupMap).sort(([a],[b]) => a.localeCompare(b)).map(([gId, matches]) => {
    const letra = gId.replace('GROUP_','').replace('Grupo ','').replace('Group ','').slice(-1);
    
    // Teams desde standings o desde los partidos
    let teams = [];
    const standKey = Object.keys(standingsByGroup).find(k => k.includes(letra) || k === gId);
    if (standKey && standingsByGroup[standKey].length) {
      teams = standingsByGroup[standKey].map(row => ({
        n: row.team?.name || '',
        fl: flag(row.team?.tla || ''),
        pj: row.playedGames || 0,
        g: row.won || 0,
        e: row.draw || 0,
        p: row.lost || 0,
        dg: (row.goalsFor || 0) - (row.goalsAgainst || 0) >= 0 ? '+' + ((row.goalsFor || 0) - (row.goalsAgainst || 0)) : String((row.goalsFor || 0) - (row.goalsAgainst || 0)),
        pts: row.points || 0,
        st: row.team?.tla === 'MEX' ? 'q' : '' // placeholder, se calcula abajo
      }));
    } else {
      // Inferir equipos desde partidos
      const teamSet = {};
      for (const m of matches) {
        const hn = m.homeTeam?.name || ''; const ht = m.homeTeam?.tla || '';
        const an = m.awayTeam?.name || ''; const at = m.awayTeam?.tla || '';
        if (hn && !teamSet[hn]) teamSet[hn] = { n: hn, fl: flag(ht), pj:0,g:0,e:0,p:0,gf:0,ga:0,pts:0,st:'' };
        if (an && !teamSet[an]) teamSet[an] = { n: an, fl: flag(at), pj:0,g:0,e:0,p:0,gf:0,ga:0,pts:0,st:'' };
        if (m.status === 'FINISHED') {
          const hg = m.score?.fullTime?.home || 0;
          const ag = m.score?.fullTime?.away || 0;
          if (teamSet[hn]) { teamSet[hn].pj++; teamSet[hn].gf+=hg; teamSet[hn].ga+=ag; if(hg>ag){teamSet[hn].g++;teamSet[hn].pts+=3;}else if(hg===ag){teamSet[hn].e++;teamSet[hn].pts+=1;}else{teamSet[hn].p++;} }
          if (teamSet[an]) { teamSet[an].pj++; teamSet[an].gf+=ag; teamSet[an].ga+=hg; if(ag>hg){teamSet[an].g++;teamSet[an].pts+=3;}else if(ag===hg){teamSet[an].e++;teamSet[an].pts+=1;}else{teamSet[an].p++;} }
        }
      }
      teams = Object.values(teamSet).sort((a,b)=>b.pts-a.pts||((b.gf-b.ga)-(a.gf-a.ga))||b.gf-a.gf).map(t=>({
        n:t.n, fl:t.fl, pj:t.pj, g:t.g, e:t.e, p:t.p,
        dg: (t.gf-t.ga)>=0 ? '+'+(t.gf-t.ga) : String(t.gf-t.ga),
        pts:t.pts, st:t.st
      }));
    }

    // Determinar estado de clasificados/eliminados
    // Contar partidos jugados por equipo
    const played = {};
    for (const m of matches) {
      if (m.status === 'FINISHED') {
        played[m.homeTeam?.name] = (played[m.homeTeam?.name] || 0) + 1;
        played[m.awayTeam?.name] = (played[m.awayTeam?.name] || 0) + 1;
      }
    }
    // Marcar clasificados/eliminados basado en standings
    if (standKey && standingsByGroup[standKey].length) {
      const rows = standingsByGroup[standKey];
      const totalTeams = rows.length;
      rows.forEach((row, i) => {
        const t = teams.find(x => x.n === row.team?.name);
        if (!t) return;
        // Simplificado: top 2 clasifican si ya jugaron suficientes partidos
        const maxPj = 3; // fase de grupos tiene 3 partidos por equipo
        if (row.playedGames >= maxPj) {
          if (i < 2) t.st = 'q'; // clasificado
          else if (i === totalTeams - 1 && row.playedGames >= maxPj) t.st = 'e'; // posible eliminado
        }
      });
    }

    // Estado del grupo
    const allFinished = matches.every(m => m.status === 'FINISHED');
    const someFinished = matches.some(m => m.status === 'FINISHED');
    const classified = teams.filter(t => t.st === 'q').map(t => t.n);
    const eliminated = teams.filter(t => t.st === 'e').map(t => t.n);
    
    let state = '';
    if (classified.length) state = classified.map(n => n + ' ya clasificado').join(', ');
    else if (eliminated.length) state = eliminated[0] + ' eliminado';
    else if (someFinished) state = 'En curso';
    else state = 'Por comenzar';

    // Partidos jugados (res) y próximos (next)
    const finished = matches.filter(m => m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED');
    const upcoming = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');

    const res = finished.map(m => ({
      a: m.homeTeam?.name || '',
      fa: flag(m.homeTeam?.tla || ''),
      b: m.awayTeam?.name || '',
      fb: flag(m.awayTeam?.tla || ''),
      s: scoreStr(m),
      w: winnerSide(m),
      live: m.status === 'IN_PLAY' || m.status === 'PAUSED'
    }));

    const next = upcoming.map(m => ({
      a: m.homeTeam?.name || '',
      fa: flag(m.homeTeam?.tla || ''),
      b: m.awayTeam?.name || '',
      fb: flag(m.awayTeam?.tla || ''),
      date: isoToDate(m.utcDate),
      time: isoToTime(m.utcDate)
    }));

    return { id: letra, state, teams, res, next };
  });

  // --- Knockout ---
  const koStages = ['LAST_16','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];
  const koMatches = allMatches.filter(m => koStages.includes(m.stage));
  
  const koRounds = {};
  for (const m of koMatches) {
    const stage = m.stage;
    if (!koRounds[stage]) koRounds[stage] = { round: stage, matches: [], dates: '' };
    koRounds[stage].matches.push({
      a: m.homeTeam?.name || 'Por definir',
      fa: flag(m.homeTeam?.tla || ''),
      b: m.awayTeam?.name || 'Por definir',
      fb: flag(m.awayTeam?.tla || ''),
      s: scoreStr(m),
      w: winnerSide(m),
      date: isoToDate(m.utcDate),
      time: isoToTime(m.utcDate),
      live: m.status === 'IN_PLAY' || m.status === 'PAUSED'
    });
  }

  const knockout = {
    rounds: Object.values(koRounds),
    d16: koRounds['LAST_16']?.matches || koRounds['ROUND_OF_16']?.matches || [],
    oct: koRounds['QUARTER_FINALS']?.matches || [],
    ccua: [],
    sem: koRounds['SEMI_FINALS']?.matches || [],
    fin: koRounds['FINAL']?.matches?.[0] || null,
    ter: koRounds['THIRD_PLACE']?.matches?.[0] || null
  };

  // --- Scorers ---
  const scorers = (scorersData?.scorers || []).slice(0, 10).map(s => ({
    n: s.player?.name || '',
    team: s.team?.name || '',
    fl: flag(s.team?.tla || ''),
    goals: s.goals || 0
  }));

  // --- Determinar fase actual ---
  const hasKo = koMatches.length > 0;
  const allGroupsFinished = gruposArr.length > 0 && gruposArr.every(g => g.next.length === 0);
  let fase = 'Fase de grupos';
  if (hasKo && allGroupsFinished) fase = 'Fase eliminatoria';
  else if (hasKo) fase = 'Eliminatorias en curso';

  // --- Output ---
  const output = {
    lastUpdated: now,
    fase,
    grupos: gruposArr,
    knockout,
    scorers
  };

  await writeFile('data.json', JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ data.json actualizado — ${now} — ${gruposArr.length} grupos, ${allMatches.length} partidos`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
