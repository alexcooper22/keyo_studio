import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/image',
  '/video',
  '/audio',
  '/pricing',
  '/privacy',
  '/terms',
  '/api/liqpay/webhook(.*)',
  '/api/community-gallery(.*)',
])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) return
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
