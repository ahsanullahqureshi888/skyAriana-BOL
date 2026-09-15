import artwork from './document-backgrounds.json'

export interface DocumentBackground {
  label: string
  category: string
  url: string
  opacity: number
}

export const DOCUMENT_BACKGROUNDS: DocumentBackground[] = [
  { label: 'Clean White', category: 'Classic', url: '', opacity: 0 },
  ...[
    ['Premium Mountain', 'mountain-watermark-premium.png'],
    ['Original Mountain Grid', 'afghan_mountain_blueprint_bg.jpg'],
    ['Truck Blueprint', 'overland_transit_blueprint.svg'],
    ['Ship Blueprint', 'maritime_shipping_blueprint.svg'],
    ['Flight Blueprint', 'air_cargo_blueprint.svg'],
    ['Air Cargo', 'sky_freight_cargo_plane.jpg'],
    ['Fleet Pass', 'afghan_cargo_fleet_pass.jpg'],
    ['Port Vessel', 'maritime_port_cargo_ship.jpg'],
  ].map(([label, file]) => ({
    label,
    category: 'Classic',
    url: `/images/${file}`,
    opacity: file === 'mountain-watermark-premium.png' ? 0.22 : 0.08,
  })),
  ...artwork,
]
