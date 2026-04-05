import type { TrackISRCRecord, PlaylistInfo } from "./types";
import type { RoyaltyAudit } from "./audit";
import type {
  ISRCProIssue,
  MetadataIssue,
  MissingRegistration,
  NeighboringRightsIssue,
  ReleaseTimelineIssue,
} from "./allIssuesTypes";

export function renderAuditHTML(params: {
  artistName: string;
  date: string;
  audit: RoyaltyAudit;
  gaps: PlaylistInfo[];
  tracks: TrackISRCRecord[];
  proIssues: ISRCProIssue[];
  metadataIssues: MetadataIssue[];
  missingRegs: MissingRegistration[];
  neighIssues: NeighboringRightsIssue[];
  releaseIssues: ReleaseTimelineIssue[];
  feePercent: number;
}) {
  const {
    artistName,
    date,
    audit,
    gaps,
    tracks,
    proIssues,
    metadataIssues,
    missingRegs,
    neighIssues,
    releaseIssues,
    feePercent,
  } = params;

  const estMin = audit.globalMin;
  const estMax = audit.globalMax;
  const feeMin = estMin * (feePercent / 100);
  const feeMax = estMax * (feePercent / 100);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VerseIQ Royalty Audit - ${artistName}</title>
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
  <h1>VerseIQ Royalty Audit Report</h1>
  <p><strong>Artist:</strong> ${artistName}<br/>
     <strong>Date:</strong> ${date}</p>

  <div class="section">
    <h2>1. Executive Summary</h2>
    <p><strong>Estimated unclaimed royalties:</strong> EUR ${estMin.toFixed(0)} - EUR ${estMax.toFixed(0)}</p>
    <p><strong>Royalty Health Score:</strong> ${audit.healthScore} / 100</p>
  </div>

  <div class="section">
    <h2>2. Territory Insights</h2>
    <table>
      <tr>
        <th>Territory</th>
        <th>PRO</th>
        <th>Missing Playlists</th>
        <th>Followers</th>
        <th>Est. Range (EUR)</th>
        <th>Manual PRO Check</th>
      </tr>
      ${audit.territoryRows
        .map(
          (row) => `
        <tr>
          <td>${row.territory}</td>
          <td>${row.pro}</td>
          <td>${row.playlists}</td>
          <td>${row.followers}</td>
          <td>EUR ${row.minRoyalty.toFixed(0)} - EUR ${row.maxRoyalty.toFixed(0)}</td>
          <td>${row.needsManualProCheck ? "Yes" : "No"}</td>
        </tr>`
        )
        .join("")}
    </table>
  </div>

  <div class="section">
    <h2>3. Estimated Revenue Breakdown</h2>
    <p><strong>Streaming gaps:</strong> EUR ${audit.split.streaming.min.toFixed(0)} - EUR ${audit.split.streaming.max.toFixed(0)}</p>
    <p><strong>Performance royalties:</strong> EUR ${audit.split.performance.min.toFixed(0)} - EUR ${audit.split.performance.max.toFixed(0)}</p>
    <p><strong>Neighboring rights:</strong> EUR ${audit.split.neighboring.min.toFixed(0)} - EUR ${audit.split.neighboring.max.toFixed(0)}</p>
  </div>

  <div class="section">
    <h2>4. Playlist Gap Analysis</h2>
    <table>
      <tr>
        <th>Name</th>
        <th>Followers</th>
        <th>Territory</th>
        <th>Value Score</th>
        <th>Radio-linked</th>
      </tr>
      ${gaps
        .map(
          (playlist) => `
        <tr>
          <td>${playlist.name}</td>
          <td>${playlist.followers}</td>
          <td>${playlist.territory}</td>
          <td>${playlist.valueScore}</td>
          <td>${playlist.isRadioLinked ? "Yes" : "No"}</td>
        </tr>`
        )
        .join("")}
    </table>
  </div>

  <div class="section">
    <h2>5. ISRC Catalog</h2>
    <table>
      <tr>
        <th>ISRC</th>
        <th>Title</th>
        <th>Artist</th>
        <th>Label</th>
        <th>Release</th>
        <th>Release Date</th>
        <th>UPC</th>
      </tr>
      ${tracks
        .map(
          (track) => `
        <tr>
          <td>${track.isrc}</td>
          <td>${track.title}</td>
          <td>${track.artist}</td>
          <td>${track.label ?? ""}</td>
          <td>${track.releaseName ?? ""}</td>
          <td>${track.releaseDate ?? ""}</td>
          <td>${track.upc ?? ""}</td>
        </tr>`
        )
        .join("")}
    </table>
  </div>

  <div class="section">
    <h2>6. PRO Repertoire Issues</h2>
    <ul>
      ${proIssues
        .map(
          (issue) =>
            `<li>[${issue.type}] ISRC ${issue.isrc} @ ${issue.pro} - ${"details" in issue ? issue.details : ""}</li>`
        )
        .join("")}
      ${missingRegs
        .map(
          (entry) =>
            `<li>[MISSING_IN_PRO] ISRC ${entry.isrc} - ${entry.pro}: ${entry.reason}</li>`
        )
        .join("")}
    </ul>
  </div>

  <div class="section">
    <h2>7. Metadata & Neighboring Rights Issues</h2>
    <ul>
      ${metadataIssues.map((issue) => `<li>[${issue.type}] ISRC ${issue.isrc}</li>`).join("")}
      ${neighIssues
        .map(
          (issue) =>
            `<li>[NEIGHBORING_RIGHTS] ISRC ${issue.isrc} - ${issue.society}: ${issue.reason}</li>`
        )
        .join("")}
    </ul>
  </div>

  <div class="section">
    <h2>8. Release Timeline & Catalog Notes</h2>
    <ul>
      ${releaseIssues
        .map(
          (issue) =>
            `<li>[${issue.bucket}] ISRC ${issue.isrc} - ${issue.reason}</li>`
        )
        .join("")}
    </ul>
  </div>

  <div class="section">
    <h2>9. Engagement & Recovery Fee</h2>
    <p><strong>Estimated unclaimed royalties:</strong> EUR ${estMin.toFixed(0)} - EUR ${estMax.toFixed(0)}</p>
    <p><strong>Estimated recovery fee (${feePercent}%):</strong> EUR ${feeMin.toFixed(0)} - EUR ${feeMax.toFixed(0)}</p>
    <p>No upfront cost. No ownership taken.</p>
  </div>
</body>
</html>
`;
}
