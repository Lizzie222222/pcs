import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5", 
  lg: "h-6 w-6",
  xl: "h-8 w-8"
};

export function ButtonSpinner({ size = "md", message, className }: ButtonSpinnerProps) {
  return (
    <Loader2 
      className={cn("animate-spin", sizeClasses[size], className)} 
      aria-hidden="true"
    />
  );
}
