import { useState } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
  initialPosition?: number;
  isInteractive?: boolean;
  height?: string;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeAlt = "Before",
  afterAlt = "After",
  className = "",
  initialPosition = 50,
  isInteractive = true,
  height = "h-96"
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(initialPosition);

  return (
    <div 
      className={`relative ${height} rounded-xl overflow-hidden group ${className}`}
      data-testid="slider-before-after"
    >
      {/* Before Image */}
      <div className="absolute inset-0">
        <OptimizedImage
          src={beforeImage}
          alt={beforeAlt}
          width={800}
          height={400}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 bg-black/60 text-white px-4 py-2 rounded-lg font-semibold">
          Before
        </div>
      </div>
      
      {/* After Image with Clip Path */}
      <div 
        className="absolute inset-0 transition-all duration-300"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <OptimizedImage
          src={afterImage}
          alt={afterAlt}
          width={800}
          height={400}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-ocean-blue text-white px-4 py-2 rounded-lg font-semibold">
          After
        </div>
      </div>

      {/* Interactive Slider */}
      {isInteractive && (
        <>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={(e) => setSliderPosition(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
            aria-label="Drag to compare before and after images"
            data-testid="input-slider-handle"
          />
          
          {/* Slider Line and Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 -ml-1" />
              <ChevronRight className="w-4 h-4 -mr-1" />
            </div>
          </div>
        </>
      )}

      {/* Static position indicator if not interactive */}
      {!isInteractive && (
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 -ml-1" />
            <ChevronRight className="w-4 h-4 -mr-1" />
          </div>
        </div>
      )}
    </div>
  );
}
