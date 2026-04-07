import { NextRequest, NextResponse } from "next/server";

type SpotifyTrack = {
  title: string;
  artists: string[];
  isrc?: string;
};

type MissingIsrc = {
  isrc: string;
  title: string;
  artist: string;
};

type GapReport = {
  spotifyUniqueIsrc: number;
  soundexchangeUniqueIsrc: number;
  missingInSoundexchange: MissingIsrc[];
  presentInSoundexchange: string[];
  soundexchangeOrphans: string[];
  gapRate: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const spotifyTracks: SpotifyTrack[] = Array.isArray(body?.spotifyTracks)
      ? body.spotifyTracks
      : [];
    const soundexchangeIsrcs: string[] = Array.isArray(body?.soundexchangeIsrcs)
      ? body.soundexchangeIsrcs
      : [];

    if (spotifyTracks.length === 0) {
      return NextResponse.json(
        { error: "No Spotify tracks provided" },
        { status: 400 }
      );
    }

    if (soundexchangeIsrcs.length === 0) {
      return NextResponse.json(
        { error: "No SoundExchange ISRCs provided" },
        { status: 400 }
      );
    }

    // Extract Spotify ISRCs (remove duplicates)
    const spotifyIsrcSet = new Set<string>();
    const spotifyIsrcMap = new Map<
      string,
      { title: string; artist: string }
    >();

    spotifyTracks.forEach((track) => {
      if (track.isrc) {
        spotifyIsrcSet.add(track.isrc);
        spotifyIsrcMap.set(track.isrc, {
          title: track.title,
          artist: track.artists.join(", "),
        });
      }
    });

    const spotifyUniqueIsrc = spotifyIsrcSet.size;

    // Extract SoundExchange ISRCs (remove duplicates)
    const soundexchangeIsrcSet = new Set<string>(
      soundexchangeIsrcs.filter(Boolean)
    );
    const soundexchangeUniqueIsrc = soundexchangeIsrcSet.size;

    // Compute gaps
    const missingInSoundexchange: MissingIsrc[] = [];
    const presentInSoundexchange: string[] = [];
    const soundexchangeOrphans: string[] = [];

    spotifyIsrcSet.forEach((isrc) => {
      if (soundexchangeIsrcSet.has(isrc)) {
        presentInSoundexchange.push(isrc);
      } else {
        const trackInfo = spotifyIsrcMap.get(isrc);
        if (trackInfo) {
          missingInSoundexchange.push({
            isrc,
            title: trackInfo.title,
            artist: trackInfo.artist,
          });
        }
      }
    });

    // Compute orphans (SoundExchange ISRCs not in Spotify)
    soundexchangeIsrcSet.forEach((isrc) => {
      if (!spotifyIsrcSet.has(isrc)) {
        soundexchangeOrphans.push(isrc);
      }
    });

    const gapRate =
      spotifyUniqueIsrc > 0 ? missingInSoundexchange.length / spotifyUniqueIsrc : 0;

    const report: GapReport = {
      spotifyUniqueIsrc,
      soundexchangeUniqueIsrc,
      missingInSoundexchange,
      presentInSoundexchange,
      soundexchangeOrphans,
      gapRate,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("[gap-finder/probe] Error:", error);
    return NextResponse.json(
      { error: "Probe failed", details: String(error) },
      { status: 500 }
    );
  }
}
