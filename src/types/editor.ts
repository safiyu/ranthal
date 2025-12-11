export type ImageState = {
    src: string;
    processedSrc: string | null;
    collageImages?: string[]; // Store for collage builder
    activeLayout?: string;
};
