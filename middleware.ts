import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Definición de rutas públicas: estas no requieren autenticación
const publicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/api/webhook',
  '/restore'
]

// Verificador para saber si una ruta pertenece a las rutas públicas
const isPublicRoute = createRouteMatcher(publicRoutes)

// Middleware principal que aplica protección con Clerk en rutas privadas
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

// Configuración del middleware para aplicar en rutas específicas
export const config = {
  matcher: [
    // Excluir archivos estáticos e internos de Next.js del middleware
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Aplicar siempre el middleware en rutas de API o TRPC
    '/(api|trpc)(.*)'
  ]
}
