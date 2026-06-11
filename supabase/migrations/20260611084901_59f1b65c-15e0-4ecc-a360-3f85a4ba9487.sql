-- Create entity_attachments table
CREATE TABLE IF NOT EXISTS public.entity_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'devis', 'service', 'financial_entry', etc.
  entity_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_attachments TO authenticated;
GRANT ALL ON public.entity_attachments TO service_role;

-- Enable RLS
ALTER TABLE public.entity_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can manage attachments" ON public.entity_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
