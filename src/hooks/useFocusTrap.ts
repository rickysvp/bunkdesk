import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * 焦点陷阱 — 弹窗打开时锁定 Tab 键焦点在容器内，关闭后恢复到触发元素。
 *
 * 用法：
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFocusTrap(ref, open);
 *   return <div ref={ref}>...</div>;
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // 记录打开前的焦点元素，关闭后恢复
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // 打开时聚焦容器内第一个可聚焦元素
    const focusables = (): HTMLElement[] => {
      const nodes = container.querySelectorAll(FOCUSABLE_SELECTOR);
      const result: HTMLElement[] = [];
      nodes.forEach((node) => {
        const el = node as HTMLElement;
        if (el.offsetParent !== null || el === document.activeElement) {
          result.push(el);
        }
      });
      return result;
    };

    // 延迟一帧确保 DOM 已渲染
    const raf = requestAnimationFrame(() => {
      const elements = focusables();
      if (elements.length > 0) elements[0].focus();
      else container.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const elements = focusables();
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey) {
        // Shift+Tab：从第一个跳到最后一个
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab：从最后一个跳到第一个
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('keydown', handleKeyDown);
      // 恢复焦点到触发元素
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [containerRef, active]);
}
