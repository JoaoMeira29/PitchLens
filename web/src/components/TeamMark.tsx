import { BADGES, FLAGS, fallbackBadge } from "../teams";

// Only the flags we use are bundled (flag-icons, MIT). Keep this list in step with FLAGS.
const flagFiles = import.meta.glob<string>(
  "../../node_modules/flag-icons/flags/4x3/{al,ar,au,at,be,br,cm,ca,cr,hr,cz,dk,ec,gb-eng,fr,ge,de,gh,hu,ir,it,jp,mx,ma,nl,pl,pt,qa,ro,sa,gb-sct,sn,rs,sk,si,kr,es,ch,tn,tr,ua,us,uy,gb-wls}.svg",
  { eager: true, query: "?url", import: "default" },
);

function flagUrl(code: string): string | undefined {
  return flagFiles[`../../node_modules/flag-icons/flags/4x3/${code}.svg`];
}

/** A team's flag (national teams) or generated badge (clubs), decorative next to its name. */
export function TeamMark({ team, size = 20 }: { team: string; size?: number }) {
  const code = FLAGS[team];
  const url = code ? flagUrl(code) : undefined;
  if (url) {
    return (
      <img
        className="team-mark flag"
        src={url}
        alt=""
        width={Math.round(size * 1.33)}
        height={size}
        loading="lazy"
      />
    );
  }
  const badge = BADGES[team] ?? fallbackBadge(team);
  return (
    <svg
      className="team-mark badge"
      width={size * 0.9}
      height={size}
      viewBox="0 0 36 40"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18 1 L34 6 V20 C34 30 27 36 18 39 C9 36 2 30 2 20 V6 Z"
        fill={badge.primary}
        stroke={badge.secondary}
        strokeWidth={3}
      />
      <text
        x="18"
        y="24"
        textAnchor="middle"
        fill={badge.text}
        fontSize={badge.code.length > 2 ? 10.5 : 13}
        fontWeight={800}
        fontFamily="Big Shoulders Display, Arial Narrow, sans-serif"
      >
        {badge.code}
      </text>
    </svg>
  );
}
