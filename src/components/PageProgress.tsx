import * as React from "react";
import { useRouterState } from "@tanstack/react-router";
import { useIsFetching } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
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
        "fixed left-0 right-0 top-0 z-[9999] transition-opacity duration-300 pointer-events-none",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="relative w-full">
        <Progress 
          value={progress} 
          className="h-[3px] w-full rounded-none bg-primary/10" 
        />
        {/* Glow effect */}
        <div 
          className="absolute top-0 h-[3px] bg-primary blur-[2px] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        {isLoading && progress > 0 && progress < 100 && (
          <div className="absolute right-2 top-2 text-[10px] font-medium text-primary bg-background/80 px-1 py-0.5 rounded backdrop-blur-sm border border-primary/20 shadow-sm animate-in fade-in zoom-in duration-300">
            {Math.round(progress)}%
          </div>
        )}
      </div>
    </div>
  );
}
