import { NextRequest, NextResponse } from "next/server";

type ProbeTrackInput = {
  title: string;
  artist: string;
  isrc?: string;
};

const MB_HEADERS = {
  "User-Agent": "VerseIQ/1.0 (useverseiq.com)",
  Accept: "application/json",
};

async function resolveIsrc(origin: string, track: ProbeTrackInput) {
  if (track.isrc) {
    return track.isrc;
  }

  const params = new URLSearchParams({
    artist: track.artist,
    track: track.title,
  });

  const res = await fetch(`${origin}/api/isrc-lookup?${params.toString()}`);
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return data?.isrc || null;
}

async function probeMusicBrainzByIsrc(isrc: string) {
  const recRes = await fetch(
    `https://musicbrainz.org/ws/2/recording?query=isrc:${encodeURIComponent(isrc)}&fmt=json&limit=1`,
    { headers: MB_HEADERS }
  );

  if (!recRes.ok) {
    return { hasRecording: false, hasWork: false, hasIswc: false };
  }

  const recData = await recRes.json();
  const recording = recData?.recordings?.[0];
  if (!recording?.id) {
    return { hasRecording: false, hasWork: false, hasIswc: false };
  }

  const fullRecRes = await fetch(
    `https://musicbrainz.org/ws/2/recording/${recording.id}?inc=work-rels&fmt=json`,
    { headers: MB_HEADERS }
  );
  if (!fullRecRes.ok) {
    return { hasRecording: true, hasWork: false, hasIswc: false };
  }

  const fullRec = await fullRecRes.json();
  const workRel = Array.isArray(fullRec?.relations)
    ? fullRec.relations.find((rel: any) => rel?.type === "performance" && rel?.work?.id)
    : null;

  if (!workRel?.work?.id) {
    return { hasRecording: true, hasWork: false, hasIswc: false };
  }

  const workRes = await fetch(
    `https://musicbrainz.org/ws/2/work/${workRel.work.id}?inc=iswcs&fmt=json`,
    { headers: MB_HEADERS }
  );

  if (!workRes.ok) {
    return { hasRecording: true, hasWork: true, hasIswc: false };
  }

  const workData = await workRes.json();
  const iswcs = Array.isArray(workData?.iswcs) ? workData.iswcs : [];

  return {
    hasRecording: true,
    hasWork: true,
    hasIswc: iswcs.length > 0,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const artistName = String(body?.artistName || "").trim();
    const tracks: ProbeTrackInput[] = Array.isArray(body?.tracks) ? body.tracks : [];

    if (!artistName) {
      return NextResponse.json({ error: "Missing artistName" }, { status: 400 });
    }

    if (tracks.length === 0) {
      return NextResponse.json({ error: "No tracks provided" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const limited = tracks.slice(0, 20);

    const probed = await Promise.all(
      limited.map(async (track) => {
        const isrc = await resolveIsrc(origin, track);
        if (!isrc) {
          return {
            title: track.title,
            artist: track.artist,
            isrc: null,
            hasRecording: false,
            hasWork: false,
            hasIswc: false,
            likelyGap: "Missing ISRC lookup",
            needsManualProCheck: true,
            soundexchangeStatus: "manual-check",
          };
        }

        const mb = await probeMusicBrainzByIsrc(isrc);

        const likelyGap = !mb.hasRecording
          ? "No recording match in MusicBrainz"
          : !mb.hasWork
          ? "No linked work"
          : !mb.hasIswc
          ? "Work found but ISWC missing"
          : "No immediate publishing gap detected";

        return {
          title: track.title,
          artist: track.artist,
          isrc,
          hasRecording: mb.hasRecording,
          hasWork: mb.hasWork,
          hasIswc: mb.hasIswc,
          likelyGap,
          needsManualProCheck: !mb.hasIswc,
          soundexchangeStatus: "manual-check",
        };
      })
    );

    const summary = {
      checkedTracks: probed.length,
      missingIsrc: probed.filter((row) => !row.isrc).length,
      missingIswc: probed.filter((row) => row.isrc && !row.hasIswc).length,
      needsManualProCheck: probed.filter((row) => row.needsManualProCheck).length,
    };

    return NextResponse.json({ artistName, summary, tracks: probed });
  } catch (error) {
    return NextResponse.json(
      { error: "Gap probe failed", details: String(error) },
      { status: 500 }
    );
  }
}
