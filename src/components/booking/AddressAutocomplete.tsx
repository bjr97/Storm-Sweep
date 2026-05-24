'use client'

import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { useEffect } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type AddressAutocompleteProps = {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
  placeholder?: string
}

export function AddressAutocomplete({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder = 'Start typing your address…',
}: AddressAutocompleteProps): React.ReactElement {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    const inputElement = document.getElementById(id) as HTMLInputElement | null
    if (!apiKey || !inputElement) {
      return
    }

    let listener: google.maps.MapsEventListener | null = null
    let cancelled = false

    setOptions({ key: apiKey, v: 'weekly' })

    void importLibrary('places').then((placesLibrary) => {
      if (cancelled || !inputElement) {
        return
      }

      const autocomplete = new placesLibrary.Autocomplete(inputElement, {
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address'],
        types: ['address'],
      })

      listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.formatted_address) {
          onChange(place.formatted_address)
        }
      })
    })

    return () => {
      cancelled = true
      listener?.remove()
    }
  }, [id, onChange])

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
