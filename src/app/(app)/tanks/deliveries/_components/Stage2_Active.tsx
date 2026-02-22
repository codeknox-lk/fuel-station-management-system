'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, ArrowRight, Timer, SkipForward } from 'lucide-react'
import { DeliveryData } from './types'
import { addMinutes, differenceInSeconds } from 'date-fns'

interface Props {
    data: DeliveryData
    onUpdate: (data: Partial<DeliveryData>) => void
    onNext: () => void
    onBack: () => void
}

export default function Stage2_Active({ data, onUpdate, onNext }: Props) {
    useState<Date>(data?.deliveryStartTime || new Date())
    const [settlingTarget, setSettlingTarget] = useState<Date>(addMinutes(new Date(), 5)) // 5 mins from mount/start
    const [timeLeft, setTimeLeft] = useState(300) // 5 mins in seconds
    const [progress, setProgress] = useState(0)

    // Start delivery time on mount if not set
    useEffect(() => {
        if (!data?.deliveryStartTime) {
            onUpdate({ deliveryStartTime: new Date() })
        }
    }, [data?.deliveryStartTime, onUpdate])

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            const secondsRemaining = differenceInSeconds(settlingTarget, new Date())
            if (secondsRemaining <= 0) {
                setTimeLeft(0)
                setProgress(100)
                clearInterval(timer)
            } else {
                setTimeLeft(secondsRemaining)
                setProgress(((300 - secondsRemaining) / 300) * 100)
            }
        }, 1000)
        return () => clearInterval(timer)
    }, [settlingTarget])

    if (!data) return <div className="p-4 text-center">Loading...</div>

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 py-4">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Timer className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">Delivery inside Active Drop</h2>
                <p className="text-muted-foreground">
                    Fuel is flowing. Please wait for the delivery to complete and the tank to settle.
                </p>
            </div>

            <Card className="border-orange-200 bg-orange-50/50">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-orange-700">Settling Timer</h3>
                        <div className="text-4xl font-mono font-bold text-orange-600">
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-xs text-orange-600/70">Recommended wait time for turbulence to settle</p>
                    </div>

                    <Progress value={progress} className="h-2 w-full bg-orange-200" indicatorClassName="bg-orange-600" />

                    {timeLeft === 0 ? (
                        <div className="flex items-center justify-center text-green-600 font-medium gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Settling Complete - Safe to Dip
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                // Force timer completion by setting target to now
                                setSettlingTarget(new Date())
                                setTimeLeft(0)
                                setProgress(100)
                            }}
                            className="text-muted-foreground hover:text-foreground hover:bg-orange-100"
                        >
                            <SkipForward className="h-4 w-4 mr-1" /> Skip Timer
                        </Button>
                    )}
                </CardContent>
            </Card>

            <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground border-l-4 border-orange-500">
                <strong>Tip:</strong> While waiting, ensure all nozzles are holstered. Sales occuring during this drop will be calculated automatically in the next step.
            </div>

            <div className="flex justify-between pt-4">
                <Button variant="ghost" disabled>Processing Drop...</Button>
                <Button
                    onClick={onNext}
                    size="lg"
                    className={timeLeft > 0 ? "opacity-50 cursor-not-allowed" : ""}
                    disabled={timeLeft > 0 || !data?.deliveryId}
                >
                    {timeLeft > 0 ? `Wait ${formatTime(timeLeft)}` : "Complete Delivery & Verify"}
                    {timeLeft === 0 && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>
        </div>
    )
}
