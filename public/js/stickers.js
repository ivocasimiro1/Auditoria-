// Shared utilities for sticker display across pages

export const FLAG_CODES = {
  USA:'us', MEX:'mx', CAN:'ca', PAN:'pa', HND:'hn', HAI:'ht', CRC:'cr',
  BRA:'br', ARG:'ar', URU:'uy', COL:'co', ECU:'ec', PAR:'py', VEN:'ve', PER:'pe', BOL:'bo',
  ENG:'gb-eng', WAL:'gb-wls', SCO:'gb-sct',
  ESP:'es', POR:'pt', FRA:'fr', GER:'de', ITA:'it', NED:'nl', BEL:'be', SUI:'ch',
  AUT:'at', CRO:'hr', SRB:'rs', DEN:'dk', SWE:'se', NOR:'no', TUR:'tr',
  POL:'pl', CZE:'cz', SVK:'sk',
  MAR:'ma', SEN:'sn', NGA:'ng', EGY:'eg', GHA:'gh', CMR:'cm', CIV:'ci',
  ALG:'dz', TUN:'tn', COD:'cd', ZAF:'za',
  JPN:'jp', KOR:'kr', AUS:'au', NZL:'nz', IRN:'ir', SAU:'sa',
  JOR:'jo', IRQ:'iq', QAT:'qa', CMV:'cv', UZB:'uz', CUW:'cw',
};

export function flagImg(teamCode) {
  const code = FLAG_CODES[teamCode];
  if (!code) return '🏳️';
  return `<img src="https://flagcdn.com/w40/${code}.png" width="20" height="14" style="border-radius:2px;object-fit:cover;vertical-align:middle;flex-shrink:0;" alt="" loading="lazy">`;
}

/** Fetch sticker metadata for an array of IDs.
 *  Returns a Map<id, {player_name, team_name, team_code, number}>.
 */
export async function fetchStickerMap(apiFetch, ids) {
  if (!ids || !ids.length) return new Map();
  const unique = [...new Set(ids)];
  try {
    const data = await apiFetch('/stickers/batch?ids=' + unique.join(','));
    if (!data) return new Map();
    return new Map(data.map(s => [s.id, s]));
  } catch { return new Map(); }
}

/** Render a sticker chip with flag + player name */
export function stickerChip(id, stickerMap) {
  const s = stickerMap?.get(id);
  if (!s) return `<span class="sticker-chip-simple">${id}</span>`;
  const flag = flagImg(s.team_code);
  const name = s.player_name || s.team_name || id;
  const num = String(s.number).padStart(3, '0');
  return `<span class="sticker-name-chip">${flag}<span class="chip-name">${name}</span><span class="chip-num">#${num}</span></span>`;
}
