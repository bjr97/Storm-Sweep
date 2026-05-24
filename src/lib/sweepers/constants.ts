export const APPLICANT_SESSION_KEY = 'storm_sweep_applicant_id'

export const TOOL_PHOTO_KEYS = [
  'shop_vac',
  'scrub_brushes',
  'mop_bucket',
  'extension_cord',
  'leaf_blower',
  'headlamp',
  'ppe',
] as const

export type ToolPhotoKey = (typeof TOOL_PHOTO_KEYS)[number]

export const TOOL_PHOTO_REQUIREMENTS: {
  key: ToolPhotoKey
  label: string
  hint: string
}[] = [
  {
    key: 'shop_vac',
    label: 'Shop vacuum (wet/dry capable)',
    hint: 'Show a wet/dry shop vac ready for shelter cleaning.',
  },
  {
    key: 'scrub_brushes',
    label: 'Stiff scrub brushes (2+ shown)',
    hint: 'Include at least two stiff scrub brushes in the photo.',
  },
  {
    key: 'mop_bucket',
    label: 'Mop + bucket',
    hint: 'Mop and bucket together, ready for floor work.',
  },
  {
    key: 'extension_cord',
    label: 'Extension cord (25ft+ unrolled)',
    hint: 'Fully unrolled cord showing length.',
  },
  {
    key: 'leaf_blower',
    label: 'Outdoor/leaf blower',
    hint: 'Leaf or outdoor blower for debris removal.',
  },
  {
    key: 'headlamp',
    label: 'Headlamp (switched on)',
    hint: 'Headlamp turned on so we can verify it works.',
  },
  {
    key: 'ppe',
    label: 'PPE: N95 mask + gloves together',
    hint: 'N95 mask and work gloves shown together.',
  },
]

export const HEARD_ABOUT_OPTIONS = [
  'Google search',
  'Facebook / Instagram',
  'Friend or family',
  'Indeed / job board',
  'Storm Sweep website',
  'Referral from partner',
  'Other',
] as const
