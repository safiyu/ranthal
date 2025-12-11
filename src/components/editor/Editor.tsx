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
    Sun
} from "lucide-react";
import { saveEdit } from "@/app/actions";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { removeBg, extractText, compressImage, cancelBgRemoval, cancelOcr } from "@/lib/image-processing";
import { createIDCard } from "@/lib/id-card-utils";
import { createCollage, AVAILABLE_LAYOUTS, type LayoutType, type CollageTransform } from "@/lib/collage-utils";
import getCroppedImg from "@/lib/crop-utils";
import { applyFilter, applyAdjustments, rotateImage, flipImage, applyBlur, applySharpen, fixRedEye, type FilterName } from "@/lib/image-effects";
import { useToast } from "@/components/Toast";
import { jsPDF } from "jspdf";
import EXIF from "exif-js";

type Tool = "bg-remove" | "crop" | "ocr" | "id-card" | "compress" | "convert" | "filters" | "social-filters" | "adjust" | "transform" | "blur" | "redeye" | "draw" | "hand" | "collage";
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

import { useEditorState } from "@/context/EditorContext";

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
    const [compressionQuality, setCompressionQuality] = useState(60);

    // ID Card State - Front and Back images
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [frontScale, setFrontScale] = useState(100); // % scale for front image
    const [backScale, setBackScale] = useState(100); // % scale for back image

    // Format Conversion State
    const [selectedFormat, setSelectedFormat] = useState<"png" | "jpeg" | "webp" | "pdf">("png");

    // Filters State
    const [selectedFilter, setSelectedFilter] = useState<FilterName>("grayscale");

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

    // Preview State (for real-time collage/adjustments before commit)
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);


    // CSS Filter string for real-time preview
    const getPreviewFilter = () => {
        if (activeTool === "filters") {
            const filterPresets: Record<FilterName, string> = {
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
            };
            return filterPresets[selectedFilter];
        }
        if (activeTool === "social-filters") {
            const filterPresets: Record<FilterName, string> = {
                grayscale: 'grayscale(100%)', // Fallbacks/Common
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
            };
            return filterPresets[selectedFilter];
        }
        if (activeTool === "adjust") {
            return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        }
        if (activeTool === "blur" && blurAmount > 0) {
            return `blur(${blurAmount}px)`;
        }
        return 'none';
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

    const currentImage = previewSrc || imageState?.processedSrc || imageState?.src;

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
        if (!imageState?.src) return;
        setIsProcessing(true);
        try {
            const source = currentImage || imageState.src;
            const newSrc = await removeBg(source);
            pushState({ ...imageState, processedSrc: newSrc });
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

    const handleCrop = async () => {
        if (!currentImage || !croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const croppedImage = await getCroppedImg(currentImage, croppedAreaPixels);
            pushState({ ...imageState!, processedSrc: croppedImage });
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
            const newSrc = await createIDCard(frontImage, backImage, frontScale / 100, backScale / 100);
            pushState({ ...imageState!, processedSrc: newSrc });
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
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const newSrc = await compressImage(currentImage, compressionQuality / 100);
            pushState({ ...imageState!, processedSrc: newSrc });
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
        if (!currentImage) return;

        startTransition(async () => {
            try {
                // Convert image to blob (handles both data URLs and regular URLs)
                const blob = await imageToBlob(currentImage);

                // Determine file extension from mime type
                let extension = 'png';
                if (blob.type === 'image/jpeg') extension = 'jpg';
                else if (blob.type === 'image/webp') extension = 'webp';
                else if (blob.type === 'image/gif') extension = 'gif';

                const file = new File([blob], `edit.${extension}`, { type: blob.type });

                const formData = new FormData();
                formData.append("resultImage", file);
                formData.append("originalUrl", imageState?.src || "");
                formData.append("toolUsed", activeTool || "unknown");

                const result = await saveEdit(formData);
                if (result.success) {
                    showToast("Project saved successfully!", "success");
                    router.refresh();
                }
            } catch (error) {
                console.error("Failed to save:", error);
                showToast("Failed to save project.", "error");
            }
        });
    };

    const handleDownload = async () => {
        if (!currentImage) return;

        // Helper function to convert data URL to Blob
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

        // Helper to convert any image URL to data URL via canvas
        const toDataURL = async (imageUrl: string): Promise<string> => {
            if (imageUrl.startsWith('data:')) {
                return imageUrl;
            }
            // For blob URLs or other URLs, convert via canvas
            return new Promise<string>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        reject(new Error('Canvas context failed'));
                    }
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = imageUrl;
            });
        };

        // Fallback download function for browsers without File System Access API
        const fallbackDownload = (blob: Blob, filename: string) => {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        };

        try {
            // First ensure we have a data URL
            const dataUrl = await toDataURL(currentImage);

            // Determine file extension and mime type from data URL
            let extension = 'png';
            let mimeType = 'image/png';
            if (dataUrl.startsWith('data:image/')) {
                const mimeMatch = dataUrl.match(/data:image\/(\w+)/);
                if (mimeMatch) {
                    extension = mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1];
                    mimeType = `image/${mimeMatch[1]}`;
                }
            }

            const defaultFilename = `ranthal-edit-${Date.now()}.${extension}`;

            // Convert data URL to Blob
            const blob = dataURLtoBlob(dataUrl);

            // Check if File System Access API is available (Chrome/Edge)
            if ('showSaveFilePicker' in window) {
                try {
                    const fileHandle = await (window as any).showSaveFilePicker({
                        suggestedName: defaultFilename,
                        types: [
                            {
                                description: 'Image Files',
                                accept: {
                                    [mimeType]: [`.${extension}`],
                                    'image/png': ['.png'],
                                    'image/jpeg': ['.jpg', '.jpeg'],
                                    'image/webp': ['.webp'],
                                },
                            },
                        ],
                    });

                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } catch (err: any) {
                    // User cancelled the save dialog
                    if (err.name === 'AbortError') {
                        return;
                    }
                    // Fallback if something else went wrong
                    console.warn('File System Access API failed, using fallback:', err);
                    fallbackDownload(blob, defaultFilename);
                }
            } else {
                // Use fallback for browsers without File System Access API
                fallbackDownload(blob, defaultFilename);
            }
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed. Please try again.');
        }
    };

    // Filter handler
    const handleApplyFilter = async () => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const newSrc = await applyFilter(currentImage, selectedFilter);
            pushState({ ...imageState!, processedSrc: newSrc });
        } catch (err) {
            showToast("Failed to apply filter", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    };

    // Adjustments handler
    const handleApplyAdjustments = async () => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const newSrc = await applyAdjustments(currentImage, brightness, contrast, saturation);
            pushState({ ...imageState!, processedSrc: newSrc });
        } catch (err) {
            showToast("Failed to apply adjustments", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
            setBrightness(100);
            setContrast(100);
            setSaturation(100);
        }
    };

    // Rotate handler
    const handleRotate = async (angle: number) => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const newSrc = await rotateImage(currentImage, angle);
            pushState({ ...imageState!, processedSrc: newSrc });
            setRotation(0); // Reset slider after applying
        } catch (err) {
            showToast("Failed to rotate", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Flip handler
    const handleFlip = async (direction: 'horizontal' | 'vertical') => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const newSrc = await flipImage(currentImage, direction);
            pushState({ ...imageState!, processedSrc: newSrc });
        } catch (err) {
            showToast("Failed to flip", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Blur handler
    const handleApplyBlur = async () => {
        if (!currentImage || blurAmount === 0) return;
        setIsProcessing(true);
        try {
            const newSrc = await applyBlur(currentImage, blurAmount);
            pushState({ ...imageState!, processedSrc: newSrc });
        } catch (err) {
            showToast("Failed to apply blur", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
            setBlurAmount(0);
        }
    };

    // Sharpen handler
    const handleApplySharpen = async () => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const newSrc = await applySharpen(currentImage, sharpenAmount / 100);
            pushState({ ...imageState!, processedSrc: newSrc });
        } catch (err) {
            showToast("Failed to sharpen", "error");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
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

    // Drawing handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

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

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

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

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--color-bg-page)]">
            {/* Sidebar (Left) */}
            {/* Sidebar (Left) */}
            <aside className="w-20 xl:w-72 m-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur-xl flex flex-col items-center xl:items-stretch py-6 z-30 shadow-2xl overflow-hidden h-[calc(100vh-8rem)]">
                <div className="flex-1 px-3 xl:px-6 overflow-y-auto scrollbar-hide space-y-6">

                    {/* Group: Essentials */}
                    <div className="space-y-2">
                        <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Essentials</h3>
                        <ToolButton active={activeTool === "crop"} onClick={() => setActiveTool("crop")} icon={<CropIcon />} label="Crop & Resize" disabled={!imageState} />
                        <ToolButton active={activeTool === "hand"} onClick={() => setActiveTool("hand")} icon={<Hand />} label="Pan Tool" disabled={!imageState} />
                        <ToolButton active={activeTool === "id-card"} onClick={() => { setActiveTool("id-card"); if (currentImage && !frontImage) setFrontImage(currentImage); }} icon={<CreditCard />} label="ID Card" disabled={!imageState} />
                    </div>

                    {/* Group: Adjustments */}
                    <div className="space-y-2">
                        <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Adjustments</h3>
                        <ToolButton active={activeTool === "filters"} onClick={() => setActiveTool("filters")} icon={<Palette />} label="Filters" disabled={!imageState} />
                        <ToolButton active={activeTool === "adjust"} onClick={() => setActiveTool("adjust")} icon={<SlidersHorizontal />} label="Tune Image" disabled={!imageState} />
                        <ToolButton active={activeTool === "blur"} onClick={() => setActiveTool("blur")} icon={<Focus />} label="Blur & Sharpen" disabled={!imageState} />
                        <ToolButton active={activeTool === "transform"} onClick={() => setActiveTool("transform")} icon={<RotateCw />} label="Transform" disabled={!imageState} />
                    </div>

                    {/* Group: Social */}
                    <div className="space-y-2">
                        <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Social</h3>
                        <ToolButton active={activeTool === "social-filters"} onClick={() => setActiveTool("social-filters")} icon={<Filter />} label="Insta Filters" disabled={!imageState} />
                    </div>

                    {/* Group: Smart Actions */}
                    <div className="space-y-2">
                        <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Smart Tools</h3>
                        <ToolButton active={activeTool === "bg-remove"} onClick={() => { setActiveTool("bg-remove"); handleBgRemove(); }} icon={<Layers />} label="Remove BG" disabled={!imageState} />
                        <ToolButton active={activeTool === "collage"} onClick={() => {
                            setActiveTool("collage");
                            if (currentImage && collageImages.length === 0) {
                                setCollageImages([currentImage]);
                                setCollageTransforms([{ zoom: 1, panX: 0, panY: 0 }]);
                            }
                        }} icon={<LayoutGrid />} label="Collage" disabled={!imageState} />
                        <ToolButton active={activeTool === "ocr"} onClick={handleOcr} icon={<ScanText />} label="Extract Text" disabled={!imageState} />
                        <ToolButton active={activeTool === "redeye"} onClick={() => setActiveTool("redeye")} icon={<Eye />} label="Red-eye Fix" disabled={!imageState} />
                    </div>

                    {/* Group: Creative */}
                    <div className="space-y-2">
                        <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Creative</h3>
                        <ToolButton active={activeTool === "draw"} onClick={() => setActiveTool("draw")} icon={<Pencil />} label="Draw" disabled={!imageState} />
                    </div>

                    {/* Group: Utilities */}
                    <div className="space-y-2">
                        <h3 className="hidden xl:block text-xs font-bold text-teal-400 uppercase tracking-wider px-2">Export</h3>
                        <ToolButton active={activeTool === "convert"} onClick={() => setActiveTool("convert")} icon={<FileType />} label="Format Convert" disabled={!imageState} />
                        <ToolButton active={activeTool === "compress"} onClick={() => setActiveTool("compress")} icon={<Minimize2 />} label="Compress" disabled={!imageState} />
                    </div>


                </div>
            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 relative bg-[var(--color-bg-page)] overflow-hidden flex items-center justify-center p-8">

                {/* Top Toolbar (Undo/Redo/Zoom) */}
                {imageState && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40 bg-black/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
                        <button onClick={undo} disabled={!canUndo} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors" title="Undo">
                            <Undo className="h-4 w-4" />
                        </button>
                        <div className="w-px h-4 bg-white/20" />
                        <button onClick={redo} disabled={!canRedo} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors" title="Redo">
                            <Redo className="h-4 w-4" />
                        </button>
                        <div className="w-px h-4 bg-white/20" />
                        <button onClick={() => setViewZoom(Math.max(25, viewZoom - 25))} disabled={viewZoom <= 25} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors" title="Zoom Out">
                            <ZoomOut className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-white font-medium min-w-[40px] text-center">{viewZoom}%</span>
                        <button onClick={() => setViewZoom(Math.min(200, viewZoom + 25))} disabled={viewZoom >= 200} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors" title="Zoom In">
                            <ZoomIn className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {!imageState ? (
                    <div
                        {...getRootProps()}
                        className={clsx(
                            "w-full max-w-xl aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all",
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
                                    "relative transition-transform duration-75 ease-linear will-change-transform w-full h-full flex items-center justify-center",
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
                                <img
                                    ref={imageRef}
                                    src={currentImage || ""}
                                    alt="Work in progress"
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-sm transition-all"
                                    style={{
                                        filter: getPreviewFilter(),
                                        transform: `scale(${viewZoom / 100}) ${activeTool === "transform" && rotation !== 0 ? `rotate(${rotation}deg)` : ""}`
                                    }}
                                />
                                {activeTool === "draw" && (
                                    <>
                                        <canvas
                                            ref={canvasRef}
                                            width={imageRef.current?.clientWidth || 800}
                                            height={imageRef.current?.clientHeight || 600}
                                            className="absolute inset-0 cursor-crosshair"
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                        />
                                        <canvas
                                            ref={tempCanvasRef}
                                            width={imageRef.current?.clientWidth || 800}
                                            height={imageRef.current?.clientHeight || 600}
                                            className="absolute inset-0 pointer-events-none"
                                            style={{
                                                opacity: drawingMode === 'highlighter' ? highlighterOpacity : 1,
                                                mixBlendMode: drawingMode === 'highlighter' ? 'multiply' : 'normal'
                                            }}
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {isProcessing && (
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
                )}

                {/* Action Buttons (Top Right) */}
                <div className="absolute top-4 right-4 flex gap-2 z-40">
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
                            // Clear URL parameter when closing
                            router.push('/editor');
                        }}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-violet-500 text-white hover:bg-violet-600 backdrop-blur-md transition-colors shadow-lg"
                        title="Close / Reset"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </main>



            {/* Properties Panel (Right side) */}
            {
                (activeTool === "crop" || activeTool === "ocr" || activeTool === "compress" || activeTool === "id-card" || activeTool === "convert" || activeTool === "filters" || activeTool === "social-filters" || activeTool === "adjust" || activeTool === "transform" || activeTool === "blur" || activeTool === "redeye" || activeTool === "draw" || activeTool === "collage") && (
                    <aside className="w-80 m-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur-xl p-6 z-20 flex flex-col transition-all overflow-y-auto shadow-2xl animate-slide-in-right h-[calc(100vh-8rem)]">
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
                                                                                "ID Card A4 Layout"}
                            </h3>
                            <button
                                onClick={() => setActiveTool(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

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

                                <button onClick={handleCreateIDCard} disabled={!frontImage || !backImage} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                    <CreditCard className="h-4 w-4" />
                                    Apply
                                </button>
                            </div>
                        )}

                        {activeTool === "crop" && (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400 mb-2">Drag on the image to select crop area.</p>
                                <button onClick={handleCrop} className="w-full btn-primary">
                                    <CropIcon className="h-4 w-4" />
                                    Apply
                                </button>
                            </div>
                        )}

                        {activeTool === "convert" && (
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
                                <button onClick={() => handleConvert(selectedFormat)} className="w-full btn-primary">
                                    <Download className="h-4 w-4" />
                                    Apply
                                </button>
                            </div>
                        )}

                        {activeTool === "ocr" && (
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
                        )}

                        {activeTool === "compress" && (
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
                                <button onClick={handleCompress} className="w-full btn-primary">
                                    <Minimize2 className="h-4 w-4" />
                                    Apply
                                </button>
                            </div>
                        )}

                        {activeTool === "filters" && (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400">Apply preset image filters.</p>
                                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                                    {(['grayscale', 'sepia', 'vintage', 'warm', 'cool', 'highContrast', 'noir', 'fade', 'kodak', 'technicolor', 'polaroid', 'dramatic', 'golden', 'cyberpunk'] as const).map((filter) => (
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
                                <button onClick={handleApplyFilter} className="w-full btn-primary">Apply Filter</button>
                            </div>
                        )}

                        {activeTool === "social-filters" && (
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
                                <button onClick={handleApplyFilter} className="w-full btn-primary">Apply</button>
                            </div>
                        )}

                        {activeTool === "adjust" && (
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
                                <button onClick={handleApplyAdjustments} className="w-full btn-primary">
                                    <Sliders className="h-4 w-4" />
                                    Apply
                                </button>
                            </div>
                        )}

                        {activeTool === "transform" && (
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
                                    <button
                                        onClick={() => handleRotate(rotation)}
                                        className="w-full btn-primary mt-2"
                                    >
                                        <RotateCw className="h-4 w-4" />
                                        Apply
                                    </button>
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
                        )}

                        {activeTool === "blur" && (
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
                                <button onClick={handleApplyBlur} disabled={blurAmount === 0} className="w-full btn-primary disabled:opacity-50">
                                    <Droplets className="h-4 w-4" />
                                    Apply
                                </button>
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
                                <button onClick={handleApplySharpen} disabled={sharpenAmount === 0} className="w-full btn-secondary disabled:opacity-50">
                                    <Zap className="h-4 w-4" />
                                    Apply
                                </button>
                            </div>
                        )}

                        {activeTool === "redeye" && (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400">Click the button to automatically detect and fix red-eye in the center area of the image.</p>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                    <p className="text-xs text-yellow-400">Note: This is a simplified fix that targets the upper-center area where faces typically appear.</p>
                                </div>
                                <button onClick={handleRedEyeFix} className="w-full btn-primary">Fix Red-eye</button>
                            </div>
                        )}

                        {activeTool === "collage" && (
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
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCollageImages(prev => [...prev].sort(() => Math.random() - 0.5))}
                                            className="flex-1 btn-secondary flex items-center justify-center gap-2"
                                        >
                                            <Shuffle className="h-4 w-4" /> Shuffle
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
                                            className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Check className="h-4 w-4" /> Apply
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTool === "draw" && (
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
                                        max={30}
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
                                <div className="flex gap-2">
                                    <button onClick={clearDrawing} className="flex-1 btn-secondary">Clear</button>
                                    <button onClick={applyDrawing} className="flex-1 btn-primary">Apply Drawing</button>
                                </div>
                            </div>
                        )}
                    </aside>
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
