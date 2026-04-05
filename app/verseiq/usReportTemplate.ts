import type { SoundExchangeGap } from "./soundexchangeMissing";
import type { USAuditSummary } from "./usAudit";
import type { USArtistScore } from "./usScores";

export function renderUSAuditHTML(params: {
  artistName: string;
  date: string;
  audit: USAuditSummary;
  artistScore: USArtistScore;
  seGaps: SoundExchangeGap[];
  feePercent: number;
}): string {
  const { artistName, date, audit, artistScore, seGaps, feePercent } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VerseIQ US Royalty Audit - ${artistName}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; }
    h1, h2, h3 { margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; font-size: 11px; }
    th { background: #f3f3f3; }
    .section { margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>VerseIQ US Royalty Audit</h1>
  <p><strong>Artist:</strong> ${artistName}<br/>
     <strong>Date:</strong> ${date}</p>

  <div class="section">
    <h2>1. Executive Summary (US Only)</h2>
    <p><strong>Estimated unclaimed US royalties:</strong> EUR ${audit.totalEstimatedRange.min.toFixed(0)} - EUR ${audit.totalEstimatedRange.max.toFixed(0)}</p>
    <p><strong>US Recovery Potential Score:</strong> ${artistScore.recoveryPotentialScore} / 100</p>
    <p><strong>Estimated recovery fee (${feePercent}%):</strong> EUR ${audit.feeRange.min.toFixed(0)} - EUR ${audit.feeRange.max.toFixed(0)}</p>
  </div>

  <div class="section">
    <h2>2. SoundExchange Gaps</h2>
    <ul>
      ${seGaps.map((g) => `<li>ISRC ${g.isrc} - ${g.reason}</li>`).join("")}
    </ul>
  </div>

  <div class="section">
    <h2>3. Track-Level US Recovery Potential</h2>
    <table>
      <tr>
        <th>ISRC</th>
        <th>Missing in SoundExchange</th>
        <th>US Playlist Followers</th>
        <th>US Radio-Linked Playlists</th>
        <th>Score (0-100)</th>
      </tr>
      ${audit.tracks
        .map(
          (t) => `
        <tr>
          <td>${t.isrc}</td>
          <td>${t.missingInSoundExchange ? "Yes" : "No"}</td>
          <td>${t.usPlaylistFollowers}</td>
          <td>${t.usRadioLinkedPlaylists}</td>
          <td>${t.score}</td>
        </tr>`
        )
        .join("")}
    </table>
  </div>

  <div class="section">
    <h2>4. Next Steps</h2>
    <p>1. Execute Letter of Direction (LOD) for SoundExchange using the attached template.</p>
    <p>2. Register missing ISRCs with SoundExchange and submit claims for retroactive royalties.</p>
    <p>3. Once US recovery is underway, optionally proceed to European PRO audits for complex cases.</p>
  </div>
</body>
</html>
`;
}
