import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type CsvRecord = Record<string, string | undefined>;

type ParsedCsv = {
  headers: string[];
  rows: CsvRecord[];
};

type SpotifyRow = {
  sourceRow: number;
  trackName: string;
  trackNameNorm: string;
  artistName: string;
  artistNameNorm: string;
  albumName: string;
  isrc: string;
  isrcNorm: string | null;
  raw: CsvRecord;
};

type SoundExchangeRow = {
  sourceRow: number;
  title: string;
  titleNorm: string;
  artist: string;
  artistNorm: string;
  releaseTitle: string;
  isrc: string;
  isrcNorm: string | null;
  raw: CsvRecord;
};

type MissingInSoundExchangeRow = {
  track_name: string;
  artist_name: string;
  album_name: string;
  isrc: string;
  spotify_row: number;
  reason: string;
};

type DuplicateSpotifyRow = {
  isrc: string;
  track_name: string;
  artist_name: string;
  album_name: string;
  spotify_row: number;
  duplicate_count: number;
};

type DuplicateSoundExchangeRow = {
  isrc: string;
  title: string;
  artist: string;
  release_title: string;
  soundexchange_row: number;
  duplicate_count: number;
};

type IsrcMismatchRow = {
  track_name: string;
  artist_name: string;
  spotify_isrcs: string;
  soundexchange_isrcs: string;
  spotify_row_count: number;
  soundexchange_row_count: number;
  spotify_albums: string;
  soundexchange_releases: string;
  note: string;
};

const MISSING_IN_SOUNDEXCHANGE_COLUMNS: Array<keyof MissingInSoundExchangeRow> = [
  "track_name",
  "artist_name",
  "album_name",
  "isrc",
  "spotify_row",
  "reason",
];

const DUPLICATE_SPOTIFY_COLUMNS: Array<keyof DuplicateSpotifyRow> = [
  "isrc",
  "track_name",
  "artist_name",
  "album_name",
  "spotify_row",
  "duplicate_count",
];

const DUPLICATE_SOUNDEXCHANGE_COLUMNS: Array<keyof DuplicateSoundExchangeRow> = [
  "isrc",
  "title",
  "artist",
  "release_title",
  "soundexchange_row",
  "duplicate_count",
];

const ISRC_MISMATCH_COLUMNS: Array<keyof IsrcMismatchRow> = [
  "track_name",
  "artist_name",
  "spotify_isrcs",
  "soundexchange_isrcs",
  "spotify_row_count",
  "soundexchange_row_count",
  "spotify_albums",
  "soundexchange_releases",
  "note",
];

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeTrackKeyText(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/\((?:feat\.?|featuring|with|version|remaster(?:ed)?|live|mono|stereo|edit|mix)[^)]+\)/g, " ")
    .replace(/\[(?:feat\.?|featuring|with|version|remaster(?:ed)?|live|mono|stereo|edit|mix)[^\]]+\]/g, " ")
    .replace(/\s[-–:]\s(?:feat\.?|featuring|with|version|remaster(?:ed)?|live|mono|stereo|edit|mix).*/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArtistKeyText(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/,\s*the$/g, "")
    .replace(/^the\s+/g, "")
    .replace(/\((?:feat\.?|featuring|with)[^)]+\)/g, " ")
    .replace(/\[(?:feat\.?|featuring|with)[^\]]+\]/g, " ")
    .replace(/\s(?:feat\.?|featuring|with)\s.*/g, " ")
    .replace(/\s*&\s*/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIsrc(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").trim().toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function joinUniqueValues(values: string[]): string {
  return uniqueValues(values).sort((left, right) => left.localeCompare(right)).join(" | ");
}

function createHeaderLookup(headers: string[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const header of headers) {
    lookup.set(normalizeHeader(header), header);
  }

  return lookup;
}

function resolveHeader(
  lookup: Map<string, string>,
  aliases: string[],
  datasetName: string,
  label: string
): string {
  for (const alias of aliases) {
    const match = lookup.get(normalizeHeader(alias));
    if (match) {
      return match;
    }
  }

  throw new Error(`${datasetName} CSV is missing a ${label} column. Checked aliases: ${aliases.join(", ")}`);
}

function readCsv(filePath: string): ParsedCsv {
  const content = fs.readFileSync(filePath, "utf8");
  const rawRows = parse(content, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];

  const headers = (rawRows[0] ?? []).map((header) => String(header ?? ""));
  if (headers.length === 0) {
    throw new Error(`CSV appears to be empty: ${filePath}`);
  }

  const rows = parse(content, {
    bom: true,
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as CsvRecord[];

  return { headers, rows };
}

function getCell(row: CsvRecord, header: string): string {
  const value = row[header];
  return typeof value === "string" ? value : "";
}

function mapSpotifyRows(parsedCsv: ParsedCsv): SpotifyRow[] {
  const headerLookup = createHeaderLookup(parsedCsv.headers);
  const trackNameHeader = resolveHeader(
    headerLookup,
    ["track_name", "track name", "title", "song title"],
    "Spotify",
    "track name"
  );
  const isrcHeader = resolveHeader(headerLookup, ["isrc", "isrc code"], "Spotify", "ISRC");
  const albumNameHeader = resolveHeader(
    headerLookup,
    ["album_name", "album name", "release title", "album"],
    "Spotify",
    "album name"
  );
  const artistNameHeader = resolveHeader(
    headerLookup,
    ["artist_name", "artist name", "artist"],
    "Spotify",
    "artist name"
  );

  return parsedCsv.rows.map((row, index) => {
    const trackName = getCell(row, trackNameHeader).trim();
    const artistName = getCell(row, artistNameHeader).trim();
    const albumName = getCell(row, albumNameHeader).trim();
    const isrc = getCell(row, isrcHeader).trim();

    return {
      sourceRow: index + 2,
      trackName,
      trackNameNorm: normalizeTrackKeyText(trackName),
      artistName,
      artistNameNorm: normalizeArtistKeyText(artistName),
      albumName,
      isrc,
      isrcNorm: normalizeIsrc(isrc),
      raw: row,
    };
  });
}

function mapSoundExchangeRows(parsedCsv: ParsedCsv): SoundExchangeRow[] {
  const headerLookup = createHeaderLookup(parsedCsv.headers);
  const isrcHeader = resolveHeader(
    headerLookup,
    ["ISRC", "isrc", "isrc code", "isrccode"],
    "SoundExchange",
    "ISRC"
  );
  const titleHeader = resolveHeader(
    headerLookup,
    ["Title", "title", "track title", "song title"],
    "SoundExchange",
    "Title"
  );
  const artistHeader = resolveHeader(
    headerLookup,
    ["Artist", "artist", "artist name"],
    "SoundExchange",
    "Artist"
  );
  const releaseTitleHeader = resolveHeader(
    headerLookup,
    ["ReleaseTitle", "release title", "album", "album name"],
    "SoundExchange",
    "ReleaseTitle"
  );

  return parsedCsv.rows.map((row, index) => {
    const title = getCell(row, titleHeader).trim();
    const artist = getCell(row, artistHeader).trim();
    const releaseTitle = getCell(row, releaseTitleHeader).trim();
    const isrc = getCell(row, isrcHeader).trim();

    return {
      sourceRow: index + 2,
      title,
      titleNorm: normalizeTrackKeyText(title),
      artist,
      artistNorm: normalizeArtistKeyText(artist),
      releaseTitle,
      isrc,
      isrcNorm: normalizeIsrc(isrc),
      raw: row,
    };
  });
}

function groupByIsrc<T extends { isrcNorm: string | null }>(rows: T[]): Map<string, T[]> {
  const result = new Map<string, T[]>();

  for (const row of rows) {
    if (!row.isrcNorm) {
      continue;
    }

    const existing = result.get(row.isrcNorm) ?? [];
    existing.push(row);
    result.set(row.isrcNorm, existing);
  }

  return result;
}

function groupByTrackArtist<T extends { titleNorm?: string; trackNameNorm?: string; artistNorm?: string; artistNameNorm?: string }>(
  rows: T[],
  getTitleNorm: (row: T) => string,
  getArtistNorm: (row: T) => string
): Map<string, T[]> {
  const result = new Map<string, T[]>();

  for (const row of rows) {
    const titleNorm = getTitleNorm(row);
    const artistNorm = getArtistNorm(row);
    if (!titleNorm || !artistNorm) {
      continue;
    }

    const key = `${titleNorm}::${artistNorm}`;
    const existing = result.get(key) ?? [];
    existing.push(row);
    result.set(key, existing);
  }

  return result;
}

function setsAreEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  return Array.from(left).every((value) => right.has(value));
}

function writeCsv<T extends Record<string, string | number>>(
  outputPath: string,
  rows: T[],
  columns: Array<keyof T>
): void {
  const csv = stringify(rows, {
    header: true,
    columns: columns as string[],
  });

  fs.writeFileSync(outputPath, csv, "utf8");
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function main(): void {
  const argv = yargs(hideBin(process.argv))
    .scriptName("compare")
    .option("spotify", {
      type: "string",
      demandOption: true,
      describe: "Path to the Spotify catalog CSV",
    })
    .option("soundexchange", {
      type: "string",
      demandOption: true,
      describe: "Path to the SoundExchange catalog CSV",
    })
    .option("out", {
      type: "string",
      demandOption: true,
      describe: "Output directory for the forensic CSV reports",
    })
    .strict()
    .help()
    .parseSync();

  const spotifyPath = path.resolve(argv.spotify);
  const soundExchangePath = path.resolve(argv.soundexchange);
  const outputDirectory = path.resolve(argv.out);

  ensureDirectory(outputDirectory);

  console.log(`Reading Spotify CSV: ${spotifyPath}`);
  const spotifyRows = mapSpotifyRows(readCsv(spotifyPath));

  console.log(`Reading SoundExchange CSV: ${soundExchangePath}`);
  const soundExchangeRows = mapSoundExchangeRows(readCsv(soundExchangePath));

  const spotifyByIsrc = groupByIsrc(spotifyRows);
  const soundExchangeByIsrc = groupByIsrc(soundExchangeRows);

  const missingInSoundExchange: MissingInSoundExchangeRow[] = spotifyRows
    .filter((row) => row.isrcNorm && !soundExchangeByIsrc.has(row.isrcNorm))
    .map((row) => ({
      track_name: row.trackName,
      artist_name: row.artistName,
      album_name: row.albumName,
      isrc: row.isrcNorm ?? row.isrc,
      spotify_row: row.sourceRow,
      reason: "ISRC not found in SoundExchange",
    }));

  const duplicatesSpotify: DuplicateSpotifyRow[] = [];
  for (const [isrc, rows] of Array.from(spotifyByIsrc.entries())) {
    if (rows.length < 2) {
      continue;
    }

    for (const row of rows) {
      duplicatesSpotify.push({
        isrc,
        track_name: row.trackName,
        artist_name: row.artistName,
        album_name: row.albumName,
        spotify_row: row.sourceRow,
        duplicate_count: rows.length,
      });
    }
  }

  const duplicatesSoundExchange: DuplicateSoundExchangeRow[] = [];
  for (const [isrc, rows] of Array.from(soundExchangeByIsrc.entries())) {
    if (rows.length < 2) {
      continue;
    }

    for (const row of rows) {
      duplicatesSoundExchange.push({
        isrc,
        title: row.title,
        artist: row.artist,
        release_title: row.releaseTitle,
        soundexchange_row: row.sourceRow,
        duplicate_count: rows.length,
      });
    }
  }

  const spotifyByTrackArtist = groupByTrackArtist(
    spotifyRows,
    (row) => row.trackNameNorm,
    (row) => row.artistNameNorm
  );
  const soundExchangeByTrackArtist = groupByTrackArtist(
    soundExchangeRows,
    (row) => row.titleNorm,
    (row) => row.artistNorm
  );

  const mismatches: IsrcMismatchRow[] = [];
  for (const [key, spotifyGroup] of Array.from(spotifyByTrackArtist.entries())) {
    const soundExchangeGroup = soundExchangeByTrackArtist.get(key);
    if (!soundExchangeGroup) {
      continue;
    }

    const spotifyIsrcSet = new Set<string>(
      spotifyGroup.map((row) => row.isrcNorm).filter((value): value is string => value !== null)
    );
    const soundExchangeIsrcSet = new Set(
      soundExchangeGroup.map((row) => row.isrcNorm).filter((value): value is string => value !== null)
    );

    if (spotifyIsrcSet.size === 0 || soundExchangeIsrcSet.size === 0) {
      continue;
    }

    if (setsAreEqual(spotifyIsrcSet, soundExchangeIsrcSet)) {
      continue;
    }

    mismatches.push({
      track_name: spotifyGroup[0]?.trackName || soundExchangeGroup[0]?.title || "",
      artist_name: spotifyGroup[0]?.artistName || soundExchangeGroup[0]?.artist || "",
      spotify_isrcs: Array.from(spotifyIsrcSet).sort((left, right) => left.localeCompare(right)).join(" | "),
      soundexchange_isrcs: Array.from(soundExchangeIsrcSet)
        .sort((left, right) => left.localeCompare(right))
        .join(" | "),
      spotify_row_count: spotifyGroup.length,
      soundexchange_row_count: soundExchangeGroup.length,
      spotify_albums: joinUniqueValues(spotifyGroup.map((row) => row.albumName)),
      soundexchange_releases: joinUniqueValues(soundExchangeGroup.map((row) => row.releaseTitle)),
      note: "Same track and artist found in both catalogs with different ISRCs",
    });
  }

  writeCsv(
    path.join(outputDirectory, "missing_in_soundexchange.csv"),
    missingInSoundExchange,
    MISSING_IN_SOUNDEXCHANGE_COLUMNS
  );
  writeCsv(
    path.join(outputDirectory, "duplicates_spotify.csv"),
    duplicatesSpotify,
    DUPLICATE_SPOTIFY_COLUMNS
  );
  writeCsv(
    path.join(outputDirectory, "duplicates_soundexchange.csv"),
    duplicatesSoundExchange,
    DUPLICATE_SOUNDEXCHANGE_COLUMNS
  );
  writeCsv(path.join(outputDirectory, "isrc_mismatches.csv"), mismatches, ISRC_MISMATCH_COLUMNS);

  console.log("Comparison complete.");
  console.log(`Missing in SoundExchange: ${missingInSoundExchange.length}`);
  console.log(`Spotify duplicates: ${duplicatesSpotify.length}`);
  console.log(`SoundExchange duplicates: ${duplicatesSoundExchange.length}`);
  console.log(`ISRC mismatches: ${mismatches.length}`);
  console.log("Track and artist matching use normalized keys, so common suffixes like 'Remastered', 'Live', 'feat.', and artist prefixes like 'The' are ignored.");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Comparison failed: ${message}`);
  process.exit(1);
}
