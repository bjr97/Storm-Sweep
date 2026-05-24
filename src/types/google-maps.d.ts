export {}

declare global {
  namespace google.maps {
    interface MapsEventListener {
      remove(): void
    }

    namespace places {
      class Autocomplete {
        constructor(
          inputField: HTMLInputElement,
          opts?: {
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
