import { useState, useRef, type MouseEvent } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoTooltipProps {
  content: string;
  dataTestId?: string;
}

export function InfoTooltip({ content, dataTestId }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const manuallyOpenedRef = useRef(false);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    manuallyOpenedRef.current = true;
    setOpen(true);
  };

  const handleClose = () => {
    manuallyOpenedRef.current = false;
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpen(true);
    } else if (!manuallyOpenedRef.current) {
      setOpen(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center ml-1 align-middle focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-pcs_blue rounded"
            aria-label={content}
            data-testid={dataTestId || "icon-info-tooltip"}
            onClick={handleClick}
          >
            <Info 
              className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help" 
              aria-hidden="true"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          onPointerDownOutside={handleClose}
          onEscapeKeyDown={handleClose}
        >
          <p className="max-w-xs text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
