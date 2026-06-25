// scripts/actualizar-datos.mjs
// Node 20 nativo: fetch + Intl + fs/promises (sin dependencias externas)
import { writeFile } from 'node:fs/promises';

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
if (!TOKEN) throw new Error('Falta FOOTBALL_DATA_TOKEN en las variables de entorno');

const BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'WC';

async function fetchJson(path) {
  const res = await fetch(BASE + path, { headers: { 'X-Auth-Token': TOKEN } });
  if (!res.ok) { const t = await res.text(); throw new Error('API ' + res.status + ': ' + t.slice(0,200)); }
  return res.json();
}

function flag(code) {
  if (!code) return '';
  const cc = code.toUpperCase();
  const MAP = {
    'ARG':'AR','AUS':'AU','AUT':'AT','BEL':'BE','BRA':'BR','CAN':'CA','CHE':'CH','CHL':'CL',
    'CHN':'CN','COL':'CO','CRI':'CR','CZE':'CZ','DEU':'DE','DNK':'DK','ECU':'EC','EGY':'EG',
    'ESP':'ES','FRA':'FR','GBR':'GB','ENG':'GB','SCO':'GB','WAL':'GB','GHA':'GH','GRC':'GR',
    'GTM':'GT','HND':'HN','HRV':'HR','HTI':'HT','HUN':'HU','IDN':'ID','IND':'IN','IRN':'IR',
    'IRQ':'IQ','IRL':'IE','ISL':'IS','ISR':'IL','ITA':'IT','JAM':'JM','JPN':'JP','KEN':'KE',
    'KOR':'KR','MAR':'MA','MEX':'MX','MYS':'MY','NGA':'NG','NLD':'NL','NOR':'NO','NZL':'NZ',
    'PAN':'PA','PER':'PE','POL':'PL','PRT':'PT','PRY':'PY','QAT':'QA','ROU':'RO','RUS':'RU',
    'SAU':'SA','SEN':'SN','SRB':'RS','SVN':'SI','SWE':'SE','TUN':'TN','TUR':'TR','UKR':'UA',
    'URY':'UY','USA':'US','VEN':'VE','ZAF':'ZA','CMR':'CM','CIV':'CI','DZA':'DZ','MLI':'ML',
    'UZB':'UZ','KAZ':'KZ','AZE':'AZ','GEO':'GE','ARM':'AM','KWT':'KW','BHR':'BH','OMN':'OM',
    'ARE':'AE','JOR':'JO','LBN':'LB','BOL':'BO','ALB':'AL','MKD':'MK','BIH':'BA','BGR':'BG',
    'FIN':'FI','SVK':'SK','BLR':'BY','LTU':'LT','LVA':'LV','EST':'EE','MDA':'MD'
  };
  const iso2 = MAP[cc] || (cc.length === 2 ? cc : cc.slice(0,2));
  if (iso2.length !== 2) return '';
  try { return String.fromCodePoint(...[...iso2].map(c => 0x1F1E0 - 65 + c.charCodeAt(0))); }
  catch(e) { return ''; }
}

function isoToDate(s) { return s ? s.slice(0,10) : ''; }
function isoToTime(s) { return s ? s.slice(11,16) : ''; }

function scoreStr(m) {
  if (m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED') {
    const h = m.score && m.score.fullTime ? m.score.fullTime.home : null;
    const a = m.score && m.score.fullTime ? m.score.fullTime.away : null;
    if (h !== null && a !== null) return h + '-' + a;
  }
  return '';
}

function winnerSide(m) {
  if (m.status !== 'FINISHED') return '';
  const w = m.score && m.score.winner;
  if (w === 'HOME_TEAM') return 'a';
  if (w === 'AWAY_TEAM') return 'b';
  if (w === 'DRAW') return 'e';
  return '';
}

function matchToObj(m) {
  return {
    a: m.homeTeam ? m.homeTeam.name : 'Por definir',
    fa: flag(m.homeTeam ? m.homeTeam.tla : ''),
    b: m.awayTeam ? m.awayTeam.name : 'Por definir',
    fb: flag(m.awayTeam ? m.awayTeam.tla : ''),
    s: scoreStr(m),
    w: winnerSide(m),
    date: isoToDate(m.utcDate),
    time: isoToTime(m.utcDate),
    live: m.status === 'IN_PLAY' || m.status === 'PAUSED'
  };
}

const KO_NAMES = {
  'LAST_16': 'Dieciseisavos de final',
  'ROUND_OF_16': 'Dieciseisavos de final',
  'QUARTER_FINALS': 'Octavos de final',
  'SEMI_FINALS': 'Semifinales',
  'THIRD_PLACE': 'Tercer puesto',
  'FINAL': 'Final'
};

async function main() {
  const now = new Date().toISOString();

  const matchesData = await fetchJson('/competitions/' + COMPETITION + '/matches');
  const allMatches = matchesData.matches || [];

  let standingsData = null;
  try { standingsData = await fetchJson('/competitions/' + COMPETITION + '/standings'); }
  catch(e) { console.warn('standings:', e.message); }

  let scorersData = null;
  try { scorersData = await fetchJson('/competitions/' + COMPETITION + '/scorers?limit=10'); }
  catch(e) { console.warn('scorers:', e.message); }

  // --- GRUPOS ---
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
      standingsByGroup[s.group || s.stage || 'A'] = s.table || [];
    }
  }

  const gruposArr = Object.entries(groupMap).sort(([a],[b]) => a.localeCompare(b)).map(([gId, matches]) => {
    const letra = gId.replace('GROUP_','').replace('Grupo ','').replace('Group ','').slice(-1);
    let teams = [];
    const standKey = Object.keys(standingsByGroup).find(k => k.includes(letra) || k === gId);
    if (standKey && standingsByGroup[standKey].length) {
      teams = standingsByGroup[standKey].map((row, i) => {
        const gf = row.goalsFor || 0;
        const ga = row.goalsAgainst || 0;
        const diff = gf - ga;
        const maxPj = 3;
        let st = '';
        if (row.playedGames >= maxPj) {
          if (i === 0) st = 'q';
          else if (i === standingsByGroup[standKey].length - 1) st = 'e';
        }
        return {
          n: row.team ? row.team.name : '',
          fl: flag(row.team ? row.team.tla : ''),
          pj: row.playedGames || 0,
          g: row.won || 0,
          e: row.draw || 0,
          p: row.lost || 0,
          dg: diff >= 0 ? '+' + diff : String(diff),
          pts: row.points || 0,
          st
        };
      });
    } else {
      const ts = {};
      for (const m of matches) {
        const hn = m.homeTeam ? m.homeTeam.name : '';
        const ht = m.homeTeam ? m.homeTeam.tla : '';
        const an = m.awayTeam ? m.awayTeam.name : '';
        const at = m.awayTeam ? m.awayTeam.tla : '';
        if (hn && !ts[hn]) ts[hn] = {n:hn,fl:flag(ht),pj:0,g:0,e:0,p:0,gf:0,ga:0,pts:0,st:''};
        if (an && !ts[an]) ts[an] = {n:an,fl:flag(at),pj:0,g:0,e:0,p:0,gf:0,ga:0,pts:0,st:''};
        if (m.status === 'FINISHED') {
          const hg = m.score && m.score.fullTime ? (m.score.fullTime.home||0) : 0;
          const ag = m.score && m.score.fullTime ? (m.score.fullTime.away||0) : 0;
          if (ts[hn]) { ts[hn].pj++; ts[hn].gf+=hg; ts[hn].ga+=ag; if(hg>ag){ts[hn].g++;ts[hn].pts+=3;}else if(hg===ag){ts[hn].e++;ts[hn].pts+=1;}else{ts[hn].p++;} }
          if (ts[an]) { ts[an].pj++; ts[an].gf+=ag; ts[an].ga+=hg; if(ag>hg){ts[an].g++;ts[an].pts+=3;}else if(ag===hg){ts[an].e++;ts[an].pts+=1;}else{ts[an].p++;} }
        }
      }
      teams = Object.values(ts).sort((a,b)=>b.pts-a.pts||((b.gf-b.ga)-(a.gf-a.ga))||b.gf-a.gf).map(t=>{
        const diff=t.gf-t.ga; return {n:t.n,fl:t.fl,pj:t.pj,g:t.g,e:t.e,p:t.p,dg:diff>=0?'+'+diff:String(diff),pts:t.pts,st:t.st};
      });
    }

    const classified = teams.filter(t=>t.st==='q').map(t=>t.n);
    const eliminated = teams.filter(t=>t.st==='e').map(t=>t.n);
    const someFinished = matches.some(m=>m.status==='FINISHED');
    let state = someFinished ? 'En curso' : 'Por comenzar';
    if (classified.length) state = classified.map(n=>n+' ya clasificado').join(', ');
    else if (eliminated.length) state = eliminated[0] + ' eliminado';

    const res = matches.filter(m=>m.status==='FINISHED'||m.status==='IN_PLAY'||m.status==='PAUSED').map(m=>({
      a:m.homeTeam?m.homeTeam.name:'', fa:flag(m.homeTeam?m.homeTeam.tla:''),
      b:m.awayTeam?m.awayTeam.name:'', fb:flag(m.awayTeam?m.awayTeam.tla:''),
      s:scoreStr(m), w:winnerSide(m), live:m.status==='IN_PLAY'||m.status==='PAUSED'
    }));

    const next = matches.filter(m=>m.status==='SCHEDULED'||m.status==='TIMED').map(m=>({
      a:m.homeTeam?m.homeTeam.name:'', fa:flag(m.homeTeam?m.homeTeam.tla:''),
      b:m.awayTeam?m.awayTeam.name:'', fb:flag(m.awayTeam?m.awayTeam.tla:''),
      date:isoToDate(m.utcDate), time:isoToTime(m.utcDate)
    }));

    return { id: letra, state, teams, res, next };
  });

  // --- KNOCKOUT (array con nombres en espanol para byName()) ---
  const KO_ORDER = ['LAST_16','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];
  const koMatchesByStage = {};
  for (const m of allMatches) {
    if (KO_NAMES[m.stage]) {
      const name = KO_NAMES[m.stage];
      if (!koMatchesByStage[name]) koMatchesByStage[name] = [];
      koMatchesByStage[name].push(matchToObj(m));
    }
  }

  const knockout = Object.entries(koMatchesByStage).map(([round, matches]) => ({
    round,
    matches,
    dates: ''
  }));

  // --- SCORERS ---
  const scorers = (scorersData && scorersData.scorers ? scorersData.scorers : []).slice(0,10).map(s=>({
    n: s.player ? s.player.name : '',
    team: s.team ? s.team.name : '',
    fl: flag(s.team ? s.team.tla : ''),
    goals: s.goals || 0
  }));

  const hasKo = knockout.length > 0;
  const allGroupsFinished = gruposArr.length > 0 && gruposArr.every(g=>g.next.length===0);
  let fase = 'Fase de grupos';
  if (hasKo && allGroupsFinished) fase = 'Fase eliminatoria';
  else if (hasKo) fase = 'Eliminatorias en curso';

  const output = { lastUpdated: now, fase, grupos: gruposArr, knockout, scorers };

  await writeFile('data.json', JSON.stringify(output, null, 2), 'utf-8');
  console.log('OK: ' + now + ' | ' + gruposArr.length + ' grupos | ' + allMatches.length + ' partidos');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
