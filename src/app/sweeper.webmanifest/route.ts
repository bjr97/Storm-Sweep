// Web app manifest for the Sweeper app: "Add to Home Screen" opens /sweeper
// full-screen with its own icon. Linked from the (sweeper) layout only.
export const dynamic = 'force-static'

export function GET(): Response {
  return Response.json(
    {
      name: 'Storm Sweep — Sweeper',
      short_name: 'Sweeper',
      description: 'Claim jobs, run your checklist, and track your pay.',
      id: '/sweeper',
      start_url: '/sweeper',
      scope: '/sweeper',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0F0F11',
      theme_color: '#141416',
      icons: [
        { src: '/sweeper-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/sweeper-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/sweeper-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
