import * as React from "react";
import { useRouterState } from "@tanstack/react-router";
import { useIsFetching } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageProgress() {
  const routerState = useRouterState();
  const isFetching = useIsFetching();
  
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  
  // routerState.status indicates page navigation
  // isFetching > 0 indicates background data fetching
  const isLoading = routerState.status === "pending" || isFetching > 0;

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    if (isLoading) {
      setVisible(true);
      // If it was already finished, reset to start
      setProgress((prev) => (prev === 100 ? 10 : Math.max(prev, 10)));

      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) return prev; // Stay almost at the end until finished
          
          // Random increments to simulate progress
          const increment = Math.random() * 5;
          const next = prev + increment;
          
          return next > 98 ? 98 : next;
        });
      }, 400);
    } else {
      // Complete the progress
      setProgress(100);
      
      // Hide after a short delay
      const timeout = setTimeout(() => {
        setVisible(false);
        // Reset progress after fade out
        const resetTimeout = setTimeout(() => setProgress(0), 300);
        return () => clearTimeout(resetTimeout);
      }, 800);
      
      return () => clearTimeout(timeout);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-0 z-[9999] transition-all duration-500 pointer-events-none",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="relative w-full">
        {/* Main Bar */}
        <div className="h-[4px] w-full bg-primary/20 backdrop-blur-sm">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Floating Label */}
        <div 
          className="absolute top-2 transition-all duration-300 ease-out"
          style={{ left: `calc(${progress}% - 20px)` }}
        >
          <div className="flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-lg border border-primary/20 animate-in fade-in zoom-in duration-300">
            {isLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
