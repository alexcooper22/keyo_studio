import crypto from 'crypto'

const PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY!
const PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY!

export const LIQPAY_PLANS = {
  starter: { credits: 200, name: 'Starter', amount: '19', currency: 'USD' },
  plus:    { credits: 1000, name: 'Plus',    amount: '49', currency: 'USD' },
} as const

export type LiqPayPlanType = keyof typeof LIQPAY_PLANS

function sign(data: string): string {
  return crypto
    .createHash('sha1')
    .update(PRIVATE_KEY + data + PRIVATE_KEY)
    .digest('base64')
}

export function buildCheckoutUrl(params: Record<string, string>): string {
  const data = Buffer.from(JSON.stringify(params)).toString('base64')
  const signature = sign(data)
  return `https://www.liqpay.ua/api/3/checkout?data=${encodeURIComponent(data)}&signature=${encodeURIComponent(signature)}`
}

export function verifyWebhook(data: string, signature: string): boolean {
  return sign(data) === signature
}

export function decodeWebhookData(data: string): Record<string, any> {
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8'))
}

export { PUBLIC_KEY }
