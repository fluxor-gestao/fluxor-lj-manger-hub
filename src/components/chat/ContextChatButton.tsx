import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "./ChatProvider";
import type { ChatContextRef } from "@/lib/chat/types";

export function ContextChatButton(props: ChatContextRef & { variant?: "default" | "outline" | "secondary" | "ghost"; size?: "default" | "sm" | "icon" }) {
  const { openContextChat } = useChat();
  const { contextType, contextId, contextLabel, variant = "outline", size = "sm" } = props;
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => openContextChat({ contextType, contextId, contextLabel })}
    >
      <MessageSquare className="h-4 w-4" />
      Conversar
    </Button>
  );
}
