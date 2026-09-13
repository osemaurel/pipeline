// Vercel Serverless Function qui proxifie les requêtes vers l'API Overpass
// (OpenStreetMap). Nécessaire parce que :
//  1. Le fetch direct depuis le browser échoue en HTTP 406 : Overpass refuse
//     le User-Agent "Mozilla/5.0 Chrome" (politique anti-scraper d'Apache
//     mod_security côté Overpass).
//  2. Depuis Vercel Serverless (Node runtime), on peut envoyer un
//     User-Agent identifiable ("TopCloz/…") qui est accepté par Overpass.
//
// Endpoint : POST /api/overpass  { city, category, excludeWithWebsite }
// Réponse  : { results: [...] } ou { error: "..." }

const USER_AGENT = 'TopCloz/1.0 (freelance prospecting; contact via app)'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

const CATEGORY_TAG: Record<string, { key: string; value: string }> = {
  restaurant: { key: 'amenity', value: 'restaurant' },
  fast_food: { key: 'amenity', value: 'fast_food' },
  cafe: { key: 'amenity', value: 'cafe' },
  bar: { key: 'amenity', value: 'bar' },
  bakery: { key: 'shop', value: 'bakery' },
  hairdresser: { key: 'shop', value: 'hairdresser' },
  beauty: { key: 'shop', value: 'beauty' },
  butcher: { key: 'shop', value: 'butcher' },
  florist: { key: 'shop', value: 'florist' },
  pharmacy: { key: 'amenity', value: 'pharmacy' },
  optician: { key: 'shop', value: 'optician' },
  clothes: { key: 'shop', value: 'clothes' },
  car_repair: { key: 'shop', value: 'car_repair' },
  hotel: { key: 'tourism', value: 'hotel' },
  estate_agent: { key: 'office', value: 'estate_agent' },
}

interface OsmTags {
  name?: string
  website?: string
  'contact:website'?: string
  phone?: string
  'contact:phone'?: string
  email?: string
  'contact:email'?: string
  'addr:housenumber'?: string
  'addr:street'?: string
  'addr:postcode'?: string
  'addr:city'?: string
}

function buildAddress(t: OsmTags): string | null {
  const parts = [
    [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
    [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' '),
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString('utf-8')
  try { return JSON.parse(raw) } catch { return {} }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'content-type')
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non supportée' })
    return
  }

  const body = await readJsonBody(req)
  const city = String(body?.city ?? '').trim()
  const category = String(body?.category ?? '').trim()
  const excludeWithWebsite = body?.excludeWithWebsite !== false

  if (!city) return res.status(400).json({ error: 'La ville est requise.' })
  const tag = CATEGORY_TAG[category]
  if (!tag) return res.status(400).json({ error: 'Catégorie inconnue.' })

  const query = `[out:json][timeout:25];area["name"="${city.replace(/"/g, '')}"]["boundary"="administrative"]->.a;(node["${tag.key}"="${tag.value}"](area.a);way["${tag.key}"="${tag.value}"](area.a););out center tags 60;`

  const errors: string[] = []
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 22000)
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!upstream.ok) {
        errors.push(`${endpoint} → HTTP ${upstream.status}`)
        continue
      }
      const data = await upstream.json()
      const elements = (data.elements ?? []) as { tags?: OsmTags }[]

      const results: {
        business_name: string
        address: string | null
        phone: string | null
        website: string | null
        email: string | null
      }[] = []
      const seen = new Set<string>()
      for (const el of elements) {
        const t = el.tags ?? {}
        if (!t.name) continue
        const website = t.website || t['contact:website'] || null
        if (excludeWithWebsite && website) continue
        const key = t.name.toLowerCase().trim()
        if (seen.has(key)) continue
        seen.add(key)
        results.push({
          business_name: t.name,
          address: buildAddress(t),
          phone: t.phone || t['contact:phone'] || null,
          website,
          email: t.email || t['contact:email'] || null,
        })
      }

      res.status(200).json({ results })
      return
    } catch (e) {
      clearTimeout(timeout)
      const name = e instanceof Error ? e.name : 'unknown'
      errors.push(`${endpoint} → ${name}`)
    }
  }

  res.status(502).json({
    error: `OpenStreetMap indisponible. Détail : ${errors.join(' | ').slice(0, 300)}`,
  })
}
