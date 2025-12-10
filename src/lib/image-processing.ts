// Abort controllers for cancelable operations
let bgRemovalController: AbortController | null = null;
let ocrController: AbortController | null = null;

export function cancelBgRemoval() {
    if (bgRemovalController) {
        bgRemovalController.abort();
        bgRemovalController = null;
    }
}

export function cancelOcr() {
    if (ocrController) {
        ocrController.abort();
        ocrController = null;
    }
}

export async function removeBg(imageSrc: string): Promise<string> {
    // Cancel any existing operation
    cancelBgRemoval();
    bgRemovalController = new AbortController();

    try {
        // Convert data URL or URL to Blob
        let blob: Blob;
        const fetchResponse = await fetch(imageSrc);
        blob = await fetchResponse.blob();

        // Send to server API
        const formData = new FormData();
        formData.append('image', blob, 'image.png');

        const response = await fetch('/api/remove-bg', {
            method: 'POST',
            body: formData,
            signal: bgRemovalController.signal,
        });

        if (!response.ok) {
            throw new Error('Server processing failed');
        }

        const resultBlob = await response.blob();
        bgRemovalController = null;
        return URL.createObjectURL(resultBlob);
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            throw new Error('Operation cancelled');
        }
        console.error("BG Removal failed:", error);
        throw new Error("Failed to remove background");
    }
}

export async function extractText(imageSrc: string): Promise<string> {
    // Cancel any existing operation
    cancelOcr();
    ocrController = new AbortController();

    try {
        // Convert data URL or URL to Blob
        let blob: Blob;
        const fetchResponse = await fetch(imageSrc);
        blob = await fetchResponse.blob();

        // Send to server API
        const formData = new FormData();
        formData.append('image', blob, 'image.png');

        const response = await fetch('/api/ocr', {
            method: 'POST',
            body: formData,
            signal: ocrController.signal,
        });

        if (!response.ok) {
            throw new Error('OCR processing failed');
        }

        const result = await response.json();
        ocrController = null;
        return result.text;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            throw new Error('Operation cancelled');
        }
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
