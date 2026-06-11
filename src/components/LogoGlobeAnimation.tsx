import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoGlobeAnimationProps {
  className?: string;
}

export function LogoGlobeAnimation({ className }: LogoGlobeAnimationProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer spinning ring */}
      <div className="absolute h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      
      {/* Inner glowing globe icon */}
      <div className="relative z-10 p-4 bg-background rounded-full shadow-lg border border-primary/10">
        <Globe className="h-10 w-10 text-primary animate-pulse stroke-[1.5]" />
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <div className="absolute top-1/4 left-1/4 h-1 w-1 bg-primary/40 rounded-full animate-ping" />
        <div className="absolute bottom-1/3 right-1/4 h-1 w-1 bg-primary/30 rounded-full animate-ping delay-300" />
        <div className="absolute top-1/2 right-1/4 h-1 w-1 bg-primary/20 rounded-full animate-ping delay-700" />
      </div>
    </div>
  );
}
