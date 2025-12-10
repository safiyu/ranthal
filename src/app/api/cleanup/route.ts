import { NextRequest, NextResponse } from "next/server";
import { cleanupOldEdits } from "@/app/actions";

// This endpoint can be called by a cron job to clean up old edits
// Example: cron job calls GET /api/cleanup?secret=your-secret
export async function GET(request: NextRequest) {
    // Simple secret check to prevent unauthorized access
    const secret = request.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.CLEANUP_SECRET || "cleanup-secret-key";

    if (secret !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await cleanupOldEdits();
        return NextResponse.json({
            message: "Cleanup complete",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Cleanup failed:", error);
        return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }
}
