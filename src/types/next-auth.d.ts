import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: "admin" | "user";
            isPasswordChanged: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        role: "admin" | "user";
        isPasswordChanged: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: "admin" | "user";
        isPasswordChanged: boolean;
    }
}
