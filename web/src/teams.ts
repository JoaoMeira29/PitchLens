// How each team is marked on the site. National teams get their flag (flag-icons, MIT licence);
// clubs get a badge we draw ourselves from their initials and colours. Official crests and
// competition logos are trademarks we have no licence for, so they are not used.

/** ISO 3166 codes as used by flag-icons, by the team names in the StatsBomb data. */
export const FLAGS: Record<string, string> = {
  Albania: "al",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  Brazil: "br",
  Cameroon: "cm",
  Canada: "ca",
  "Costa Rica": "cr",
  Croatia: "hr",
  "Czech Republic": "cz",
  Denmark: "dk",
  Ecuador: "ec",
  England: "gb-eng",
  France: "fr",
  Georgia: "ge",
  Germany: "de",
  Ghana: "gh",
  Hungary: "hu",
  Iran: "ir",
  Italy: "it",
  Japan: "jp",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  Poland: "pl",
  Portugal: "pt",
  Qatar: "qa",
  Romania: "ro",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  Serbia: "rs",
  Slovakia: "sk",
  Slovenia: "si",
  "South Korea": "kr",
  Spain: "es",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  Ukraine: "ua",
  "United States": "us",
  Uruguay: "uy",
  Wales: "gb-wls",
};

export interface Badge {
  /** Three-letter abbreviation shown in the badge. */
  code: string;
  /** Main club colour (shield) and second colour (rim); text colour chosen for contrast. */
  primary: string;
  secondary: string;
  text: string;
}

/** Club colours for the generated badges, by the team names in the StatsBomb data. */
export const BADGES: Record<string, Badge> = {
  "AFC Bournemouth": { code: "BOU", primary: "#DA291C", secondary: "#111111", text: "#FFFFFF" },
  Arsenal: { code: "ARS", primary: "#EF0107", secondary: "#FFFFFF", text: "#FFFFFF" },
  "Aston Villa": { code: "AVL", primary: "#670E36", secondary: "#95BFE5", text: "#FFFFFF" },
  Chelsea: { code: "CHE", primary: "#034694", secondary: "#FFFFFF", text: "#FFFFFF" },
  "Crystal Palace": { code: "CRY", primary: "#1B458F", secondary: "#C4122E", text: "#FFFFFF" },
  Everton: { code: "EVE", primary: "#003399", secondary: "#FFFFFF", text: "#FFFFFF" },
  "Leicester City": { code: "LEI", primary: "#003090", secondary: "#FDBE11", text: "#FFFFFF" },
  Liverpool: { code: "LIV", primary: "#C8102E", secondary: "#F6EB61", text: "#FFFFFF" },
  "Manchester City": { code: "MCI", primary: "#6CABDD", secondary: "#1C2C5B", text: "#1C2C5B" },
  "Manchester United": { code: "MUN", primary: "#DA291C", secondary: "#FBE122", text: "#FFFFFF" },
  "Newcastle United": { code: "NEW", primary: "#241F20", secondary: "#FFFFFF", text: "#FFFFFF" },
  "Norwich City": { code: "NOR", primary: "#FFF200", secondary: "#00A650", text: "#00572B" },
  Southampton: { code: "SOU", primary: "#D71920", secondary: "#FFFFFF", text: "#FFFFFF" },
  "Stoke City": { code: "STK", primary: "#E03A3E", secondary: "#FFFFFF", text: "#FFFFFF" },
  Sunderland: { code: "SUN", primary: "#EB172B", secondary: "#FFFFFF", text: "#FFFFFF" },
  "Swansea City": { code: "SWA", primary: "#FFFFFF", secondary: "#121212", text: "#121212" },
  "Tottenham Hotspur": { code: "TOT", primary: "#FFFFFF", secondary: "#132257", text: "#132257" },
  Watford: { code: "WAT", primary: "#FBEE23", secondary: "#ED2127", text: "#111111" },
  "West Bromwich Albion": {
    code: "WBA",
    primary: "#122F67",
    secondary: "#FFFFFF",
    text: "#FFFFFF",
  },
  "West Ham United": { code: "WHU", primary: "#7A263A", secondary: "#1BB1E7", text: "#FFFFFF" },
};

/** Fallback badge for a team we have no colours for: initials on the site's turf green. */
export function fallbackBadge(team: string): Badge {
  const words = team.split(/\s+/).filter(Boolean);
  const code = (words.length > 1 ? words.map((w) => w[0]).join("") : team).slice(0, 3);
  return { code: code.toUpperCase(), primary: "#2E6B3F", secondary: "#FFFFFF", text: "#FFFFFF" };
}
