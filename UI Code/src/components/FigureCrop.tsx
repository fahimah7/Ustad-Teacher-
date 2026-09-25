import { pageImageUrl } from "../native/bridge";

/** A figure cut from the textbook page: the page image, framed to the figure's box
 *  (bbox = [x0, y0, x1, y1] as fractions of the page). */
export function FigureCrop({ bookId, image, aspect, bbox, radius = 14 }: { bookId: string; image: string; aspect: number; bbox: number[]; radius?: number }) {
  const pad = 0.015;
  const x0 = Math.max(0, Math.min(bbox[0], bbox[2]) - pad), x1 = Math.min(1, Math.max(bbox[0], bbox[2]) + pad);
  const y0 = Math.max(0, Math.min(bbox[1], bbox[3]) - pad), y1 = Math.min(1, Math.max(bbox[1], bbox[3]) + pad);
  const cw = Math.max(0.05, x1 - x0), ch = Math.max(0.03, y1 - y0);
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: `${cw} / ${aspect * ch}`, overflow: "hidden", borderRadius: radius, background: "#FFFFFF", border: "2px solid #EFE6DA" }}>
      <img src={pageImageUrl(bookId, image)} alt="" draggable={false} style={{ position: "absolute", width: `${100 / cw}%`, left: `${(-x0 / cw) * 100}%`, top: `${(-y0 / ch) * 100}%`, maxWidth: "none" }} />
    </div>
  );
}
