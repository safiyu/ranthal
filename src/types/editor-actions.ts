import { FilterName } from "@/lib/image-effects";
import { type Crop } from "react-image-crop";

export type ActionType =
    | 'filter'
    | 'adjust'
    | 'crop'
    | 'rotate'
    | 'flip'
    | 'blur-sharpen'
    | 'sticker'
    | 'markup'
    | 'resize'
    | 'watermark';

export interface BaseAction {
    id: string;
    type: ActionType;
    timestamp: number;
}

export interface FilterAction extends BaseAction {
    type: 'filter';
    filterName: FilterName;
}

export interface AdjustAction extends BaseAction {
    type: 'adjust';
    brightness: number;
    contrast: number;
    saturation: number;
}

export interface CropAction extends BaseAction {
    type: 'crop';
    crop: Crop; // Percentage or Pixel? Typically pixel for processing, but percentage is safer for resolution independence.
    // However, since we have different resolutions (proxy vs original), we MUST use percentages or normalized coordinates
    // OR scale the pixel coordinates when replaying.
    // Let's store Normalized coordinates (0-1) to be resolution independent.
    cropData: {
        x: number; // 0-1
        y: number; // 0-1
        width: number; // 0-1
        height: number; // 0-1
        rotation?: number; // Crop rotation (if separate from image rotation)
    };
}

export interface RotateAction extends BaseAction {
    type: 'rotate';
    angle: number; // Total rotation angle
}

export interface FlipAction extends BaseAction {
    type: 'flip';
    direction: 'horizontal' | 'vertical';
}

export interface BlurSharpenAction extends BaseAction {
    type: 'blur-sharpen';
    blur: number;
    sharpen: number;
}

export interface StickerAction extends BaseAction {
    type: 'sticker';
    stickerSrc: string;
    x: number; // normalized 0-1
    y: number; // normalized 0-1
    width: number; // normalized 0-1
    height: number; // normalized 0-1
    rotation?: number;
}

// Union type
export type EditorAction =
    | FilterAction
    | AdjustAction
    | CropAction
    | RotateAction
    | FlipAction
    | BlurSharpenAction
    | StickerAction;
