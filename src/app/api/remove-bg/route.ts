import { removeBackground } from "@imgly/background-removal-node";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get("image") as File;

        if (!imageFile) {
            return NextResponse.json(
                { error: "No image provided" },
                { status: 400 }
            );
        }

        console.log("Processing image:", imageFile.name, imageFile.size, "bytes");

        // Convert File to Blob
        const arrayBuffer = await imageFile.arrayBuffer();
        const inputBlob = new Blob([arrayBuffer], { type: imageFile.type || 'image/png' });

        // Process with background removal
        const resultBlob = await removeBackground(inputBlob);

        console.log("Background removal complete");

        // Convert Blob to Buffer for response
        const resultBuffer = Buffer.from(await resultBlob.arrayBuffer());

        return new NextResponse(resultBuffer, {
            headers: {
                "Content-Type": "image/png",
            },
        });
    } catch (error) {
        console.error("Background removal failed:", error);
        return NextResponse.json(
            { error: "Failed to remove background", details: String(error) },
            { status: 500 }
        );
    }
}
