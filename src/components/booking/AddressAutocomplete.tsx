'use client'

import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { useEffect, useRef } from 'react'

import { Input } from '@/components/ui/input'
import { partsFromPlace, type AddressParts } from '@/lib/booking/address'
import { cn } from '@/lib/utils'

/** Norman, OK and surrounding Cleveland County / south OKC metro. */
const NORMAN_AREA_BOUNDS = {
  north: 35.55,
  south: 34.88,
  east: -97.05,
  west: -97.82,
}

type AddressAutocompleteProps = {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
  placeholder?: string
  /** Called with street/city/state/ZIP when a Google suggestion is picked. */
  onPlace?: (parts: Partial<AddressParts>) => void
}

export function AddressAutocomplete({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder = 'Start typing your address…',
  onPlace,
}: AddressAutocompleteProps): React.ReactElement {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onPlaceRef = useRef(onPlace)
  onPlaceRef.current = onPlace

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    const inputElement = document.getElementById(id) as HTMLInputElement | null
    if (!apiKey || !inputElement) {
      return
    }

    let listener: google.maps.MapsEventListener | null = null
    let cancelled = false

    setOptions({ key: apiKey, v: 'weekly' })

    void importLibrary('places')
      .then((placesLibrary) => {
        if (cancelled || !inputElement) {
          return
        }

        const autocomplete = new placesLibrary.Autocomplete(inputElement, {
          bounds: NORMAN_AREA_BOUNDS,
          strictBounds: false,
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'address_components'],
          types: ['address'],
        })

        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          const parts = partsFromPlace(place.address_components)
          if (parts.address && onPlaceRef.current) {
            onChangeRef.current(parts.address)
            onPlaceRef.current(parts)
          } else if (place.formatted_address) {
            onChangeRef.current(place.formatted_address)
          }
        })
      })
      .catch((error: unknown) => {
        console.error('[AddressAutocomplete] Places API unavailable:', error)
      })

    return () => {
      cancelled = true
      listener?.remove()
    }
  }, [id])

  return (
    <Input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      aria-invalid={invalid}
      placeholder={placeholder}
      autoComplete="street-address"
      className={cn('h-10 bg-white', invalid && 'border-tornado')}
    />
  )
}
