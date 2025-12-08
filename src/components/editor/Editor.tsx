"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Layers, Crop as CropIcon, Image as ImageIcon, Download, ScanText, X, Wand2, CreditCard, Undo, Redo, Minimize2, FileType, ArrowUpDown, Palette, SlidersHorizontal, RotateCw, Focus, Eye, FlipHorizontal, FlipVertical, RotateCcw, Pencil, Eraser, Highlighter, ZoomIn, ZoomOut, Hand } from "lucide-react";
import clsx from "clsx";
import Cropper from "react-easy-crop";
import { removeBg, extractText, compressImage } from "@/lib/image-processing";
import { createIDCard } from "@/lib/id-card-utils";
import getCroppedImg from "@/lib/crop-utils";
import { useHistory } from "@/hooks/useHistory";
import { applyFilter, applyAdjustments, rotateImage, flipImage, applyBlur, applySharpen, fixRedEye, type FilterName } from "@/lib/image-effects";

type Tool = "bg-remove" | "crop" | "ocr" | "id-card" | "compress" | "convert" | "filters" | "adjust" | "transform" | "blur" | "redeye" | "draw" | "hand";
type DrawingMode = "pen" | "highlighter" | "eraser";

type ImageState = {
    src: string;
    processedSrc: string | null;
};

export function Editor() {
    const { state: imageState, pushState, undo, redo, canUndo, canRedo } = useHistory<ImageState | null>(null);
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Crop State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
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
    const [selectedFormat, setSelectedFormat] = useState<"png" | "jpeg" | "webp">("png");

    // Filters State
    const [selectedFilter, setSelectedFilter] = useState<FilterName>("grayscale");

    // Adjustments State
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);

    // Blur/Sharpen State
    const [blurAmount, setBlurAmount] = useState(0);
    const [sharpenAmount, setSharpenAmount] = useState(0);

    // Drawing State
    const [drawingMode, setDrawingMode] = useState<DrawingMode>("pen");
    const [brushColor, setBrushColor] = useState("#ff0000");
    const [brushSize, setBrushSize] = useState(5);
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

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

    const currentImage = imageState?.processedSrc || imageState?.src;

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
            alert("Error removing background");
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
            alert("Crop failed");
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
            alert("Error creating ID Card");
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
            alert("Compression failed");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    }

    const handleConvert = async (format: "png" | "jpeg" | "webp") => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const img = new Image();
            img.src = currentImage;
            await new Promise((resolve) => { img.onload = resolve; });

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
            alert("Conversion failed");
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
            alert("Failed to extract text");
        } finally {
            setIsProcessing(false);
        }
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

            const defaultFilename = `lumin-edit-${Date.now()}.${extension}`;

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
            alert("Failed to apply filter");
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
            alert("Failed to apply adjustments");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
            setBrightness(100);
            setContrast(100);
            setSaturation(100);
        }
    };

    // Rotate handler
    const handleRotate = async (angle: 90 | 180 | 270) => {
        if (!currentImage) return;
        setIsProcessing(true);
        try {
            const newSrc = await rotateImage(currentImage, angle);
            pushState({ ...imageState!, processedSrc: newSrc });
        } catch (err) {
            alert("Failed to rotate");
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
            alert("Failed to flip");
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
            alert("Failed to apply blur");
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
            alert("Failed to sharpen");
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
            alert("Failed to fix red-eye");
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
        } else if (drawingMode === 'highlighter') {
            // Convert hex to rgba with transparency for highlighter effect
            const hex = brushColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            // source-over works better for a digital highlighter feel than multiply
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`; // 50% opacity
            ctx.lineWidth = brushSize * 3;
            // Removed globalAlpha override as we're using rgba
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColor;
            ctx.globalAlpha = 1;
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

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
            }
        }
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
            alert("Failed to apply drawing");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Sidebar (Left) */}
            <div className="w-20 lg:w-64 border-r border-white/10 bg-black/20 flex flex-col items-center lg:items-stretch py-4 z-10 glass-panel">
                <div className="flex-1 space-y-2 px-2 lg:px-4">
                    <ToolButton
                        active={activeTool === "bg-remove"}
                        onClick={() => { setActiveTool("bg-remove"); handleBgRemove(); }}
                        icon={<Layers />}
                        label="Remove BG"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "crop"}
                        onClick={() => setActiveTool("crop")}
                        icon={<CropIcon />}
                        label="Crop & Resize"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "hand"}
                        onClick={() => setActiveTool("hand")}
                        icon={<Hand />}
                        label="Pan Tool"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "id-card"}
                        onClick={() => {
                            setActiveTool("id-card");
                            if (currentImage && !frontImage) {
                                setFrontImage(currentImage);
                            }
                        }}
                        icon={<CreditCard />}
                        label="ID Card A4 Layout"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "convert"}
                        onClick={() => setActiveTool("convert")}
                        icon={<FileType />}
                        label="Format Convert"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "ocr"}
                        onClick={handleOcr}
                        icon={<ScanText />}
                        label="Extract Text"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "compress"}
                        onClick={() => setActiveTool("compress")}
                        icon={<Minimize2 />}
                        label="Compress"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "filters"}
                        onClick={() => setActiveTool("filters")}
                        icon={<Palette />}
                        label="Filters"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "adjust"}
                        onClick={() => setActiveTool("adjust")}
                        icon={<SlidersHorizontal />}
                        label="Adjust"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "transform"}
                        onClick={() => setActiveTool("transform")}
                        icon={<RotateCw />}
                        label="Transform"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "blur"}
                        onClick={() => setActiveTool("blur")}
                        icon={<Focus />}
                        label="Blur/Sharpen"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "redeye"}
                        onClick={() => setActiveTool("redeye")}
                        icon={<Eye />}
                        label="Red-eye Fix"
                        disabled={!imageState}
                    />
                    <ToolButton
                        active={activeTool === "draw"}
                        onClick={() => setActiveTool("draw")}
                        icon={<Pencil />}
                        label="Draw"
                        disabled={!imageState}
                    />
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden flex items-center justify-center p-8">

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
                            <div className="relative w-full h-full bg-black/50">
                                <Cropper
                                    image={currentImage || ""}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={undefined}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                                />
                            </div>
                        ) : (
                            <div
                                className={clsx(
                                    "relative transition-transform duration-75 ease-linear will-change-transform",
                                    activeTool === "hand" ? (isPanning ? "cursor-grabbing" : "cursor-grab") : ""
                                )}
                                style={{
                                    transform: `scale(${viewZoom / 100}) translate(${pan.x}px, ${pan.y}px)`
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
                                    style={{ filter: getPreviewFilter() }}
                                />
                                {activeTool === "draw" && (
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
                                )}
                            </div>
                        )}

                        {isProcessing && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="flex flex-col items-center">
                                    <Wand2 className="h-8 w-8 text-white animate-spin mb-2" />
                                    <p className="text-white font-medium">Processing...</p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons (Top Right) */}
                        <div className="absolute top-4 right-4 flex gap-2 z-40">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black hover:bg-slate-200 font-medium transition-colors shadow-lg"
                                title="Download"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Download</span>
                            </button>
                            <button
                                onClick={() => pushState(null)}
                                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-colors"
                                title="Close / Reset"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Properties Panel (Right side) */}
            {(activeTool === "crop" || activeTool === "ocr" || activeTool === "compress" || activeTool === "id-card" || activeTool === "convert" || activeTool === "filters" || activeTool === "adjust" || activeTool === "transform" || activeTool === "blur" || activeTool === "redeye" || activeTool === "draw") && (
                <div className="w-80 border-l border-white/10 bg-black/20 p-4 glass-panel z-20 flex flex-col transition-all overflow-y-auto">
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
                                            <img src={frontImage} alt="Front" className="w-full h-full object-cover" style={{ transform: `scale(${frontScale / 100})` }} />
                                            <button onClick={() => setFrontImage(null)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 w-12">Size</span>
                                            <input
                                                type="range"
                                                min={20}
                                                max={150}
                                                step={5}
                                                value={frontScale}
                                                onChange={(e) => setFrontScale(Number(e.target.value))}
                                                className="flex-1 accent-teal-400"
                                            />
                                            <span className="text-xs text-white w-10 text-right">{frontScale}%</span>
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
                                            <img src={backImage} alt="Back" className="w-full h-full object-cover" style={{ transform: `scale(${backScale / 100})` }} />
                                            <button onClick={() => setBackImage(null)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 w-12">Size</span>
                                            <input
                                                type="range"
                                                min={20}
                                                max={150}
                                                step={5}
                                                value={backScale}
                                                onChange={(e) => setBackScale(Number(e.target.value))}
                                                className="flex-1 accent-teal-400"
                                            />
                                            <span className="text-xs text-white w-10 text-right">{backScale}%</span>
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
                                Create A4 ID Card
                            </button>
                        </div>
                    )}

                    {activeTool === "crop" && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-2">Zoom</label>
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full accent-white"
                                />
                            </div>
                            <button onClick={handleCrop} className="w-full btn-primary">Apply Crop</button>
                        </div>
                    )}

                    {activeTool === "convert" && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-400 mb-2">Convert image format.</p>
                            <div>
                                <label className="text-xs text-slate-400 block mb-2">Output Format</label>
                                <select
                                    value={selectedFormat}
                                    onChange={(e) => setSelectedFormat(e.target.value as "png" | "jpeg" | "webp")}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/50"
                                >
                                    <option value="png">PNG</option>
                                    <option value="jpeg">JPG</option>
                                    <option value="webp">WebP</option>
                                </select>
                            </div>
                            <button onClick={() => handleConvert(selectedFormat)} className="w-full btn-primary">Convert Image</button>
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
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400">Quality</label>
                                    <span className="text-xs text-white font-medium">{compressionQuality}%</span>
                                </div>
                                <input
                                    type="range"
                                    min={10}
                                    max={100}
                                    step={5}
                                    value={compressionQuality}
                                    onChange={(e) => setCompressionQuality(Number(e.target.value))}
                                    className="w-full accent-teal-400"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>Smaller</span>
                                    <span>Higher Quality</span>
                                </div>
                            </div>
                            <button onClick={handleCompress} className="w-full btn-primary">Compress Image</button>
                        </div>
                    )}

                    {activeTool === "filters" && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-400">Apply preset image filters.</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(['grayscale', 'sepia', 'vintage', 'warm', 'cool', 'highContrast', 'noir', 'fade'] as const).map((filter) => (
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

                    {activeTool === "adjust" && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-400">Adjust brightness, contrast, and saturation.</p>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400">Brightness</label>
                                    <span className="text-xs text-white font-medium">{brightness}%</span>
                                </div>
                                <input type="range" min={50} max={150} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-teal-400" />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400">Contrast</label>
                                    <span className="text-xs text-white font-medium">{contrast}%</span>
                                </div>
                                <input type="range" min={50} max={150} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-teal-400" />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400">Saturation</label>
                                    <span className="text-xs text-white font-medium">{saturation}%</span>
                                </div>
                                <input type="range" min={0} max={200} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-teal-400" />
                            </div>
                            <button onClick={handleApplyAdjustments} className="w-full btn-primary">Apply Adjustments</button>
                        </div>
                    )}

                    {activeTool === "transform" && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-400">Rotate and flip your image.</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleRotate(270)} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
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
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400">Blur Amount</label>
                                    <span className="text-xs text-white font-medium">{blurAmount}px</span>
                                </div>
                                <input type="range" min={0} max={20} value={blurAmount} onChange={(e) => setBlurAmount(Number(e.target.value))} className="w-full accent-teal-400" />
                            </div>
                            <button onClick={handleApplyBlur} disabled={blurAmount === 0} className="w-full btn-primary disabled:opacity-50">Apply Blur</button>
                            <div className="border-t border-white/10 pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400">Sharpen Amount</label>
                                    <span className="text-xs text-white font-medium">{sharpenAmount}%</span>
                                </div>
                                <input type="range" min={0} max={100} value={sharpenAmount} onChange={(e) => setSharpenAmount(Number(e.target.value))} className="w-full accent-teal-400" />
                            </div>
                            <button onClick={handleApplySharpen} disabled={sharpenAmount === 0} className="w-full btn-secondary disabled:opacity-50">Apply Sharpen</button>
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
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400">Brush Size</label>
                                    <span className="text-xs text-white font-medium">{brushSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={30}
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(Number(e.target.value))}
                                    className="w-full accent-teal-400"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button onClick={clearDrawing} className="flex-1 btn-secondary">Clear</button>
                                <button onClick={applyDrawing} className="flex-1 btn-primary">Apply Drawing</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ToolButton({ active, icon, label, onClick, disabled }: { active?: boolean; icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group lg:justify-start justify-center",
                active ? "bg-white/10 text-white ring-1 ring-white/20" : "text-slate-400 hover:bg-white/5 hover:text-white",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className={clsx("h-5 w-5", active && "text-white")}>{icon}</div>
            <span className="hidden lg:block font-medium text-sm">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white hidden lg:block" />}
        </button>
    );
}
