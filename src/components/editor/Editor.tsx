"use client";

import { useRef, useState, useEffect, useCallback, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { Slider } from "@/components/ui/Slider";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
    Crop as CropIcon,
    Wand2,
    Sliders,
    Type,
    RotateCcw,
    RotateCw,
    FlipHorizontal,
    FlipVertical,
    Image as ImageIcon,
    Download,
    X,
    Undo,
    Redo,
    ZoomIn,
    ZoomOut,
    ArrowUpDown,
    LayoutGrid,
    Plus,
    CreditCard,
    Minimize2,
    Droplets,
    Zap,
    FileText,
    Check,
    ArrowRight,
    Shuffle,
    Hand,
    Palette,
    SlidersHorizontal,
    Layers,
    ScanText,
    Eye,
    FileType,
    Pencil,
    Save,
    Highlighter,
    Eraser,
    Filter,
    Focus,
    QrCode,
    Sparkles
} from "lucide-react";
import { saveEdit } from "@/app/actions";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { removeBg, extractText, compressImage, cancelBgRemoval, cancelOcr } from "@/lib/image-processing";
import { createIDCard } from "@/lib/id-card-utils";
import { createCollage, AVAILABLE_LAYOUTS, type LayoutType, type CollageTransform } from "@/lib/collage-utils";
import getCroppedImg from "@/lib/crop-utils";
import { applyFilter, applyAdjustments, rotateImage, flipImage, applyBlur, applySharpen, fixRedEye, remasterImage, type FilterName, FILTER_PRESETS } from "@/lib/image-effects";
import { useToast } from "@/components/Toast";
import { jsPDF } from "jspdf";
import EXIF from "exif-js";
import { generateQRCode, formatWifi, formatVCard, formatSms, formatEmail, formatPhone, formatGeo } from "@/lib/qr-utils";
import { STICKER_CATEGORIES, emojiToDataURL } from "@/lib/sticker-utils";
import { overlayImage } from "@/lib/image-processing";
import { Sticker as StickerIcon } from "lucide-react";

type Tool = "bg-remove" | "crop" | "ocr" | "id-card" | "compress" | "convert" | "filters" | "social-filters" | "adjust" | "transform" | "blur" | "redeye" | "draw" | "hand" | "collage" | "qr-code" | "sticker" | "remaster";
type DrawingMode = "pen" | "highlighter" | "eraser";



// Helper to convert data URL to Blob
const dataURLtoBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

// Helper to convert any image source to a Blob
const imageToBlob = async (imageSrc: string): Promise<Blob> => {
    // If it's already a data URL, use the existing method
    if (imageSrc.startsWith('data:')) {
        return dataURLtoBlob(imageSrc);
    }

    // Otherwise, fetch the image and convert to blob
    const response = await fetch(imageSrc);
    return await response.blob();
};

import { useEditorState, generateProxy } from "@/context/EditorContext";
import { type EditorAction, type FilterAction } from "@/types/editor-actions";
import { replayActions } from "@/lib/action-replayer";

export function Editor() {
    const { showToast } = useToast();
    const { imageState, pushState, undo, redo, canUndo, canRedo } = useEditorState();
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Crop State
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    // View Zoom State (for image display)
    const [viewZoom, setViewZoom] = useState(100);

    // Pan State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // OCR State
    const [extractedText, setExtractedText] = useState("");

    // Compression State
    const [compressionQuality, setCompressionQuality] = useState(90);

    // ID Card State - Front and Back images
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [frontScale, setFrontScale] = useState(100); // % scale for front image
    const [backScale, setBackScale] = useState(100); // % scale for back image

    // Format Conversion State
    const [selectedFormat, setSelectedFormat] = useState<"png" | "jpeg" | "webp" | "pdf">("png");

    // Filters State
    const [selectedFilter, setSelectedFilter] = useState<FilterName>("none");

    // Adjustments State
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [rotation, setRotation] = useState(0);

    // Blur/Sharpen State
    const [blurAmount, setBlurAmount] = useState(0);
    const [sharpenAmount, setSharpenAmount] = useState(0);

    // Drawing State
    const [drawingMode, setDrawingMode] = useState<DrawingMode>("pen");
    const [brushColor, setBrushColor] = useState("#ff0000");
    const [brushSize, setBrushSize] = useState(5);
    const [highlighterOpacity, setHighlighterOpacity] = useState(0.5);
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const activeStrokePoints = useRef<{ x: number, y: number }[]>([]);

    // Collage State
    const [collageImages, setCollageImages] = useState<string[]>([]);
    const [activeLayout, setActiveLayout] = useState<LayoutType | null>(null);
    const [collageTransforms, setCollageTransforms] = useState<CollageTransform[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number>(0);

    // QR Code State
    const [qrText, setQrText] = useState("");
    const [qrType, setQrType] = useState<"text" | "url" | "wifi" | "contact" | "phone" | "email" | "sms" | "geo">("text");
    const [qrData, setQrData] = useState<any>({});
    const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(null);
    const [qrPosition, setQrPosition] = useState({ x: 0, y: 0 });
    const [qrSize, setQrSize] = useState(200);

    // Sticker State
    const [activeSticker, setActiveSticker] = useState<string | null>(null);
    const [stickerPos, setStickerPos] = useState({ x: 0, y: 0 });
    const [stickerSize, setStickerSize] = useState(200);
    const [stickerRotation, setStickerRotation] = useState(0);
    const [activeStickerTab, setActiveStickerTab] = useState(STICKER_CATEGORIES[0].id);

    // Preview State (for real-time collage/adjustments before commit)
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    // Comparison State
    const [isComparing, setIsComparing] = useState(false);
    const [compareSnapshot, setCompareSnapshot] = useState<string | null>(null);

    // Ref for imageState to avoid stale closures in callbacks
    const imageStateRef = useRef(imageState);
    useEffect(() => {
        imageStateRef.current = imageState;
    }, [imageState]);

    // Derived State
    // If comparing, show the SNAPSHOT (or last committed/original if no snapshot).
    // If not comparing, show preview first, then processed, then original.
    // "Before" = compareSnapshot || imageState.processedSrc || imageState.src
    // "After" = previewSrc
    // Derived State
    const baseImage = imageState?.processedSrc || imageState?.src;

    // Ref to track latest baseImage without closure staleness during callbacks
    const baseImageRef = useRef(baseImage);
    useEffect(() => {
        baseImageRef.current = baseImage;
    }, [baseImage]);

    // Logic: 
    // Comparing? -> Show Snapshot (if exists) or Base (fallback).
    // Not Comparing? -> Show Preview (if exists) or Base (fallback).
    const currentImage = isComparing
        ? (compareSnapshot || baseImage)
        : (previewSrc || baseImage);

    // Snapshot Effect REDUNDANT - Removed in favor of explicit handler

    // Explicit Tool Activation Handler
    const activateTool = (tool: Tool) => {
        const currentBase = baseImageRef.current;
        console.log(`[${Date.now()}] activateTool called for: ${tool}`);
        console.log(`[${Date.now()}] activateTool: baseImageRef length:`, currentBase ? currentBase.length : 'null');
        console.log(`[${Date.now()}] activateTool: imageState.processedSrc length:`, imageState?.processedSrc ? imageState.processedSrc.length : 'null');

        // 1. Capture Snapshot (if applicable)
        if (!['crop', 'compress', 'convert', 'resize', 'id-card', 'hand'].includes(tool)) {
            if (currentBase) {
                setCompareSnapshot(currentBase);
            }
        } else {
            setCompareSnapshot(null);
        }

        // 2. Clear Preview & Reset Tool States
        setPreviewSrc(null);
        setIsComparing(false);

        // Reset ALL effect tool states to clear lingering effects
        setSelectedFilter('none');
        setBlurAmount(0);
        setSharpenAmount(0);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setRotation(0);

        // 3. Set Active Tool
        setActiveTool(tool);
    };

    // Cursor State
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [showCursor, setShowCursor] = useState(false);
    const [imageScale, setImageScale] = useState(1);

    // Update image scale for cursor sizing
    // Update image scale for cursor sizing
    const updateImageScale = useCallback(() => {
        if (imageRef.current) {
            const { width } = imageRef.current.getBoundingClientRect();
            const naturalWidth = imageRef.current.naturalWidth;
            if (naturalWidth > 0) {
                setImageScale(width / naturalWidth);
            }
        }
    }, []);

    // Live Preview for Blur/Sharpen
    useEffect(() => {
        if (activeTool !== 'blur') {
            if (previewSrc && (blurAmount > 0 || sharpenAmount > 0)) {
                setPreviewSrc(null); // Cleanup if tool changed but preview remained
            }
            return;
        }

        const baseImage = imageState?.processedSrc || imageState?.src;
        if (!baseImage) return;

        // Debounce preview generation
        const timer = setTimeout(async () => {
            if (blurAmount === 0 && sharpenAmount === 0) {
                setPreviewSrc(null);
                return;
            }

            try {
                let result = baseImage;
                if (blurAmount > 0) {
                    result = await applyBlur(result, blurAmount);
                }
                if (sharpenAmount > 0) {
                    result = await applySharpen(result, sharpenAmount / 100);
                }
                setPreviewSrc(result);
            } catch (e) {
                console.error("Preview generation failed", e);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [activeTool, blurAmount, sharpenAmount, imageState]);

    // Auto-resize canvas when window resizes
    useEffect(() => {
        updateImageScale();
        window.addEventListener('resize', updateImageScale);
        return () => window.removeEventListener('resize', updateImageScale);
    }, [currentImage, activeTool, updateImageScale]);


    // CSS Filter string for real-time preview
    const getPreviewFilter = () => {
        // If comparing, we want to see the RAW snapshot/original without any overlays
        if (isComparing) return 'none';

        const filters = [];

        // Only apply CSS filter preset if we are NOT viewing a baked preview of it.
        // If (activeTool is filters/social) AND (previewSrc is set), it means previewSrc has the filter baked in.
        // So we skip adding the CSS filter to avoid double application.
        const isBakedPreview = (activeTool === 'filters' || activeTool === 'social-filters') && previewSrc;

        if (selectedFilter !== 'none' && FILTER_PRESETS[selectedFilter] && !isBakedPreview) {
            filters.push(FILTER_PRESETS[selectedFilter]);
        }
        if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
        if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
        if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
        if (blurAmount > 0) filters.push(`blur(${blurAmount / 10}px)`);

        // Note: Sharpen creates a new image instead of CSS filter
        return filters.join(' ');
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                pushState({
                    src: reader.result as string,
                    processedSrc: null,
                });
            };
            reader.readAsDataURL(file);
        }
    }, [pushState]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });

    // ID Card Back Image Drop
    const onDropBackImage = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setBackImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    }, []);
    const { getRootProps: getBackImageProps, getInputProps: getBackImageInputProps } = useDropzone({
        onDrop: onDropBackImage,
        accept: { 'image/*': [] },
        maxFiles: 1
    });

    // Collage Image Drop
    const onDropCollage = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                setCollageImages(prev => {
                    if (prev.length >= 5) return prev; // Limit to 5
                    // Add default transform for new image
                    setCollageTransforms(t => [...t, { zoom: 1, panX: 0, panY: 0 }]);
                    return [...prev, reader.result as string];
                });
            };
            reader.readAsDataURL(file);
        });
    }, []);
    const { getRootProps: getCollageProps, getInputProps: getCollageInputProps } = useDropzone({
        onDrop: onDropCollage,
        accept: { 'image/*': [] },
        maxFiles: 5
    });



    // Auto-generate collage preview
    useEffect(() => {
        if (activeTool === 'collage' && activeLayout && collageImages.length >= 2) {
            const generatePreview = async () => {
                try {
                    const preview = await createCollage(collageImages, activeLayout, collageTransforms);
                    setPreviewSrc(preview);
                } catch (e) {
                    console.error("Preview generation failed", e);
                }
            };
            generatePreview();
        } else {
            setPreviewSrc(null);
        }
    }, [activeTool, activeLayout, collageImages, collageTransforms]);

    // Set front image when main image is uploaded
    const handleSetFrontImage = useCallback(() => {
        if (currentImage && !frontImage) {
            setFrontImage(currentImage);
        }
    }, [currentImage, frontImage]);

    // Swap front and back images
    const handleSwapImages = () => {
        const temp = frontImage;
        setFrontImage(backImage);
        setBackImage(temp);
    };

    // Clear drawing canvas when image changes (e.g. undo/redo) to prevent ghost strokes
    useEffect(() => {
        if (activeTool === 'draw' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    }, [currentImage, activeTool]);

    const handleBgRemove = async () => {
        if (!imageState) return;
        setIsProcessing(true);
        try {
            const source = imageState.originalSrc || imageState.src;
            if (!source) return;

            // Replay actions to preserve previous edits (Rotate -> BgRemove -> Correct)
            const hasActions = imageState.actions && imageState.actions.length > 0;
            const inputForAI = hasActions
                ? await replayActions(source, imageState.actions!)
                : source;

            const newOriginal = await removeBg(inputForAI);
            const newProxy = await generateProxy(newOriginal);

            pushState({
                src: newProxy, // Display proxy
                originalSrc: newOriginal,
                proxySrc: newProxy,
                processedSrc: newProxy,
                actions: [] // Reset actions
            });
        } catch (err) {
            // Don't show error if operation was cancelled
            if ((err as Error).message !== 'Operation cancelled') {
                showToast("Error removing background", "error");
            }
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    };



    const handleRemaster = async () => {
        if (!imageState) return;
        setIsProcessing(true);
        try {
            const source = imageState.originalSrc || imageState.src;
            if (!source) return;

            // Replay existing actions first to bake them in?
            // If we don't, Remaster will run on raw original, ignoring previous edits.
            // Usually Remaster is done early. But if late, we should Baking.
            const hasActions = imageState.actions && imageState.actions.length > 0;
            const inputForRemaster = hasActions
                ? await replayActions(source, imageState.actions!)
                : source;

            const newOriginal = await remasterImage(inputForRemaster);
            const newProxy = await generateProxy(newOriginal);

            pushState({
                src: newProxy,
                originalSrc: newOriginal,
                proxySrc: newProxy,
                processedSrc: newProxy,
                actions: []
            });
            showToast("Remaster successful", "success");
        } catch (err) {
            showToast("Remaster failed", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    };



    const handleCrop = async () => {
        if (!imageState || !currentImage || !croppedAreaPixels || !imgRef.current) return;
        setIsProcessing(true);
        try {
            // Calculate Normalized Crop for Resolution Independence
            const image = imgRef.current;
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;

            // croppedAreaPixels is in DISPLAY PIXELS scaled to match natural size?
            // "onComplete... setCroppedAreaPixels... c.x * scaleX"
            // Yes, croppedAreaPixels are in NATURAL image pixels of the CURRENT (proxy) image.

            const normalizedCrop = {
                x: croppedAreaPixels.x / naturalWidth,
                y: croppedAreaPixels.y / naturalHeight,
                width: croppedAreaPixels.width / naturalWidth,
                height: croppedAreaPixels.height / naturalHeight
            };

            const action: EditorAction = {
                type: 'crop',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                crop: crop as Crop, // Saving generic crop for reference
                cropData: normalizedCrop
            };

            const newActions = [...(imageState.actions || []), action];
            const croppedImage = await getCroppedImg(currentImage, croppedAreaPixels);

            pushState({ ...imageState, processedSrc: croppedImage, actions: newActions });
            setActiveTool(null);
        } catch (e) {
            console.error(e);
            showToast("Crop failed", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateIDCard = async () => {
        if (!frontImage || !backImage) return;
        setIsProcessing(true);
        try {
            // Flattening Strategy
            // ID Card is a new composition.
            const newOriginal = await createIDCard(frontImage, backImage, frontScale / 100, backScale / 100);
            const newProxy = await generateProxy(newOriginal);

            pushState({
                src: newProxy,
                originalSrc: newOriginal,
                proxySrc: newProxy,
                processedSrc: newProxy,
                actions: []
            });
        } catch (err) {
            showToast("Error creating ID Card", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
            setFrontImage(null);
            setBackImage(null);
            setFrontScale(100);
            setBackScale(100);
        }
    };

    const handleCompress = async () => {
        if (!imageState) return;
        setIsProcessing(true);
        try {
            // Flattening Strategy
            // Compression changes the fundamental image data/artifacts.
            const source = imageState.originalSrc || imageState.src;
            if (!source) return;

            const hasActions = imageState.actions && imageState.actions.length > 0;
            const inputComp = hasActions
                ? await replayActions(source, imageState.actions!)
                : source;

            const newOriginal = await compressImage(inputComp, compressionQuality / 100);
            const newProxy = await generateProxy(newOriginal);

            pushState({
                src: newProxy,
                originalSrc: newOriginal,
                proxySrc: newProxy,
                processedSrc: newProxy,
                actions: []
            });
        } catch (err) {
            showToast("Compression failed", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    }

    const handleConvert = async (format: "png" | "jpeg" | "webp" | "pdf") => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const img = new Image();
            img.src = currentImage;
            await new Promise((resolve) => { img.onload = resolve; });

            // Handle PDF Export
            if (format === "pdf") {
                // Determine orientation based on EXIF data
                // We use a temp canvas to "bake in" the rotation if needed
                let sourceImage = img;
                let srcWidth = img.width;
                let srcHeight = img.height;

                // Helper to get EXIF orientation
                const getOrientation = (file: Blob): Promise<number> => {
                    return new Promise((resolve) => {
                        EXIF.getData(file as any, function (this: any) {
                            const orientation = EXIF.getTag(this, "Orientation");
                            resolve(orientation || 1);
                        });
                    });
                };

                const blob = dataURLtoBlob(currentImage);
                const orientation = await getOrientation(blob);

                // If orientation is not normal (1), draw to canvas to normalize it
                if (orientation > 1) {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        const width = img.width;
                        const height = img.height;

                        if ([5, 6, 7, 8].includes(orientation)) {
                            canvas.width = height;
                            canvas.height = width;
                        } else {
                            canvas.width = width;
                            canvas.height = height;
                        }

                        // Apply transforms based on orientation
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

                        // Use this canvas as the source image
                        // We convert back to image to easily use with jsPDF
                        const normalizedData = canvas.toDataURL("image/png");
                        const normalizedImg = new Image();
                        normalizedImg.src = normalizedData;
                        await new Promise(resolve => normalizedImg.onload = resolve);
                        sourceImage = normalizedImg;
                        srcWidth = normalizedImg.width;
                        srcHeight = normalizedImg.height;
                    }
                }

                // Determine PDF orientation based on (possibly normalized) image dimensions
                const pdfOrientation = srcWidth > srcHeight ? 'l' : 'p';
                const pdf = new jsPDF({
                    orientation: pdfOrientation,
                    unit: 'mm'
                });

                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 10;

                // Calculate dimensions to fit within margins while maintaining aspect ratio
                const maxWidth = pageWidth - (margin * 2);
                const maxHeight = pageHeight - (margin * 2);

                const imgRatio = srcWidth / srcHeight;
                const pageRatio = maxWidth / maxHeight;

                let finalWidth, finalHeight;

                if (imgRatio > pageRatio) {
                    // Image is wider than page area (relative to height)
                    finalWidth = maxWidth;
                    finalHeight = maxWidth / imgRatio;
                } else {
                    // Image is taller than page area (relative to width)
                    finalHeight = maxHeight;
                    finalWidth = maxHeight * imgRatio;
                }

                // Center the image
                const x = (pageWidth - finalWidth) / 2;
                const y = (pageHeight - finalHeight) / 2;

                pdf.addImage(sourceImage, 'PNG', x, y, finalWidth, finalHeight);
                pdf.save('image-converted.pdf');
                showToast("PDF downloaded successfully", "success");
                setIsProcessing(false);
                setActiveTool(null);
                return;
            }

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                const newSrc = canvas.toDataURL(`image/${format}`);
                pushState({ ...imageState!, processedSrc: newSrc });
            }
        } catch (e) {
            console.error(e);
            showToast("Conversion failed", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    }

    const handleOcr = async () => {
        if (!currentImage) return;
        setIsProcessing(true);
        setActiveTool("ocr");
        try {
            const text = await extractText(currentImage);
            setExtractedText(text);
        } catch (error) {
            // Don't show error if operation was cancelled
            if ((error as Error).message !== 'Operation cancelled') {
                showToast("Failed to extract text", "error");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const [isSaving, startTransition] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Load initial image from query param
    useEffect(() => {
        const imageUrl = searchParams.get("image");
        if (imageUrl) {
            // Decode the URL (in case it was encoded)
            const decodedUrl = decodeURIComponent(imageUrl);

            // Always update if we have a URL in the query params
            // This ensures the image loads when navigating from history
            if (!imageState || imageState.src !== decodedUrl) {
                console.log("Loading image from URL:", decodedUrl);
                pushState({
                    src: decodedUrl,
                    processedSrc: null
                });
            }
        }
    }, [searchParams, imageState, pushState]);


    const handleSave = async () => {
        const baseSrc = imageState?.originalSrc || imageState?.src;
        if (!baseSrc) return;

        setIsProcessing(true);

        try {
            // HIGH RES REPLAY
            const hasActions = imageState?.actions && imageState.actions.length > 0;
            const finalImage = hasActions
                ? await replayActions(baseSrc, imageState!.actions!)
                : (imageState?.processedSrc || baseSrc);

            startTransition(async () => {
                try {
                    // OPTIMIZATION: Re-encode to JPEG if possible to save space/bandwidth
                    // Reuse logic from handleDownload (inline here for safety)

                    // 1. Determine Output Format
                    let outputMimeType = 'image/jpeg';
                    let outputQuality = 0.92;
                    let outputExtension = 'jpg';

                    try {
                        if (baseSrc.startsWith('data:image/')) {
                            const match = baseSrc.match(/data:(image\/\w+)/);
                            if (match && match[1] === 'image/png') {
                                outputMimeType = 'image/png';
                                outputExtension = 'png';
                                outputQuality = 1.0;
                            }
                        } else {
                            const response = await fetch(baseSrc);
                            const blob = await response.blob();
                            if (blob.type === 'image/png') {
                                outputMimeType = 'image/png';
                                outputExtension = 'png';
                                outputQuality = 1.0;
                            }
                        }
                    } catch (e) {
                        console.warn("Could not detect original format for save, defaulting to JPEG");
                    }

                    // 2. Convert to Data URL with correct format AND max size (4K)
                    const toDataURL = async (imageUrl: string, mimeType: string, quality: number): Promise<string> => {
                        if (imageUrl.startsWith(`data:${mimeType}`) && imageUrl.length < 500000) return imageUrl; // Return if small enough already

                        return new Promise<string>((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                let width = img.width;
                                let height = img.height;

                                // Resize to Max 4K (3840px) to prevent massive payloads crashing servers
                                const MAX_DIM = 3840;
                                if (width > MAX_DIM || height > MAX_DIM) {
                                    if (width > height) {
                                        height = Math.round((height * MAX_DIM) / width);
                                        width = MAX_DIM;
                                    } else {
                                        width = Math.round((width * MAX_DIM) / height);
                                        height = MAX_DIM;
                                    }
                                }

                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    if (mimeType === 'image/jpeg') {
                                        ctx.fillStyle = '#FFFFFF';
                                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                                    }
                                    ctx.drawImage(img, 0, 0, width, height);
                                    resolve(canvas.toDataURL(mimeType, quality));
                                } else {
                                    reject(new Error('Canvas context failed'));
                                }
                            };
                            img.onerror = () => reject(new Error('Image load failed'));
                            img.src = imageUrl;
                        });
                    };

                    const optimizedDataUrl = await toDataURL(finalImage, outputMimeType, outputQuality);

                    // 3. Convert to Blob
                    const res = await fetch(optimizedDataUrl);
                    const blob = await res.blob();

                    console.log(`Saving Image: ${blob.size / 1024 / 1024} MB, Type: ${outputExtension}`);

                    const file = new File([blob], `edit.${outputExtension}`, { type: blob.type });

                    const formData = new FormData();
                    formData.append("resultImage", file);

                    // CRITICAL FIX: Do NOT send the original URL if it's a huge Data URL (base64)
                    // This doubles the payload size and crashes the server/request limit.
                    // Only send it if it's a remote URL (http/https)
                    if (baseSrc.startsWith('http')) {
                        formData.append("originalUrl", baseSrc);
                    } else {
                        formData.append("originalUrl", "Local Upload (Not Saved)");
                    }

                    formData.append("toolUsed", activeTool || "unknown");

                    const result = await saveEdit(formData);
                    if (result.success) {
                        showToast("Project saved successfully!", "success");
                        router.refresh();
                    }
                } catch (error) {
                    console.error("Failed to save:", error);
                    showToast("Failed to save project (Size too large?)", "error");
                } finally {
                    setIsProcessing(false);
                }
            });
        } catch (e) {
            console.error("Replay failed during save", e);
            showToast("Failed to prepare image for save", "error");
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        // If we have an originalSrc and actions, we MUST replay them on the originalSrc now
        const baseSrc = imageState?.originalSrc || imageState?.src;
        if (!baseSrc) return;

        try {
            // 1. Determine Output Format (Fast Check)
            let outputMimeType = 'image/jpeg';
            let outputQuality = 0.92;
            let outputExtension = 'jpg';

            try {
                if (baseSrc.startsWith('data:image/')) {
                    const match = baseSrc.match(/data:(image\/\w+)/);
                    if (match && match[1] === 'image/png') {
                        outputMimeType = 'image/png';
                        outputExtension = 'png';
                        outputQuality = 1.0;
                    }
                } else {
                    const response = await fetch(baseSrc);
                    const blob = await response.blob();
                    if (blob.type === 'image/png') {
                        outputMimeType = 'image/png';
                        outputExtension = 'png';
                        outputQuality = 1.0;
                    }
                }
            } catch (e) {
                console.warn("Could not detect original format, defaulting to JPEG");
            }

            const defaultFilename = `ranthal-edit-${Date.now()}.${outputExtension}`;

            // 2. Invoke File Picker IMMEDIATELY (to preserve user activation)
            let fileHandle: any = null;
            if ('showSaveFilePicker' in window) {
                try {
                    fileHandle = await (window as any).showSaveFilePicker({
                        suggestedName: defaultFilename,
                        types: [{
                            description: outputExtension.toUpperCase() + ' Image',
                            accept: { [outputMimeType]: [`.${outputExtension}`] }
                        }],
                    });
                } catch (err: any) {
                    // If user cancelled, stop everything
                    if (err.name === 'AbortError') return;
                    // If not supported/other error, we will use fallback later
                    console.warn('File Picker failed, falling back:', err);
                }
            }

            // 3. Process Image (Heavy Operation)
            setIsProcessing(true);

            const hasActions = imageState?.actions && imageState.actions.length > 0;
            const finalImage = hasActions
                ? await replayActions(baseSrc, imageState!.actions!)
                : (imageState?.processedSrc || baseSrc);

            // Helpers
            const dataURLtoBlob = (dataUrl: string): Blob => {
                const arr = dataUrl.split(',');
                const mimeMatch = arr[0].match(/:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) u8arr[n] = bstr.charCodeAt(n);
                return new Blob([u8arr], { type: mime });
            };

            const toDataURL = async (imageUrl: string, mimeType: string, quality: number): Promise<string> => {
                if (imageUrl.startsWith(`data:${mimeType}`)) return imageUrl;

                return new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            if (mimeType === 'image/jpeg') {
                                ctx.fillStyle = '#FFFFFF';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                            }
                            ctx.drawImage(img, 0, 0);
                            resolve(canvas.toDataURL(mimeType, quality));
                        } else {
                            reject(new Error('Canvas context failed'));
                        }
                    };
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = imageUrl;
                });
            };

            const finalDataUrl = await toDataURL(finalImage, outputMimeType, outputQuality);
            const blob = dataURLtoBlob(finalDataUrl);

            // 4. Save to File
            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                // Fallback Download
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = defaultFilename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }

        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Generate preview for selected filter
    const updateFilterPreview = async () => {
        if (!baseImageRef.current) return;

        setIsProcessing(true);
        try {
            const newSrc = await applyFilter(baseImageRef.current, selectedFilter);
            setPreviewSrc(newSrc);
        } catch (err) {
            console.error("Filter preview error:", err);
            // Don't toast on every selection change, it's annoying
        } finally {
            setIsProcessing(false);
        }
    };

    // Auto-update filter preview when selection changes
    useEffect(() => {
        if ((activeTool === 'filters' || activeTool === 'social-filters') && baseImageRef.current) {
            updateFilterPreview();
        }
    }, [selectedFilter, activeTool]); // Removed baseImage dependency to avoid loops, though Ref handles it

    // Adjustments handler
    // Adjustments handler
    const handleApplyAdjustments = async () => {
        if (!imageState) return;
        setIsProcessing(true);
        try {
            // Create Action
            const action: EditorAction = {
                type: 'adjust',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                brightness: brightness,
                contrast: contrast,
                saturation: saturation
            };

            const newActions = [...(imageState.actions || []), action];

            // We use the already computed result from `applyAdjustments` (if we had a preview)
            // But wait, adjustments usually apply CSS preview, they don't generate a `previewSrc` until "Apply" is clicked?
            // Actually `Editor` implies `applyAdjustments` generates a new SRC.
            // Let's generate the preview using the replayer or just the function
            const newSrc = await applyAdjustments(imageState.processedSrc || imageState.src, brightness, contrast, saturation);

            pushState({
                ...imageState,
                processedSrc: newSrc,
                actions: newActions
            });

            showToast("Adjustments applied", "success");

            // Reset values
            setBrightness(100);
            setContrast(100);
            setSaturation(100);

            setActiveTool(null);
        } catch (err: any) {
            console.error("Adjustment apply error:", err);
            showToast("Failed to apply adjustments", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Rotate handler
    // Rotate handler
    const handleRotate = async (angle: number) => {
        if (!imageState) return;
        setIsProcessing(true);
        try {
            const action: EditorAction = {
                type: 'rotate',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                angle: angle
            };

            const newActions = [...(imageState.actions || []), action];
            const newSrc = await rotateImage(imageState.processedSrc || imageState.src, angle);

            pushState({ ...imageState, processedSrc: newSrc, actions: newActions });
            setRotation(0);
        } catch (err) {
            showToast("Failed to rotate", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Flip handler
    // Flip handler
    const handleFlip = async (direction: 'horizontal' | 'vertical') => {
        if (!imageState) return;
        setIsProcessing(true);
        try {
            const action: EditorAction = {
                type: 'flip',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                direction: direction
            };
            const newActions = [...(imageState.actions || []), action];
            const newSrc = await flipImage(imageState.processedSrc || imageState.src, direction);

            pushState({ ...imageState, processedSrc: newSrc, actions: newActions });
        } catch (err) {
            showToast("Failed to flip", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Unified Blur/Sharpen handler
    // Unified Blur/Sharpen handler
    const handleApplyBlurSharpen = async () => {
        if (!imageState) return;

        // If we already have a preview, just commit it with action
        if (previewSrc) {
            const action: EditorAction = {
                type: 'blur-sharpen',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                blur: blurAmount,
                sharpen: sharpenAmount
            };
            const newActions = [...(imageState.actions || []), action];

            pushState({ ...imageState, processedSrc: previewSrc, actions: newActions });

            setPreviewSrc(null);
            setIsProcessing(false);
            setActiveTool(null);
            setBlurAmount(0);
            setSharpenAmount(0);
            return;
        }

        const baseImage = imageState.processedSrc || imageState.src;
        if (!baseImage || (blurAmount === 0 && sharpenAmount === 0)) return;

        setIsProcessing(true);
        try {
            let processedSrc = baseImage;
            // Apply Blur if needed
            if (blurAmount > 0) processedSrc = await applyBlur(processedSrc, blurAmount);
            // Apply Sharpen if needed
            if (sharpenAmount > 0) processedSrc = await applySharpen(processedSrc, sharpenAmount / 100);

            const action: EditorAction = {
                type: 'blur-sharpen',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                blur: blurAmount,
                sharpen: sharpenAmount
            };
            const newActions = [...(imageState.actions || []), action];

            pushState({ ...imageState, processedSrc, actions: newActions });
        } catch (err) {
            showToast("Failed to apply effects", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
            setBlurAmount(0);
            setSharpenAmount(0);
        }
    };

    // Red-eye fix handler (simplified - applies to center of image)
    const handleRedEyeFix = async () => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            // For simplicity, we'll scan the whole image for red pixels
            const img = new Image();
            img.src = currentImage;
            await new Promise(resolve => { img.onload = resolve; });
            // Apply to center area as a demonstration
            const newSrc = await fixRedEye(currentImage, img.width / 2, img.height / 3, 50);
            pushState({ ...imageState!, processedSrc: newSrc });
        } catch (err) {
            showToast("Failed to fix red-eye", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    };

    const handleGenerateQR = async () => {
        let textToEncode = qrText;

        if (qrType === 'wifi') {
            textToEncode = formatWifi(qrData);
        } else if (qrType === 'contact') {
            textToEncode = formatVCard(qrData);
        } else if (qrType === 'sms') {
            textToEncode = formatSms(qrData);
        } else if (qrType === 'email') {
            textToEncode = formatEmail(qrData);
        } else if (qrType === 'phone') {
            textToEncode = formatPhone(qrData.phone);
        } else if (qrType === 'geo') {
            textToEncode = formatGeo(qrData);
        }

        if (!textToEncode) return;

        try {
            const src = await generateQRCode(textToEncode);
            setQrCodeSrc(src);
            // Default position center
            if (imageRef.current) {
                setQrPosition({
                    x: (imageRef.current.naturalWidth / 2) - 100,
                    y: (imageRef.current.naturalHeight / 2) - 100
                });
            }
        } catch (e) {
            showToast("Failed to generate QR Code", "error");
        }
    };

    const handleApplySticker = async () => {
        if (!activeSticker || !currentImage || !imageState || !imageRef.current) return;
        setIsProcessing(true);
        try {
            // Need to calculate normalized position
            const image = imageRef.current;
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;

            const normalizedX = stickerPos.x / naturalWidth;
            const normalizedY = stickerPos.y / naturalHeight;
            const normalizedSizeW = stickerSize / naturalWidth;
            const normalizedSizeH = stickerSize / naturalHeight;

            const action: EditorAction = {
                type: 'sticker',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                stickerSrc: activeSticker,
                x: normalizedX,
                y: normalizedY,
                width: normalizedSizeW,
                height: normalizedSizeH,
                rotation: stickerRotation
            };

            const processed = await overlayImage(
                currentImage,
                activeSticker,
                stickerPos.x,
                stickerPos.y,
                stickerSize,
                stickerSize,
                stickerRotation
            );

            const newActions = [...(imageState.actions || []), action];
            pushState({ ...imageState, processedSrc: processed, actions: newActions });
            setActiveSticker(null);
            setActiveTool(null);
            showToast("Sticker applied successfully", "success");
        } catch (err) {
            showToast("Failed to apply sticker", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSelectSticker = (emoji: string) => {
        const dataUrl = emojiToDataURL(emoji, 300);
        setActiveSticker(dataUrl);
        // Reset size to default
        setStickerSize(200);
        if (imageRef.current) {
            setStickerPos({
                x: (imageRef.current.naturalWidth / 2) - 100,
                y: (imageRef.current.naturalHeight / 2) - 100
            });
        }
    };

    const handleApplyQR = async () => {
        if (!currentImage || !qrCodeSrc) return;
        setIsProcessing(true);
        try {
            const newSrc = await overlayImage(currentImage, qrCodeSrc, qrPosition.x, qrPosition.y, qrSize, qrSize);
            pushState({ ...imageState!, processedSrc: newSrc });
            // Reset
            setQrCodeSrc(null);
            setQrText("");
            setActiveTool(null);
        } catch (e) {
            console.error(e);
            showToast("Failed to apply QR Code", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Drawing handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;

        if (drawingMode === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.globalAlpha = 1;
            ctx.lineCap = 'round';
        } else if (drawingMode === 'highlighter') {
            // Convert hex to rgba
            const hex = brushColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            // Multiply blending gives a realistic highlighter effect on white paper
            ctx.globalCompositeOperation = 'multiply';

            // Use opacity from state
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${highlighterOpacity})`;
            ctx.lineWidth = brushSize * 3;
            ctx.lineCap = 'butt'; // Flat end for marker feel
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColor;
            ctx.globalAlpha = 1;
            ctx.lineCap = 'round';
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        if (drawingMode === 'eraser') {
            ctx.lineTo(x, y);
            ctx.stroke();
            return;
        }

        // Add point to stroke
        activeStrokePoints.current.push({ x, y });

        // Draw active stroke on temp canvas
        const tempCanvas = tempCanvasRef.current;
        if (!tempCanvas) return;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Clear temp canvas
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw solid stroke
        tempCtx.beginPath();
        const points = activeStrokePoints.current;
        if (points.length < 2) return;

        tempCtx.moveTo(points[0].x, points[0].y);

        // Use quadratic curves for smoother lines
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            tempCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        // Connect to last point
        const last = points[points.length - 1];
        tempCtx.lineTo(last.x, last.y);

        // Styles for solid stroke (opacity handled by CSS on canvas element)
        tempCtx.strokeStyle = brushColor;
        tempCtx.lineWidth = drawingMode === 'highlighter' ? brushSize * 3 : brushSize;
        tempCtx.lineCap = drawingMode === 'highlighter' ? 'butt' : 'round';
        tempCtx.lineJoin = 'round';
        tempCtx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        const tempCanvas = tempCanvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // If we were using temp canvas (pen/highlighter), composite it now
                if (drawingMode !== 'eraser' && tempCanvas) {
                    const tempCtx = tempCanvas.getContext('2d');

                    if (drawingMode === 'highlighter') {
                        // Apply multiply blend for highlighter
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.globalAlpha = highlighterOpacity;

                        // For highlighter we need to reconstruct the rgba color
                        // because canvas.drawImage ignores strokeStyle
                        // But wait - the temp canvas already has the COLOR.
                        // We just need to apply the alpha and blend mode.
                    } else {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.globalAlpha = 1;
                    }

                    // Draw the solid stroke from temp canvas onto main canvas
                    ctx.drawImage(tempCanvas, 0, 0);

                    // Clear temp canvas
                    if (tempCtx) tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                    // Reset context
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = 1;
                } else {
                    // Reset eraser context
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
        }
        activeStrokePoints.current = [];
    };

    const clearDrawing = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const applyDrawing = async () => {
        if (!currentImage || !canvasRef.current) return;
        setIsProcessing(true);
        try {
            const img = new Image();
            img.src = currentImage;
            await new Promise(resolve => { img.onload = resolve; });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No context');

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Draw the overlay canvas scaled to image size
            const drawCanvas = canvasRef.current;
            ctx.drawImage(drawCanvas, 0, 0, drawCanvas.width, drawCanvas.height, 0, 0, img.width, img.height);

            pushState({ ...imageState!, processedSrc: canvas.toDataURL('image/png') });
            clearDrawing();
        } catch (err) {
            showToast("Failed to apply drawing", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    };

    // Generic Apply/Cancel for Preview Tools
    const applyPreview = async () => {
        // Special case for adjustments (handled elsewhere usually, but if here, redirect)
        if (activeTool === 'adjust') {
            handleApplyAdjustments();
            return;
        }

        const currentImageState = imageStateRef.current; // Use Ref for freshness

        try {
            if (previewSrc && currentImageState) {
                console.log(`[${Date.now()}] applyPreview: Applying preview...`);

                // Create Action based on active tool
                let newAction: EditorAction | null = null;

                if (activeTool === 'filters' || activeTool === 'social-filters') {
                    newAction = {
                        type: 'filter',
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        filterName: selectedFilter
                    };
                } else if (activeTool === 'remaster') {
                    // Remaster is unique, maybe no action yet or custom action?
                    // For now, let's treat it as a generic "replace image" action or just skip action recording (legacy fallback)
                    // If we want to support it, we need a 'remaster' action type.
                    // Let's assume for now Remaster is destructive/base improvement.
                }

                const newActions = newAction
                    ? [...(currentImageState.actions || []), newAction]
                    : (currentImageState.actions || []);

                const newState = {
                    ...currentImageState,
                    processedSrc: previewSrc,
                    actions: newActions
                };

                // Attempt push
                pushState(newState);

                console.log(`[${Date.now()}] applyPreview: PushState called with action:`, newAction?.type);
                showToast(`Applied successfully!`, "success");

                setPreviewSrc(null);

                // Reset states
                setSelectedFilter('none');
                setBlurAmount(0);
                setSharpenAmount(0);

                if (activeTool === 'remaster' || activeTool === 'filters' || activeTool === 'social-filters') {
                    setActiveTool(null);
                }
            } else {
                console.warn("Cannot apply preview: previewSrc or imageState missing");
                showToast("Error: No preview to apply", "error");
            }
        } catch (e: any) {
            console.error("Crash in applyPreview:", e);
            window.alert("Critical Error Applying: " + e.message);
        }
    };

    const cancelPreview = () => {
        setPreviewSrc(null);
        if (activeTool === 'adjust') {
            // Reset adjustments on cancel but stay in tool? Or exit?
            setBrightness(100);
            setContrast(100);
            setSaturation(100);
            setActiveTool(null);
        } else {
            if (activeTool === 'remaster') setActiveTool(null);
        }
    };


    return (
        <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-64px)] overflow-y-auto lg:overflow-hidden pt-20 lg:pt-0">
            {/* Sidebar (Left) */}
            {imageState && (
                <aside className="w-full lg:w-20 xl:w-72 m-4 lg:m-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur-xl flex flex-row lg:flex-col items-center lg:items-stretch py-4 lg:py-6 z-30 shadow-2xl overflow-x-auto lg:overflow-y-auto scrollbar-hide lg:h-[calc(100vh-8rem)] shrink-0 order-2 lg:order-1 gap-4 lg:gap-0 px-4 lg:px-0">
                    <div className="flex flex-row lg:flex-col lg:flex-1 px-0 lg:px-3 xl:px-6 overflow-x-visible lg:overflow-y-auto scrollbar-hide space-x-4 lg:space-x-0 lg:space-y-6">

                        {/* Group: Essentials */}
                        <div className="space-x-2 lg:space-x-0 lg:space-y-2 flex flex-row lg:flex-col">
                            <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Essentials</h3>
                            <ToolButton active={activeTool === "crop"} onClick={() => activateTool("crop")} icon={<CropIcon />} label="Crop & Resize" disabled={!imageState} />
                            <ToolButton active={activeTool === "hand"} onClick={() => activateTool("hand")} icon={<Hand />} label="Pan Tool" disabled={!imageState} />
                            <ToolButton active={activeTool === "id-card"} onClick={() => { activateTool("id-card"); if (currentImage && !frontImage) setFrontImage(currentImage); }} icon={<CreditCard />} label="ID Card" disabled={!imageState} />
                        </div>

                        {/* Group: Adjustments */}
                        <div className="space-x-2 lg:space-x-0 lg:space-y-2 flex flex-row lg:flex-col">
                            <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Adjustments</h3>
                            <ToolButton active={activeTool === "filters"} onClick={() => activateTool("filters")} icon={<Palette />} label="Filters" disabled={!imageState} />
                            <ToolButton active={activeTool === "adjust"} onClick={() => activateTool("adjust")} icon={<SlidersHorizontal />} label="Tune Image" disabled={!imageState} />
                            <ToolButton active={activeTool === "blur"} onClick={() => activateTool("blur")} icon={<Focus />} label="Blur & Sharpen" disabled={!imageState} />
                            <ToolButton active={activeTool === "transform"} onClick={() => activateTool("transform")} icon={<RotateCw />} label="Transform" disabled={!imageState} />
                        </div>

                        {/* Group: Social */}
                        <div className="space-x-2 lg:space-x-0 lg:space-y-2 flex flex-row lg:flex-col">
                            <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Social</h3>
                            <ToolButton active={activeTool === "social-filters"} onClick={() => activateTool("social-filters")} icon={<Filter />} label="Insta Filters" disabled={!imageState} />
                        </div>

                        {/* Group: Smart Actions */}
                        <div className="space-x-2 lg:space-x-0 lg:space-y-2 flex flex-row lg:flex-col">
                            <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Smart Tools</h3>
                            <ToolButton active={activeTool === "remaster"} onClick={() => { activateTool("remaster"); handleRemaster(); }} icon={<Sparkles />} label="Remaster" disabled={!imageState} />
                            <ToolButton active={activeTool === "bg-remove"} onClick={() => { activateTool("bg-remove"); handleBgRemove(); }} icon={<Layers />} label="Remove BG" disabled={!imageState} />
                            <ToolButton active={activeTool === "collage"} onClick={() => {
                                activateTool("collage");
                                if (currentImage && collageImages.length === 0) {
                                    setCollageImages([currentImage]);
                                    setCollageTransforms([{ zoom: 1, panX: 0, panY: 0 }]);
                                }
                            }} icon={<LayoutGrid />} label="Collage" disabled={!imageState} />
                            <ToolButton active={activeTool === "qr-code"} onClick={() => activateTool("qr-code")} icon={<QrCode />} label="QR Code" disabled={!imageState} />
                            <ToolButton active={activeTool === "ocr"} onClick={() => { activateTool("ocr"); handleOcr(); }} icon={<ScanText />} label="Extract Text" disabled={!imageState} />
                            <ToolButton active={activeTool === "redeye"} onClick={() => activateTool("redeye")} icon={<Eye />} label="Red-eye Fix" disabled={!imageState} />
                        </div>

                        {/* Group: Creative */}
                        <div className="space-x-2 lg:space-x-0 lg:space-y-2 flex flex-row lg:flex-col">
                            <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Creative</h3>
                            <ToolButton active={activeTool === "draw"} onClick={() => activateTool("draw")} icon={<Pencil />} label="Draw" disabled={!imageState} />
                            <ToolButton active={activeTool === "sticker"} onClick={() => activateTool("sticker")} icon={<StickerIcon />} label="Stickers" disabled={!imageState} />
                        </div>

                        {/* Group: Utilities */}
                        <div className="space-x-2 lg:space-x-0 lg:space-y-2 flex flex-row lg:flex-col">
                            <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Export</h3>
                            <ToolButton active={activeTool === "convert"} onClick={() => activateTool("convert")} icon={<FileType />} label="Format Convert" disabled={!imageState} />
                            <ToolButton active={activeTool === "compress"} onClick={() => activateTool("compress")} icon={<Minimize2 />} label="Compress" disabled={!imageState} />
                        </div>


                    </div>
                </aside>
            )}

            {/* Main Canvas Area */}
            <main className="flex-1 relative overflow-hidden flex items-center justify-center p-4 lg:p-8 m-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)]/30 backdrop-blur-sm shadow-inner min-h-[50vh] lg:h-[calc(100vh-8rem)] order-1 lg:order-2">

                {/* Bottom Toolbar (Zoom Only) */}
                {imageState && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40 bg-black/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 w-max max-w-[90%] overflow-x-auto">
                        <button onClick={() => setViewZoom(Math.max(25, viewZoom - 25))} disabled={viewZoom <= 25} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors" title="Zoom Out">
                            <ZoomOut className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-white font-medium min-w-[40px] text-center">{viewZoom}%</span>
                        <button onClick={() => setViewZoom(Math.min(200, viewZoom + 25))} disabled={viewZoom >= 200} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors" title="Zoom In">
                            <ZoomIn className="h-4 w-4" />
                        </button>
                    </div>
                )}
                {/* Preview / Compare Controls */}
                {(previewSrc || activeTool === 'adjust') && (
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-4">
                        <button
                            className={clsx(
                                "px-4 py-2 rounded-full font-medium text-sm shadow-lg transition-all",
                                isComparing
                                    ? "bg-white text-black"
                                    : "bg-black/60 text-white border border-white/20 backdrop-blur-md hover:bg-black/80"
                            )}
                            onMouseDown={() => setIsComparing(true)}
                            // Use window mouseup to ensure release even if cursor moves off button
                            onMouseUp={() => setIsComparing(false)}
                            onMouseLeave={() => setIsComparing(false)}
                            onTouchStart={() => setIsComparing(true)}
                            onTouchEnd={() => setIsComparing(false)}
                        >
                            {isComparing ? "Original" : "Hold to Compare"}
                        </button>


                    </div>
                )}
                {!imageState ? (
                    <div
                        {...getRootProps()}
                        className={clsx(
                            "w-full max-w-xl aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center",
                            isDragActive ? "border-white bg-white/10" : "border-white/10 hover:border-white/50 hover:bg-white/5"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <ImageIcon className="h-8 w-8 text-white/50" />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">Upload an image</h3>
                        <p className="text-slate-400">Drag & drop or click to browse</p>
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {activeTool === "crop" ? (
                            <div className="max-h-full max-w-full overflow-auto flex items-center justify-center p-4">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    aspect={undefined}
                                    onComplete={(c) => {
                                        setCompletedCrop(c);
                                        // Calculate scale between displayed image and actual image
                                        if (imgRef.current) {
                                            const image = imgRef.current;
                                            const scaleX = image.naturalWidth / image.width;
                                            const scaleY = image.naturalHeight / image.height;

                                            setCroppedAreaPixels({
                                                x: c.x * scaleX,
                                                y: c.y * scaleY,
                                                width: c.width * scaleX,
                                                height: c.height * scaleY,
                                            });
                                        }
                                    }}
                                    className="max-w-full max-h-full"
                                >
                                    <img
                                        ref={imgRef}
                                        alt="Crop me"
                                        src={currentImage || ""}
                                        style={{
                                            transform: `scale(${1}) rotate(${rotation}deg)`,
                                            maxHeight: '70vh',
                                            maxWidth: '100%',
                                            objectFit: 'contain'
                                        }}
                                        // We need to capture the image ref for proper scaling calculations if needed
                                        onLoad={(e) => {
                                            // You might need to set aspect or initial crop here if desired
                                        }}
                                    />
                                </ReactCrop>
                            </div>
                        ) : (
                            <div
                                className={clsx(
                                    "relative inline-flex items-center justify-center transition-transform duration-75 ease-linear will-change-transform w-full h-full",
                                    activeTool === "hand" ? (isPanning ? "cursor-grabbing" : "cursor-grab") : ""
                                )}
                                style={{
                                    transform: `translate(${pan.x}px, ${pan.y}px)`
                                }}
                                onMouseDown={(e) => {
                                    if (activeTool === "hand") {
                                        e.preventDefault();
                                        setIsPanning(true);
                                        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                                    }
                                }}
                                onMouseMove={(e) => {
                                    if (activeTool === "hand" && isPanning) {
                                        e.preventDefault();
                                        setPan({
                                            x: e.clientX - dragStart.x,
                                            y: e.clientY - dragStart.y
                                        });
                                    }
                                }}
                                onMouseUp={() => setIsPanning(false)}
                                onMouseLeave={() => setIsPanning(false)}
                            >
                                <div
                                    className="relative inline-flex items-center justify-center transition-all rounded-xl border border-white/20 shadow-[0_0_50px_-12px_rgba(45,212,191,0.5)] ring-1 ring-white/10"
                                    style={{
                                        transform: `scale(${viewZoom / 100}) ${activeTool === "transform" && rotation !== 0 ? `rotate(${rotation}deg)` : ""}`
                                    }}
                                >
                                    <img
                                        ref={imageRef}
                                        src={currentImage || ""}
                                        alt="Work in progress"
                                        onLoad={updateImageScale}
                                        className="max-w-[calc(100vw-8rem)] max-h-[calc(100vh-12rem)] object-contain rounded-lg"
                                        style={{
                                            filter: getPreviewFilter(),
                                        }}
                                    />
                                    {/* Overlay canvases need to be inside the transformed container to rotate/scale with it */}

                                    {/* QR Code Overlay */}
                                    {activeTool === "qr-code" && qrCodeSrc && (
                                        <div
                                            className="absolute cursor-move border-2 border-dashed border-teal-400"
                                            style={{
                                                left: qrPosition.x * imageScale,
                                                top: qrPosition.y * imageScale,
                                                width: qrSize * imageScale,
                                                height: qrSize * imageScale,
                                                backgroundImage: `url(${qrCodeSrc})`,
                                                backgroundSize: 'contain',
                                                backgroundRepeat: 'no-repeat'
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation(); // Prevent panning
                                                const startX = e.clientX;
                                                const startY = e.clientY;
                                                const startPos = { ...qrPosition };

                                                const handleMove = (moveEvent: MouseEvent) => {
                                                    const dx = (moveEvent.clientX - startX) / imageScale;
                                                    const dy = (moveEvent.clientY - startY) / imageScale;
                                                    setQrPosition({
                                                        x: startPos.x + dx,
                                                        y: startPos.y + dy
                                                    });
                                                };

                                                const handleUp = () => {
                                                    document.removeEventListener('mousemove', handleMove);
                                                    document.removeEventListener('mouseup', handleUp);
                                                };

                                                document.addEventListener('mousemove', handleMove);
                                                document.addEventListener('mouseup', handleUp);
                                            }}
                                        >
                                            {/* Resize Handle */}
                                            <div
                                                className="absolute bottom-0 right-0 w-4 h-4 bg-teal-400 rounded-full translate-x-1/2 translate-y-1/2 cursor-nwse-resize"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    const startX = e.clientX;
                                                    const startSize = qrSize;

                                                    const handleResize = (moveEvent: MouseEvent) => {
                                                        const d = (moveEvent.clientX - startX) / imageScale;
                                                        setQrSize(Math.max(50, startSize + d));
                                                    };

                                                    const handleUp = () => {
                                                        document.removeEventListener('mousemove', handleResize);
                                                        document.removeEventListener('mouseup', handleUp);
                                                    };

                                                    document.addEventListener('mousemove', handleResize);
                                                    document.addEventListener('mouseup', handleUp);
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Sticker Overlay */}
                                    {activeTool === "sticker" && activeSticker && imageRef.current && (
                                        <>
                                            <img
                                                src={activeSticker}
                                                alt="sticker-overlay"
                                                className="absolute select-none cursor-move"
                                                style={{
                                                    left: `${(stickerPos.x / imageRef.current.naturalWidth) * 100}%`,
                                                    top: `${(stickerPos.y / imageRef.current.naturalHeight) * 100}%`,
                                                    width: `${(stickerSize / imageRef.current.naturalWidth) * 100}%`,
                                                    zIndex: 30,
                                                    transform: `translate(0, 0) rotate(${stickerRotation}deg)`,
                                                    opacity: 0.9
                                                }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation(); // Prevent panning
                                                    const startX = e.clientX;
                                                    const startY = e.clientY;
                                                    const startPosX = stickerPos.x;
                                                    const startPosY = stickerPos.y;

                                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                                        if (!imageRef.current) return;
                                                        const scaleX = imageRef.current.naturalWidth / imageRef.current.offsetWidth;
                                                        const scaleY = imageRef.current.naturalHeight / imageRef.current.offsetHeight;

                                                        const deltaX = (moveEvent.clientX - startX) * scaleX;
                                                        const deltaY = (moveEvent.clientY - startY) * scaleY;

                                                        setStickerPos({
                                                            x: startPosX + deltaX,
                                                            y: startPosY + deltaY
                                                        });
                                                    };

                                                    const handleMouseUp = () => {
                                                        document.removeEventListener('mousemove', handleMouseMove);
                                                        document.removeEventListener('mouseup', handleMouseUp);
                                                    };

                                                    document.addEventListener('mousemove', handleMouseMove);
                                                    document.addEventListener('mouseup', handleMouseUp);
                                                }}
                                            />

                                            {/* Resize Handle for Sticker */}
                                            <div
                                                className="absolute w-4 h-4 bg-teal-500 rounded-full border-2 border-white cursor-se-resize z-40"
                                                style={{
                                                    left: `${((stickerPos.x + stickerSize) / imageRef.current.naturalWidth) * 100}%`,
                                                    top: `${((stickerPos.y + stickerSize) / imageRef.current.naturalHeight) * 100}%`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const startX = e.clientX;
                                                    const startWidth = stickerSize;

                                                    const handleResizeMove = (moveEvent: MouseEvent) => {
                                                        if (!imageRef.current) return;
                                                        const scale = imageRef.current.naturalWidth / imageRef.current.offsetWidth;
                                                        const delta = (moveEvent.clientX - startX) * scale;
                                                        const newSize = Math.max(50, startWidth + delta);
                                                        setStickerSize(newSize);
                                                    };

                                                    const handleResizeUp = () => {
                                                        document.removeEventListener('mousemove', handleResizeMove);
                                                        document.removeEventListener('mouseup', handleResizeUp);
                                                    };

                                                    document.addEventListener('mousemove', handleResizeMove);
                                                    document.addEventListener('mouseup', handleResizeUp);
                                                }}
                                            />

                                            {/* Rotation Handle for Sticker */}
                                            <div
                                                className="absolute w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center cursor-move z-40 border border-teal-500 hover:scale-110 transition-transform"
                                                style={{
                                                    // Position initially at Top Center of the sticker rect
                                                    left: `${((stickerPos.x + stickerSize / 2) / imageRef.current.naturalWidth) * 100}%`,
                                                    top: `${((stickerPos.y - 20) / imageRef.current.naturalHeight) * 100}%`,

                                                    // Apply rotation equal to sticker's rotation
                                                    transform: `translate(-50%, -50%) rotate(${stickerRotation}deg)`,

                                                    // Pivot around the center of the sticker
                                                    // Distance from Handle (Top - 20) to Center (Top + Size/2) is (20 + Size/2) pixels
                                                    // Note: We need to convert this pixel distance to a string
                                                    transformOrigin: `50% ${(20 + stickerSize / 2) * imageScale}px`
                                                    // Wait, transformOrigin uses CSS pixels. stickerSize is logic pixels (natural resolution).
                                                    // If the image is scaled (imageScale), visually the sticker is smaller.
                                                    // We need to account for imageScale! 
                                                    // Actually, 'left'/'top' % are robust.
                                                    // But 'transformOrigin' in px needs to match visual pixels.
                                                    // stickerSize * imageScale = Visual Size.
                                                }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation(); // Stop panning

                                                    // Calculate center of sticker in CLIENT coordinates
                                                    const rect = imageRef.current!.getBoundingClientRect();
                                                    const scaleX = rect.width / imageRef.current!.naturalWidth;
                                                    const scaleY = rect.height / imageRef.current!.naturalHeight;

                                                    const centerX = rect.left + (stickerPos.x + stickerSize / 2) * scaleX;
                                                    const centerY = rect.top + (stickerPos.y + stickerSize / 2) * scaleY;

                                                    const handleRotateMove = (moveEvent: MouseEvent) => {
                                                        const dx = moveEvent.clientX - centerX;
                                                        const dy = moveEvent.clientY - centerY;
                                                        // Angle in degrees
                                                        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                                                        // atan2(0,-1) is 180 (Left). atan2(-1,0) is -90 (Top).
                                                        // We want Top to be 0 deg.
                                                        // So -90 + offset = 0 => offset = +90.
                                                        setStickerRotation(angle + 90);
                                                    };

                                                    const handleRotateUp = () => {
                                                        document.removeEventListener('mousemove', handleRotateMove);
                                                        document.removeEventListener('mouseup', handleRotateUp);
                                                    };

                                                    document.addEventListener('mousemove', handleRotateMove);
                                                    document.addEventListener('mouseup', handleRotateUp);
                                                }}
                                            >
                                                <RotateCw className="w-3 h-3 text-teal-600" />
                                            </div>
                                        </>
                                    )}
                                    {activeTool === "draw" && (
                                        <>
                                            <canvas
                                                ref={canvasRef}
                                                width={imageRef.current?.naturalWidth || 800}
                                                height={imageRef.current?.naturalHeight || 600}
                                                className={clsx(
                                                    "absolute inset-0 w-full h-full",
                                                    (activeTool === "draw" && showCursor) ? "cursor-none" : "",
                                                    drawingMode === 'pen' && !showCursor && "cursor-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3R5bGU9ImZpbHRlcjogZHJvcC1zaGFkb3coMXB4IDFweCAxcHggYmxhY2spOyI+PHBhdGggZD0iTTEyIDE5bDctN2wzLTMgNyA3bC0zIDMiLz48cGF0aCBkPSJTE4IDEzIDEyIDE5Ii8+PHBhdGggZD0iTTIyIDIyIDEyIDIyIi8+PC9zdmc+')_0_24,pointer]",
                                                    drawingMode === 'highlighter' && !showCursor && "cursor-text",
                                                    drawingMode === 'eraser' && !showCursor && "cursor-cell"
                                                )}
                                                onMouseDown={startDrawing}
                                                onMouseMove={(e) => {
                                                    setCursorPos({ x: e.clientX, y: e.clientY });
                                                    draw(e);
                                                }}
                                                onMouseUp={stopDrawing}
                                                onMouseLeave={(e) => {
                                                    setShowCursor(false);
                                                    stopDrawing();
                                                }}
                                                onMouseEnter={() => setShowCursor(true)}
                                                onTouchStart={(e) => {
                                                    //e.preventDefault(); // This might block scrolling if we are not careful, but needed for drawing
                                                    startDrawing(e);
                                                }}
                                                onTouchMove={(e) => {
                                                    //e.preventDefault();
                                                    if (e.touches[0]) {
                                                        setCursorPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
                                                        draw(e);
                                                    }
                                                }}
                                                onTouchEnd={stopDrawing}
                                            />
                                            <canvas
                                                ref={tempCanvasRef}
                                                width={imageRef.current?.naturalWidth || 800}
                                                height={imageRef.current?.naturalHeight || 600}
                                                className="absolute inset-0 pointer-events-none w-full h-full"
                                                style={{
                                                    opacity: drawingMode === 'highlighter' ? highlighterOpacity : 1,
                                                    mixBlendMode: drawingMode === 'highlighter' ? 'multiply' : 'normal'
                                                }}
                                            />
                                        </>
                                    )}
                                </div>
                                {activeTool === "draw" && null /* Canvases moved inside wrapper */}
                            </div>
                        )}
                    </div>
                )
                }

                {
                    isProcessing && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                            <div className="flex flex-col items-center">
                                <Wand2 className="h-8 w-8 text-white animate-spin mb-2" />
                                <p className="text-white font-medium mb-3">Processing...</p>
                                {(activeTool === 'bg-remove' || activeTool === 'ocr') && (
                                    <button
                                        onClick={() => {
                                            if (activeTool === 'bg-remove') cancelBgRemoval();
                                            if (activeTool === 'ocr') cancelOcr();
                                            setIsProcessing(false);
                                            setActiveTool(null);
                                        }}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    imageState && (
                        <div className="absolute top-4 right-4 flex gap-2 z-40">
                            <button
                                onClick={undo}
                                disabled={!canUndo}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Undo"
                            >
                                <Undo className="h-5 w-5" />
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Redo"
                            >
                                <Redo className="h-5 w-5" />
                            </button>

                            <div className="w-px h-10 bg-white/10 mx-1" />

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-lg disabled:opacity-50"
                                title="Save Project"
                            >
                                {isSaving ? <Wand2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-slate-200 transition-colors shadow-lg"
                                title="Download"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => {
                                    pushState(null);
                                    // Reset local state
                                    setActiveTool(null);
                                    setCrop(undefined);
                                    setCompletedCrop(undefined);
                                    setZoom(1);
                                    setViewZoom(100);
                                    setPan({ x: 0, y: 0 });
                                    setExtractedText("");
                                    setFrontImage(null);
                                    setBackImage(null);
                                    setQrCodeSrc(null);
                                    setActiveSticker(null);
                                    setPreviewSrc(null);
                                    setIsComparing(false);
                                    setCompareSnapshot(null);

                                    // Reset effect values
                                    setSelectedFilter('none');
                                    setBlurAmount(0);
                                    setSharpenAmount(0);
                                    setBrightness(100);
                                    setContrast(100);
                                    setSaturation(100);
                                    setRotation(0);

                                    // Clear URL parameter when closing
                                    router.push('/editor');
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-violet-500 text-white hover:bg-violet-600 backdrop-blur-md transition-colors shadow-lg"
                                title="Close / Reset"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    )
                }
            </main >



            {/* Properties Panel (Right side) - Always Visible if image loaded */}
            {
                imageState && (
                    <aside className="w-full lg:w-80 m-4 lg:m-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur-xl p-6 z-20 flex flex-col transition-all overflow-y-auto shadow-2xl h-[400px] lg:h-[calc(100vh-8rem)] shrink-0 order-3">
                        {!activeTool ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Sliders className="h-8 w-8 text-white/50" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Properties</h3>
                                <p className="text-sm text-slate-400">Select a tool from the left to adjust settings.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-white font-bold">
                                        {activeTool === "crop" ? "Crop Settings" :
                                            activeTool === "ocr" ? "Extracted Text" :
                                                activeTool === "compress" ? "Compression" :
                                                    activeTool === "convert" ? "Format Conversion" :
                                                        activeTool === "filters" ? "Filters" :
                                                            activeTool === "adjust" ? "Adjustments" :
                                                                activeTool === "transform" ? "Transform" :
                                                                    activeTool === "blur" ? "Blur / Sharpen" :
                                                                        activeTool === "redeye" ? "Red-eye Fix" :
                                                                            activeTool === "draw" ? "Draw" :
                                                                                activeTool === "social-filters" ? "Instagram Filters" :
                                                                                    activeTool === "collage" ? "Collage Maker" :
                                                                                        activeTool === "qr-code" ? "QR Code Generator" :
                                                                                            activeTool === "hand" ? "Pan Tool" :
                                                                                                activeTool === "bg-remove" ? "Background Removal" :
                                                                                                    activeTool === "sticker" ? "Sticker Library" :
                                                                                                        activeTool === "id-card" ? "ID Card A4 Layout" :
                                                                                                            "Settings"}
                                    </h3>

                                </div>

                                {activeTool === "hand" && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-400">Move around the image when zoomed in.</p>
                                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                                                <li>Click and drag on the image to pan.</li>
                                                <li>Use the zoom controls in the top toolbar to zoom in/out.</li>
                                                <li>Double click to reset view.</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {activeTool === "bg-remove" && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-400">Remove image background automatically.</p>
                                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col items-center text-center">
                                            <Wand2 className="h-8 w-8 text-teal-400 mb-2" />
                                            <p className="text-sm text-slate-300 font-medium">Removing Background...</p>
                                            <p className="text-xs text-slate-500 mt-1">This may take a few seconds.</p>
                                        </div>
                                    </div>
                                )}

                                {activeTool === "id-card" && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-400">Combine front & back for A4 printing. The first image is set as the front.</p>

                                        {/* Front Image */}
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-2">Front Image</label>
                                            {frontImage ? (
                                                <>
                                                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/20 group mb-2">
                                                        <img src={frontImage || ""} alt="Front" className="w-full h-full object-cover" style={{ transform: `scale(${frontScale / 100})` }} />
                                                        <button onClick={() => setFrontImage(null)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <div className="mb-2">
                                                        <Slider
                                                            label="Size"
                                                            valueDisplay={`${frontScale}%`}
                                                            min={20}
                                                            max={150}
                                                            step={5}
                                                            value={frontScale}
                                                            onChange={(e) => setFrontScale(parseInt(e.target.value))}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="border border-dashed border-white/20 rounded-lg p-4 flex items-center justify-center text-slate-500 text-xs">
                                                    No front image selected
                                                </div>
                                            )}
                                        </div>

                                        {/* Back Image */}
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-2">Back Image</label>
                                            {!backImage ? (
                                                <div {...getBackImageProps()} className="border border-dashed border-white/20 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                                    <input {...getBackImageInputProps()} />
                                                    <ImageIcon className="h-6 w-6 text-slate-500 mb-2" />
                                                    <span className="text-xs text-slate-400">Upload Back Image</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/20 group mb-2">
                                                        <img src={backImage || ""} alt="Back" className="w-full h-full object-cover" style={{ transform: `scale(${backScale / 100})` }} />
                                                        <button onClick={() => setBackImage(null)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <div className="mb-2">
                                                        <Slider
                                                            label="Size"
                                                            valueDisplay={`${backScale}%`}
                                                            min={20}
                                                            max={150}
                                                            step={5}
                                                            value={backScale}
                                                            onChange={(e) => setBackScale(parseInt(e.target.value))}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Swap Button */}
                                        {frontImage && backImage && (
                                            <button onClick={handleSwapImages} className="w-full btn-secondary flex items-center justify-center gap-2">
                                                <ArrowUpDown className="h-4 w-4" />
                                                Swap Front & Back
                                            </button>
                                        )}

                                        <button
                                            onClick={handleCreateIDCard}
                                            disabled={!frontImage || !backImage}
                                            className="h-10 w-10 mx-auto rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Apply ID Card"
                                        >
                                            <Check className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}

                                {
                                    activeTool === "crop" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400 mb-2">Drag on the image to select crop area.</p>
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={handleCrop}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                    title="Apply Crop"
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "convert" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400 mb-2">Convert image format.</p>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-2">Output Format</label>
                                                <select
                                                    value={selectedFormat}
                                                    onChange={(e) => setSelectedFormat(e.target.value as "png" | "jpeg" | "webp" | "pdf")}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/50"
                                                >
                                                    <option value="png">PNG</option>
                                                    <option value="jpeg">JPG</option>
                                                    <option value="webp">WebP</option>
                                                    <option value="pdf">PDF (Download)</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleConvert(selectedFormat)}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                    title="Convert"
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "ocr" && (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            {isProcessing ? (
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <Wand2 className="h-6 w-6 text-white animate-spin mb-2" />
                                                    <p className="text-xs text-slate-400">Extracting text...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <textarea
                                                        className="flex-1 w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-slate-300 resize-none focus:outline-none focus:border-white/50 mb-4"
                                                        value={extractedText}
                                                        readOnly
                                                        placeholder="Text will appear here..."
                                                    />
                                                    <button
                                                        className="w-full btn-secondary flex items-center justify-center gap-2"
                                                        onClick={() => { navigator.clipboard.writeText(extractedText) }}
                                                        disabled={!extractedText}
                                                    >
                                                        Copy to Clipboard
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "compress" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Reduce file size. Lower quality = smaller file.</p>
                                            <div className="mb-4">
                                                <Slider
                                                    label="Quality"
                                                    valueDisplay={`${compressionQuality}%`}
                                                    min={10}
                                                    max={100}
                                                    value={compressionQuality}
                                                    onChange={(e) => setCompressionQuality(parseInt(e.target.value))}
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">Lower quality = smaller file size</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={handleCompress}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                    title="Compress"
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "filters" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Apply preset image filters.</p>
                                            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                                                {(['grayscale', 'sepia', 'vintage', 'oldCinema', 'retro', 'warm', 'cool', 'twilight', 'sunset', 'forest', 'rust', 'highContrast', 'noir', 'fade', 'kodak', 'technicolor', 'polaroid', 'dramatic', 'golden', 'cyberpunk'] as const).map((filter) => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => setSelectedFilter(filter)}
                                                        className={clsx(
                                                            "px-3 py-2 text-xs rounded-lg border transition-all capitalize",
                                                            selectedFilter === filter
                                                                ? "border-teal-400 bg-teal-500/20 text-teal-300"
                                                                : "border-white/10 text-slate-400 hover:bg-white/5"
                                                        )}
                                                    >
                                                        {filter.replace(/([A-Z])/g, ' $1').trim()}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex justify-center pt-2">
                                                <button
                                                    onClick={applyPreview}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                    title="Apply Filter"
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "social-filters" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Trendy social media filters.</p>
                                            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                                                {(['clarendon', 'gingham', 'juno', 'lark', 'ludwig', 'valencia', 'moon', 'reyes', 'slumber', 'crema', 'aden', 'perpetua'] as const).map((filter) => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => setSelectedFilter(filter)}
                                                        className={clsx(
                                                            "px-3 py-2 text-xs rounded-lg border transition-all capitalize",
                                                            selectedFilter === filter
                                                                ? "border-teal-400 bg-teal-500/20 text-teal-300"
                                                                : "border-white/10 text-slate-400 hover:bg-white/5"
                                                        )}
                                                    >
                                                        {filter}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex justify-center pt-2">
                                                <button
                                                    onClick={applyPreview}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                    title="Apply Filter"
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "adjust" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Adjust brightness, contrast, and saturation.</p>
                                            <div className="space-y-6">
                                                <Slider
                                                    label="Brightness"
                                                    valueDisplay={`${brightness}%`}
                                                    min={0}
                                                    max={200}
                                                    value={brightness}
                                                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                                                />
                                                <Slider
                                                    label="Contrast"
                                                    valueDisplay={`${contrast}%`}
                                                    min={0}
                                                    max={200}
                                                    value={contrast}
                                                    onChange={(e) => setContrast(parseInt(e.target.value))}
                                                />
                                                <Slider
                                                    label="Saturation"
                                                    valueDisplay={`${saturation}%`}
                                                    min={0}
                                                    max={200}
                                                    value={saturation}
                                                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={handleApplyAdjustments}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                    title="Apply Adjustments"
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "transform" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Rotate and flip your image.</p>

                                            {/* Custom Rotation Slider */}
                                            <div className="pt-4 border-t border-white/10 mb-4">
                                                <Slider
                                                    label="Custom Rotation"
                                                    valueDisplay={`${rotation}°`}
                                                    min={-180}
                                                    max={180}
                                                    value={rotation}
                                                    onChange={(e) => setRotation(parseInt(e.target.value))}
                                                />
                                            </div>
                                            {rotation !== 0 && (
                                                <div className="flex justify-center mt-2">
                                                    <button
                                                        onClick={() => handleRotate(rotation)}
                                                        className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                        title="Apply Rotation"
                                                    >
                                                        <Check className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                                                <button onClick={() => handleRotate(-90)} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
                                                    <RotateCcw className="h-4 w-4" />
                                                    <span className="text-xs">Left 90°</span>
                                                </button>
                                                <button onClick={() => handleRotate(90)} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
                                                    <RotateCw className="h-4 w-4" />
                                                    <span className="text-xs">Right 90°</span>
                                                </button>
                                                <button onClick={() => handleFlip('horizontal')} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
                                                    <FlipHorizontal className="h-4 w-4" />
                                                    <span className="text-xs">Flip H</span>
                                                </button>
                                                <button onClick={() => handleFlip('vertical')} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
                                                    <FlipVertical className="h-4 w-4" />
                                                    <span className="text-xs">Flip V</span>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "blur" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Apply blur or sharpen effect.</p>
                                            <div>
                                                <Slider
                                                    label="Blur Amount"
                                                    valueDisplay={`${blurAmount}px`}
                                                    min={0}
                                                    max={20}
                                                    value={blurAmount}
                                                    onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="border-t border-white/10 pt-4">
                                                <Slider
                                                    label="Sharpen Amount"
                                                    valueDisplay={`${sharpenAmount}%`}
                                                    min={0}
                                                    max={100}
                                                    value={sharpenAmount}
                                                    onChange={(e) => setSharpenAmount(parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="flex justify-center pt-4">
                                                <button
                                                    onClick={handleApplyBlurSharpen}
                                                    disabled={blurAmount === 0 && sharpenAmount === 0}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all disabled:opacity-50"
                                                    title="Apply Changes"
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "redeye" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Click the button to automatically detect and fix red-eye in the center area of the image.</p>
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                                <p className="text-xs text-yellow-400">Note: This is a simplified fix that targets the upper-center area where faces typically appear.</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={handleRedEyeFix}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                    title="Fix Red-eye"
                                                >
                                                    <Eye className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "collage" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Combine 2-5 images into a collage.</p>

                                            {/* Image List */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {collageImages.map((img, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setSelectedSlot(idx)}
                                                        className={clsx(
                                                            "relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all",
                                                            selectedSlot === idx ? "border-teal-400 ring-2 ring-teal-500/50" : "border-white/20 hover:border-white/50"
                                                        )}
                                                    >
                                                        <img src={img} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCollageImages(prev => prev.filter((_, i) => i !== idx));
                                                                setCollageTransforms(prev => prev.filter((_, i) => i !== idx));
                                                                if (selectedSlot >= collageImages.length - 1) setSelectedSlot(Math.max(0, collageImages.length - 2));
                                                            }}
                                                            className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                        <div className="absolute bottom-0 left-0 bg-black/50 text-[10px] text-white px-1.5 py-0.5 rounded-tr">
                                                            #{idx + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                                {collageImages.length < 5 && (
                                                    <div {...getCollageProps()} className="aspect-square border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                                        <input {...getCollageInputProps()} />
                                                        <Plus className="h-6 w-6 text-slate-500" />
                                                        <span className="text-[10px] text-slate-500 mt-1">Add Img</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Layout Selector */}
                                            {collageImages.length >= 2 && (
                                                <div>
                                                    <label className="text-xs text-slate-400 block mb-2">Select Layout</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {AVAILABLE_LAYOUTS[collageImages.length]?.map(layout => (
                                                            <button
                                                                key={layout}
                                                                onClick={() => setActiveLayout(layout)}
                                                                className={clsx(
                                                                    "px-3 py-2 text-xs rounded-lg border transition-all capitalize",
                                                                    activeLayout === layout
                                                                        ? "border-teal-400 bg-teal-500/20 text-teal-300"
                                                                        : "border-white/10 text-slate-400 hover:bg-white/5"
                                                                )}
                                                            >
                                                                {layout}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Transform Controls */}
                                            {collageImages.length >= 2 && collageTransforms[selectedSlot] && (
                                                <div className="border-t border-white/10 pt-4 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-bold text-teal-400">Edit Image #{selectedSlot + 1}</label>
                                                        <button
                                                            onClick={() => {
                                                                const newT = [...collageTransforms];
                                                                newT[selectedSlot] = { zoom: 1, panX: 0, panY: 0 };
                                                                setCollageTransforms(newT);
                                                            }}
                                                            className="text-[10px] text-slate-400 hover:text-white"
                                                        >
                                                            Reset
                                                        </button>
                                                    </div>

                                                    {/* Zoom */}
                                                    <div className="mb-4">
                                                        <Slider
                                                            label="Zoom"
                                                            valueDisplay={`${collageTransforms[selectedSlot].zoom.toFixed(1)}x`}
                                                            min={0.5}
                                                            max={3}
                                                            step={0.1}
                                                            value={collageTransforms[selectedSlot].zoom}
                                                            onChange={(e) => {
                                                                const newT = [...collageTransforms];
                                                                newT[selectedSlot] = { ...newT[selectedSlot], zoom: parseFloat(e.target.value) };
                                                                setCollageTransforms(newT);
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Pan X */}
                                                    <div className="mb-4">
                                                        <Slider
                                                            label="Pan Horizontal"
                                                            min={-0.5}
                                                            max={0.5}
                                                            step={0.05}
                                                            value={collageTransforms[selectedSlot].panX}
                                                            onChange={(e) => {
                                                                const newT = [...collageTransforms];
                                                                newT[selectedSlot] = { ...newT[selectedSlot], panX: parseFloat(e.target.value) };
                                                                setCollageTransforms(newT);
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Pan Y */}
                                                    <div className="mb-4">
                                                        <Slider
                                                            label="Pan Vertical"
                                                            min={-0.5}
                                                            max={0.5}
                                                            step={0.05}
                                                            value={collageTransforms[selectedSlot].panY}
                                                            onChange={(e) => {
                                                                const newT = [...collageTransforms];
                                                                newT[selectedSlot] = { ...newT[selectedSlot], panY: parseFloat(e.target.value) };
                                                                setCollageTransforms(newT);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {collageImages.length >= 2 && (
                                                <div className="flex gap-4 justify-center">
                                                    <button
                                                        onClick={() => setCollageImages(prev => [...prev].sort(() => Math.random() - 0.5))}
                                                        className="h-10 w-10 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-white/10 flex items-center justify-center transition-all"
                                                        title="Shuffle"
                                                    >
                                                        <Shuffle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (previewSrc) {
                                                                pushState({ ...imageState!, processedSrc: previewSrc });
                                                                setActiveTool(null);
                                                                setCollageImages([]);
                                                                setActiveLayout(null);
                                                                setPreviewSrc(null);
                                                            }
                                                        }}
                                                        disabled={!previewSrc}
                                                        className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all disabled:opacity-50"
                                                        title="Apply Collage"
                                                    >
                                                        <Check className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "qr-code" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Generate a QR Code and place it on your image.</p>

                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">Type</label>
                                                <select
                                                    value={qrType}
                                                    onChange={(e) => {
                                                        setQrType(e.target.value as any);
                                                        setQrData({});
                                                        setQrText("");
                                                    }}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 hover:border-teal-500/50 transition-colors"
                                                >
                                                    <option value="text" className="bg-slate-950">Text</option>
                                                    <option value="url" className="bg-slate-950">URL</option>
                                                    <option value="wifi" className="bg-slate-950">WiFi Network</option>
                                                    <option value="contact" className="bg-slate-950">Contact (vCard)</option>
                                                    <option value="phone" className="bg-slate-950">Phone Number</option>
                                                    <option value="email" className="bg-slate-950">Email</option>
                                                    <option value="sms" className="bg-slate-950">SMS</option>
                                                    <option value="geo" className="bg-slate-950">Location</option>
                                                </select>
                                            </div>

                                            {(qrType === 'text' || qrType === 'url') && (
                                                <div className="space-y-2">
                                                    <label className="text-xs text-slate-400">Content</label>
                                                    <input
                                                        type="text"
                                                        value={qrText}
                                                        onChange={(e) => setQrText(e.target.value)}
                                                        placeholder={qrType === 'url' ? "https://example.com" : "Enter text here"}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:outline-none focus:border-white/50"
                                                    />
                                                </div>
                                            )}

                                            {qrType === 'wifi' && (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text" placeholder="SSID (Network Name)"
                                                        value={qrData.ssid || ''}
                                                        onChange={e => setQrData({ ...qrData, ssid: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300 mb-2"
                                                    />
                                                    <input
                                                        type="text" placeholder="Password"
                                                        value={qrData.password || ''}
                                                        onChange={e => setQrData({ ...qrData, password: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300 mb-2"
                                                    />
                                                    <select
                                                        value={qrData.encryption || 'WPA'}
                                                        onChange={e => setQrData({ ...qrData, encryption: e.target.value })}
                                                        className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-sm text-slate-300 mb-2 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 hover:border-teal-500/50 transition-colors"
                                                    >
                                                        <option value="WPA" className="bg-slate-950">WPA/WPA2</option>
                                                        <option value="WEP" className="bg-slate-950">WEP</option>
                                                        <option value="nopass" className="bg-slate-950">No Encryption</option>
                                                    </select>
                                                    <label className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={qrData.hidden || false}
                                                            onChange={e => setQrData({ ...qrData, hidden: e.target.checked })}
                                                            className="rounded border-white/10 bg-black/40 text-teal-500 focus:ring-teal-500"
                                                        />
                                                        <span className="text-xs text-slate-400">Hidden Community</span>
                                                    </label>
                                                </div>
                                            )}

                                            {qrType === 'contact' && (
                                                <div className="space-y-2">
                                                    <input type="text" placeholder="Full Name" value={qrData.name || ''} onChange={e => setQrData({ ...qrData, name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <input type="text" placeholder="Phone" value={qrData.phone || ''} onChange={e => setQrData({ ...qrData, phone: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <input type="email" placeholder="Email" value={qrData.email || ''} onChange={e => setQrData({ ...qrData, email: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <input type="text" placeholder="Organization" value={qrData.org || ''} onChange={e => setQrData({ ...qrData, org: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <input type="text" placeholder="Job Title" value={qrData.title || ''} onChange={e => setQrData({ ...qrData, title: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <input type="text" placeholder="Website" value={qrData.url || ''} onChange={e => setQrData({ ...qrData, url: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                </div>
                                            )}

                                            {qrType === 'phone' && (
                                                <div className="space-y-2">
                                                    <input type="tel" placeholder="Phone Number" value={qrData.phone || ''} onChange={e => setQrData({ ...qrData, phone: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                </div>
                                            )}

                                            {qrType === 'sms' && (
                                                <div className="space-y-2">
                                                    <input type="tel" placeholder="Phone Number" value={qrData.phone || ''} onChange={e => setQrData({ ...qrData, phone: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <textarea placeholder="Message" value={qrData.message || ''} onChange={e => setQrData({ ...qrData, message: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300 resize-none h-20" />
                                                </div>
                                            )}

                                            {qrType === 'email' && (
                                                <div className="space-y-2">
                                                    <input type="email" placeholder="Email Address" value={qrData.email || ''} onChange={e => setQrData({ ...qrData, email: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <input type="text" placeholder="Subject" value={qrData.subject || ''} onChange={e => setQrData({ ...qrData, subject: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <textarea placeholder="Body" value={qrData.body || ''} onChange={e => setQrData({ ...qrData, body: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300 resize-none h-20" />
                                                </div>
                                            )}

                                            {qrType === 'geo' && (
                                                <div className="space-y-2 flex gap-2">
                                                    <input type="text" placeholder="Latitude" value={qrData.lat || ''} onChange={e => setQrData({ ...qrData, lat: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                    <input type="text" placeholder="Longitude" value={qrData.long || ''} onChange={e => setQrData({ ...qrData, long: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-slate-300" />
                                                </div>
                                            )}

                                            <button
                                                onClick={handleGenerateQR}
                                                className="w-full btn-secondary disabled:opacity-50"
                                            >
                                                Generate QR
                                            </button>

                                            {qrCodeSrc && (
                                                <div className="border-t border-white/10 pt-4 space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-slate-400">Size</label>
                                                        <Slider
                                                            label=""
                                                            valueDisplay={`${Math.round(qrSize)}px`}
                                                            min={50}
                                                            max={1000}
                                                            value={qrSize}
                                                            onChange={(e) => setQrSize(parseInt(e.target.value))}
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs text-slate-400">Position X</label>
                                                        <Slider
                                                            label=""
                                                            valueDisplay={`${Math.round(qrPosition.x)}px`}
                                                            min={0}
                                                            max={imageRef.current?.naturalWidth || 1000}
                                                            value={qrPosition.x}
                                                            onChange={(e) => setQrPosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs text-slate-400">Position Y</label>
                                                        <Slider
                                                            label=""
                                                            valueDisplay={`${Math.round(qrPosition.y)}px`}
                                                            min={0}
                                                            max={imageRef.current?.naturalHeight || 1000}
                                                            value={qrPosition.y}
                                                            onChange={(e) => setQrPosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                                                        />
                                                    </div>

                                                    <div className="flex gap-4 pt-2 justify-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setQrCodeSrc(null); }}
                                                            className="h-10 w-10 rounded-full bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 border border-white/10 flex items-center justify-center transition-all shadow-lg"
                                                            title="Cancel"
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApplyQR(); }}
                                                            className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                            title="Apply"
                                                        >
                                                            <Check className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "sticker" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Choose a sticker to add to your image.</p>

                                            {/* Categories */}
                                            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                                                {STICKER_CATEGORIES.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setActiveStickerTab(cat.id)}
                                                        className={clsx(
                                                            "px-3 py-1 text-xs rounded-full border transition-all whitespace-nowrap",
                                                            activeStickerTab === cat.id
                                                                ? "border-teal-400 bg-teal-500/20 text-teal-300"
                                                                : "border-white/10 text-slate-400 hover:bg-white/5"
                                                        )}
                                                    >
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Sticker Grid */}
                                            <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                                                {STICKER_CATEGORIES.find(c => c.id === activeStickerTab)?.items.map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSelectSticker(item)}
                                                        className="aspect-square flex items-center justify-center text-2xl hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/20"
                                                    >
                                                        {item}
                                                    </button>
                                                ))}
                                            </div>

                                            {activeSticker && (
                                                <div className="border-t border-white/10 pt-4 space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-slate-400">Size</label>
                                                        <Slider
                                                            label=""
                                                            valueDisplay={`${Math.round(stickerSize)}px`}
                                                            min={50}
                                                            max={1000}
                                                            value={stickerSize}
                                                            onChange={(e) => setStickerSize(parseInt(e.target.value))}
                                                        />
                                                    </div>

                                                    <div className="flex gap-4 pt-2 justify-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveSticker(null); }}
                                                            className="h-10 w-10 rounded-full bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 border border-white/10 flex items-center justify-center transition-all shadow-lg"
                                                            title="Cancel"
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApplySticker(); }}
                                                            className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                            title="Apply"
                                                        >
                                                            <Check className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }

                                {
                                    activeTool === "draw" && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-400">Draw on your image with pen, highlighter, or eraser.</p>

                                            {/* Drawing Mode Selection */}
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-2">Tool</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        onClick={() => setDrawingMode('pen')}
                                                        className={clsx(
                                                            "flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs transition-all",
                                                            drawingMode === 'pen' ? "border-teal-400 bg-teal-500/20 text-teal-300" : "border-white/10 text-slate-400 hover:bg-white/5"
                                                        )}
                                                    >
                                                        <Pencil className="h-3 w-3" /> Pen
                                                    </button>
                                                    <button
                                                        onClick={() => setDrawingMode('highlighter')}
                                                        className={clsx(
                                                            "flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs transition-all",
                                                            drawingMode === 'highlighter' ? "border-teal-400 bg-teal-500/20 text-teal-300" : "border-white/10 text-slate-400 hover:bg-white/5"
                                                        )}
                                                    >
                                                        <Highlighter className="h-3 w-3" /> Highlight
                                                    </button>
                                                    <button
                                                        onClick={() => setDrawingMode('eraser')}
                                                        className={clsx(
                                                            "flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs transition-all",
                                                            drawingMode === 'eraser' ? "border-teal-400 bg-teal-500/20 text-teal-300" : "border-white/10 text-slate-400 hover:bg-white/5"
                                                        )}
                                                    >
                                                        <Eraser className="h-3 w-3" /> Eraser
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Color Picker */}
                                            {drawingMode !== 'eraser' && (
                                                <div>
                                                    <label className="text-xs text-slate-400 block mb-2">Color</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={brushColor}
                                                            onChange={(e) => setBrushColor(e.target.value)}
                                                            className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                                                        />
                                                        <div className="flex gap-1">
                                                            {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'].map(color => (
                                                                <button
                                                                    key={color}
                                                                    onClick={() => setBrushColor(color)}
                                                                    className={clsx(
                                                                        "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                                                        brushColor === color ? "border-white" : "border-white/20"
                                                                    )}
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Brush Size */}
                                            <div>
                                                <Slider
                                                    label="Brush Size"
                                                    valueDisplay={`${brushSize}px`}
                                                    min={1}
                                                    max={200}
                                                    value={brushSize}
                                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                                />
                                            </div>

                                            {/* Highlighter Opacity - Only show for highlighter */}
                                            {drawingMode === 'highlighter' && (
                                                <div>
                                                    <Slider
                                                        label="Opacity"
                                                        valueDisplay={`${Math.round(highlighterOpacity * 100)}%`}
                                                        min={10}
                                                        max={100}
                                                        step={5}
                                                        value={highlighterOpacity * 100}
                                                        onChange={(e) => setHighlighterOpacity(parseInt(e.target.value) / 100)}
                                                    />
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            {/* Action Buttons */}
                                            <div className="flex gap-4 pt-2 justify-center">
                                                <button
                                                    onClick={clearDrawing}
                                                    className="h-10 w-10 rounded-full bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 border border-white/10 flex items-center justify-center transition-all shadow-lg"
                                                    title="Clear Drawing"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={applyDrawing}
                                                    className="h-10 w-10 rounded-full bg-teal-500 text-white hover:bg-teal-400 hover:shadow-teal-500/50 shadow-lg shadow-teal-500/20 border border-transparent flex items-center justify-center transition-all"
                                                    title="Apply Drawing"
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }
                            </>
                        )}
                    </aside >
                )
            }
            {/* Custom Cursor */}
            {
                activeTool === "draw" && showCursor && (
                    <div
                        className="fixed pointer-events-none rounded-full z-[100]"
                        style={{
                            left: cursorPos.x,
                            top: cursorPos.y,
                            width: `${(brushSize * (drawingMode === 'highlighter' ? 3 : 1)) * imageScale}px`,
                            height: `${(brushSize * (drawingMode === 'highlighter' ? 3 : 1)) * imageScale}px`,
                            transform: 'translate(-50%, -50%)',
                            border: '1px solid white',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                            backgroundColor: 'transparent'
                        }}
                    />
                )
            }
        </div >
    );
}

function ToolButton({ active, icon, label, onClick, disabled }: { active?: boolean; icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group lg:justify-start justify-center relative overflow-hidden",
                active
                    ? "bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-400 ring-1 ring-teal-500/50 shadow-[0_0_15px_-3px_rgba(20,184,166,0.3)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                disabled && "opacity-50 cursor-not-allowed grayscale"
            )}
        >
            <div className={clsx("h-5 w-5 transition-colors", active ? "text-teal-400" : "text-slate-300 group-hover:text-white")}>{icon}</div>
            <span className={clsx("hidden xl:block font-medium text-sm transition-colors", active ? "text-white" : "text-slate-300 group-hover:text-white")}>{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 hidden xl:block shadow-[0_0_8px_rgba(20,184,166,0.8)]" />}
        </button>
    );
}
