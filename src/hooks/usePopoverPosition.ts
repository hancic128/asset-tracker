import { useState, useEffect, type RefObject, type CSSProperties } from 'react';

interface Options {
  /** Match the anchor width (default true). Set false for wider panels like the calendar. */
  matchWidth?: boolean;
  /** Fixed width when matchWidth is false. */
  width?: number;
  /** Preferred max height of the panel. */
  maxHeight?: number;
}

/**
 * Positions a portal-rendered popover under (or above) an anchor element.
 *
 * Anything rendered with `position: absolute` inside the modal gets clipped by the
 * modal's `overflow-y-auto`. Rendering the popover into document.body with
 * `position: fixed` escapes that, so we compute coordinates from the anchor rect
 * and re-measure on scroll/resize. Flips above the anchor when there is more room
 * up there than below.
 */
export function usePopoverPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  { matchWidth = true, width: fixedWidth, maxHeight = 320 }: Options = {},
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open) {
      setStyle({});
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor) return;

      const r = anchor.getBoundingClientRect();
      const width = matchWidth ? r.width : (fixedWidth ?? 288);
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = r.left;
      if (left + width > vw - 8) left = vw - width - 8;
      if (left < 8) left = 8;

      const panelH = panel?.offsetHeight || maxHeight;
      const spaceBelow = vh - r.bottom - 8;
      const spaceAbove = r.top - 8;

      let top = r.bottom + 4;
      let maxH = Math.min(maxHeight, Math.max(120, spaceBelow));

      if (panelH > spaceBelow && spaceAbove > spaceBelow) {
        maxH = Math.min(maxHeight, Math.max(120, spaceAbove));
        top = r.top - Math.min(panelH, maxH) - 4;
      }

      setStyle({ position: 'fixed', top, left, width, maxHeight: maxH });
    };

    update();
    const raf = requestAnimationFrame(update);

    window.addEventListener('resize', update);
    // capture:true so scrolls inside the modal body also re-position the panel
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef, panelRef, matchWidth, fixedWidth, maxHeight]);

  return style;
}

/** True when the node is inside the anchor or the (portaled) panel — used to keep
 * the popover open while the user interacts with it. */
export function isInside(target: EventTarget | null, ...refs: RefObject<HTMLElement | null>[]): boolean {
  if (!(target instanceof Node)) return false;
  return refs.some((r) => r.current?.contains(target));
}
