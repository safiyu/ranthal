import EXIF from 'exif-js';

/**
 * Remaster image using auto-levels (contrast), saturation boost, and sharpening
 */
export async function remasterImage(imageSrc: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // 1. Auto-Levels (Histogram Stretching)
            let minR = 255, minG = 255, minB = 255;
            let maxR = 0, maxG = 0, maxB = 0;

            // Find min/max values
            for (let i = 0; i < data.length; i += 4) {
                minR = Math.min(minR, data[i]);
                minG = Math.min(minG, data[i + 1]);
                minB = Math.min(minB, data[i + 2]);
                maxR = Math.max(maxR, data[i]);
                maxG = Math.max(maxG, data[i + 1]);
                maxB = Math.max(maxB, data[i + 2]);
            }

            // Apply stretching
            for (let i = 0; i < data.length; i += 4) {
                data[i] = (data[i] - minR) * (255 / (maxR - minR));
                data[i + 1] = (data[i + 1] - minG) * (255 / (maxG - minG));
                data[i + 2] = (data[i + 2] - minB) * (255 / (maxB - minB));
            }

            // 2. Saturation Boost (approx +15%)
            const saturationScale = 1.15;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b; // rec601 luma

                data[i] = Math.min(255, Math.max(0, gray + (r - gray) * saturationScale));
                data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * saturationScale));
                data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * saturationScale));
            }

            // Put data back for sharpening
            ctx.putImageData(imageData, 0, 0);

            // 3. Smart Sharpen (Mild)
            // We can reuse the existing applySharpen function logic or just call it if we could compose promises.
            // But since we are already in a canvas context, let's apply a mild sharpen kernel directly here for speed.
            // Kernel for mild sharpen:
            //  0 -0.5  0
            // -0.5  3 -0.5
            //  0 -0.5  0
            // Actually, let's use the same kernel as applySharpen but with small amount (0.5)
            // Or simpler: just continue modifying the imageData buffer (but sharpening needs neighbors).
            // For simplicity and to avoid implementing convolution again in same buffer (complex),
            // let's just resolve with what we have (Auto-levels + Saturation)
            // AND THEN chain the applySharpen from the caller?
            // No, "Remaster" should be one-click.
            // Let's implement a quick sharpen pass on a copy of the buffer.

            const sharpAmount = 0.5;
            const width = canvas.width;
            const height = canvas.height;
            const inputData = new Uint8ClampedArray(data); // Copy of current state (Levels + Saturation)

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;

                    // Simple sharpen kernel
                    //  0 -1  0
                    // -1  5 -1
                    //  0 -1  0
                    // Blended with original by sharpAmount

                    for (let c = 0; c < 3; c++) {
                        const val = inputData[idx + c];
                        const up = inputData[((y - 1) * width + x) * 4 + c];
                        const down = inputData[((y + 1) * width + x) * 4 + c];
                        const left = inputData[(y * width + (x - 1)) * 4 + c];
                        const right = inputData[(y * width + (x + 1)) * 4 + c];

                        const laplace = val * 5 - (up + down + left + right); // This is a strong sharpen

                        // Mix original with sharpened
                        data[idx + c] = Math.min(255, Math.max(0, val + (laplace - val) * sharpAmount));
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

type FilterName = 'none' | 'grayscale' | 'sepia' | 'vintage' | 'warm' | 'cool' | 'highContrast' | 'noir' | 'fade' | 'kodak' | 'technicolor' | 'polaroid' | 'dramatic' | 'golden' | 'cyberpunk' | 'clarendon' | 'gingham' | 'juno' | 'lark' | 'ludwig' | 'valencia' | 'moon' | 'reyes' | 'slumber' | 'crema' | 'aden' | 'perpetua' | 'oldCinema' | 'retro' | 'twilight' | 'sunset' | 'forest' | 'rust';

// Preset filter definitions
export const FILTER_PRESETS: Record<FilterName, string> = {
    none: 'none',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    vintage: 'sepia(50%) contrast(90%) brightness(90%)',
    warm: 'sepia(30%) saturate(120%) brightness(105%)',
    cool: 'saturate(80%) hue-rotate(20deg) brightness(95%)',
    highContrast: 'contrast(150%) saturate(110%)',
    noir: 'grayscale(100%) contrast(120%) brightness(90%)',
    fade: 'contrast(80%) brightness(110%) saturate(80%)',
    kodak: 'sepia(20%) saturate(160%) contrast(110%) brightness(105%)',
    technicolor: 'saturate(200%) contrast(130%) hue-rotate(-10deg)',
    polaroid: 'contrast(110%) brightness(110%) grayscale(20%) sepia(20%)',
    dramatic: 'contrast(140%) grayscale(30%) brightness(90%)',
    golden: 'sepia(40%) saturate(150%) brightness(110%) contrast(110%)',
    cyberpunk: 'hue-rotate(180deg) saturate(200%) contrast(130%)',
    clarendon: 'sepia(10%) contrast(120%) brightness(125%) saturate(135%)',
    gingham: 'sepia(10%) hue-rotate(-10deg) brightness(105%) contrast(110%) saturate(80%)',
    juno: 'sepia(30%) contrast(115%) brightness(110%) saturate(140%) hue-rotate(-10deg)',
    lark: 'contrast(90%) brightness(120%) saturate(110%)',
    ludwig: 'sepia(10%) contrast(105%) brightness(105%) saturate(180%)',
    valencia: 'sepia(25%) contrast(108%) brightness(108%)',
    moon: 'grayscale(100%) brightness(110%) contrast(110%)',
    reyes: 'sepia(22%) brightness(110%) contrast(85%) saturate(75%)',
    slumber: 'sepia(35%) contrast(125%) saturate(125%)',
    crema: 'sepia(50%) contrast(125%) saturate(90%) hue-rotate(-2deg)',
    aden: 'hue-rotate(-20deg) contrast(90%) saturate(85%) brightness(120%)',
    perpetua: 'contrast(110%) brightness(110%) saturate(110%)',
    oldCinema: 'grayscale(90%) contrast(160%) brightness(85%) sepia(20%)',
    retro: 'sepia(40%) saturate(140%) contrast(110%) brightness(95%)',
    twilight: 'sepia(40%) hue-rotate(180deg) saturate(140%) contrast(110%)',
    sunset: 'sepia(30%) saturate(160%) hue-rotate(-10deg) contrast(110%)',
    forest: 'sepia(20%) brightness(95%) contrast(110%) saturate(120%) hue-rotate(60deg)',
    rust: 'sepia(50%) saturate(150%) contrast(130%) hue-rotate(-20deg)',
};

/**
 * Apply a preset filter to an image
 */
export async function applyFilter(imageSrc: string, filterName: FilterName): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            if (filterName !== 'none' && FILTER_PRESETS[filterName]) {
                ctx.filter = FILTER_PRESETS[filterName];
            } else {
                ctx.filter = 'none';
            }

            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Apply brightness, contrast, and saturation adjustments
 */
export async function applyAdjustments(
    imageSrc: string,
    brightness: number,  // 50-150, default 100
    contrast: number,    // 50-150, default 100
    saturation: number   // 0-200, default 100
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Rotate image by 90, 180, or 270 degrees
 */
export async function rotateImage(imageSrc: string, angle: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            const rads = (angle * Math.PI) / 180;
            const c = Math.cos(rads);
            const s = Math.sin(rads);

            // Calculate new bounding box
            const newWidth = Math.abs(img.width * c) + Math.abs(img.height * s);
            const newHeight = Math.abs(img.width * s) + Math.abs(img.height * c);

            canvas.width = newWidth;
            canvas.height = newHeight;

            ctx.translate(newWidth / 2, newHeight / 2);
            ctx.rotate(rads);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Flip image horizontally or vertically
 */
export async function flipImage(imageSrc: string, direction: 'horizontal' | 'vertical'): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            if (direction === 'horizontal') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            } else {
                ctx.translate(0, canvas.height);
                ctx.scale(1, -1);
            }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Apply blur effect
 */
export async function applyBlur(imageSrc: string, amount: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.filter = `blur(${amount}px)`;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Apply sharpening using convolution
 */
export async function applySharpen(imageSrc: string, amount: number = 1): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            // Sharpen kernel
            const kernel = [
                0, -amount, 0,
                -amount, 1 + 4 * amount, -amount,
                0, -amount, 0
            ];

            const output = new Uint8ClampedArray(data.length);

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    for (let c = 0; c < 3; c++) { // RGB channels only
                        let sum = 0;
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                                sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                            }
                        }
                        output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
                    }
                    output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]; // Alpha
                }
            }

            // Copy output back
            for (let i = 0; i < data.length; i++) {
                imageData.data[i] = output[i] || data[i];
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Fix red-eye at a clicked point
 */
export async function fixRedEye(imageSrc: string, clickX: number, clickY: number, radius: number = 15): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;

            // Process pixels within radius of click point
            for (let y = Math.max(0, clickY - radius); y < Math.min(canvas.height, clickY + radius); y++) {
                for (let x = Math.max(0, clickX - radius); x < Math.min(canvas.width, clickX + radius); x++) {
                    const dist = Math.sqrt((x - clickX) ** 2 + (y - clickY) ** 2);
                    if (dist <= radius) {
                        const idx = (y * width + x) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];

                        // Check if pixel is "red" (high red, low green and blue)
                        if (r > 80 && r > g * 1.5 && r > b * 1.5) {
                            // Desaturate the red
                            const avg = (r + g + b) / 3;
                            data[idx] = avg * 0.5;     // Reduce red significantly
                            data[idx + 1] = g;         // Keep green
                            data[idx + 2] = b + 20;    // Slight blue boost
                        }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}
/**
 * Add WhatsApp-style white outline/stroke around a sticker
 * This creates a clean, professional sticker look
 */
export async function cartoonize(imageSrc: string, strokeWidth: number = 6): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Create canvas with extra space for the outline
            const padding = strokeWidth * 2;
            const canvas = document.createElement('canvas');
            canvas.width = img.width + padding * 2;
            canvas.height = img.height + padding * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw the original image to get its alpha channel
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) {
                reject(new Error('Could not get temp canvas context'));
                return;
            }
            tempCtx.drawImage(img, 0, 0);

            // Create the white outline by drawing the image multiple times with offsets
            ctx.fillStyle = 'white';

            // Draw white silhouette in a circle around the original position
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const offsetX = Math.cos(angle) * strokeWidth;
                const offsetY = Math.sin(angle) * strokeWidth;

                // Draw white version
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(tempCanvas, padding + offsetX, padding + offsetY);
            }

            // Get the outline shape and fill it white
            const outlineData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < outlineData.data.length; i += 4) {
                if (outlineData.data[i + 3] > 0) {
                    // If pixel has any opacity, make it white
                    outlineData.data[i] = 255;     // R
                    outlineData.data[i + 1] = 255; // G
                    outlineData.data[i + 2] = 255; // B
                }
            }
            ctx.putImageData(outlineData, 0, 0);

            // Draw the original image on top (centered)
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(img, padding, padding);

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Fix image orientation based on EXIF data
 */
export async function fixImageOrientation(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            EXIF.getData(img as any, function (this: any) {
                const orientation = EXIF.getTag(this, "Orientation");
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas context failed'));
                    return;
                }

                if (!orientation || orientation === 1) {
                    resolve(URL.createObjectURL(file));
                    return;
                }

                const width = img.width;
                const height = img.height;

                if (orientation > 4 && orientation < 9) {
                    canvas.width = height;
                    canvas.height = width;
                } else {
                    canvas.width = width;
                    canvas.height = height;
                }

                switch (orientation) {
                    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
                    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
                    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
                    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
                    case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
                    case 7: ctx.transform(0, -1, -1, 0, height, width); break;
                    case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
                    default: break;
                }

                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            });
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Trim transparent borders from an image (Auto-crop to content)
 * "Take image around the face"
 */
export async function trimTransparency(imageSrc: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context failed'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Find bounds
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            let found = false;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const alpha = data[(y * canvas.width + x) * 4 + 3];
                    if (alpha > 10) { // Threshold for "visible" pixel
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        found = true;
                    }
                }
            }

            if (!found) {
                resolve(imageSrc); // Empty image
                return;
            }

            // Add small padding
            const padding = 10;
            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(canvas.width, maxX + padding);
            maxY = Math.min(canvas.height, maxY + padding);

            const width = maxX - minX;
            const height = maxY - minY;

            const trimmedCanvas = document.createElement('canvas');
            trimmedCanvas.width = width;
            trimmedCanvas.height = height;
            const trimmedCtx = trimmedCanvas.getContext('2d');

            if (trimmedCtx) {
                trimmedCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
                resolve(trimmedCanvas.toDataURL('image/png'));
            } else {
                resolve(imageSrc);
            }
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Cleanup remaining noise/artifacts from background removal
 * Removes small isolated pixels and semi-transparent edges
 */
export async function cleanupNoise(imageSrc: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context failed'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            // 1. Hard threshold for alpha to remove faint shadows
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 50) { // If alpha < 50 (out of 255), make it fully transparent
                    data[i + 3] = 0;
                } else {
                    // Make slightly transparent pixels fully opaque if they are "solid enough"
                    // This helps the outline from looking messy
                    if (data[i + 3] > 200) data[i + 3] = 255;
                }
            }

            // 2. Simple Despeckle (remove single pixels)
            // Iterate and check neighbors. If pixel is opaque but has no opaque neighbors, kill it.
            const dataCopy = new Uint8ClampedArray(data);

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    if (dataCopy[idx + 3] > 0) {
                        let neighbors = 0;
                        // Check 8 neighbors
                        if (dataCopy[idx - 4 + 3] > 0) neighbors++; // Left
                        if (dataCopy[idx + 4 + 3] > 0) neighbors++; // Right
                        if (dataCopy[((y - 1) * width + x) * 4 + 3] > 0) neighbors++; // Up
                        if (dataCopy[((y + 1) * width + x) * 4 + 3] > 0) neighbors++; // Down

                        // If very isolated, remove it
                        if (neighbors < 2) {
                            data[idx + 3] = 0;
                        }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

/**
 * Advanced Noise Removal: Keep only the largest connected component
 * This removes all isolated "islands" of noise, leaving only the main subject.
 */
export async function removeIsolatedComponents(imageSrc: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context failed'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            // Connected Component Labeling using simple BFS/FloodFill
            const visited = new Uint8Array(width * height);
            const components: { id: number, size: number, pixels: number[] }[] = [];
            let currentLabel = 1;

            // Helper for pixel index
            const getIdx = (x: number, y: number) => y * width + x;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = getIdx(x, y);

                    // If pixel is visible and not visited
                    if (data[idx * 4 + 3] > 20 && visited[idx] === 0) {
                        // Start a new component
                        const componentPixels: number[] = [];
                        const queue = [idx];
                        visited[idx] = 1;
                        let size = 0;

                        while (queue.length > 0) {
                            const currentIdx = queue.pop()!;
                            componentPixels.push(currentIdx);
                            size++;

                            const cx = currentIdx % width;
                            const cy = Math.floor(currentIdx / width);

                            // Check 4 neighbors
                            const neighbors = [
                                { nx: cx + 1, ny: cy },
                                { nx: cx - 1, ny: cy },
                                { nx: cx, ny: cy + 1 },
                                { nx: cx, ny: cy - 1 }
                            ];

                            for (const { nx, ny } of neighbors) {
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                    const nIdx = getIdx(nx, ny);
                                    if (visited[nIdx] === 0 && data[nIdx * 4 + 3] > 20) {
                                        visited[nIdx] = 1;
                                        queue.push(nIdx);
                                    }
                                }
                            }
                        }

                        if (size > 0) {
                            components.push({ id: currentLabel, size, pixels: componentPixels });
                            currentLabel++;
                        }
                    }
                }
            }

            // Find the largest component
            if (components.length > 0) {
                components.sort((a, b) => b.size - a.size);
                const largest = components[0];

                // Keep only the largest component, erase others
                // Actually, since we want to erase others, let's just build a mask
                // But efficient way: 
                // 1. Create a set of "kept" pixels from the largest component
                // 2. Iterate image, if pixel index not in set, set alpha to 0

                // Better: Create blank alpha channel, fill in only largest component
                const newData = new Uint8ClampedArray(data.length);

                // Copy ONLY the pixels of the largest component
                for (const pIdx of largest.pixels) {
                    newData[pIdx * 4] = data[pIdx * 4];         // R
                    newData[pIdx * 4 + 1] = data[pIdx * 4 + 1]; // G
                    newData[pIdx * 4 + 2] = data[pIdx * 4 + 2]; // B
                    newData[pIdx * 4 + 3] = data[pIdx * 4 + 3]; // A
                }

                // Replace image data
                for (let i = 0; i < newData.length; i++) {
                    data[i] = newData[i];
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

export type { FilterName };
