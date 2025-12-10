import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/editor");
            const isOnAdmin = nextUrl.pathname.startsWith("/admin");
            const isOnChangePassword = nextUrl.pathname.startsWith("/change-password");

            const isSetup = nextUrl.pathname.startsWith("/setup");
            const isSignOut = nextUrl.pathname.startsWith("/api/auth/signout");

            if (isLoggedIn) {
                // Enforce password change (Exempting setup and signout to prevent loops)
                if (!auth.user.isPasswordChanged && !isOnChangePassword && !isSetup && !isSignOut) {
                    return Response.redirect(new URL("/change-password", nextUrl));
                }

                // Protect admin routes
                if (isOnAdmin && auth.user.role !== "admin") {
                    return Response.redirect(new URL("/dashboard", nextUrl));
                }

                if (isOnDashboard) return true;

                // Redirect logged-in users away from login
                if (nextUrl.pathname.startsWith("/login")) {
                    return Response.redirect(new URL("/dashboard", nextUrl));
                }
            } else {
                if (isOnDashboard || isOnAdmin || isOnChangePassword) {
                    return false; // Redirect unauthenticated users to login page
                }
            }
            return true;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;
                session.user.role = token.role as "admin" | "user";
                session.user.isPasswordChanged = token.isPasswordChanged as boolean;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.role = user.role;
                token.isPasswordChanged = user.isPasswordChanged;
            }
            return token;
        },
    },
    providers: [], // Providers with DB dependencies will be added in auth.ts
} satisfies NextAuthConfig;
