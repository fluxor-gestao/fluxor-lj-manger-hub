import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, Trash2, FileText, Loader2, FileIcon, ImageIcon, FileSpreadsheet, FileCode } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface EntityAttachmentsProps {
  entityType: string;
  entityId: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "text/csv",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function EntityAttachments({ entityType, entityId }: EntityAttachmentsProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: attachments, isLoading } = useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_attachments")
        .select(`
          *,
          uploader:profiles!entity_attachments_uploaded_by_fkey(full_name)
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Tipo de arquivo não permitido. Use PDF, Imagem, DOCX ou XLSX.");
      }
      if (file.size > MAX_SIZE) {
        throw new Error("Arquivo muito grande. Máximo 10MB.");
      }

      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${entityType}/${entityId}/${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Register in database
      const { error: dbError } = await supabase.from("entity_attachments").insert({
        entity_type: entityType,
        entity_id: entityId,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
      });

      if (dbError) {
        // Rollback storage if database fails
        await supabase.storage.from("attachments").remove([filePath]);
        throw dbError;
      }
    },
    onSuccess: () => {
      toast.success("Anexo enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });
      setUploading(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar anexo: " + error.message);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: any) => {
      // Remove from storage first
      const { error: storageError } = await supabase.storage
        .from("attachments")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Remove from database
      const { error: dbError } = await supabase
        .from("entity_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Anexo excluído.");
      queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir anexo: " + error.message);
    },
  });

  const handleDownload = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("attachments")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast.error("Erro ao baixar arquivo: " + error.message);
    }
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (contentType === "application/pdf") return <FileText className="h-4 w-4" />;
    if (contentType.includes("spreadsheet") || contentType === "text/csv") return <FileSpreadsheet className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">Anexos ({attachments?.length || 0})</h3>
        <div className="relative">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            disabled={uploading}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
          />
          <Button variant="outline" size="sm" disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Enviando..." : "Adicionar anexo"}
          </Button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 hover:bg-white/5 border-white/10">
              <TableHead className="text-slate-400 text-xs uppercase font-bold tracking-wider">Arquivo</TableHead>
              <TableHead className="text-slate-400 text-xs uppercase font-bold tracking-wider">Tamanho</TableHead>
              <TableHead className="text-slate-400 text-xs uppercase font-bold tracking-wider">Por</TableHead>
              <TableHead className="text-slate-400 text-xs uppercase font-bold tracking-wider">Data</TableHead>
              <TableHead className="text-right text-slate-400 text-xs uppercase font-bold tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attachments?.length === 0 ? (
              <TableRow className="hover:bg-transparent border-white/5">
                <TableCell colSpan={5} className="h-24 text-center text-slate-500 text-sm italic">
                  Nenhum anexo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              attachments?.map((att) => (
                <TableRow key={att.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded text-primary">
                        {getFileIcon(att.content_type)}
                      </div>
                      <span className="truncate max-w-[200px]" title={att.file_name}>
                        {att.file_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                    {formatSize(att.file_size)}
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                    {att.uploader?.full_name || "Sistema"}
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                    {format(new Date(att.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => handleDownload(att)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-destructive"
                        onClick={() => {
                          if (window.confirm("Tem certeza que deseja excluir este anexo?")) {
                            deleteMutation.mutate(att);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
