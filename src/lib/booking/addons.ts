import { PRICING } from '@/lib/utils'
import type { ShelterSize } from '@/types/database'

/**
 * Hardware & flooring upgrades — bookable in Step 1 and sellable on site.
 * Prices live in PRICING.addons; this is the catalog (names, copy).
 * Upgrades count toward the Storm Ready 10% member discount.
 */
export const HARDWARE_ADDON_IDS = ['interior_handle', 'hinge_roller_service', 'flooring'] as const
export type HardwareAddonId = (typeof HARDWARE_ADDON_IDS)[number]

export type HardwareAddon = { id: HardwareAddonId; name: string; description: string }

export const HARDWARE_ADDONS: readonly HardwareAddon[] = [
  {
    id: 'interior_handle',
    name: 'Interior Handle Install',
    description: 'Install a sturdy interior handle so the hatch can be pulled shut and opened from inside.',
  },
  {
    id: 'hinge_roller_service',
    name: 'Hinge / Roller Service',
    description: 'Clean, lubricate and adjust sticky or rusted hinges — or the rollers and track on sliding doors.',
  },
  {
    id: 'flooring',
    name: 'Shelter Carpet',
    description: 'Cut-to-fit carpet with hook-and-loop backing — warmer, quieter, and removable for cleaning.',
  },
]

/** Price in cents for this shelter size; null = needs a quote (X-Large flooring). */
export function hardwareAddonPrice(id: HardwareAddonId, size: ShelterSize): number | null {
  if (id === 'flooring') return PRICING.addons.flooring[size]
  return PRICING.addons[id]
}

export function getHardwareAddon(id: HardwareAddonId): HardwareAddon {
  const addon = HARDWARE_ADDONS.find((a) => a.id === id)
  if (!addon) throw new Error(`Unknown add-on ${id}`)
  return addon
}
