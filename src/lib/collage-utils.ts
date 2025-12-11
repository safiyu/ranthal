
export type LayoutType =
    | '2-split-v' | '2-split-h'
    | '3-cols' | '3-rows' | '3-left-main' | '3-top-main'
    | '4-grid' | '4-cols' | '4-rows'
    | '5-grid-mixed' | '5-cols';

export interface CollageTransform {
    zoom: number; // 1 to 3
    panX: number; // -1 to 1 (relative to image width)
    panY: number; // -1 to 1 (relative to image height)
}

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

const CANVAS_SIZE = 1200;

const LAYOUTS: Record<string, (width: number, height: number) => Rect[]> = {
    // 2 Images
    '2-split-v': (w, h) => [
        { x: 0, y: 0, w: w / 2, h: h },
        { x: w / 2, y: 0, w: w / 2, h: h }
    ],
    '2-split-h': (w, h) => [
        { x: 0, y: 0, w: w, h: h / 2 },
        { x: 0, y: h / 2, w: w, h: h / 2 }
    ],

    // 3 Images
    '3-cols': (w, h) => [
        { x: 0, y: 0, w: w / 3, h: h },
        { x: w / 3, y: 0, w: w / 3, h: h },
        { x: (w / 3) * 2, y: 0, w: w / 3, h: h }
    ],
    '3-rows': (w, h) => [
        { x: 0, y: 0, w: w, h: h / 3 },
        { x: 0, y: h / 3, w: w, h: h / 3 },
        { x: 0, y: (h / 3) * 2, w: w, h: h / 3 }
    ],
    '3-left-main': (w, h) => [
        { x: 0, y: 0, w: w / 2, h: h },
        { x: w / 2, y: 0, w: w / 2, h: h / 2 },
        { x: w / 2, y: h / 2, w: w / 2, h: h / 2 }
    ],
    '3-top-main': (w, h) => [
        { x: 0, y: 0, w: w, h: h / 2 },
        { x: 0, y: h / 2, w: w / 2, h: h / 2 },
        { x: w / 2, y: h / 2, w: w / 2, h: h / 2 }
    ],

    // 4 Images
    '4-grid': (w, h) => [
        { x: 0, y: 0, w: w / 2, h: h / 2 },
        { x: w / 2, y: 0, w: w / 2, h: h / 2 },
        { x: 0, y: h / 2, w: w / 2, h: h / 2 },
        { x: w / 2, y: h / 2, w: w / 2, h: h / 2 }
    ],
    '4-cols': (w, h) => [
        { x: 0, y: 0, w: w / 4, h: h },
        { x: w / 4, y: 0, w: w / 4, h: h },
        { x: w / 2, y: 0, w: w / 4, h: h },
        { x: (w / 4) * 3, y: 0, w: w / 4, h: h }
    ],
    '4-rows': (w, h) => [
        { x: 0, y: 0, w: w, h: h / 4 },
        { x: 0, y: h / 4, w: w, h: h / 4 },
        { x: 0, y: h / 2, w: w, h: h / 4 },
        { x: 0, y: (h / 4) * 3, w: w, h: h / 4 }
    ],

    // 5 Images
    '5-grid-mixed': (w, h) => [
        { x: 0, y: 0, w: w / 2, h: h / 2 },
        { x: w / 2, y: 0, w: w / 2, h: h / 2 },
        { x: 0, y: h / 2, w: w / 3, h: h / 2 },
        { x: w / 3, y: h / 2, w: w / 3, h: h / 2 },
        { x: (w / 3) * 2, y: h / 2, w: w / 3, h: h / 2 }
    ],
    '5-cols': (w, h) => [
        { x: 0, y: 0, w: w / 5, h: h },
        { x: w / 5, y: 0, w: w / 5, h: h },
        { x: (w / 5) * 2, y: 0, w: w / 5, h: h },
        { x: (w / 5) * 3, y: 0, w: w / 5, h: h },
        { x: (w / 5) * 4, y: 0, w: w / 5, h: h }
    ]
};

export const AVAILABLE_LAYOUTS: Record<number, LayoutType[]> = {
    2: ['2-split-v', '2-split-h'],
    3: ['3-cols', '3-rows', '3-left-main', '3-top-main'],
    4: ['4-grid', '4-cols', '4-rows'],
    5: ['5-grid-mixed', '5-cols']
};

/**
 * Creates a collage from an array of image data URLs
 */
export async function createCollage(images: string[], layoutId: string, transforms: CollageTransform[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
        // Load all images first
        const imagePromises = images.map(src => {
            return new Promise<HTMLImageElement>((resolveImg, rejectImg) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolveImg(img);
                img.onerror = rejectImg;
                img.src = src;
            });
        });

        Promise.all(imagePromises).then(loadedImages => {
            const canvas = document.createElement('canvas');
            canvas.width = CANVAS_SIZE;
            canvas.height = CANVAS_SIZE;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // Fill background white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const getRects = LAYOUTS[layoutId];
            if (!getRects) {
                reject(new Error(`Layout ${layoutId} not found`));
                return;
            }

            const rects = getRects(canvas.width, canvas.height);

            loadedImages.forEach((img, index) => {
                if (index >= rects.length) return;
                const rect = rects[index];


                const transform = transforms[index] || { zoom: 1, panX: 0, panY: 0 };

                // Base Crop Calculation (Object Cover)
                const imgRatio = img.width / img.height;
                const rectRatio = rect.w / rect.h;

                let drawW, drawH, drawX, drawY;

                if (imgRatio > rectRatio) {
                    // Image is wider: Height matches, crop width
                    drawH = img.height;
                    drawW = img.height * rectRatio;
                    drawX = (img.width - drawW) / 2;
                    drawY = 0;
                } else {
                    // Image is taller: Width matches, crop height
                    drawW = img.width;
                    drawH = img.width / rectRatio;
                    drawX = 0;
                    drawY = (img.height - drawH) / 2;
                }

                // Apply Transforms
                // Zoom: effectively draws a smaller portion of the source into the same rect
                // We actually want "Zoom In" to mean we see LESS of the image, so we reduce the source rect size.
                // However, drawImage params are (sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight).
                // To Zoom IN, we REDUCE sWidth/sHeight.

                const zoomFactor = Math.max(0.1, transform.zoom); // Ensure > 0
                const zoomedW = drawW / zoomFactor;
                const zoomedH = drawH / zoomFactor;

                // Center the zoomed area
                let sx = drawX + (drawW - zoomedW) / 2;
                let sy = drawY + (drawH - zoomedH) / 2;

                // Apply Pan
                // panX/Y are relative to the *original* source image size? Or the cropped view?
                // Let's make them relative to the cropped view to feel intuitive.
                sx -= transform.panX * drawW; // Move source window opposite to direction
                sy -= transform.panY * drawH;

                ctx.save();
                ctx.beginPath();
                ctx.rect(rect.x, rect.y, rect.w, rect.h);
                ctx.clip();

                // We draw the calculated sub-rectangle of the source image into the destination rect
                ctx.drawImage(img, sx, sy, zoomedW, zoomedH, rect.x, rect.y, rect.w, rect.h);

                ctx.restore();

                // Optional: Draw subtle border between images
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            });

            resolve(canvas.toDataURL('image/png'));
        }).catch(err => {
            reject(err);
        });
    });
}
