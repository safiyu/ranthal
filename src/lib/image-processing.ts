import { removeBackground } from "@imgly/background-removal";
import Tesseract from "tesseract.js";

export async function removeBg(imageSrc: string): Promise<string> {
    try {
        const blob = await removeBackground(imageSrc);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("BG Removal failed:", error);
        throw new Error("Failed to remove background");
    }
}

export async function extractText(imageSrc: string): Promise<string> {
    try {
        const result = await Tesseract.recognize(imageSrc, 'eng', {
            logger: m => console.log(m)
        });
        return result.data.text;
    } catch (error) {
        console.error("OCR failed:", error);
        throw new Error("Failed to extract text");
    }
}

export async function compressImage(imageSrc: string, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Canvas context failed"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(URL.createObjectURL(blob));
                    } else {
                        reject(new Error("Compression failed"));
                    }
                },
                "image/jpeg",
                quality // 0.1 to 1.0
            );
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}
