// Architected and built by Drferdi.
// Sentrapedia Multi-Agent Clinical Intelligence Architecture Node Graph
// Compatible with Claude, Gemini, ChatGPT, Audrey, & Custom Healthcare LLMs via RAG/Tool-Calling
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Database, Bot, Stethoscope, Search, Layers, Cpu } from 'lucide-react'

export default function SentraAgentNodeGraph({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`relative select-none ${className}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Outer Container */}
      <div className="relative w-[500px] h-[440px] max-w-full mx-auto">
        {/* Canvas dot grid */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(183,171,152,0.12) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* Bezier connection wires */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 500 440"
          fill="none"
        >
          {/* User / Doctor Query → Sentrapedia Engine (right handle → left handle) */}
          <path
            d="M135 60 C180 60, 170 100, 210 100"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            fill="none"
          />
          {/* Sentrapedia Oracle → AI Agent Runtime (Claude/Gemini/GPT/Audrey) (right → left) */}
          <path
            d="M400 130 C440 130, 440 210, 400 210"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            fill="none"
          />
          {/* Sentrapedia Knowledge Base → Clinical Protocol Gateway (bottom → top) */}
          <path
            d="M305 165 C305 200, 180 200, 180 240"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            fill="none"
          />
          {/* AI Agent Runtime → Response Diagnostic (right → left) */}
          <path
            d="M400 260 C450 260, 440 360, 390 360"
            stroke="rgba(196,149,106,0.25)"
            strokeWidth="2"
            fill="none"
          />
          {/* Clinical Protocol Gateway → Response Diagnostic (right → left) */}
          <path
            d="M270 280 C320 280, 290 360, 320 360"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
            fill="none"
          />

          {/* Animated pulse on main wire */}
          <circle r="4" fill="#eb5939" opacity="0">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path="M135 60 C180 60, 170 100, 210 100"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="3.5" fill="#C4956A" opacity="0">
            <animateMotion
              dur="2.5s"
              repeatCount="indefinite"
              path="M400 130 C440 130, 440 210, 400 210"
            />
            <animate
              attributeName="opacity"
              values="0;0.8;0.8;0"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="3" fill="#b8ac99" opacity="0">
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              path="M305 165 C305 200, 180 200, 180 240"
            />
            <animate
              attributeName="opacity"
              values="0;0.7;0.7;0"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* ══ Node 1: User / Clinical Query (top-left) ══ */}
        <div className="absolute" style={{ left: 0, top: 20, width: 140 }}>
          <div
            className="rounded-lg transition-transform hover:-translate-y-0.5 duration-200"
            style={{
              background:
                'linear-gradient(135deg, rgba(235,89,57,0.06) 0%, transparent 50%), #18171a',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 6px -6px 24px rgba(235,89,57,0.06)',
            }}
          >
            <div
              className="px-3 py-2.5 flex items-center gap-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Search size={11} className="text-accent" />
              <span
                style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
              >
                Clinical Query
              </span>
            </div>
            <div className="px-3 py-2">
              <div
                className="rounded px-2 py-1.5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow:
                    'inset 2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>
                  Preeklamsia / O14.9...
                </span>
              </div>
            </div>
          </div>
          {/* Output handle right */}
          <div
            className="absolute top-1/2 -right-[6px] -translate-y-1/2 w-[12px] h-[12px] rounded-full"
            style={{
              background: '#eb5939',
              boxShadow: '0 0 8px rgba(235,89,57,0.5)',
              border: '2px solid #18171a',
            }}
          />
        </div>

        {/* ══ Node 2: Sentrapedia Engine (center) ══ */}
        <div className="absolute" style={{ left: 200, top: 55, width: 210 }}>
          <div
            className="rounded-lg transition-transform hover:-translate-y-0.5 duration-200"
            style={{
              background:
                'linear-gradient(135deg, rgba(235,89,57,0.1) 0%, rgba(235,89,57,0.02) 40%, transparent 60%), #18171a',
              border: '1px solid rgba(235,89,57,0.2)',
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(235,89,57,0.04), 8px -8px 30px rgba(235,89,57,0.08)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-2.5 flex items-center gap-2.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ background: 'rgba(235,89,57,0.15)' }}
              >
                <Database size={11} style={{ color: '#eb5939' }} />
              </div>
              <span
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
              >
                Sentrapedia Oracle
              </span>
            </div>
            {/* Fields */}
            <div className="px-4 py-2 flex flex-col gap-2">
              {/* Corpus Field */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-[6px] h-[6px] rounded-full"
                    style={{
                      background: '#eb5939',
                      border: '1.5px solid #18171a',
                      boxShadow: '0 0 4px rgba(235,89,57,0.4)',
                    }}
                  />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                    Dataset Korpus
                  </span>
                </div>
                <div
                  className="rounded px-2 py-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow:
                      'inset 2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(255,255,255,0.04)',
                  }}
                >
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>
                    144 Penyakit SKDI 4A FKTP
                  </span>
                </div>
              </div>
              {/* Standard */}
              <div
                className="flex items-center justify-between rounded px-2 py-1"
                style={{
                  boxShadow:
                    'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-[6px] h-[6px] rounded-full"
                    style={{ background: '#b8ac99' }}
                  />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                    Standard
                  </span>
                </div>
                <span
                  style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
                >
                  Permenkes 5/2014
                </span>
              </div>
              {/* Universal AI API / Integration */}
              <div
                className="flex items-center justify-between rounded px-2 py-1"
                style={{
                  boxShadow:
                    'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-[6px] h-[6px] rounded-full"
                    style={{ background: '#b8ac99' }}
                  />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>API Protocol</span>
                </div>
                <span style={{ fontSize: 8.5, color: '#eb5939', fontWeight: 600 }}>
                  Open RAG / Tool-Calling
                </span>
              </div>
              {/* Response output */}
              <div
                className="flex items-center justify-end gap-1.5 pt-1"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                  Knowledge Stream
                </span>
                <div
                  className="w-[10px] h-[10px] rounded-full"
                  style={{
                    background: '#eb5939',
                    boxShadow: '0 0 6px rgba(235,89,57,0.5)',
                    border: '2px solid #18171a',
                  }}
                />
              </div>
            </div>
          </div>
          {/* Input handle left */}
          <div className="absolute -left-[6px]" style={{ top: 42 }}>
            <div
              className="w-[12px] h-[12px] rounded-full"
              style={{
                background: '#eb5939',
                boxShadow: '0 0 8px rgba(235,89,57,0.4)',
                border: '2px solid #18171a',
              }}
            />
          </div>
        </div>

        {/* ══ Node 3: Multi-AI Agent Runtime (Claude, Gemini, ChatGPT, Audrey) ══ */}
        <div className="absolute" style={{ left: 295, top: 185, width: 200 }}>
          <div
            className="rounded-lg transition-transform hover:-translate-y-0.5 duration-200"
            style={{
              background:
                'linear-gradient(135deg, rgba(235,89,57,0.06) 0%, transparent 45%), #18171a',
              border: '1px solid rgba(196,149,106,0.2)',
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(196,149,106,0.03), 6px -6px 24px rgba(235,89,57,0.06)',
            }}
          >
            <div
              className="px-3.5 py-2.5 flex items-center gap-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ background: 'rgba(196,149,106,0.15)' }}
              >
                <Bot size={11} style={{ color: '#C4956A' }} />
              </div>
              <span
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
              >
                Universal AI Agent
              </span>
            </div>
            <div className="px-3.5 py-2 flex flex-col gap-2">
              <div
                className="flex items-center justify-between rounded px-2 py-1"
                style={{
                  boxShadow:
                    'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-[6px] h-[6px] rounded-full"
                    style={{ background: '#C4956A' }}
                  />
                  <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>LLM Runtime</span>
                </div>
                <span
                  style={{ fontSize: 8, color: '#C4956A', fontWeight: 600 }}
                >
                  Claude · Gemini · GPT · Audrey
                </span>
              </div>
              <div
                className="flex items-center justify-between rounded px-2 py-1"
                style={{
                  boxShadow:
                    'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-[6px] h-[6px] rounded-full"
                    style={{ background: '#C4956A' }}
                  />
                  <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>Grounding</span>
                </div>
                <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.6)' }}>
                  RAG / Tool Call
                </span>
              </div>
              <div
                className="flex items-center justify-end gap-1.5 pt-1"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>
                  Clinical Inference
                </span>
                <div
                  className="w-[10px] h-[10px] rounded-full"
                  style={{
                    background: '#C4956A',
                    boxShadow: '0 0 6px rgba(196,149,106,0.5)',
                    border: '2px solid #18171a',
                  }}
                />
              </div>
            </div>
          </div>
          {/* Input handle left */}
          <div
            className="absolute -left-[6px] top-[20px] w-[12px] h-[12px] rounded-full"
            style={{
              background: '#C4956A',
              boxShadow: '0 0 6px rgba(196,149,106,0.4)',
              border: '2px solid #18171a',
            }}
          />
        </div>

        {/* ══ Node 4: Protocol Gateway (bottom-left) ══ */}
        <div className="absolute" style={{ left: 60, top: 235, width: 180 }}>
          <div
            className="rounded-lg transition-transform hover:-translate-y-0.5 duration-200"
            style={{
              background:
                'linear-gradient(135deg, rgba(235,89,57,0.05) 0%, transparent 50%), #18171a',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4), 6px -6px 20px rgba(235,89,57,0.05)',
            }}
          >
            <div
              className="px-3 py-2 flex items-center gap-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center"
                style={{ background: 'rgba(183,171,152,0.1)' }}
              >
                <Layers size={9} style={{ color: '#b8ac99' }} />
              </div>
              <span
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
              >
                Protokol FKTP
              </span>
            </div>
            <div className="px-3 py-2">
              <div
                className="rounded px-2 py-1"
                style={{
                  boxShadow:
                    'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                }}
              >
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>
                  ICD-10 · Terapi · Kriteria Rujuk
                </span>
              </div>
            </div>
          </div>
          {/* Input handle top */}
          <div
            className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full"
            style={{ background: 'rgba(183,171,152,0.5)', border: '2px solid #18171a' }}
          />
          {/* Output handle right */}
          <div
            className="absolute top-1/2 -right-[6px] -translate-y-1/2 w-[10px] h-[10px] rounded-full"
            style={{ background: 'rgba(183,171,152,0.4)', border: '2px solid #18171a' }}
          />
        </div>

        {/* ══ Response bubble: Rekomendasi Terapi & Diagnosis (bottom-right) ══ */}
        <div className="absolute" style={{ left: 260, top: 340, width: 220 }}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(235,89,57,0.15)' }}
            >
              <Stethoscope size={8} style={{ color: '#eb5939' }} />
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Sintesis Bukti Klinis...
            </span>
            <div className="flex gap-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#eb5939' }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#eb5939', opacity: 0.5, animationDelay: '0.2s' }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#eb5939', opacity: 0.3, animationDelay: '0.4s' }}
              />
            </div>
          </div>
          <div
            className="rounded-lg px-4 py-3"
            style={{
              background:
                'linear-gradient(135deg, rgba(235,89,57,0.05) 0%, transparent 50%), #1e1d1a',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3), 6px -6px 20px rgba(235,89,57,0.05)',
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.55,
                display: 'block',
              }}
            >
              <strong className="text-accent">Diagnosis 4A:</strong> Preeklamsia Berat (O14.9).
              <br />
              <strong className="text-foreground/80">Grounding AI:</strong> Claude, Gemini & GPT tersinkron dosis MgSO4 & kriteria rujukan FKTP.
            </span>
          </div>
          {/* Input handle left */}
          <div
            className="absolute top-[12px] -left-[6px] w-[10px] h-[10px] rounded-full"
            style={{ background: 'rgba(183,171,152,0.3)', border: '2px solid #18171a' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
