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

function flag(code) {
  if (!code) return '';
  const cc = code.toUpperCase();
  const MAP = {
    'ARG':'AR','AUS':'AU','AUT':'AT','BEL':'BE','BRA':'BR','CAN':'CA',
    'CHE':'CH','CHL':'CL','CHN':'CN','COL':'CO','CRI':'CR','CZE':'CZ',
    'DEU':'DE','DNK':'DK','ECU':'EC','EGY':'EG','ESP':'ES','FRA':'FR',
    'GBR':'GB','ENG':'GB','SCO':'GB','WAL':'GB','GHA':'GH','GRC':'GR',
    'GTM':'GT','HND':'HN','HRV':'HR','HTI':'HT','HUN':'HU','IDN':'ID',
    'IND':'IN','IRN':'IR','IRQ':'IQ','IRL':'IE','ISL':'IS','ISR':'IL',
    'ITA':'IT','JAM':'JM','JPN':'JP','KEN':'KE','KOR':'KR','MAR':'MA',
    'MEX':'MX','MLI':'ML','MNE':'ME','MYS':'MY','NGA':'NG','NLD':'NL',
    'NOR':'NO','NZL':'NZ','PAN':'PA','PER':'PE','POL':'PL','PRT':'PT',
    'PRY':'PY','QAT':'QA','ROU':'RO','RUS':'RU','SAU':'SA','SEN':'SN',
    'SRB':'RS','SVN':'SI','SWE':'SE','TUN':'TN','TUR':'TR','UKR':'UA',
    'URY':'UY','USA':'US','VEN':'VE','ZAF':'ZA','CMR':'CM','CIV':'CI',
    'DZA':'DZ','GIN':'GN','MLT':'MT','MRT':'MR','MOZ':'MZ','NAM':'NA',
    'UZB':'UZ','KAZ':'KZ','AZE':'AZ','GEO':'GE','ARM':'AM','KWT':'KW',
    'BHR':'BH','OMN':'OM','ARE':'AE','JOR':'JO','LBN':'LB','SYR':'SY',
    'IRQ':'IQ','BOL':'BO','PRK':'KP','ALB':'AL','MKD':'MK','BIH':'BA',
    'KVX':'XK','BGR':'BG','FIN':'FI','SVK':'SK','BLR':'BY','LTU':'LT',
    'LVA':'LV','EST':'EE','MDA':'MD','GNB':'GW','BEN':'BJ','TGO':'TG',
    'BFA':'BF','NER':'NE','COD':'CD','COG':'CG','GAB':'GA','CAF':'CF',
    'CMR':'CM','RWA':'RW','BDI':'BI','TZA':'TZ','UGA':'UG','ZMB':'ZM',
    'ZWE':'ZW','BWA':'BW','LSO':'LS','SWZ':'SZ','MDG':'MG','MUS':'MU',
    'CPV':'CV','SLE':'SL','LBR':'LR','GNQ':'GQ','STP':'ST','COM':'KM',
    'DJI':'DJ','ERI':'ER','ETH':'ET','SDN':'SD','SOM':'SO','SSD':'SS',
    'AGO':'AO','MOZ':'MZ','VNM':'VN','THA':'TH','PHL':'PH','KHM':'KH',
    'LAO':'LA','MMR':'MM','SGP':'SG','BRN':'BN','TLS':'TL','FJI':'FJ',
    'PNG':'PG','VUT':'VU','WSM':'WS','TON':'TO','KIR':'KI','TUV':'TV',
    'NRU':'NR','MHL':'MH','FSM':'FM','PLW':'PW','CUB':'CU','DOM':'DO',
    'HTI':'HT','JAM':'JM','ATG':'AG','BRB':'BB','TTO':'TT','GRD':'GD',
    'VCT':'VC','LCA':'LC','KNA':'KN','DMA':'DM','BLZ':'BZ','GUY':'GY',
    'SUR':'SR','NPL':'NP','BGD':'BD','LKA':'LK','AFG':'AF','PAK':'PK',
    'MDV':'MV','BTN':'BT','MNG':'MN','PRK':'KP','TKM':'TM','TJK':'TJ',
    'KGZ':'KG','GEO':'GE','YEM':'YE','SYR':'SY','LBY':'LY','TUN':'TN',
    'MLT':'MT','CYP':'CY','ISR':'IL','PSE':'PS'
  };
  const iso2 = MAP[cc] || (cc.length === 2 ? cc : cc.slice(0,2));
  if (iso2.length !== 2) return '';
  try {
    return String.fromCodePoint(...[...iso2].map(c => 0x1F1E0 - 65 + c.charCodeAt(0)));
  } catch(e) { return ''; }
}

function isoToDate(utcStr) {
  return utcStr ? utcStr.slice(0, 10) : '';
}

function isoToTime(utcStr) {
  return utcStr ? utcStr.slice(11, 16) : '';
}

function scoreStr(m) {
  if (m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED') {
    const h = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null;
    const a = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null;
    if (h !== null && a !== null) return h + '-' + a;
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
  const now = new Date().toISOString();

  const matchesData = await fetchJson('/competitions/' + COMPETITION + '/matches');
  const allMatches = matchesData.matches || [];

  let standingsData = null;
  try { standingsData = await fetchJson('/competitions/' + COMPETITION + '/standings'); }
  catch(e) { console.warn('standings no disponible:', e.message); }

  let scorersData = null;
  try { scorersData = await fetchJson('/competitions/' + COMPETITION + '/scorers?limit=10'); }
  catch(e) { console.warn('scorers no disponible:', e.message); }

  const groupMatches = allMatches.filter(m => m.stage === 'GROUP_STAGE');

  const groupMap = {};
  for (const m of groupMatches) {
    const gId = m.group || 'A';
    if (!groupMap[gId]) groupMap[gId] = [];
    groupMap[gId].push(m);
  }

  const standingsByGroup = {};
  if (standingsData && standingsData.standings) {
    for (const s of standingsData.standings) {
      const gId = s.group || s.stage || 'A';
      standingsByGroup[gId] = s.table || [];
    }
  }

  const gruposArr = Object.entries(groupMap).sort(([a],[b]) => a.localeCompare(b)).map(([gId, matches]) => {
    const letra = gId.replace('GROUP_','').replace('Grupo ','').replace('Group ','').slice(-1);

    let teams = [];
    const standKey = Object.keys(standingsByGroup).find(k => k.includes(letra) || k === gId);
    if (standKey && standingsByGroup[standKey].length) {
      teams = standingsByGroup[standKey].map(row => {
        const gf = row.goalsFor || 0;
        const ga = row.goalsAgainst || 0;
        const diff = gf - ga;
        return {
          n: row.team ? row.team.name : '',
          fl: flag(row.team ? row.team.tla : ''),
          pj: row.playedGames || 0,
          g: row.won || 0,
          e: row.draw || 0,
          p: row.lost || 0,
          dg: diff >= 0 ? '+' + diff : String(diff),
          pts: row.points || 0,
          st: ''
        };
      });
      const maxPj = 3;
      standingsByGroup[standKey].forEach((row, i) => {
        const t = teams.find(x => row.team && x.n === row.team.name);
        if (!t) return;
        if (row.playedGames >= maxPj) {
          if (i === 0) t.st = 'q';
          else if (i === teams.length - 1) t.st = 'e';
        }
      });
    } else {
      const teamSet = {};
      for (const m of matches) {
        const hn = m.homeTeam ? m.homeTeam.name : '';
        const ht = m.homeTeam ? m.homeTeam.tla : '';
        const an = m.awayTeam ? m.awayTeam.name : '';
        const at = m.awayTeam ? m.awayTeam.tla : '';
        if (hn && !teamSet[hn]) teamSet[hn] = { n:hn, fl:flag(ht), pj:0,g:0,e:0,p:0,gf:0,ga:0,pts:0,st:'' };
        if (an && !teamSet[an]) teamSet[an] = { n:an, fl:flag(at), pj:0,g:0,e:0,p:0,gf:0,ga:0,pts:0,st:'' };
        if (m.status === 'FINISHED') {
          const hg = (m.score && m.score.fullTime) ? (m.score.fullTime.home || 0) : 0;
          const ag = (m.score && m.score.fullTime) ? (m.score.fullTime.away || 0) : 0;
          if (teamSet[hn]) { teamSet[hn].pj++; teamSet[hn].gf+=hg; teamSet[hn].ga+=ag; if(hg>ag){teamSet[hn].g++;teamSet[hn].pts+=3;}else if(hg===ag){teamSet[hn].e++;teamSet[hn].pts+=1;}else{teamSet[hn].p++;} }
          if (teamSet[an]) { teamSet[an].pj++; teamSet[an].gf+=ag; teamSet[an].ga+=hg; if(ag>hg){teamSet[an].g++;teamSet[an].pts+=3;}else if(ag===hg){teamSet[an].e++;teamSet[an].pts+=1;}else{teamSet[an].p++;} }
        }
      }
      teams = Object.values(teamSet).sort((a,b)=>b.pts-a.pts||((b.gf-b.ga)-(a.gf-a.ga))||b.gf-a.gf).map(t=>{
        const diff = t.gf-t.ga;
        return { n:t.n, fl:t.fl, pj:t.pj, g:t.g, e:t.e, p:t.p, dg:diff>=0?'+'+diff:String(diff), pts:t.pts, st:t.st };
      });
    }

    const classified = teams.filter(t => t.st === 'q').map(t => t.n);
    const eliminated = teams.filter(t => t.st === 'e').map(t => t.n);
    const someFinished = matches.some(m => m.status === 'FINISHED');
    let state = '';
    if (classified.length) state = classified.map(n => n + ' ya clasificado').join(', ');
    else if (eliminated.length) state = eliminated[0] + ' eliminado';
    else if (someFinished) state = 'En curso';
    else state = 'Por comenzar';

    const finished = matches.filter(m => m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED');
    const upcoming = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');

    const res = finished.map(m => ({
      a: m.homeTeam ? m.homeTeam.name : '',
      fa: flag(m.homeTeam ? m.homeTeam.tla : ''),
      b: m.awayTeam ? m.awayTeam.name : '',
      fb: flag(m.awayTeam ? m.awayTeam.tla : ''),
      s: scoreStr(m),
      w: winnerSide(m),
      live: m.status === 'IN_PLAY' || m.status === 'PAUSED'
    }));

    const next = upcoming.map(m => ({
      a: m.homeTeam ? m.homeTeam.name : '',
      fa: flag(m.homeTeam ? m.homeTeam.tla : ''),
      b: m.awayTeam ? m.awayTeam.name : '',
      fb: flag(m.awayTeam ? m.awayTeam.tla : ''),
      date: isoToDate(m.utcDate),
      time: isoToTime(m.utcDate)
    }));

    return { id: letra, state, teams, res, next };
  });

  const koStages = ['LAST_16','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];
  const koMatches = allMatches.filter(m => koStages.includes(m.stage));

  const koRounds = {};
  for (const m of koMatches) {
    const stage = m.stage;
    if (!koRounds[stage]) koRounds[stage] = { round: stage, matches: [] };
    koRounds[stage].matches.push({
      a: m.homeTeam ? m.homeTeam.name : 'Por definir',
      fa: flag(m.homeTeam ? m.homeTeam.tla : ''),
      b: m.awayTeam ? m.awayTeam.name : 'Por definir',
      fb: flag(m.awayTeam ? m.awayTeam.tla : ''),
      s: scoreStr(m),
      w: winnerSide(m),
      date: isoToDate(m.utcDate),
      time: isoToTime(m.utcDate),
      live: m.status === 'IN_PLAY' || m.status === 'PAUSED'
    });
  }

  const d16 = (koRounds['LAST_16'] || koRounds['ROUND_OF_16'] || { matches: [] }).matches;
  const oct = (koRounds['QUARTER_FINALS'] || { matches: [] }).matches;
  const sem = (koRounds['SEMI_FINALS'] || { matches: [] }).matches;
  const finMatch = (koRounds['FINAL'] || { matches: [] }).matches[0] || null;
  const terMatch = (koRounds['THIRD_PLACE'] || { matches: [] }).matches[0] || null;

  const knockout = {
    rounds: Object.values(koRounds),
    d16,
    oct,
    ccua: [],
    sem,
    fin: finMatch,
    ter: terMatch
  };

  const scorers = ((scorersData && scorersData.scorers) ? scorersData.scorers : []).slice(0, 10).map(s => ({
    n: s.player ? s.player.name : '',
    team: s.team ? s.team.name : '',
    fl: flag(s.team ? s.team.tla : ''),
    goals: s.goals || 0
  }));

  const hasKo = koMatches.length > 0;
  const allGroupsFinished = gruposArr.length > 0 && gruposArr.every(g => g.next.length === 0);
  let fase = 'Fase de grupos';
  if (hasKo && allGroupsFinished) fase = 'Fase eliminatoria';
  else if (hasKo) fase = 'Eliminatorias en curso';

  const output = {
    lastUpdated: now,
    fase,
    grupos: gruposArr,
    knockout,
    scorers
  };

  await writeFile('data.json', JSON.stringify(output, null, 2), 'utf-8');
  console.log('data.json actualizado - ' + now + ' - ' + gruposArr.length + ' grupos, ' + allMatches.length + ' partidos');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
