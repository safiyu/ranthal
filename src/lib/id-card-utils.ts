export async function createIDCard(frontImageSrc: string, backImageSrc: string, frontScale: number = 1, backScale: number = 1): Promise<string> {
    return new Promise((resolve, reject) => {
        const frontImg = new Image();
        const backImg = new Image();

        // A4 at 150 DPI: 210mm x 297mm -> 1240 x 1754 pixels
        const canvasWidth = 1240;
        const canvasHeight = 1754;
        const margin = 40;
        const gap = 30; // Gap between front and back images

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }

        // Fill white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        let loadedCount = 0;
        const onImageLoad = () => {
            loadedCount++;
            if (loadedCount === 2) {
                // Calculate available space for each image
                const availableWidth = canvasWidth - (margin * 2);
                const availableHeight = (canvasHeight - (margin * 2) - gap) / 2;

                // Draw front image (top half) with scale applied
                const frontDims = fitImageToArea(frontImg.width, frontImg.height, availableWidth * frontScale, availableHeight * frontScale);
                const frontX = margin + (availableWidth - frontDims.width) / 2;
                const frontY = margin + (availableHeight - frontDims.height) / 2;
                ctx.drawImage(frontImg, frontX, frontY, frontDims.width, frontDims.height);

                // Add label for front
                ctx.fillStyle = "#666666";
                ctx.font = "bold 20px Arial";
                ctx.textAlign = "center";
                ctx.fillText("FRONT", canvasWidth / 2, margin + availableHeight + gap / 2 + 7);

                // Draw back image (bottom half) with scale applied
                const backDims = fitImageToArea(backImg.width, backImg.height, availableWidth * backScale, availableHeight * backScale);
                const backX = margin + (availableWidth - backDims.width) / 2;
                const backY = margin + availableHeight + gap + (availableHeight - backDims.height) / 2;
                ctx.drawImage(backImg, backX, backY, backDims.width, backDims.height);

                // Add "BACK" label at bottom
                ctx.fillText("BACK", canvasWidth / 2, canvasHeight - margin + 25);

                // Draw subtle border around each image area
                ctx.strokeStyle = "#e0e0e0";
                ctx.lineWidth = 1;
                ctx.strokeRect(margin, margin, availableWidth, availableHeight);
                ctx.strokeRect(margin, margin + availableHeight + gap, availableWidth, availableHeight);

                resolve(canvas.toDataURL("image/png"));
            }
        };

        frontImg.crossOrigin = "anonymous";
        backImg.crossOrigin = "anonymous";
        frontImg.onload = onImageLoad;
        backImg.onload = onImageLoad;
        frontImg.onerror = reject;
        backImg.onerror = reject;

        frontImg.src = frontImageSrc;
        backImg.src = backImageSrc;
    });
}

// Helper function to fit image within an area while maintaining aspect ratio
function fitImageToArea(imgWidth: number, imgHeight: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
    const imgRatio = imgWidth / imgHeight;
    const areaRatio = maxWidth / maxHeight;

    let width: number;
    let height: number;

    if (imgRatio > areaRatio) {
        // Image is wider than area - fit to width
        width = maxWidth;
        height = maxWidth / imgRatio;
    } else {
        // Image is taller than area - fit to height
        height = maxHeight;
        width = maxHeight * imgRatio;
    }

    return { width, height };
}

