import { NextRequest, NextResponse } from 'next/server'
import { getModels, type PublicModel } from '../../../lib/models'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category')
  if (category !== 'image' && category !== 'video') {
    return NextResponse.json({ error: 'category must be "image" or "video"' }, { status: 400 })
  }

  try {
    const models = await getModels(category)
    const publicModels: PublicModel[] = models.map(({ api_key_env, api_secret_env, ...rest }) => rest)
    return NextResponse.json({ models: publicModels })
  } catch (err: any) {
    console.error('Failed to fetch models:', err)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 503 })
  }
}
