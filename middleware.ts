import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { LRUCache } from 'lru-cache'

// Sliding window rate limiter: 60 requests per minute per IP
const rateLimitCache = new LRUCache<string, number[]>({ max: 500 })
const WINDOW_MS = 60_000
const MAX_REQUESTS = 60

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitCache.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS
  )
  timestamps.push(now)
  rateLimitCache.set(ip, timestamps)
  return timestamps.length > MAX_REQUESTS
}

export async function middleware(request: NextRequest) {
  // ── Rate limiting ───────────────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (isRateLimited(ip)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  // ── Session refresh (required for @supabase/ssr) ────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/sales'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
