import type { Metadata } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PwaCleanup from "@/components/PwaCleanup";
import TopNavigation from "@/components/ui/TopNavigation";
import GlobalLoadingOverlay from "@/components/ui/GlobalLoadingOverlay";
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/auth'

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fredoka = Fredoka({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "IBeleza | Saúde e Beleza",
  description:
    "Marketplace de saúde e beleza com agenda, serviços, pagamento online e notificações.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let loggedIn = false
  let userName: string | undefined
  let userLabel: string | undefined
  let panelHref: string | undefined
  let showAddEstablishment = false

  if (user) {
    loggedIn = true
    const db = createAdminClient()
    const { data: profile } = await supabase
      .from('usuarios')
      .select('nome, telefone, nivel_acesso, tipo_cadastro, comerciante_status, comerciante_ativo, conta_bloqueada')
      .eq('id', user.id)
      .maybeSingle()

    userName = profile?.nome || user.email || 'Minha conta'
    const superAdmin = isSuperAdmin({ email: user.email, phone: profile?.telefone }) || profile?.nivel_acesso === 'administrador'

    panelHref = superAdmin ? '/sales/dashboard' : '/buscar'
    userLabel = superAdmin ? 'Admin VIP' : 'Cliente'

    if (profile?.conta_bloqueada) {
      panelHref = '/conta-bloqueada'
      userLabel = 'Bloqueado'
    }

    if (!superAdmin) {
      const { data: establishment } = await db
        .from('estabelecimentos')
        .select('id, status_aprovacao')
        .eq('usuario_admin_id', user.id)
        .order('criado_em', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (profile?.tipo_cadastro === 'comerciante' && profile.comerciante_status !== 'aprovado') {
        panelHref = '/aguardando-aprovacao'
        userLabel = 'Aguardando'
      } else if (
        profile?.comerciante_ativo ||
        profile?.nivel_acesso === 'profissional' ||
        establishment?.id
      ) {
        panelHref = establishment?.status_aprovacao === 'pendente'
          ? '/aguardando-aprovacao?tipo=estabelecimento'
          : establishment?.status_aprovacao === 'aprovado'
            ? '/admin/dashboard'
            : '/dono'
        userLabel = 'Comerciante'

        // Check if can add more establishments (max 3)
        const { count: establishmentCount } = await db
          .from('estabelecimentos')
          .select('id', { count: 'exact', head: true })
          .eq('usuario_admin_id', user.id)

        showAddEstablishment = (establishmentCount ?? 0) < 3
      }
    }
  }

  // Check if current path is an auth route by looking at the URL
  const isAuthRoute = false // This will be set dynamically in a client component

  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${plusJakarta.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaCleanup />
        <GlobalLoadingOverlay />
        {/* Only render TopNavigation if user is logged in or not on auth routes */}
        {loggedIn && <TopNavigation loggedIn={loggedIn} userName={userName} userLabel={userLabel} panelHref={panelHref} showAddEstablishment={showAddEstablishment} />}
        <main className={`flex-1 ${loggedIn ? 'pt-16' : ''}`}>{children}</main>
      </body>
    </html>
  )
}
