import { NextRequest, NextResponse } from "next/server";

const MB_HEADERS = {
  "User-Agent": "VerseIQ/1.0 (useverseiq.com)",
  Accept: "application/json",
};

function isValidISRC(isrc: string) {
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc);
}

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist") || "";
  const trackTitle = req.nextUrl.searchParams.get("track") || "";
  const isrc = req.nextUrl.searchParams.get("isrc") || "";

  if (!artist && !isrc) {
    return NextResponse.json(
      { error: "Provide artist or isrc param" },
      { status: 400 }
    );
  }

  try {
    // Direct ISRC lookup via MusicBrainz
    if (isrc) {
      const normalized = isrc.toUpperCase().replace(/-/g, "").trim();
      if (!isValidISRC(normalized)) {
        return NextResponse.json(
          { error: "Invalid ISRC format" },
          { status: 400 }
        );
      }
      const url = `https://musicbrainz.org/ws/2/recording?query=isrc:${encodeURIComponent(normalized)}&fmt=json&limit=1`;
      const res = await fetch(url, { headers: MB_HEADERS });
      const data = await res.json();
      const rec = data.recordings?.[0];
      if (rec) {
        return NextResponse.json({
          isrc: normalized,
          title: rec.title,
          artist: rec["artist-credit"]?.[0]?.name || "",
        });
      }
      return NextResponse.json(
        { error: "ISRC not found in MusicBrainz" },
        { status: 404 }
      );
    }

    // Resolve artist+track → ISRC via Deezer
    const artistPart = artist.split(",")[0].trim();

    const tryDeezer = async (q: string) => {
      const r = await fetch(
        `https://api.deezer.com/search?q=${q}&limit=10`
      );
      return r.json();
    };

    let data = await tryDeezer(
      trackTitle
        ? encodeURIComponent(`artist:"${artistPart}" track:"${trackTitle}"`)
        : encodeURIComponent(`artist:"${artistPart}"`)
    );

    // Fallback to plain text search if structured query returns nothing
    if (!data.data || data.data.length === 0) {
      const fallbackQ = trackTitle
        ? encodeURIComponent(`${artistPart} ${trackTitle}`)
        : encodeURIComponent(artistPart);
      data = await tryDeezer(fallbackQ);
    }

    if (!data.data || data.data.length === 0) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    // Pick closest title match when track title is provided
    let bestMatch = data.data[0];
    if (trackTitle) {
      const titleLower = trackTitle.toLowerCase();
      const exact = data.data.find((t: any) =>
        t.title?.toLowerCase().includes(titleLower.split("(")[0].trim())
      );
      if (exact) bestMatch = exact;
    }

    const trackRes = await fetch(
      `https://api.deezer.com/track/${bestMatch.id}`
    );
    const track = await trackRes.json();

    if (!track.isrc) {
      return NextResponse.json(
        { error: "No ISRC available for this track" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      isrc: track.isrc,
      title: track.title,
      artist: track.artist?.name || bestMatch.artist?.name || artist,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Lookup failed", details: String(err) },
      { status: 500 }
    );
  }
}
