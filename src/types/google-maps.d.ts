export {}

declare global {
  namespace google.maps {
    interface LatLngBoundsLiteral {
      east: number
      north: number
      south: number
      west: number
    }

    interface MapsEventListener {
      remove(): void
    }

    namespace places {
      class Autocomplete {
        constructor(
          inputField: HTMLInputElement,
          opts?: {
            bounds?: LatLngBoundsLiteral
            strictBounds?: boolean
            componentRestrictions?: { country: string | string[] }
            fields?: string[]
            types?: string[]
          }
        )
        addListener(eventName: 'place_changed', handler: () => void): MapsEventListener
        getPlace(): { formatted_address?: string }
      }
    }
  }
}
