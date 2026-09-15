type MotionKind = 'air' | 'road' | 'sea' | 'route'

function resolveMotionKind(backgroundUrl: string): MotionKind | null {
  const url = backgroundUrl.toLowerCase()
  if (/(mountain|snow|alpine|winter|glacier)/.test(url)) return null
  if (/(flight|air|cloud|sky|departure|arrival|plane|jet)/.test(url)) return 'air'
  if (/(ocean|harbor|coastal|port|lighthouse|island|maritime|ship|vessel|anchorage)/.test(url)) return 'sea'
  if (/(road|highway|border|valley|convoy|rail|pass|transit|truck|fleet)/.test(url)) return 'road'
  return 'route'
}

function MotionVehicle({ kind }: { kind: MotionKind }) {
  if (kind === 'air') {
    return (
      <svg viewBox="0 0 110 56" className="h-full w-full overflow-visible" role="presentation">
        <defs>
          <linearGradient id="air-contrail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="40%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {/* Aerodynamic Contrail Streamlines */}
        <path className="motion-trail motion-trail-upper" stroke="url(#air-contrail-grad)" d="M2 36 Q 26 37, 50 36" />
        <path className="motion-trail motion-trail-lower" stroke="url(#air-contrail-grad)" d="M10 44 Q 34 45, 58 43" />
        {/* Supersonic Cargo Transport Aircraft */}
        <g className="motion-plane-body">
          <path
            className="motion-vehicle-fill"
            d="M98 12 c-2-3-8-2-13 0 L60 27 22 17 l-9 4 30 18 -17 10 -12-3 -6 4 18 10 21-6 14-11 34-16 c9-5 13-13 8-17 Z"
          />
          {/* Wingtip navigation strobe beacon */}
          <circle cx="98" cy="11" r="2.2" className="motion-beacon motion-beacon-strobe" />
          {/* Underwing turbofan engine nacelle */}
          <ellipse cx="52" cy="38" rx="6.5" ry="2.5" className="motion-vehicle-fill" opacity="0.9" />
        </g>
      </svg>
    )
  }

  if (kind === 'sea') {
    return (
      <svg viewBox="0 0 116 56" className="h-full w-full overflow-visible" role="presentation">
        {/* Dynamic Ocean Wave Crests */}
        <path className="motion-wave motion-wave-1" d="M0 46 Q 16 42, 32 46 T 64 46 T 96 46 T 128 46" />
        <path className="motion-wave motion-wave-2" d="M6 51 Q 22 47, 38 51 T 70 51 T 102 51 T 134 51" />
        {/* Oceangoing Container Vessel */}
        <g className="motion-ship-body">
          {/* Superstructure Bridge & Radar Mast */}
          <rect x="76" y="14" width="14" height="17" rx="1.5" className="motion-vehicle-fill" />
          <line x1="83" y1="8" x2="83" y2="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="83" cy="8" r="1.8" className="motion-beacon motion-beacon-radar" />
          {/* Intermodal Cargo Container Stacks */}
          <rect x="22" y="19" width="15" height="12" rx="1" className="motion-vehicle-fill" />
          <rect x="39" y="17" width="16" height="14" rx="1" className="motion-vehicle-fill" opacity="0.92" />
          <rect x="57" y="21" width="17" height="10" rx="1" className="motion-vehicle-fill" opacity="0.86" />
          {/* Heavy Cargo Ship Hull */}
          <path d="M12 31 h90 l-14 16 H24 Z" className="motion-vehicle-fill" />
          {/* Hydrodynamic Bulbous Bow Waterbreak */}
          <path d="M10 47 Q 20 44, 34 47" className="motion-vehicle-stroke" />
        </g>
      </svg>
    )
  }

  if (kind === 'road') {
    return (
      <svg viewBox="0 0 120 56" className="h-full w-full overflow-visible" role="presentation">
        <defs>
          <linearGradient id="road-headlight-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Road Surface Streak & Exhaust Trail */}
        <path className="motion-trail" d="M0 38 Q 14 36, 26 38 M6 44 Q 16 43, 24 44" />
        {/* Night Highway Headlight Beam */}
        <polygon points="102,34 146,26 146,48 102,42" fill="url(#road-headlight-grad)" className="motion-headlight" />
        {/* Transit Hauler Chassis & Cargo Container */}
        <g className="motion-truck-body">
          {/* Dry Freight Container Box */}
          <rect x="24" y="9" width="50" height="29" rx="2" className="motion-vehicle-fill" />
          {/* Vertical Container Corrugation Ribs */}
          <line x1="34" y1="11" x2="34" y2="36" className="motion-truck-ridge" />
          <line x1="44" y1="11" x2="44" y2="36" className="motion-truck-ridge" />
          <line x1="54" y1="11" x2="54" y2="36" className="motion-truck-ridge" />
          <line x1="64" y1="11" x2="64" y2="36" className="motion-truck-ridge" />
          {/* Aerodynamic Highway Cab */}
          <path d="M74 19 h16 l14 11 v11 H74 Z" className="motion-vehicle-fill" />
          {/* Cab Tinted Windshield */}
          <path d="M78 22 h9 l10 8 h-19 Z" fill="#ffffff" opacity="0.45" />
        </g>
        {/* Spinning Multi-Axle Road Wheels */}
        <g className="motion-wheel motion-wheel-steer" style={{ transformOrigin: "94px 44px" }}>
          <circle cx="94" cy="44" r="6.5" />
          <circle cx="94" cy="44" r="2.5" fill="currentColor" />
          <line x1="94" y1="37.5" x2="94" y2="50.5" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="87.5" y1="44" x2="100.5" y2="44" stroke="#ffffff" strokeWidth="1.2" />
        </g>
        <g className="motion-wheel motion-wheel-drive1" style={{ transformOrigin: "42px 44px" }}>
          <circle cx="42" cy="44" r="6.5" />
          <circle cx="42" cy="44" r="2.5" fill="currentColor" />
          <line x1="42" y1="37.5" x2="42" y2="50.5" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="35.5" y1="44" x2="48.5" y2="44" stroke="#ffffff" strokeWidth="1.2" />
        </g>
        <g className="motion-wheel motion-wheel-drive2" style={{ transformOrigin: "58px 44px" }}>
          <circle cx="58" cy="44" r="6.5" />
          <circle cx="58" cy="44" r="2.5" fill="currentColor" />
          <line x1="58" y1="37.5" x2="58" y2="50.5" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="51.5" y1="44" x2="64.5" y2="44" stroke="#ffffff" strokeWidth="1.2" />
        </g>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 110 56" className="h-full w-full overflow-visible" role="presentation">
      {/* Flight & Transit Pathway Vector */}
      <path className="motion-trail" d="M2 30 Q 30 25, 58 30 M10 38 Q 32 36, 52 38" />
      {/* Concentric GPS Radar Scan Rings */}
      <circle className="motion-route-ring motion-route-ring-1" cx="68" cy="30" r="22" />
      <circle className="motion-route-ring motion-route-ring-2" cx="68" cy="30" r="14" />
      <circle className="motion-route-ring motion-route-ring-3" cx="68" cy="30" r="7" />
      {/* High-Accuracy Logistics Waypoint Pin */}
      <g className="motion-waypoint-pin">
        <circle className="motion-vehicle-fill" cx="68" cy="30" r="4.5" />
        <circle className="motion-beacon motion-beacon-pulse" cx="68" cy="30" r="9" />
      </g>
    </svg>
  )
}

export function BackgroundMotionAccent({
  backgroundUrl,
  pdfMode,
}: {
  backgroundUrl: string
  pdfMode: boolean
}) {
  if (!backgroundUrl) return null
  const kind = resolveMotionKind(backgroundUrl)
  if (!kind) return null

  return (
    <div
      data-bol-motion-accent="true"
      data-motion-kind={kind}
      data-pdf-static={pdfMode ? 'true' : undefined}
      className="pointer-events-none absolute left-0 top-0 z-0 h-[15mm] w-[28mm]"
      aria-hidden="true"
    >
      <MotionVehicle kind={kind} />
    </div>
  )
}
