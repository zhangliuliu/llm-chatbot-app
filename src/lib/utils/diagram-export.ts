/**
 * Utility functions for exporting diagrams to various formats.
 */

export function triggerDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export async function downloadPng(svgEl: SVGElement, filename: string = "diagram.png") {
    // 1. Calculate the actual content boundaries to remove empty space
    const bbox = (svgEl as any).getBBox?.() || { x: 0, y: 0, width: 800, height: 600 };
    const padding = 40; // Add some breathing room around the diagram

    const cropX = bbox.x - padding / 2;
    const cropY = bbox.y - padding / 2;
    const cropWidth = bbox.width + padding;
    const cropHeight = bbox.height + padding;

    // 2. Clone and prepare SVG
    const clonedSvg = svgEl.cloneNode(true) as SVGElement;

    // Set explicit width/height and viewBox based on content
    clonedSvg.setAttribute("width", cropWidth.toString());
    clonedSvg.setAttribute("height", cropHeight.toString());
    clonedSvg.setAttribute("viewBox", `${cropX} ${cropY} ${cropWidth} ${cropHeight}`);
    clonedSvg.setAttribute("style", "background-color: white;");

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // 3. Higher DPI for HD results (Scale 3.0)
    const scale = 3;
    canvas.width = cropWidth * scale;
    canvas.height = cropHeight * scale;

    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    img.src = `data:image/svg+xml;base64,${svgBase64}`;

    return new Promise<void>((resolve, reject) => {
        img.onload = () => {
            if (ctx) {
                // Background
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw higher resolution image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                try {
                    const pngUrl = canvas.toDataURL("image/png", 1.0);
                    triggerDownload(pngUrl, filename);
                    resolve();
                } catch (e) {
                    console.error("Export failed:", e);
                    reject(e);
                }
            }
        };
        img.onerror = reject;
    });
}

export function downloadSvg(svgEl: SVGElement, filename: string = "diagram.svg") {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
