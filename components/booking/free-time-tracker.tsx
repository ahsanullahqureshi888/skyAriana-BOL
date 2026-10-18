"use client"

import React, { useState, useEffect } from "react"
import { ContainerLifecycle } from "@/lib/types/booking"
import { BookingService, FreeDayEngine } from "@/lib/services/booking-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function FreeTimeTracker() {
  const [containers, setContainers] = useState<ContainerLifecycle[]>([])

  useEffect(() => {
    setContainers(BookingService.getContainers())
  }, [])

  // Filter only containers that are discharged but not returned yet
  const activeContainers = containers.filter(c => 
    c.dischargeDate && 
    c.status !== "Empty Returned" && 
    c.status !== "Completed"
  )

  const alerts = activeContainers.map(c => {
    const exposure = FreeDayEngine.calculateDetentionExposure(c)
    const lastFreeDay = FreeDayEngine.calculateLastFreeDay(c)
    
    let daysRemaining = 0
    if (lastFreeDay) {
      const diff = lastFreeDay.getTime() - new Date().getTime()
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))
    }
    
    return { container: c, exposure, lastFreeDay, daysRemaining }
  }).sort((a, b) => a.daysRemaining - b.daysRemaining)

  const detentionCount = alerts.filter(a => a.exposure > 0).length
  const warningCount = alerts.filter(a => a.exposure === 0 && a.daysRemaining <= 3).length
  const safeCount = alerts.filter(a => a.exposure === 0 && a.daysRemaining > 3).length

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <CardTitle className="text-lg font-black text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Detention & Free Time Exposure
          </div>
          <Badge variant="outline" className="bg-white text-slate-600 font-mono">
            {activeContainers.length} ACTIVE
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="p-4 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase">In Detention</p>
            <p className="text-2xl font-black text-red-600 mt-1">{detentionCount}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase">&lt; 3 Days Left</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{warningCount}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase">Safe</p>
            <p className="text-2xl font-black text-emerald-500 mt-1">{safeCount}</p>
          </div>
        </div>

        <div className="p-4 max-h-[300px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-50" />
              No active containers exposed to detention.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(item => (
                <div key={item.container.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                  item.exposure > 0 ? 'bg-red-50 border-red-100' :
                  item.daysRemaining <= 3 ? 'bg-amber-50 border-amber-100' :
                  'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-3">
                    {item.exposure > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : item.daysRemaining <= 3 ? (
                      <Clock className="h-5 w-5 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{item.container.containerNumber}</p>
                      <p className="text-xs text-slate-500">
                        Exp: {item.lastFreeDay ? item.lastFreeDay.toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {item.exposure > 0 ? (
                      <>
                        <p className="text-xs font-bold text-red-600">-{item.daysRemaining * -1} DAYS</p>
                        <p className="text-sm font-black text-red-700">${item.exposure.toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <p className={`text-xs font-bold ${item.daysRemaining <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {item.daysRemaining} DAYS LEFT
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">No Exposure</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
