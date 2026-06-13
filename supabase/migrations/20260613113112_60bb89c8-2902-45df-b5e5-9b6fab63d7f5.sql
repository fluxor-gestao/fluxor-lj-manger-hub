
-- Chat interno corporativo

CREATE TYPE public.conversation_type AS ENUM ('direct', 'area', 'context');

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.conversation_type NOT NULL DEFAULT 'direct',
  title text,
  area public.app_role,
  context_type text,
  context_id text,
  context_label text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_context ON public.conversations(context_type, context_id);
CREATE INDEX idx_conversations_area ON public.conversations(area);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area public.app_role,
  last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_cp_user ON public.conversation_participants(user_id);
CREATE INDEX idx_cp_conv ON public.conversation_participants(conversation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- Security definer: usuário é participante (explícito) ou pertence à área da conversa
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = _conv AND user_id = _user)
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = _conv
        AND c.area IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = _user AND ur.role = c.area)
    );
$$;

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- conversations
CREATE POLICY "conv_select" ON public.conversations FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_conversation_participant(id, auth.uid())
);
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "conv_delete" ON public.conversations FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- participants
CREATE POLICY "cp_select" ON public.conversation_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_conversation_participant(conversation_id, auth.uid())
);
CREATE POLICY "cp_insert" ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.conversations c
             WHERE c.id = conversation_id AND c.created_by = auth.uid())
);
CREATE POLICY "cp_update" ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cp_delete" ON public.conversation_participants FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- messages
CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid());
CREATE POLICY "msg_delete" ON public.messages FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_msg_bump_conv
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;
