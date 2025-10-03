'use client'

import { forwardRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showTime?: boolean
  showSeconds?: boolean
}

export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  ({ 
    value, 
    onChange, 
    placeholder = 'Select date and time',
    className,
    disabled = false,
    showTime = true,
    showSeconds = false
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(value)
    const [time, setTime] = useState(() => {
      if (value) {
        return {
          hours: value.getHours().toString().padStart(2, '0'),
          minutes: value.getMinutes().toString().padStart(2, '0'),
          seconds: showSeconds ? value.getSeconds().toString().padStart(2, '0') : '00'
        }
      }
      return {
        hours: '00',
        minutes: '00',
        seconds: '00'
      }
    })

    const handleDateSelect = (date: Date | undefined) => {
      setSelectedDate(date)
      if (date && showTime) {
        // Preserve existing time or use current time
        const newDate = new Date(date)
        newDate.setHours(parseInt(time.hours), parseInt(time.minutes), parseInt(time.seconds))
        onChange?.(newDate)
      } else {
        onChange?.(date)
      }
    }

    const handleTimeChange = (field: 'hours' | 'minutes' | 'seconds', value: string) => {
      const newTime = { ...time, [field]: value }
      setTime(newTime)
      
      if (selectedDate) {
        const newDate = new Date(selectedDate)
        newDate.setHours(
          parseInt(newTime.hours), 
          parseInt(newTime.minutes), 
          parseInt(newTime.seconds)
        )
        onChange?.(newDate)
      }
    }

    const formatDisplayValue = (date: Date | undefined): string => {
      if (!date) return ''
      
      const dateStr = format(date, 'MMM dd, yyyy')
      if (showTime) {
        const timeStr = showSeconds 
          ? format(date, 'HH:mm:ss')
          : format(date, 'HH:mm')
        return `${dateStr} ${timeStr}`
      }
      return dateStr
    }

    const generateTimeOptions = (max: number) => {
      return Array.from({ length: max }, (_, i) => {
        const value = i.toString().padStart(2, '0')
        return { value, label: value }
      })
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground',
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayValue(selectedDate) || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
            {showTime && (
              <div className="border-l p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Time
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Hours</label>
                    <Select value={time.hours} onValueChange={(value) => handleTimeChange('hours', value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generateTimeOptions(24).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Minutes</label>
                    <Select value={time.minutes} onValueChange={(value) => handleTimeChange('minutes', value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generateTimeOptions(60).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {showSeconds && (
                    <div>
                      <label className="text-xs text-gray-500">Seconds</label>
                      <Select value={time.seconds} onValueChange={(value) => handleTimeChange('seconds', value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {generateTimeOptions(60).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

DateTimePicker.displayName = 'DateTimePicker'
