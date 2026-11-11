'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  type TerminalLine,
  terminalCode,
  terminalSpeaker,
  SyntaxHighlightedCode,
  getCommonPrefixLength,
  getTerminalDelay,
  sleep,
} from '@/components/showcase/thinking-stack-config'

function TerminalPrompt({ speaker }: { speaker: { user: string; host: string; path: string } }) {
  return (
    <span className="fi-terminal-prompt">
      <span className="fi-terminal-prompt-user">{speaker.user}</span>
      <span className="fi-terminal-prompt-at">@</span>
      <span className="fi-terminal-prompt-host">{speaker.host}</span>
      <span>:</span>
      <span className="fi-terminal-prompt-path">{speaker.path}</span>
      <span className="fi-terminal-prompt-symbol">$</span>
    </span>
  )
}

function TerminalCursor({ active }: { active: boolean }) {
  return <span className={active ? 'fi-terminal-cursor typing' : 'fi-terminal-cursor'}></span>
}

function TerminalLineView({ line }: { line: TerminalLine }) {
  if (line.type === 'banner') {
    return (
      <div className="fi-terminal-line">
        <div className="fi-terminal-orchestra-banner">
          <div className="fi-terminal-banner-title">Chief&apos;s Orchestration Agents - LIVE</div>
          <div className="fi-terminal-agent-line">
            <span className="fi-terminal-agent-badge agent-dexton">DEX</span>
            <span className="fi-terminal-agent-arrow">-&gt;</span>
            <span className="fi-terminal-agent-status">ONLINE</span>
            <span className="fi-terminal-agent-note">reasoning engine loaded</span>
          </div>
          <div className="fi-terminal-agent-line">
            <span className="fi-terminal-agent-badge agent-claude">CLA</span>
            <span className="fi-terminal-agent-arrow">-&gt;</span>
            <span className="fi-terminal-agent-status busy">SYNCING</span>
            <span className="fi-terminal-agent-note">context window: 128k</span>
          </div>
          <div className="fi-terminal-agent-line">
            <span className="fi-terminal-agent-badge agent-kimi">KIM</span>
            <span className="fi-terminal-agent-arrow">-&gt;</span>
            <span className="fi-terminal-agent-status">ONLINE</span>
            <span className="fi-terminal-agent-note">long-context ready</span>
          </div>
          <div className="fi-terminal-agent-line">
            <span
              className="fi-terminal-agent-badge"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              AGV
            </span>
            <span className="fi-terminal-agent-arrow">-&gt;</span>
            <span className="fi-terminal-agent-status busy">LOADING...</span>
            <span className="fi-terminal-agent-note">please wait (still thinking)</span>
          </div>
          <div className="fi-terminal-banner-foot">
            Consensus Protocol: active | AGV: belum siap
          </div>
        </div>
      </div>
    )
  }

  if (line.type === 'output') {
    return (
      <div className="fi-terminal-line">
        <span className={`fi-terminal-output ${line.tone ?? ''}`}>{line.text}</span>
        {!line.complete ? <TerminalCursor active /> : null}
      </div>
    )
  }

  if (line.type === 'code') {
    return (
      <div className="fi-terminal-line code">
        <SyntaxHighlightedCode text={line.text} />
        {!line.complete ? <TerminalCursor active /> : null}
      </div>
    )
  }

  return (
    <div className="fi-terminal-line">
      <TerminalPrompt speaker={line.speaker ?? terminalSpeaker} />
      <span>{line.text}</span>
      {!line.complete ? <TerminalCursor active /> : null}
    </div>
  )
}

export function ThinkingTerminal() {
  const [activeTab, setActiveTab] = useState('sentra-core')
  const [lines, setLines] = useState<TerminalLine[]>([])
  const tabs = useMemo(() => ['sentra-core/', 'melinda-dhai/', 'ferdiiskandar-plus/'], [])

  useEffect(() => {
    let cancelled = false
    let id = 0

    const addLine = async (line: Omit<TerminalLine, 'id'>, delay = 0) => {
      if (delay > 0) await sleep(delay)
      if (cancelled) return
      setLines((current) => [...current, { ...line, id: id++ }])
    }

    const typeLine = async (
      line: Omit<TerminalLine, 'id' | 'complete'>,
      baseSpeed = 42,
      delay = 0,
      typoText?: string
    ) => {
      if (delay > 0) await sleep(delay)
      if (cancelled) return

      const targetText = line.text ?? ''
      setLines((current) => [...current, { ...line, id: id++, text: '', complete: false }])

      const setCurrentLineText = (nextText: string) => {
        if (cancelled) return
        setLines((current) =>
          current.map((item, index) =>
            index === current.length - 1 ? { ...item, text: nextText } : item
          )
        )
      }

      const typeTextRange = async (fromIndex: number) => {
        for (let i = fromIndex; i < targetText.length; i += 1) {
          if (cancelled) return
          setCurrentLineText(targetText.slice(0, i + 1))
          await sleep(getTerminalDelay(targetText[i] ?? '', i, baseSpeed))
        }
      }

      if (typoText) {
        for (let i = 0; i < typoText.length; i += 1) {
          if (cancelled) return
          setCurrentLineText(typoText.slice(0, i + 1))
          await sleep(getTerminalDelay(typoText[i] ?? '', i, baseSpeed))
        }

        await sleep(220)

        const resumeIndex = getCommonPrefixLength(typoText, targetText)
        for (let i = typoText.length; i > resumeIndex; i -= 1) {
          if (cancelled) return
          setCurrentLineText(typoText.slice(0, i - 1))
          await sleep(32 + ((i * 7) % 22))
        }

        await sleep(140)
        await typeTextRange(resumeIndex)
      } else {
        await typeTextRange(0)
      }

      if (cancelled) return
      setLines((current) =>
        current.map((item, index) =>
          index === current.length - 1 ? { ...item, complete: true } : item
        )
      )
    }

    const runSequence = async () => {
      await sleep(600)
      await typeLine(
        { type: 'command', speaker: terminalSpeaker, text: 'vim orchestrator/agent-swarm.ts' },
        42,
        0,
        'vim orchestratr/agent-swarm.ts'
      )
      await typeLine(
        { type: 'output', tone: 'dim', text: '"orchestrator/agent-swarm.ts" [New File]' },
        22,
        360
      )
      await typeLine({ type: 'output', tone: 'dim', text: '-- INSERT --' }, 28, 220)
      await typeLine({ type: 'code', text: terminalCode }, 18, 260)
      await typeLine({ type: 'output', tone: 'dim', text: '-- NORMAL --' }, 28, 360)
      await typeLine({ type: 'command', speaker: terminalSpeaker, text: ':wq' }, 58, 220)
      await typeLine(
        { type: 'output', tone: 'success', text: '"orchestrator/agent-swarm.ts" written' },
        24,
        360
      )

      await typeLine(
        { type: 'command', speaker: terminalSpeaker, text: 'sentra-orchestrate --boot' },
        42,
        620,
        'sentra-orchestrat --boot'
      )
      await typeLine(
        { type: 'output', tone: 'info', text: "[ORCHESTRATOR] Booting Chief's agent swarm..." },
        20,
        280
      )
      await typeLine(
        { type: 'output', tone: 'dim', text: '[ORCHESTRATOR] Loading Dexton    -> OK  (23ms)' },
        20,
        320
      )
      await typeLine(
        { type: 'output', tone: 'dim', text: '[ORCHESTRATOR] Loading Claude    -> OK  (41ms)' },
        20,
        300
      )
      await typeLine(
        { type: 'output', tone: 'dim', text: '[ORCHESTRATOR] Loading Kimi      -> OK  (38ms)' },
        20,
        300
      )
      await typeLine(
        { type: 'output', tone: 'dim', text: '[ORCHESTRATOR] Loading Antigravity -> .' },
        20,
        340
      )
      await typeLine(
        { type: 'output', tone: 'dim', text: '[ORCHESTRATOR] Loading Antigravity -> . .' },
        20,
        900
      )
      await typeLine(
        {
          type: 'output',
          tone: 'dim',
          text: '[ORCHESTRATOR] Loading Antigravity -> . . . (masih loading)',
        },
        20,
        1100
      )
      await typeLine(
        {
          type: 'output',
          tone: 'dim',
          text: '[ORCHESTRATOR] Loading Antigravity -> . . . . . (serius ini)',
        },
        20,
        1400
      )
      await typeLine(
        {
          type: 'output',
          tone: 'success',
          text: '[ORCHESTRATOR] Antigravity -> OK  (4872ms) // finally',
        },
        22,
        600
      )
      await typeLine(
        {
          type: 'output',
          tone: 'success',
          text: '[ORCHESTRATOR] All 4 agents registered. Swarm ready.',
        },
        22,
        400
      )

      await typeLine(
        {
          type: 'command',
          speaker: terminalSpeaker,
          text: 'invoke --all --task=clinical-reasoning',
        },
        42,
        560,
        'invoke --al --task=clinical-reasoning'
      )
      await addLine({ type: 'banner', complete: true }, 360)

      await typeLine(
        {
          type: 'output',
          tone: 'dim',
          text: '[SWARM] Dexton       -> analyzing task decomposition...  done (61ms)',
        },
        20,
        440
      )
      await typeLine(
        {
          type: 'output',
          tone: 'dim',
          text: '[SWARM] Claude       -> generating structured output...   done (89ms)',
        },
        20,
        480
      )
      await typeLine(
        {
          type: 'output',
          tone: 'dim',
          text: '[SWARM] Kimi         -> cross-referencing long-context... done (112ms)',
        },
        20,
        520
      )
      await typeLine({ type: 'output', tone: 'dim', text: '[SWARM] Antigravity  -> ...' }, 20, 560)
      await typeLine(
        { type: 'output', tone: 'dim', text: '[SWARM] Antigravity  -> masih mikir' },
        20,
        1800
      )
      await typeLine(
        { type: 'output', tone: 'dim', text: '[SWARM] Antigravity  -> bentar lagi' },
        20,
        2200
      )
      await typeLine(
        {
          type: 'output',
          tone: 'dim',
          text: '[SWARM] Antigravity  -> context window penuh. re-indexing...',
        },
        20,
        1600
      )
      await typeLine(
        {
          type: 'output',
          tone: 'dim',
          text: '[SWARM] Antigravity  -> done (7341ms) // Chief please upgrade tier',
        },
        20,
        800
      )
      await typeLine(
        {
          type: 'output',
          tone: 'success',
          text: '[SWARM] Consensus reached. Clinical output delivered. AGV: minta kredit.',
        },
        22,
        500
      )
      await addLine({ type: 'command', speaker: terminalSpeaker, text: '', complete: false }, 320)
    }

    void runSequence()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="fi-terminal-window">
      <div className="fi-terminal-title-bar">
        <div aria-label="Window controls" className="fi-terminal-traffic-lights">
          <button
            aria-label="Close terminal preview"
            className="fi-terminal-traffic-btn red"
            type="button"
          />
          <button
            aria-label="Minimize terminal preview"
            className="fi-terminal-traffic-btn yellow"
            type="button"
          />
          <button
            aria-label="Maximize terminal preview"
            className="fi-terminal-traffic-btn green"
            type="button"
          />
        </div>
        <div className="fi-terminal-window-title">ferdi@sentrahai.com -- ~ -- zsh -- 80x24</div>
        <div aria-hidden="true" className="fi-terminal-window-controls">
          <span></span>
          <span></span>
        </div>
      </div>
      <div className="fi-terminal-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className={activeTab === tab ? 'fi-terminal-tab active' : 'fi-terminal-tab'}
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            type="button"
          >
            <span>{tab}</span>
            <span aria-hidden="true" className="fi-terminal-tab-close">
              x
            </span>
          </button>
        ))}
        <button aria-label="New terminal tab" className="fi-terminal-tab-new" type="button">
          +
        </button>
      </div>
      <div aria-live="polite" className="fi-terminal-body">
        {lines.map((line) => (
          <TerminalLineView key={line.id} line={line} />
        ))}
      </div>
      <div className="fi-terminal-status-bar">
        <div className="fi-terminal-status-section">
          <span className="fi-terminal-status-item">
            <span className="fi-terminal-status-dot"></span>
            zsh
          </span>
          <span className="fi-terminal-status-item">UTF-8</span>
          <span className="fi-terminal-status-item">80x24</span>
        </div>
        <div className="fi-terminal-status-section right">
          <span className="fi-terminal-status-item">~/projects/sentrahai.com</span>
          <span className="fi-terminal-status-item">L1:C1</span>
        </div>
      </div>
    </div>
  )
}
