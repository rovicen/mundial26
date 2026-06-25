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
  const now = new Date().toISOString();


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
