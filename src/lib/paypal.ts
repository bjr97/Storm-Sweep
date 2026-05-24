import { getAppUrl } from '@/lib/stripe'

type PayPalAccessTokenResponse = {
  access_token: string
  token_type: string
}

type PayPalLink = {
  href: string
  rel: string
  method: string
}

type PayPalOrderResponse = {
  id: string
  status: string
  links: PayPalLink[]
}

function getPayPalBaseUrl(): string {
  const mode = process.env.PAYPAL_MODE ?? 'sandbox'
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

function getPayPalCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are not configured')
  }
  return { clientId, clientSecret }
}

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getPayPalCredentials()
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`PayPal auth failed: ${errorBody}`)
  }

  const data = (await response.json()) as PayPalAccessTokenResponse
  return data.access_token
}

export type PayPalOrderItem = {
  name: string
  unit_amount: number
  quantity: number
}

export async function createPayPalOrder(params: {
  amount: number
  items: PayPalOrderItem[]
  metadata: Record<string, string>
}): Promise<{ orderId: string; approvalUrl: string }> {
  const accessToken = await getPayPalAccessToken()
  const appUrl = getAppUrl()

  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: params.amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: params.amount.toFixed(2),
              },
            },
          },
          items: params.items.map((item) => ({
            name: item.name.slice(0, 127),
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: 'USD',
              value: item.unit_amount.toFixed(2),
            },
            category: 'DIGITAL_GOODS',
          })),
          custom_id: JSON.stringify(params.metadata),
        },
      ],
      application_context: {
        brand_name: 'Storm Sweep',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${appUrl}/book/confirmation`,
        cancel_url: `${appUrl}/book`,
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`PayPal create order failed: ${errorBody}`)
  }

  const order = (await response.json()) as PayPalOrderResponse
  const approvalUrl = order.links.find((link) => link.rel === 'approve')?.href

  if (!approvalUrl) {
    throw new Error('PayPal approval URL not found')
  }

  return { orderId: order.id, approvalUrl }
}

export async function capturePayPalOrder(orderId: string): Promise<{
  status: string
  customId: string | null
}> {
  const accessToken = await getPayPalAccessToken()

  const response = await fetch(
    `${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`PayPal capture failed: ${errorBody}`)
  }

  const data = (await response.json()) as {
    status: string
    purchase_units?: Array<{ custom_id?: string }>
  }

  return {
    status: data.status,
    customId: data.purchase_units?.[0]?.custom_id ?? null,
  }
}
