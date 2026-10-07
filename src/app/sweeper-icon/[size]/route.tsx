import { ImageResponse } from 'next/og'

// App icon rendered on demand (no binary assets in the repo). ImageResponse
// (Satori) only supports inline style objects — this is not UI markup, so the
// no-inline-styles rule doesn't apply here.
const SIZES = new Set([180, 192, 512])

export function GET(_req: Request, { params }: { params: { size: string } }): Response {
  const size = Number(params.size)
  if (!SIZES.has(size)) return new Response('Not found', { status: 404 })
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#141416',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: size * 0.14,
            background: '#2E86C1',
            color: '#FFFFFF',
            fontSize: size * 0.42,
            fontWeight: 800,
            letterSpacing: -size * 0.01,
          }}
        >
          SS
        </div>
      </div>
    ),
    { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=604800, immutable' } }
  )
}
