/** Provides a reusable modal/drawer focus trap for an active container ref. */
import { RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type FocusTrapOptions<
  TContainer extends HTMLElement,
  TInitial extends HTMLElement,
  TRestore extends HTMLElement,
> = {
  active: boolean;
  containerRef: RefObject<TContainer | null>;
  onEscape: () => void;
  initialFocusRef?: RefObject<TInitial | null>;
  restoreFocusRef?: RefObject<TRestore | null>;
};

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);

  return (
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    element.getClientRects().length > 0
  );
}

function isEnabled(element: HTMLElement): boolean {
  if (element.hasAttribute("disabled")) {
    return false;
  }

  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return !element.disabled;
  }

  return true;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => isEnabled(element) && isVisible(element),
  );
}

function focusElement(element: HTMLElement | null): void {
  if (element) {
    element.focus({ preventScroll: true });
  }
}

export function useFocusTrap<
  TContainer extends HTMLElement,
  TInitial extends HTMLElement = HTMLElement,
  TRestore extends HTMLElement = HTMLElement,
>({
  active,
  containerRef,
  onEscape,
  initialFocusRef,
  restoreFocusRef,
}: FocusTrapOptions<TContainer, TInitial, TRestore>): void {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active || typeof document === "undefined") {
      return undefined;
    }

    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const trapNode = container;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const initialElement = initialFocusRef?.current ?? getFocusableElements(container)[0] ?? null;
    focusElement(initialElement);

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(trapNode);

      if (focusableElements.length === 0) {
        event.preventDefault();
        focusElement(trapNode);
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !trapNode.contains(activeElement)) {
          event.preventDefault();
          focusElement(lastElement);
        }

        return;
      }

      if (activeElement === lastElement || !trapNode.contains(activeElement)) {
        event.preventDefault();
        focusElement(firstElement);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      focusElement(restoreFocusRef?.current ?? previouslyFocusedRef.current);
      previouslyFocusedRef.current = null;
    };
  }, [active, containerRef, initialFocusRef, restoreFocusRef]);
}
