# VerseIQ Royalty Recovery System — Implementation Guide

## Overview

This document describes the complete implementation of the Royalty Recovery System in VerseIQ.

**What it does:**
1. Connect to Spotify API
2. Export artist/playlist catalog (with ISRCs)
3. Compare against SoundExchange registrations
4. Estimate missing royalties
5. Generate actionable recovery recommendations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface (React)                     │
│              components/RoyaltyRecoveryWizard.tsx                │
│  ┌──────────────────┬─────────────────┬──────────────────────┐   │
│  │ Step 1: Input    │ Step 2: Preview │ Step 3: Upload SE CSV│   │
│  │ (Spotify URL)    │ (Metadata)      │ (Gap Analysis)       │   │
│  └──────┬───────────┴────────┬────────┴──────────┬───────────┘   │
│         │                    │                    │               │
└─────────┼────────────────────┼────────────────────┼───────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Server Actions (Next.js)                       │
│      app/actions/royaltyRecoveryWorkflow.ts                      │
│  ┌──────────────────┬─────────────────┬──────────────────────┐   │
│  │ exportSpotify()  │ analyzeGaps()   │ generateRecommendations
│  └────────┬─────────┴────────┬────────┴──────────┬───────────┘   │
└─────────┼────────────────────┼────────────────────┼───────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Business Logic Libraries                        │
│  ┌──────────────────┬─────────────────┬──────────────────────┐   │
│  │ exportSpotify    │ gapAnalysisEngine
 │ (types)          │
│  │ Catalog.ts       │ .ts             │ gapAnalysis.ts       │
│  └────────┬─────────┴────────┬────────┴──────────┬───────────┘   │
└─────────┼────────────────────┼────────────────────┼───────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External APIs                                 │
│  ┌──────────────────┬─────────────────┐                         │
│  │ Spotify Web API  │ (User provides) │                         │
│  │ (ISRC, metadata) │ SoundExchange CSV                         │
│  └──────────────────┴─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
verseiq/
├── app/
│   ├── actions/
│   │   └── royaltyRecoveryWorkflow.ts       # Orchestrates workflow
│   ├── api/
│   │   └── gaps/
│   │       └── analyze/
│   │           └── route.ts                 # REST endpoint for analysis
│   └── verseiq/                             # Main app pages
│       └── royalty-recovery/
│           └── page.tsx                     # Main page (use wizard)
│
├── components/
│   └── RoyaltyRecoveryWizard.tsx            # Multi-step UI component
│
├── lib/
│   ├── exportSpotifyCatalog.ts              # Spotify API integration
│   └── gapAnalysisEngine.ts                 # Gap analysis logic
│
├── types/
│   ├── spotifyCatalog.ts                    # Spotify types (existing)
│   └── gapAnalysis.ts                       # Gap analysis types (new)
│
└── PRODUCT_STRATEGY.md                      # Business strategy
```

---

## Step-by-Step Integration

### Step 1: Environment Setup

Add to your `.env.local`:

```bash
# Spotify API token (long-lived user token or service account)
SPOTIFY_TOKEN=BQCvT8xnK9l...

# Debug logging
SPOTIFY_DEBUG=true
```

**How to get a SPOTIFY_TOKEN:**

Option A: Use Spotify Web API with Client Credentials flow:
```bash
# Get access token
curl -X POST https://accounts.spotify.com/api/token \
  -H "Authorization: Basic YOUR_BASE64_CREDENTIALS" \
  -d "grant_type=client_credentials"
```

Option B: Use a user token (more powerful):
```bash
# Authorize manually via https://developer.spotify.com/console/
# Then copy the access token
```

### Step 2: Add the Main Page

Create `app/verseiq/royalty-recovery/page.tsx`:

```tsx
import { RoyaltyRecoveryWizard } from "@/components/RoyaltyRecoveryWizard";

export const metadata = {
  title: "Royalty Recovery | VerseIQ",
  description: "Find and recover missing royalties from your Spotify catalog",
};

export default function RoyaltyRecoveryPage() {
  return <RoyaltyRecoveryWizard />;
}
```

### Step 3: Test End-to-End

1. Navigate to `/verseiq/royalty-recovery`
2. Paste a Spotify artist URL: `https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf94`
3. Review the preview
4. Prepare a sample SoundExchange CSV (or use the API directly)
5. Upload CSV to see gap analysis

---

## Data Flow Examples

### Example 1: Spotify Export Only

**Input:**
```
User pastes: https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf94
```

**Processing:**
1. `parseSpotifyInput()` → extracts artist ID
2. `collectArtistCatalog()` → fetches albums + tracks
3. `fetchTrackDetails()` → gets ISRC data
4. Returns `ExportedCatalog` with metadata

**Output:**
```json
{
  "sourceType": "artist",
  "sourceId": "06HL4z0CvFAxyc27GXpf94",
  "catalogName": "The Beatles",
  "tracksFound": 245,
  "tracksWithIsrc": 240,
  "tracksMissingIsrc": 5,
  "csv": "isrc,track_name,artist_names,album_name,..."
}
```

### Example 2: Full Gap Analysis

**Input:**
```
Spotify catalog + SoundExchange CSV
```

**SoundExchange CSV format:**
```csv
ISRC,Title,WorksID,Registration Date
GBDMZ2400001,Song A,12345,2023-01-15
GBDMZ2400002,Song B,12346,2023-01-15
```

**Processing:**
1. Parse SoundExchange CSV
2. Extract registered ISRCs: {GBDMZ2400001, GBDMZ2400002, ...}
3. Compare against Spotify catalog ISRCs
4. Categorize each track: missing | present | mismatch
5. Estimate streams + royalties for missing tracks

**Output:**
```json
{
  "summary": {
    "catalogName": "The Beatles",
    "totalTracks": 240,
    "missingCount": 48,
    "missingPercent": 20,
    "presentCount": 192,
    "estimatedMissingRoyaltiesLow": 24000,
    "estimatedMissingRoyaltiesHigh": 40000,
    "recoveryPriority": "high"
  },
  "missingTracks": [
    {
      "isrc": "GBDMZ2400003",
      "trackName": "Song C",
      "status": "missing",
      "estimatedAnnualStreams": 50000,
      "estimatedAnnualRoyalty": 200
    }
  ]
}
```

---

## API Reference

### Server Actions

#### `executeRoyaltyRecoveryWorkflow(input)`

**Purpose:** Orchestrate complete workflow (Spotify + gap analysis)

**Signature:**
```typescript
export async function executeRoyaltyRecoveryWorkflow(input: {
  spotifyInput: string;           // Artist URL or ID
  soundexchangeCsv?: string;      // Optional SoundExchange CSV
}): Promise<RoyaltyRecoveryWorkflowResult>
```

**Response:**
```typescript
{
  status: "success" | "preview" | "error";
  spotifyExport?: ExportedCatalog;
  gapAnalysis?: GapAnalysisResult;
  gapSummaryText?: string;
  steps: string[];
  next?: string;
  error?: string;
}
```

**Usage:**
```typescript
const result = await executeRoyaltyRecoveryWorkflow({
  spotifyInput: "https://open.spotify.com/artist/...",
  soundexchangeCsv: csvFileContent,
});
```

#### `analyzeRoyaltyGapsAction(spotifyInput, soundexchangeCsv)`

**Purpose:** Direct gap analysis without orchestration

**Signature:**
```typescript
export async function analyzeRoyaltyGapsAction(
  spotifyInput: string,
  soundexchangeCsv: string
): Promise<GapAnalysisResult>
```

---

### Gap Analysis Engine

#### `analyzeGaps(spotifyExport, soundexchangeCsv)`

**Purpose:** Compare Spotify vs SoundExchange catalogs

```typescript
const result = await analyzeGaps(spotifyExport, soundexchangeCsv);
```

**Returns:**
```typescript
{
  summary: GapAnalysisSummary;
  gaps: TrackGap[];
  missingTracks: TrackGap[];
  presentTracks: TrackGap[];
}
```

#### `parseSoundExchangeExport(csvText)`

**Purpose:** Parse CSV from SoundExchange export

```typescript
const data = parseSoundExchangeExport(csvContent);
// Returns: { registeredIsrcs: Set<string>, totalCount: number }
```

---

## Testing

### Manual Testing

1. **Spotify API connectivity:**
   ```bash
   curl -H "Authorization: Bearer $SPOTIFY_TOKEN" \
     https://api.spotify.com/v1/artists/06HL4z0CvFAxyc27GXpf94
   ```

2. **Test with local script:**
   ```bash
   cd tools/
   SPOTIFY_TOKEN=... python3 spotify_export.py --artist-id 06HL4z0CvFAxyc27GXpf94
   ```

3. **UI Testing:**
   - Start dev server: `npm run dev`
   - Go to `/verseiq/royalty-recovery`
   - Test all wizard steps

### Automated Testing

Create `__tests__/gapAnalysisEngine.test.ts`:

```typescript
describe("Gap Analysis Engine", () => {
  test("should identify missing tracks", () => {
    const spotifyExport = {
      tracksFound: 100,
      previewRows: [...]
    };
    const soundexchangeCsv = "ISRC,Title\nGBDMZ01,Song A";
    
    const result = analyzeGaps(spotifyExport, soundexchangeCsv);
    expect(result.summary.missingCount).toBeGreaterThan(0);
  });
});
```

---

## Error Handling

### Expected Errors & Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| "SPOTIFY_TOKEN not configured" | Env var missing | Set `.env.local` |
| "Could not resolve artist" | Invalid ID | Show input validation error |
| "No ISRC metadata available" | Track lacks ISRC | Flag with warning |
| "Could not find ISRC column" | Malformed CSV | Show CSV format guide |
| Rate limit (429) | Too many API calls | Exponential backoff + queue |

### Implementation Example

```typescript
try {
  const result = await analyzeGaps(spotifyExport, soundexchangeCsv);
  return { status: "success", data: result };
} catch (error) {
  if (error.message.includes("ISRC")) {
    return {
      status: "error",
      error: "SoundExchange CSV format error. Expected columns: ISRC, Title"
    };
  }
  return { status: "error", error: error.message };
}
```

---

## Performance Optimization

### Spotify API Caching

Cache artist + album data for 24 hours:

```typescript
// In lib/spotifyClient.ts (add if creating new file)
const cache = new Map<string, { data: any; timestamp: number }>();

async function getCachedArtist(artistId: string) {
  const cached = cache.get(artistId);
  if (cached && Date.now() - cached.timestamp < 86400000) {
    return cached.data;
  }
  
  const data = await spotifyGet(`/artists/${artistId}`);
  cache.set(artistId, { data, timestamp: Date.now() });
  return data;
}
```

### Batch Processing

Process track details in batches of 50 (Spotify limit):

```typescript
async function fetchTrackDetails(trackIds: string[], token: string) {
  const detailedTracks = new Map<string, any>();

  for (let i = 0; i < trackIds.length; i += 50) {
    const chunk = trackIds.slice(i, i + 50);
    const detailData = await spotifyJson(
      `https://api.spotify.com/v1/tracks?ids=${chunk.join(",")}`,
      token
    );
    // ... process batch
  }

  return detailedTracks;
}
```

---

## Deployment

### Vercel

No special setup needed. Just ensure `.env.local` is set in Vercel dashboard:

```
SPOTIFY_TOKEN = BQCvT8xnK9l...
SPOTIFY_DEBUG = false
```

### Self-Hosted (Docker)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV SPOTIFY_TOKEN=needed_at_runtime
ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Funnel:**
   - Free scans → Preview views → CSV uploads → Paid
   - Conversion rate by step

2. **Usage:**
   - Tracks exported per day
   - Average catalog size
   - SoundExchange upload rate

3. **Business:**
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - LTV (Lifetime Value)

### Logging Example

```typescript
console.log("[ROYALTY RECOVERY]", {
  timestamp: new Date().toISOString(),
  userId: user.id,
  action: "gap_analysis_complete",
  catalogSize: result.summary.totalTracks,
  missingCount: result.summary.missingCount,
  estimatedValue: result.summary.estimatedMissingRoyaltiesHigh,
});
```

---

## Next Steps

1. **This week:**
   - [ ] Deploy to production (`/verseiq/royalty-recovery`)
   - [ ] Test with 5 real artists
   - [ ] Create landing page

2. **Next week:**
   - [ ] Set up Stripe billing (for paid tiers)
   - [ ] Create email sequence
   - [ ] Launch on Product Hunt

3. **Month 2:**
   - [ ] Land first 10 paying customers
   - [ ] Refine UI based on feedback
   - [ ] Add PRO registration templates

---

## Support & Resources

- **Spotify API Docs:** https://developer.spotify.com/documentation/web-api
- **SoundExchange:** https://soundexchange.com (for CSV format reference)
- **ISRC Standard:** https://www.iswc.org/en/isrc-information

---

## Questions?

This system is designed to be:
- ✅ **Modular:** Each piece can be tested independently
- ✅ **Scalable:** Handles 1,000+ track catalogs
- ✅ **User-focused:** Leads with money, not features
- ✅ **Revenue-ready:** Can monetize immediately

**You're ready to launch. Let's build the future of music royalties.**
