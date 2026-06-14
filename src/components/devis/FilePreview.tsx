import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - ?url handled by Vite
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, Loader2, Download, AlertCircle } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  file: File;
  previewUrl: string | null;
}

export default function FilePreview({ file, previewUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");
  const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);

  // Load PDF
  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Não foi possível renderizar o PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, isPdf]);

  // Render page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (cancelled) return;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Erro ao renderizar página");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNum, scale]);

  // Load text preview
  useEffect(() => {
    if (!isText) return;
    file.text().then((t) => setTextPreview(t.slice(0, 5000))).catch(() => setTextPreview(null));
  }, [file, isText]);

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = file.name;
    a.click();
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{file.name}</span>
          <Badge variant="outline" className="shrink-0">{(file.size / (1024 * 1024)).toFixed(2)} MB</Badge>
        </div>
        <div className="flex items-center gap-1">
          {isPdf && pdfDoc && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} title="Diminuir zoom">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale((s) => Math.min(3, s + 0.2))} title="Aumentar zoom">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Baixar">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div className="h-[480px] w-full bg-muted/30 rounded-md border overflow-auto flex items-start justify-center p-3">
        {isPdf && loading && (
          <div className="flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Carregando PDF…</span>
          </div>
        )}

        {isPdf && error && (
          <div className="flex flex-col items-center justify-center gap-3 h-full text-center px-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div className="text-sm font-medium">Não foi possível renderizar o PDF</div>
            <div className="text-xs text-muted-foreground max-w-xs">{error}</div>
            {previewUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={previewUrl} target="_blank" rel="noreferrer">Abrir em nova aba</a>
              </Button>
            )}
          </div>
        )}

        {isPdf && pdfDoc && !error && (
          <canvas ref={canvasRef} className="shadow-md bg-white" />
        )}

        {isImage && previewUrl && (
          <img src={previewUrl} alt={file.name} className="max-w-full h-auto rounded shadow" />
        )}

        {isText && (
          <pre className="text-xs whitespace-pre-wrap w-full font-mono text-foreground/80">{textPreview ?? "Carregando…"}</pre>
        )}

        {!isPdf && !isImage && !isText && (
          <div className="flex flex-col items-center justify-center gap-3 h-full text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm font-medium">Pré-visualização não disponível</div>
            <p className="text-xs text-muted-foreground max-w-xs">
              O arquivo será enviado normalmente para análise. Use o botão abaixo para baixar e conferir localmente.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5 mr-2" /> Baixar arquivo
            </Button>
          </div>
        )}
      </div>

      {/* Page nav */}
      {isPdf && pdfDoc && numPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum <= 1}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Página <span className="font-semibold text-foreground">{pageNum}</span> de {numPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPageNum((p) => Math.min(numPages, p + 1))} disabled={pageNum >= numPages}>
            Próxima <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
