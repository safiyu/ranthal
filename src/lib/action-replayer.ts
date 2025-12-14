import { EditorAction } from "@/types/editor-actions";
import {
    applyFilter,
    applyAdjustments,
    rotateImage,
    flipImage,
    applyBlur,
    applySharpen
} from "./image-effects";
import getCroppedImg from "./crop-utils"; // We might need to adapt this for normalized coords
import { overlayImage } from "./image-processing";

/**
 * Replays a list of actions on a base image.
 * Returns the final processed image as a Data URL.
 */
export async function replayActions(baseImageSrc: string, actions: EditorAction[]): Promise<string> {
    let currentImage = baseImageSrc;

    // We process sequentially
    // Optimization: Some actions like redundant rotations could be merged, but let's stick to simple replay first.

    for (const action of actions) {
        console.log(`Replaying action: ${action.type}`, action);
        try {
            switch (action.type) {
                case 'filter':
                    currentImage = await applyFilter(currentImage, action.filterName);
                    break;
                case 'adjust':
                    currentImage = await applyAdjustments(
                        currentImage,
                        action.brightness,
                        action.contrast,
                        action.saturation
                    );
                    break;
                case 'rotate':
                    currentImage = await rotateImage(currentImage, action.angle);
                    break;
                case 'flip':
                    currentImage = await flipImage(currentImage, action.direction);
                    break;
                case 'blur-sharpen':
                    if (action.blur > 0) {
                        currentImage = await applyBlur(currentImage, action.blur);
                    }
                    if (action.sharpen > 0) {
                        currentImage = await applySharpen(currentImage, action.sharpen / 100);
                    }
                    break;
                case 'crop':
                    // We need to convert normalized coords back to pixel coords for the current image state
                    const img = new Image();
                    img.src = currentImage;
                    await new Promise(resolve => { img.onload = resolve; });

                    const pixelCrop = {
                        x: action.cropData.x * img.width,
                        y: action.cropData.y * img.height,
                        width: action.cropData.width * img.width,
                        height: action.cropData.height * img.height
                    };

                    currentImage = await getCroppedImg(currentImage, pixelCrop);
                    break;
                case 'sticker':
                    const sImg = new Image();
                    sImg.src = currentImage;
                    await new Promise(resolve => { sImg.onload = resolve; });

                    const sX = action.x * sImg.width;
                    const sY = action.y * sImg.height;
                    const sW = action.width * sImg.width;
                    const sH = action.height * sImg.height;

                    currentImage = await overlayImage(currentImage, action.stickerSrc, sX, sY, sW, sH, action.rotation || 0);
                    break;
            }
        } catch (error) {
            console.error(`Failed to replay action ${action.type}:`, error);
            // Continue? Or abort? 
            // Aborting usually safer to avoid weird states, but skipping might be robust.
            // Let's log and continue.
        }
    }

    return currentImage;
}
