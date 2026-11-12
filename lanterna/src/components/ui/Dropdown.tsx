import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  anchor: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  label: string;
}

/** Menu suspenso acessível: fecha com Esc e clique fora. */
export function Dropdown({ open, onClose, anchor, children, align = "right", className = "", label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      {anchor}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={`absolute top-[calc(100%+10px)] z-50 overflow-hidden rounded-xl border border-line bg-surface/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,.9)] backdrop-blur-xl ${align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"} ${className}`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
