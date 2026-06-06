import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('credit_packages')
    .select('*')
    .order('sort_order')

  if (error || !data?.length) {
    return NextResponse.json([
      { id: 's',  name: 'S',  credits: 100, price_usd: 9,  original_price_usd: null, is_popular: false, sort_order: 1 },
      { id: 'm',  name: 'M',  credits: 200, price_usd: 17, original_price_usd: 20,   is_popular: false, sort_order: 2 },
      { id: 'l',  name: 'L',  credits: 450, price_usd: 32, original_price_usd: 40,   is_popular: false, sort_order: 3 },
      { id: 'xl', name: 'XL', credits: 900, price_usd: 49, original_price_usd: 80,   is_popular: true,  sort_order: 4 },
    ])
  }

  return NextResponse.json(data)
}
