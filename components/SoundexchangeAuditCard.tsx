import type { GapReport } from "../types/gapReport";

type Props = {
  catalogName?: string;
  report: GapReport;
};

type MetricProps = {
  label: string;
  value: number | string;
  highlight?: boolean;
};

export function SoundexchangeAuditCard({ catalogName, report }: Props) {
  return (
    <section className="se-audit-card">
      <div className="se-audit-card__header">
        <h2 className="se-audit-card__title">SoundExchange Performer Audit</h2>
        <p className="se-audit-card__subtitle">
          {catalogName || "Unknown catalog"} - Rights-Chain Gap Report
        </p>
      </div>

      <div className="se-audit-card__metrics">
        <Metric label="Spotify ISRCs" value={report.spotifyUniqueIsrc} />
        <Metric label="SoundExchange ISRCs" value={report.soundexchangeUniqueIsrc} />
        <Metric
          label="Missing Performer Registrations"
          value={report.missingInSoundexchange.length}
          highlight
        />
        <Metric label="Gap Rate" value={`${(report.gapRate * 100).toFixed(1)}%`} />
      </div>

      <div className="se-audit-card__section">
        <h3 className="se-audit-card__section-title">Missing ISRCs</h3>
        {report.missingInSoundexchange.length === 0 ? (
          <p className="se-audit-card__empty">No missing ISRCs detected.</p>
        ) : (
          <div className="se-audit-card__missing-list">
            {report.missingInSoundexchange.map((row) => (
              <div key={row.isrc} className="se-audit-card__missing-item">
                <span className="se-audit-card__isrc">{row.isrc}</span>
                <span className="se-audit-card__track">{row.title}</span>
                <span className="se-audit-card__artist">{row.artist}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="se-audit-card__footer-note">
        {report.soundexchangeOrphans.length} SoundExchange orphans detected (label-side or unrelated entries).
      </div>

      <div className="se-audit-card__section">
        <p className="se-audit-card__section-title">Recommended Actions</p>
        <ul className="se-audit-card__actions">
          <li>Obtain signed Letter of Direction</li>
          <li>Submit performer-side registration corrections</li>
          <li>Notify SAMI of pending US matches</li>
          <li>File retroactive royalty claim</li>
          <li>Request updated SoundExchange statements</li>
        </ul>
      </div>
    </section>
  );
}

function Metric({ label, value, highlight = false }: MetricProps) {
  return (
    <div className={`se-audit-metric${highlight ? " se-audit-metric--highlight" : ""}`}>
      <div className="se-audit-metric__label">{label}</div>
      <div className="se-audit-metric__value">{value}</div>
    </div>
  );
}