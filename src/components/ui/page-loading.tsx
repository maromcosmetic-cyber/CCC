'use client';

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoadingProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function PageLoading({ 
  message = "Loading...", 
  className,
  fullScreen = false 
}: PageLoadingProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-4",
      fullScreen ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" : "min-h-[50vh]",
      className
    )}>
      <div className="relative">
        {/* Outer spinning ring */}
        <div className="w-16 h-16 rounded-full border-4 border-primary/20" />
        {/* Inner spinning loader */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
      </div>
      {message && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}