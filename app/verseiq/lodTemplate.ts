export function generateSoundExchangeLOD(params: {
  artistLegalName: string;
  artistAddress: string;
  artistEmail: string;
  representativeName: string;
  representativeEntity: string;
  feePercent: number;
  isrcs: string[];
  date: string;
}): string {
  const {
    artistLegalName,
    artistAddress,
    artistEmail,
    representativeName,
    representativeEntity,
    feePercent,
    isrcs,
    date,
  } = params;

  return `
LETTER OF DIRECTION - SOUNDEXCHANGE

Date: ${date}

To: SoundExchange, Inc.

I, ${artistLegalName} ("Artist"), hereby authorize ${representativeEntity}, represented by ${representativeName} ("Representative"), to act on my behalf in connection with the registration, administration, and collection of digital performance royalties payable by SoundExchange for the sound recordings listed in Appendix A (the "Recordings").

1. AUTHORITY
Artist authorizes Representative to:
  - Register the Recordings with SoundExchange;
  - Submit and manage any related claims;
  - Receive statements and payments from SoundExchange relating to the Recordings;
  - Take any actions reasonably necessary to recover past and future royalties.

2. COMPENSATION
In consideration of these services, Artist agrees that Representative shall be entitled to ${feePercent}% of all gross royalties recovered from SoundExchange in relation to the Recordings, whether paid retroactively or prospectively, for the duration of this Letter of Direction.

3. TERM
This Letter of Direction shall remain in effect until revoked in writing by Artist, provided that Representative shall remain entitled to its percentage of any royalties arising from claims or registrations initiated during the term.

4. NON-ASSIGNMENT OF OWNERSHIP
Nothing in this Letter of Direction transfers ownership of any copyrights or neighboring rights. Artist retains all ownership; Representative acts solely as an authorized collection and administration agent.

5. CONTACT DETAILS
Artist:
  Name: ${artistLegalName}
  Address: ${artistAddress}
  Email: ${artistEmail}

Representative:
  Name: ${representativeName}
  Entity: ${representativeEntity}

APPENDIX A - ISRC LIST
${isrcs.map((i) => `  - ${i}`).join("\n")}

Signed,

______________________________
Artist: ${artistLegalName}

______________________________
Representative: ${representativeName} (${representativeEntity})
`;
}
