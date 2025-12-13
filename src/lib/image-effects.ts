
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

export type { FilterName };
