import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters"

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    role: text("role").$type<"admin" | "user">().notNull().default("user"),
    approved: integer("approved", { mode: "boolean" }).notNull().default(false),
    isPasswordChanged: integer("is_password_changed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

export const loginAttempts = sqliteTable("login_attempts", {
    ip: text("ip").primaryKey(),
    attempts: integer("attempts").notNull().default(0),
    lastAttempt: integer("last_attempt", { mode: "timestamp" }).default(new Date()),
    blockedUntil: integer("blocked_until", { mode: "timestamp" }),
});

export const edits = sqliteTable("edits", {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    originalUrl: text("original_url").notNull(),
    resultUrl: text("result_url").notNull(),
    toolUsed: text("tool_used").notNull(), // 'remove-bg', 'crop', etc.
    createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

export const passwordRequests = sqliteTable("password_requests", {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id).notNull(),
    status: text("status").$type<"pending" | "approved" | "rejected">().default("pending").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

export const accounts = sqliteTable(
    "account",
    {
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccountType>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
    })
)

export const sessions = sqliteTable("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
})

export const verificationTokens = sqliteTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
    },
    (verificationToken) => ({
        compositePk: primaryKey({
            columns: [verificationToken.identifier, verificationToken.token],
        }),
    })
)

export const authenticators = sqliteTable(
    "authenticator",
    {
        credentialID: text("credentialID").notNull().unique(),
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        providerAccountId: text("providerAccountId").notNull(),
        credentialPublicKey: text("credentialPublicKey").notNull(),
        counter: integer("counter").notNull(),
        credentialDeviceType: text("credentialDeviceType").notNull(),
        credentialBackedUp: integer("credentialBackedUp", {
            mode: "boolean",
        }).notNull(),
        transports: text("transports"),
    },
    (authenticator) => ({
        compositePK: primaryKey({
            columns: [authenticator.userId, authenticator.credentialID],
        }),
    })
)
