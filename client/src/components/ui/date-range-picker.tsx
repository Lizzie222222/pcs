import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format, subDays, subYears } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type DateRangePickerProps = {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  className?: string
}

type DatePreset = {
  label: string
  value: string
  getRange: () => DateRange
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: "Last 7 days",
    value: "last_7_days",
    getRange: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 days",
    value: "last_30_days",
    getRange: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    label: "Last 90 days",
    value: "last_90_days",
    getRange: () => ({
      from: subDays(new Date(), 90),
      to: new Date(),
    }),
  },
  {
    label: "Last 1 year",
    value: "last_1_year",
    getRange: () => ({
      from: subYears(new Date(), 1),
      to: new Date(),
    }),
  },
  {
    label: "All time",
    value: "all_time",
    getRange: () => ({
      from: undefined,
      to: undefined,
    }),
  },
]

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState("last_30_days")
  const [isCustom, setIsCustom] = React.useState(false)

  const handlePresetChange = (presetValue: string) => {
    if (presetValue === "custom") {
      setIsCustom(true)
      setSelectedPreset("custom")
      return
    }

    const preset = DATE_PRESETS.find((p) => p.value === presetValue)
    if (preset) {
      setSelectedPreset(presetValue)
      setIsCustom(false)
      onChange?.(preset.getRange())
    }
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onChange?.(range)
    if (range?.from || range?.to) {
      setIsCustom(true)
      setSelectedPreset("custom")
    }
  }

  const formatDateRange = () => {
    if (!value?.from && !value?.to) {
      return "All time"
    }
    
    if (value?.from && value?.to) {
      return `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`
    }
    
    if (value?.from) {
      return `From ${format(value.from, "MMM d, yyyy")}`
    }
    
    if (value?.to) {
      return `Until ${format(value.to, "MMM d, yyyy")}`
    }
    
    return "Select date range"
  }

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Date Range:</span>
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger 
            className="w-[180px] bg-white border-gray-300"
            data-testid="select-date-preset"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem 
                key={preset.value} 
                value={preset.value}
                data-testid={`preset-${preset.value}`}
              >
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value="custom" data-testid="preset-custom">
              Custom range
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal bg-white border-gray-300",
              !value?.from && !value?.to && "text-muted-foreground"
            )}
            data-testid="button-date-range-picker"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-pcs_blue" />
            <span className="text-sm" data-testid="text-selected-date-range">
              {formatDateRange()}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            data-testid="calendar-date-range"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
