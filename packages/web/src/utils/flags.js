// Flag emoji mapping for WC2026 teams
// Team names match what is seeded in the DB (Portuguese names)

const FLAGS = {
  // Group A
  'México': '🇲🇽',
  'EUA': '🇺🇸',
  'Canadá': '🇨🇦',
  'Nova Zelândia': '🇳🇿',

  // Group B
  'Brasil': '🇧🇷',
  'Croácia': '🇭🇷',
  'Marrocos': '🇲🇦',
  'Bélgica': '🇧🇪',

  // Group C
  'Argentina': '🇦🇷',
  'Polônia': '🇵🇱',
  'Arábia Saudita': '🇸🇦',
  'Austrália': '🇦🇺',

  // Group D
  'França': '🇫🇷',
  'Peru': '🇵🇪',
  'Dinamarca': '🇩🇰',
  'Tunísia': '🇹🇳',

  // Group E
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Irã': '🇮🇷',
  'Senegal': '🇸🇳',
  'Países Baixos': '🇳🇱',

  // Group F
  'Espanha': '🇪🇸',
  'Costa Rica': '🇨🇷',
  'Alemanha': '🇩🇪',
  'Japão': '🇯🇵',

  // Group G
  'Portugal': '🇵🇹',
  'Gana': '🇬🇭',
  'Uruguai': '🇺🇾',
  'Coreia do Sul': '🇰🇷',

  // Group H
  'Itália': '🇮🇹',
  'Colômbia': '🇨🇴',
  'Equador': '🇪🇨',
  'Costa do Marfim': '🇨🇮',

  // Group I
  'Argélia': '🇩🇿',
  'Venezuela': '🇻🇪',
  'Camarões': '🇨🇲',

  // Group J
  'Turquia': '🇹🇷',
  'Chile': '🇨🇱',
  'Romênia': '🇷🇴',
  'Nigéria': '🇳🇬',

  // Group K
  'Ucrânia': '🇺🇦',
  'Egito': '🇪🇬',
  'Bolívia': '🇧🇴',
  'República Tcheca': '🇨🇿',

  // Group L
  'Qatar': '🇶🇦',
  'África do Sul': '🇿🇦',
  'Panamá': '🇵🇦',
  'Indonésia': '🇮🇩',

  // English name aliases (in case used elsewhere)
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'Mexico': '🇲🇽',
  'Canada': '🇨🇦',
  'New Zealand': '🇳🇿',
  'Brazil': '🇧🇷',
  'Croatia': '🇭🇷',
  'Morocco': '🇲🇦',
  'Belgium': '🇧🇪',
  'Poland': '🇵🇱',
  'Saudi Arabia': '🇸🇦',
  'Australia': '🇦🇺',
  'France': '🇫🇷',
  'Denmark': '🇩🇰',
  'Tunisia': '🇹🇳',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Iran': '🇮🇷',
  'Netherlands': '🇳🇱',
  'Spain': '🇪🇸',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'Portugal': '🇵🇹',
  'Ghana': '🇬🇭',
  'Uruguay': '🇺🇾',
  'South Korea': '🇰🇷',
  'Italy': '🇮🇹',
  'Colombia': '🇨🇴',
  'Ecuador': '🇪🇨',
  "Côte d'Ivoire": '🇨🇮',
  'Algeria': '🇩🇿',
  'Venezuela': '🇻🇪',
  'Cameroon': '🇨🇲',
  'Turkey': '🇹🇷',
  'Chile': '🇨🇱',
  'Romania': '🇷🇴',
  'Nigeria': '🇳🇬',
  'Ukraine': '🇺🇦',
  'Egypt': '🇪🇬',
  'Bolivia': '🇧🇴',
  'Czech Republic': '🇨🇿',
  'Qatar': '🇶🇦',
  'South Africa': '🇿🇦',
  'Panama': '🇵🇦',
  'Indonesia': '🇮🇩',
  'Serbia': '🇷🇸',
  'Austria': '🇦🇹',
  'Hungary': '🇭🇺',
  'Slovakia': '🇸🇰',
  'Switzerland': '🇨🇭',
  'DR Congo': '🇨🇩', 'Mali': '🇲🇱', 'Senegal': '🇸🇳',
  'Bosnia-Herzegovina': '🇧🇦', 'Ivory Coast': '🇨🇮',

  // FIFA 3-letter codes (used in knockout bracket)
  'RSA': '🇿🇦', 'CAN': '🇨🇦', 'GER': '🇩🇪', 'FRA': '🇫🇷',
  'NED': '🇳🇱', 'MAR': '🇲🇦', 'BRA': '🇧🇷', 'JPN': '🇯🇵',
  'CIV': '🇨🇮', 'NOR': '🇳🇴', 'MEX': '🇲🇽', 'USA': '🇺🇸',
  'BIH': '🇧🇦', 'SUI': '🇨🇭', 'ARG': '🇦🇷', 'AUS': '🇦🇺',
  'ESP': '🇪🇸', 'POR': '🇵🇹', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'BEL': '🇧🇪',
  'CRO': '🇭🇷', 'URU': '🇺🇾', 'COL': '🇨🇴', 'ECU': '🇪🇨',
  'CHI': '🇨🇱', 'PER': '🇵🇪', 'SEN': '🇸🇳', 'GHA': '🇬🇭',
  'CMR': '🇨🇲', 'NGA': '🇳🇬', 'EGY': '🇪🇬', 'ALG': '🇩🇿',
  'TUN': '🇹🇳', 'QAT': '🇶🇦', 'KSA': '🇸🇦', 'IRN': '🇮🇷',
  'KOR': '🇰🇷', 'TUR': '🇹🇷', 'UKR': '🇺🇦', 'POL': '🇵🇱',
  'DEN': '🇩🇰', 'SWE': '🇸🇪', 'SRB': '🇷🇸', 'ROU': '🇷🇴',
  'CZE': '🇨🇿', 'AUT': '🇦🇹', 'NZL': '🇳🇿', 'IDN': '🇮🇩',
  'VEN': '🇻🇪', 'BOL': '🇧🇴', 'PAR': '🇵🇾', 'CRC': '🇨🇷',
  'PAN': '🇵🇦', 'HON': '🇭🇳', 'ITA': '🇮🇹', 'GRE': '🇬🇷',
  'HUN': '🇭🇺', 'SVK': '🇸🇰', 'SVN': '🇸🇮',
};

/**
 * Returns the emoji flag for a team name, or '' if not found (e.g. placeholder names).
 * @param {string} teamName
 * @returns {string}
 */
export function getFlag(teamName) {
  if (!teamName) return '';
  return FLAGS[teamName] || '';
}
