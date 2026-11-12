import { RefreshCw, WifiOff } from "lucide-react";
import { EmptyState } from "./ui";

export function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="pt-28">
      <EmptyState
        icon={<WifiOff size={28} />}
        title="Não foi possível carregar o catálogo"
        body="Verifique sua conexão. Se estiver usando o Supabase, confira a URL e a chave no arquivo .env."
        action={<button className="btn-primary" onClick={onRetry}><RefreshCw size={18} /> Tentar novamente</button>}
      />
    </div>
  );
}
