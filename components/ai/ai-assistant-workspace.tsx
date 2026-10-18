"use client"

import React from "react"
import { AIChatInterface } from "./ai-chat-interface"

export function AiAssistantWorkspace() {
  return (
    <div className="w-full max-w-5xl mx-auto h-[calc(100vh-4.5rem)] flex flex-col py-2">
      <AIChatInterface isFloating={false} />
    </div>
  )
}

export default AiAssistantWorkspace
