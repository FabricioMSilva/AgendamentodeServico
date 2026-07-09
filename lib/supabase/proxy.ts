import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/database.types'

const PUBLIC_SINGLE_SEGMENT_ROUTES = new Set(['login', 'recuperar-senha', 'dono', 'admin', 'sales', 'api'])

function isCustomerProtectedPath(pathname: string) {
  if (pathname === '/buscar') return true

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1) return false

  const [segment] = segments
  return !PUBLIC_SINGLE_SEGMENT_ROUTES.has(segment) && !segment.includes('.')
}

function getLoginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone()
  const next = `${url.pathname}${url.search}`
  url.pathname = '/login'
  url.search = ''
  url.searchParams.set('mode', 'login')
  url.searchParams.set('next', next)
  return url
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isCustomerProtectedPath(request.nextUrl.pathname)) {
    const redirectResponse = NextResponse.redirect(getLoginRedirect(request))
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return response
}
