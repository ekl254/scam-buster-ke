export async function compressImage(file: File): Promise<File> {
    // If file is already small enough and is an image, return it
    if (file.size <= 1024 * 1024 && file.type !== "image/png") return file; // <1MB and not PNG (PNGs are big)

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Max dimension 1920px
                const MAX_DIMENSION = 1920;
                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("Compression failed"));
                            return;
                        }
                        // Create new file
                        // Use original name but ensure .jpg extension if we converted
                        const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                        const newFile = new File([blob], newName, {
                            type: "image/jpeg",
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    },
                    "image/jpeg",
                    0.7
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
