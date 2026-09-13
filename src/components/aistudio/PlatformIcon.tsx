// Logos officiels des 3 plateformes, rendus en badge de marque.
// Fiverr & Upwork : glyphe officiel (simple-icons) en blanc sur pastille de marque.
// ComeUp : n'existe sur aucun CDN d'icônes → SVG dédié (pastille jaune, marque noire).

type Platform = 'comeup' | 'fiverr' | 'upwork'

const BRAND_BG: Record<Platform, string> = {
  comeup: '#F7E14C',
  fiverr: '#1DBF73',
  upwork: '#14A800',
}

export function PlatformIcon({
  platform,
  size = 22,
}: {
  platform: Platform
  size?: number
}) {
  const glyph = Math.round(size * 0.62)

  if (platform === 'comeup') {
    // Marque ComeUp : deux boucles « co » + soulignement, sur pastille jaune.
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-lg"
        style={{ width: size, height: size, backgroundColor: BRAND_BG.comeup }}
        aria-label="ComeUp"
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
          {/* boucle gauche « c » (ouverte à droite) */}
          <path
            d="M13 6.5 A5.5 5.5 0 1 0 13 17.5"
            stroke="#0A0A0A"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* boucle droite « o » */}
          <circle cx="15.5" cy="12" r="4.4" stroke="#0A0A0A" strokeWidth="3.2" fill="none" />
          {/* soulignement */}
          <rect x="6" y="19.5" width="12" height="2.6" rx="1.3" fill="#0A0A0A" />
        </svg>
      </span>
    )
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: BRAND_BG[platform] }}
      aria-label={platform === 'fiverr' ? 'Fiverr' : 'Upwork'}
    >
      <img
        src={`https://cdn.simpleicons.org/${platform}/white`}
        alt=""
        width={glyph}
        height={glyph}
        style={{ width: glyph, height: glyph }}
        loading="lazy"
      />
    </span>
  )
}
