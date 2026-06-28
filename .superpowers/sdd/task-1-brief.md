### Task 1: Project Initialization

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.env.local.example`, `public/manifest.json`, `app/globals.css`, `app/layout.tsx`

**Interfaces:**
- Produces: a running `next dev` server at localhost:3000

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /home/flavio/github/vip-space
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-eslint
```

Expected: project files generated at `/home/flavio/github/vip-space/`

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js zod dayjs react-day-picker lru-cache
npm install next-pwa
npm install -D @types/node
```

- [ ] **Step 3: Configure next.config.ts with security headers**

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

// CSP: only allow scripts/styles from self and Google OAuth iframe.
// 'unsafe-inline' for styles is required by Tailwind + react-day-picker.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com;
  font-src 'self';
  connect-src 'self' https://*.supabase.co https://accounts.google.com wss://*.supabase.co;
  frame-src https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`.replace(/\n/g, ' ').trim()

const securityHeaders = [
  { key: 'Content-Security-Policy',       value: ContentSecurityPolicy },
  { key: 'X-Frame-Options',               value: 'DENY' },
  { key: 'X-Content-Type-Options',        value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control',        value: 'on' },
  { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',            value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

module.exports = withPWA(nextConfig)
```

- [ ] **Step 4: Create PWA manifest**

```json
// public/manifest.json
{
  "name": "Vip Space",
  "short_name": "VipSpace",
  "description": "Beauty salon scheduling",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 5: Create .env.local.example**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Comma-separated consultant emails — NEVER add NEXT_PUBLIC_ prefix
SUPER_ADMIN_EMAILS=consultant@yourcompany.com,another@example.com
```

Copy to `.env.local` and fill in actual values from Supabase dashboard.

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at http://localhost:3000 with no errors.

- [ ] **Step 7: Commit**

```bash
git init && git add -A
git commit -m "feat: initialize Next.js 15 project with Tailwind, PWA, and Supabase dependencies"
```

---

