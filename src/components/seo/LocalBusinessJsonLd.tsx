import { HARDWARE_ADDONS, hardwareAddonPrice } from '@/lib/booking/addons'
import { SITE } from '@/lib/site'
import { PRICING } from '@/lib/utils'

const dollars = (cents: number): string => (cents / 100).toFixed(2)
const whole = (cents: number): string => dollars(cents).replace(/\.00$/, '')

/**
 * schema.org LocalBusiness for Google (service-area business: no street
 * address). Prices come from PRICING so they never drift from the site.
 */
export function LocalBusinessJsonLd(): React.ReactElement {
  const offers = [
    { name: 'Storm shelter deep clean (standard)', price: PRICING.shelter.standard },
    { name: 'LED lighting package', price: PRICING.addons.led_package },
    { name: 'Full Package (clean + LED + prep kit)', price: PRICING.bundles.full_package },
    ...HARDWARE_ADDONS.map((a) => ({ name: a.name, price: hardwareAddonPrice(a.id, 'standard') ?? 0 })),
  ]
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE.name,
    url: SITE.url,
    image: `${SITE.url}/og.png`,
    description: SITE.description,
    priceRange: `$${whole(PRICING.shelter.small)}–$${whole(PRICING.bundles.full_package)}`,
    areaServed: { '@type': 'City', name: `${SITE.city}, ${SITE.region}` },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Storm shelter services',
      itemListElement: offers.map((o) => ({
        '@type': 'Offer',
        price: dollars(o.price),
        priceCurrency: 'USD',
        itemOffered: { '@type': 'Service', name: o.name },
      })),
    },
  }
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be raw JSON; it's built from constants, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
