import { Download } from "lucide-react";
import { useState } from "react";
import { downloadSource } from "@/lib/downloadSource";
import { useUI } from "@/store/ui";
import { Spinner } from "./ui";

/** Gera e entrega o projeto completo (código, banco, artes e vídeo) como .zip. */
export function SourceDownloadButton({ className = "btn-glass" }: { className?: string }) {
  const { toast } = useUI();
  const [progress, setProgress] = useState<number | null>(null);

  const run = async () => {
    setProgress(0);
    try {
      const r = await downloadSource((d, t) => setProgress(Math.round((d / t) * 100)));
      if (r === "saved") toast("Projeto baixado: lanterna-projeto.zip");
      else if (r === "declined") toast("Download cancelado", "info");
      else toast("Este aparelho não permite baixar arquivos por aqui. Abra a página no navegador do computador.", "error");
    } catch {
      toast("Não foi possível montar o arquivo. Tente de novo.", "error");
    } finally {
      setProgress(null);
    }
  };

  return (
    <button className={className} onClick={run} disabled={progress !== null} aria-live="polite">
      {progress !== null ? <Spinner /> : <Download size={18} />}
      {progress !== null ? `Preparando ${progress}%` : "Baixar código-fonte"}
    </button>
  );
}
