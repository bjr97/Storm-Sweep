'use client'

import { useEffect, useState } from 'react'

import type { KitSelection } from '@/components/booking/KitSelector'

const KIT_MESSAGE_STORAGE_KEY = 'booking_kit_message'

const KIT_BUNDLE_LABELS: Record<NonNullable<KitSelection['selectedBundle']>, string> = {
  storm_starter: 'Storm Starter',
  family_ready: 'Family Ready',
  pet_ready: 'Pet Ready',
  full_house: 'Full House',
}

const A_LA_CARTE_LABELS: Record<string, string> = {
  shelter_ready: 'Shelter Ready Kit',
  little_ones: 'Little Ones',
  pets: 'Pets Add-on',
  hygiene: 'Hygiene Pack',
}

export function buildKitConfirmationMessage(kitSelection: KitSelection): string | null {
  if (kitSelection.selectedBundle) {
    return `Your Sweeper will bring your ${KIT_BUNDLE_LABELS[kitSelection.selectedBundle]} kit to the visit.`
  }

  if (kitSelection.aLaCarteItems.length > 0) {
    const itemNames = kitSelection.aLaCarteItems
      .map((id) => A_LA_CARTE_LABELS[id] ?? id)
      .join(', ')
    return `Your Sweeper will bring your ${itemNames} kit to the visit.`
  }

  return null
}

export function kitMessageFromServiceTypes(serviceTypes: string[]): string | null {
  const prepKit = serviceTypes.find((service) => service.startsWith('Prep Kit — '))
  if (!prepKit) {
    return null
  }

  const name = prepKit.replace('Prep Kit — ', '')
  if (name === 'Custom') {
    return null
  }

  return `Your Sweeper will bring your ${name} kit to the visit.`
}

type ConfirmationKitMessageProps = {
  serviceTypes?: string[]
}

export function ConfirmationKitMessage({
  serviceTypes = [],
}: ConfirmationKitMessageProps): React.ReactElement | null {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(KIT_MESSAGE_STORAGE_KEY)
    if (stored) {
      setMessage(stored)
      sessionStorage.removeItem(KIT_MESSAGE_STORAGE_KEY)
      return
    }

    setMessage(kitMessageFromServiceTypes(serviceTypes))
  }, [serviceTypes])

  if (!message) {
    return null
  }

  return (
    <div className="mb-6">
      <p className="rounded-lg border border-sky/20 bg-sky-pale px-4 py-3 font-['Barlow'] text-sm text-[var(--color-bg)]">
        {message}
      </p>
    </div>
  )
}

export function persistKitConfirmationMessage(kitSelection: KitSelection): void {
  const message = buildKitConfirmationMessage(kitSelection)
  if (message) {
    sessionStorage.setItem(KIT_MESSAGE_STORAGE_KEY, message)
  } else {
    sessionStorage.removeItem(KIT_MESSAGE_STORAGE_KEY)
  }
}
