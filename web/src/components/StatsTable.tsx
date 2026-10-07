import { formatClock, formatXg, type MatchDocument } from "../data";

/** Side-by-side numbers for the two teams. */
export function StatsTable({ match }: { match: MatchDocument }) {
  const home = match.stats[match.home.team];
  const away = match.stats[match.away.team];
  const rows: [string, string | number, string | number][] = [
    ["Goals", home.goals, away.goals],
    ["Shots", home.shots, away.shots],
    ["Shots on target", home.shots_on_target, away.shots_on_target],
    ["PitchLens xG", formatXg(home.xg), formatXg(away.xg)],
    ["StatsBomb xG", formatXg(home.statsbomb_xg), formatXg(away.statsbomb_xg)],
  ];
  return (
    <table className="stats">
      <caption className="visually-hidden">Match statistics</caption>
      <thead>
        <tr>
          <th scope="col" className="home">
            {match.home.team}
          </th>
          <th scope="col">
            <span className="visually-hidden">Statistic</span>
          </th>
          <th scope="col" className="away">
            {match.away.team}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, h, a]) => (
          <tr key={label}>
            <td>{h}</td>
            <th scope="row">{label}</th>
            <td>{a}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every shot as a table: the text alternative to the shot map. */
export function ShotList({ match }: { match: MatchDocument }) {
  return (
    <table className="shot-list">
      <caption>All shots in match order</caption>
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Team</th>
          <th scope="col">Player</th>
          <th scope="col">Outcome</th>
          <th scope="col">PitchLens xG</th>
          <th scope="col">StatsBomb xG</th>
        </tr>
      </thead>
      <tbody>
        {match.shots.map((shot) => (
          <tr key={shot.id} className={shot.goal ? "goal" : undefined}>
            <td>{formatClock(shot.minute, shot.second)}</td>
            <td>{shot.team}</td>
            <td>
              {shot.player ?? ""}
              {shot.penalty ? " (penalty)" : ""}
            </td>
            <td>{shot.outcome}</td>
            <td>{formatXg(shot.xg)}</td>
            <td>{formatXg(shot.statsbomb_xg)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
