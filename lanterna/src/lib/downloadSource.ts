type DownloadsNs = { save: (r: { filename: string; data: Blob }) => Promise<{ status: string }> };
type ClaudeHost = { use?: (name: "downloads") => Promise<DownloadsNs | null> };

export type DownloadResult = "saved" | "declined" | "unavailable";

/**
 * Baixa o projeto completo. Dentro do claude.ai usa a capacidade "downloads"
 * (o visitante confirma); em qualquer outra hospedagem, um download comum do navegador.
 */
export async function downloadSource(onProgress?: (done: number, total: number) => void): Promise<DownloadResult> {
  const { buildSourceZip } = await import("./sourceBundle");
  const blob = await buildSourceZip(onProgress);
  const filename = "lanterna-projeto.zip";

  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    const downloads = await host.use("downloads").catch(() => null);
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
        return "saved";
      } catch (e) {
        return (e as { code?: string }).code === "declined" ? "declined" : "unavailable";
      }
    }
    return "unavailable";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "saved";
}
