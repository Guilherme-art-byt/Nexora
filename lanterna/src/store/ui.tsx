import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
interface Toast { id: number; message: string; kind: ToastKind; action?: { label: string; run: () => void } }
interface ConfirmOptions { title: string; body?: string; confirmLabel: string; danger?: boolean }

interface UICtx {
  toast: (message: string, kind?: ToastKind, action?: Toast["action"]) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);

  const toast = useCallback<UICtx["toast"]>((message, kind = "success", action) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, message, kind, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 3600);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] z-[90] flex flex-col items-center gap-2 px-4 md:bottom-8">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-line/80 bg-raised/95 px-4 py-3 text-sm text-paper shadow-[0_18px_40px_-12px_rgba(0,0,0,.7)] backdrop-blur-xl"
              role={t.kind === "error" ? "alert" : "status"}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${t.kind === "error" ? "bg-ember/20 text-ember" : t.kind === "info" ? "bg-paper/10 text-paper" : "bg-lamp/20 text-lamp"}`}>
                {t.kind === "error" ? <AlertTriangle size={14} /> : t.kind === "info" ? <Info size={14} /> : <Check size={14} />}
              </span>
              <span className="leading-snug">{t.message}</span>
              {t.action && (
                <button
                  className="ml-1 shrink-0 rounded-md px-2 py-1 font-semibold text-lamp hover:bg-lamp/10"
                  onClick={() => { t.action!.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {dialog && <ConfirmDialog {...dialog} onClose={close} />}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

function ConfirmDialog({ title, body, confirmLabel, danger, onClose }: ConfirmOptions & { onClose: (v: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onClose(false)}>
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        initial={{ y: 12, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 8, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="confirm-title" className="text-lg font-bold text-paper">{title}</h2>
          <button onClick={() => onClose(false)} className="-mr-2 -mt-1 rounded-full p-1.5 text-mute hover:bg-paper/10 hover:text-paper" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {body && <p className="mt-2 text-sm leading-relaxed text-mute">{body}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => onClose(false)}>Cancelar</button>
          <button ref={confirmRef} className={danger ? "btn-danger" : "btn-primary"} onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI fora do UIProvider");
  return c;
}
