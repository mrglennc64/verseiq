import type { PlaylistInfo } from "./types";

const RADIO_KEYWORDS = [
  "star fm",
  "nrj",
  "rix fm",
  "bbc",
  "iheart",
  "radio",
  "p3",
  "p4",
  "p1",
];

export function markRadioLinked(playlists: PlaylistInfo[]): PlaylistInfo[] {
  return playlists.map((playlist) => {
    const text = `${playlist.name} ${playlist.description} ${playlist.ownerName}`.toLowerCase();
    const isRadio = RADIO_KEYWORDS.some((keyword) => text.includes(keyword));
    return { ...playlist, isRadioLinked: isRadio };
  });
}
