import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    const publicRoutes = ['/login', '/force-change-password', '/api/auth/login', '/api/auth/change-password']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    if (isPublicRoute) {
        return NextResponse.next()
    }

    // Check if user is authenticated
    const token = request.cookies.get('accessToken')?.value

    if (!token) {
        // Redirect to login if not authenticated
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // TODO: Decode JWT to check isFirstLogin flag
    // For now, this is handled client-side in the login page
    // In production, you should verify the token and check isFirstLogin here

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|images|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
    ],
}
