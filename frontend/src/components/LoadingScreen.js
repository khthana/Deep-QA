import React from 'react'
import ContentMotionDIV from './ContentMotionDIV'

export default function LoadingScreen() {
  return (
    <ContentMotionDIV className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0B1120]">
      {/* Ambient Background */}
      <div className="absolute h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[160px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-indigo-900/20" />

      <ContentMotionDIV
        key="loading"
        className="relative flex flex-col items-center gap-10"
      >
        {/* Premium Spinner */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Static Ring */}
          <div className="absolute inset-0 rounded-full border border-white/5" />

          {/* Animated Ring */}
          <div className="absolute inset-0 animate-spin rounded-full border-[6px] border-transparent border-t-white " />

          {/* Soft Core Glow */}
        </div>

        {/* Text Section */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm  uppercase text-slate-400">
            กำลังโหลดข้อมูล
          </span>

          <h2 className="text-lg font-semibold tracking-tight text-white">
            Digital Educational Excellence Portfolio
          </h2>

          <div className="mt-2 flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
          </div>
        </div>
      </ContentMotionDIV>
    </ContentMotionDIV>
  )
}
