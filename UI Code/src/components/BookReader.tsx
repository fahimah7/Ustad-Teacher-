import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TextBook } from "../tutor/book";
import { pageImageUrl } from "../native/bridge";

export type ReaderHandle = { goTo(pdfPage: number, smooth?: boolean): void; current(): number };

type Layout = { tops: number[]; widths: number[]; heights: number[]; total: number };

/** The textbook itself, page after page. At normal zoom every page fits the window whole and the
 *  scroll snaps to one page; zoomed in, pages grow and scroll freely. The page with the most
 *  area in view is reported as the page she is reading. */
export const BookReader = forwardRef<ReaderHandle, {
  bookId: string; text: TextBook; initialPage: number; zoom: number; onPage: (pdfPage: number) => void;
  bg?: string; pad?: number; gap?: number; label?: (pdfPage: number) => string;
}>(function BookReader({ bookId, text, initialPage, zoom, onPage, bg = "#3A3350", pad = 16, gap = 16, label }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const current = useRef(initialPage);
  /** The page the view last settled on; a push of more than 40 px away from it turns a page. */
  const anchor = useRef(initialPage);
  const placed = useRef(false);
  const raf = useRef(0);
  const idle = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = box.current!;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout: Layout | null = useMemo(() => {
    if (!size || size.w < 50 || size.h < 50) return null;
    const tops: number[] = [], widths: number[] = [], heights: number[] = [];
    let y = pad;
    for (const aspect of text.pageAspects) {
      const fitW = Math.min(size.w - pad * 2, (size.h - pad * 2) / aspect);
      const w = Math.max(120, fitW * zoom);
      tops.push(y);
      widths.push(w);
      heights.push(w * aspect);
      y += w * aspect + gap;
    }
    return { tops, widths, heights, total: y - gap + pad };
  }, [size, zoom, text, pad, gap]);

  const offsetFor = (page: number, l: Layout, viewH: number) => {
    const i = Math.min(Math.max(page, 1), l.tops.length) - 1;
    // Centre a page that fits; otherwise show its top.
    const slack = viewH - l.heights[i];
    return Math.max(0, l.tops[i] - (slack > 0 ? slack / 2 : pad));
  };

  const goTo = (page: number, smooth = true) => {
    const el = box.current;
    if (!el || !layout) return;
    const p = Math.min(Math.max(page, 1), layout.tops.length);
    current.current = p;
    anchor.current = p;
    el.scrollTo({ top: offsetFor(p, layout, el.clientHeight), behavior: smooth ? "smooth" : "auto" });
  };

  useImperativeHandle(ref, () => ({ goTo, current: () => current.current }), [layout]);

  // First placement, and keeping her page in view when the zoom or the window changes.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !layout) return;
    const p = placed.current ? current.current : initialPage;
    el.scrollTop = offsetFor(p, layout, el.clientHeight);
    anchor.current = p;
    placed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const mostVisible = (l: Layout, top: number, h: number) => {
    const bottom = top + h;
    let lo = 0, hi = l.tops.length - 1;
    while (lo < hi) { // first page whose bottom is below the top of the view
      const mid = (lo + hi) >> 1;
      if (l.tops[mid] + l.heights[mid] <= top) lo = mid + 1; else hi = mid;
    }
    let best = lo, bestArea = -1;
    for (let i = lo; i < l.tops.length && l.tops[i] < bottom; i++) {
      const area = (Math.min(bottom, l.tops[i] + l.heights[i]) - Math.max(top, l.tops[i])) * l.widths[i];
      if (area > bestArea) { bestArea = area; best = i; }
    }
    return best + 1;
  };

  // At normal zoom the view settles on one whole page once scrolling stops: a push of more than
  // 40 px turns one page, a longer scroll lands on the page most in view.
  const settle = () => {
    const el = box.current;
    if (!el || !layout || zoom !== 1) return;
    const delta = el.scrollTop - offsetFor(anchor.current, layout, el.clientHeight);
    if (Math.abs(delta) < 2) return;
    const seen = mostVisible(layout, el.scrollTop, el.clientHeight);
    let target = anchor.current;
    if (delta > 40) target = seen > anchor.current ? seen : anchor.current + 1;
    else if (delta < -40) target = seen < anchor.current ? seen : anchor.current - 1;
    target = Math.min(Math.max(target, 1), layout.tops.length);
    goTo(target);
    onPage(target);
  };

  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = box.current;
      if (!el || !layout || !placed.current) return;
      const p = mostVisible(layout, el.scrollTop, el.clientHeight);
      if (p !== current.current) {
        current.current = p;
        onPage(p);
      }
      if (zoom !== 1) anchor.current = p;
    });
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(settle, 180);
  };
  useEffect(() => () => { cancelAnimationFrame(raf.current); window.clearTimeout(idle.current); }, []);

  return (
    <div ref={box} onScroll={onScroll} className="vscroll book-reader" tabIndex={-1}
      style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: zoom > 1 ? "auto" : "hidden", background: bg, outline: "none", position: "relative", overscrollBehavior: "contain" }}>
      {layout && (
        <div style={{ position: "relative", height: layout.total, minWidth: Math.max(...layout.widths) + pad * 2 }}>
          {text.images.map((img, i) => (
            <div key={i} data-page={i + 1} style={{ position: "absolute", top: layout.tops[i], left: `max(${pad}px, calc(50% - ${layout.widths[i] / 2}px))`, width: layout.widths[i], height: layout.heights[i], background: "#FFFFFF", borderRadius: 6, boxShadow: "0 4px 18px rgba(0,0,0,.28)", overflow: "hidden" }}>
              <img src={pageImageUrl(bookId, img)} alt={label ? label(i + 1) : `${i + 1}`} loading="lazy" decoding="async" draggable={false} style={{ width: "100%", height: "100%", display: "block", userSelect: "none" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
