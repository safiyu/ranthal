import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

export const edits = sqliteTable("edits", {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    originalUrl: text("original_url").notNull(),
    resultUrl: text("result_url").notNull(),
    toolUsed: text("tool_used").notNull(), // 'remove-bg', 'crop', etc.
    createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});
