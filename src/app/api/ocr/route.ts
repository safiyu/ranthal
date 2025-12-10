import { createWorker, Worker } from "tesseract.js";
import { NextRequest, NextResponse } from "next/server";

// Persistent worker - initialized once, reused for all requests
let worker: Worker | null = null;
let workerReady = false;

async function getWorker(): Promise<Worker> {
    if (!worker) {
        console.log("Initializing Tesseract worker...");
        worker = await createWorker('eng', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });
        workerReady = true;
        console.log("Tesseract worker ready");
    }
    return worker;
}

// Pre-initialize worker on module load
getWorker().catch(console.error);

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

        console.log("OCR request received, size:", imageFile.size, "bytes");

        // Convert File to buffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Get persistent worker
        const ocrWorker = await getWorker();

        // Run OCR
        const startTime = Date.now();
        const result = await ocrWorker.recognize(buffer);
        console.log("OCR completed in", Date.now() - startTime, "ms");

        return NextResponse.json({ text: result.data.text });
    } catch (error) {
        console.error("OCR failed:", error);
        return NextResponse.json(
            { error: "Failed to extract text", details: String(error) },
            { status: 500 }
        );
    }
}
