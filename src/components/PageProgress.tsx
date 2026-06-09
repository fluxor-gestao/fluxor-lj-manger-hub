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
  
  const isLoading = routerState.status === "pending" || isFetching > 0;

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    if (isLoading) {
      setVisible(true);
      setProgress(10); // Start with 10%

      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev; // Stay at 95% until finished
          const increment = Math.random() * 10;
          return Math.min(prev + increment, 95);
        });
      }, 300);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => {
        setVisible(false);
        // Small delay to let the user see the 100% completion before resetting
        setTimeout(() => setProgress(0), 200);
      }, 300);
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
        {isLoading && progress > 0 && progress < 100 && (
          <div className="absolute right-2 top-2 text-[10px] font-medium text-primary bg-background/80 px-1 rounded backdrop-blur-sm">
            {Math.round(progress)}%
          </div>
        )}
      </div>
    </div>
  );
}
