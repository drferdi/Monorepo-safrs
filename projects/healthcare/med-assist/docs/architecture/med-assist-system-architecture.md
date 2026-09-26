# Med Assist — System Architecture

> Last updated: 2026-04-17 · Author: Drferdi

---

## 1. High-Level Overview

```mermaid
graph TB
    subgraph EXT["🔷 Browser Extension (Chrome MV3)"]
        direction TB

        subgraph UI["UI Layer"]
            SP["Side Panel UI<br/><small>main.tsx · React 18</small>"]
            LP["Login Page<br/><small>login/main.tsx</small>"]
        end

        subgraph LOGIC["Logic Layer"]
            BG["Background Script<br/><small>background.ts · Service Worker</small>"]
            CS["Content Script<br/><small>content.ts · DOM Access</small>"]
        end

        subgraph ENGINES["Clinical Engines <small>(in lib/)</small>"]
            IDE["Iskandar Diagnosis Engine<br/><small>iskandar-diagnosis-engine/</small>"]
            ED["Emergency Detector<br/><small>emergency-detector/</small>"]
            PE["Pattern Engine v2<br/><small>70 patterns · 11 GATEs</small>"]
            TA["Trajectory Analyzer<br/><small>trajectory-analyzer.ts</small>"]
        end

        subgraph SCRAPER["Scraper System"]
            DAS["DAS<br/><small>Adaptive Scraper</small>"]
            FIL["Filler Core<br/><small>Form Writer</small>"]
            HND["Page Handlers<br/><small>anamnesa · diagnosa · resep</small>"]
        end

        subgraph DATA["Data Layer"]
            STR["Chrome Storage<br/><small>local · session · sync</small>"]
            DDI["DDI Database<br/><small>173K+ interactions</small>"]
            ICD["ICD-10 + RAG<br/><small>penyakit · stok obat</small>"]
        end
    end

    subgraph EXTERNAL["External Systems"]
        EMR["ePuskesmas EMR<br/><small>DOM · Web Page</small>"]
        API["Sentra Dashboard API<br/><small>crew.puskesmasbalowerti.com</small>"]
        AI["AI Services<br/><small>Local-first · DeepSeek fallback</small>"]
    end

    %% UI → Background (message passing)
    SP -->|"sendMessage()"| BG
    LP -->|"AuthClient.login()"| BG

    %% Background → Content Script (relay)
    BG -->|"tabs.sendMessage()"| CS

    %% Content Script → Background (results)
    CS -->|"scrapeResult · visitHistory"| BG

    %% Content Script → DOM
    CS <-->|"scrape / fill"| EMR

    %% Content Script → Scraper subsystem
    CS --- DAS
    CS --- FIL
    CS --- HND

    %% Background → Engines
    BG -->|"getSuggestions"| IDE
    BG -->|"initializeCDSS"| ED

    %% Sidepanel → Engines (direct import)
    SP -->|"buildAlerts()"| ED
    SP -->|"evaluatePatterns()"| PE
    SP -->|"analyzeTrajectory()"| TA

    %% Engine relationships
    ED --- PE
    IDE -.->|"red flags"| ED

    %% Background → External
    BG <-->|"sync · transfer"| API
    BG -->|"LLM reasoning"| AI
    LP -->|"POST /auth/login"| API

    %% DAS → AI
    DAS -->|"semantic field mapping"| AI

    %% Data access
    BG --> STR
    BG --> DDI
    IDE --> ICD
    DAS --> STR

    %% Styling
    classDef uiNode fill:#1a2332,stroke:#6b9b8a,stroke-width:2px,color:#f4efe6
    classDef logicNode fill:#1a1a2e,stroke:#eb5939,stroke-width:2px,color:#f4efe6
    classDef engineNode fill:#0f1a16,stroke:#6b9b8a,stroke-width:1.5px,color:#6b9b8a
    classDef dataNode fill:#1a1a1a,stroke:#444,stroke-width:1px,color:#b7ab98
    classDef extNode fill:#0a0a0a,stroke:#eb5939,stroke-width:2px,color:#eb5939

    class SP,LP uiNode
    class BG,CS logicNode
    class IDE,ED,PE,TA engineNode
    class DAS,FIL,HND engineNode
    class STR,DDI,ICD dataNode
    class EMR,API,AI extNode
```

---

## 2. Message Flow Architecture

```mermaid
sequenceDiagram
    participant SP as Side Panel UI
    participant BG as Background Script
    participant CS as Content Script
    participant EMR as ePuskesmas DOM
    participant API as Dashboard API
    participant AI as AI Services

    Note over SP,AI: ━━━ SCRAPING FLOW ━━━
    SP->>BG: sendMessage('scanVisitHistory')
    BG->>CS: tabs.sendMessage('scanVisitHistory')
    CS->>EMR: DOM traversal + DAS
    EMR-->>CS: scraped data
    CS->>BG: sendMessage('scrapeResult', data)
    BG->>API: syncPatientToDashboard()
    BG-->>SP: return scraped data

    Note over SP,AI: ━━━ FORM FILLING FLOW ━━━
    SP->>BG: sendMessage('fillResep', payload)
    BG->>CS: tabs.sendMessage('fillResep')
    CS->>EMR: Filler Core → DOM write
    EMR-->>CS: FillResult
    CS-->>BG: result
    BG-->>SP: result

    Note over SP,AI: ━━━ DIAGNOSIS FLOW ━━━
    SP->>BG: sendMessage('getSuggestions', context)
    BG->>BG: runGetSuggestionsFlow()
    BG->>BG: Iskandar Diagnosis Engine (local)
    opt LLM configured
        BG->>AI: LLM reasoning request
        AI-->>BG: reasoning result
    end
    BG-->>SP: CDSSResponse (ranked diagnoses)

    Note over SP,AI: ━━━ CLINICAL TRIAGE (in-UI) ━━━
    SP->>SP: buildAlerts() — existing 5 gates
    SP->>SP: buildClinicalSnapshot()
    SP->>SP: evaluatePatterns() — 70 patterns
    SP->>SP: patternMatchesToAlerts()
    SP->>SP: merge alerts → Emergency Dashboard

    Note over SP,AI: ━━━ TRAJECTORY ANALYSIS (in-UI) ━━━
    SP->>BG: sendMessage('scanVisitHistory')
    BG->>CS: relay
    CS-->>BG: visit records
    BG-->>SP: visit records
    SP->>SP: analyzeTrajectory(visits)
    opt Canonical Engine available
        SP->>API: evaluateCanonicalClinicalEngine()
        API-->>SP: canonical result
    end
    SP->>SP: render ClinicalTrajectory dashboard
```

---

## 3. Clinical Engine Stack

```mermaid
graph LR
    subgraph INPUT["Patient Input"]
        VS["Vital Signs<br/><small>SBP DBP HR RR Temp SpO2 Glucose</small>"]
        SX["Symptom Text<br/><small>Indonesian free-text</small>"]
        HX["History<br/><small>allergies · chronic · pregnancy</small>"]
        AV["AVPU Level"]
    end

    subgraph GATE_LEGACY["GATE v1 — buildAlerts()"]
        G0["AVPU Gate"]
        G1["Hypotension Gate"]
        G2["Occult Shock Gate"]
        G3["HTN Crisis Gate"]
        G4["Glucose Gate"]
    end

    subgraph SNAPSHOT["ClinicalSnapshot Builder"]
        PV["Parse Vitals"]
        DV["Derive Values<br/><small>MAP · Shock Index · HTN Severity</small>"]
        SS["Extract Symptom Signals<br/><small>24 keyword groups · negation-aware</small>"]
    end

    subgraph GATE_V2["GATE v2 — Pattern Engine"]
        PE2["evaluatePatterns()<br/><small>70 patterns · 11 GATEs</small>"]
        DD["Deduplication<br/><small>supersededBy existing alerts</small>"]
    end

    subgraph GATES_NEW["11 New Clinical GATEs"]
        GS["SEPSIS_EARLY"]
        GSS["SEPTIC_SHOCK"]
        GSI["SHOCK_INDEX"]
        GRF["RESP_FAILURE"]
        GPE["PE_SUSPECT"]
        GAC["ACS"]
        GST["STROKE"]
        GAN["ANAPHYLAXIS"]
        GDK["DKA_HHS"]
        GRA["RESP_ASTHMA_COPD"]
        GAB["ANEMIA_BLEED"]
    end

    subgraph OUTPUT["Alert Output"]
        SA["ScreeningAlert[]<br/><small>merged · sorted by severity</small>"]
        AP["Action Protocols<br/><small>9 ABCDE protocols</small>"]
    end

    VS --> GATE_LEGACY
    AV --> G0
    VS --> PV
    SX --> SS
    HX --> DV

    GATE_LEGACY --> SA
    GATE_LEGACY -->|"enricher values"| DV

    PV --> DV
    DV --> PE2
    SS --> PE2

    PE2 --> DD
    DD -->|"deduplicated"| SA
    PE2 --> GATES_NEW
    PE2 --> AP

    classDef inputNode fill:#1a1a2e,stroke:#6b9b8a,color:#f4efe6
    classDef legacyNode fill:#1a1612,stroke:#b7ab98,color:#b7ab98
    classDef v2Node fill:#0f1a16,stroke:#6b9b8a,stroke-width:2px,color:#6b9b8a
    classDef gateNode fill:#1a0a0a,stroke:#eb5939,color:#eb5939
    classDef outputNode fill:#0a0a0a,stroke:#f4efe6,color:#f4efe6

    class VS,SX,HX,AV inputNode
    class G0,G1,G2,G3,G4 legacyNode
    class PV,DV,SS,PE2,DD v2Node
    class GS,GSS,GSI,GRF,GPE,GAC,GST,GAN,GDK,GRA,GAB gateNode
    class SA,AP outputNode
```

---

## 4. Storage Architecture

```mermaid
graph TB
    subgraph CHROME_STORAGE["Chrome Storage API"]
        subgraph LOCAL["chrome.storage.local <small>(persistent)</small>"]
            AUTH_L["Auth Session<br/><small>sentra:auth:session</small>"]
            ENC["Encounter Data<br/><small>sentra_encounter</small>"]
            DDI_C["DDI Database Cache"]
            MAP_C["DAS Mapping Cache"]
            AUDIT["Audit Logs"]
            SYNC_C["Dashboard Sync Cache"]
        end

        subgraph SESSION["chrome.storage.session <small>(RAM-only)</small>"]
            TOKEN["Auth Tokens<br/><small>secure · volatile</small>"]
        end

        subgraph SYNC_S["chrome.storage.sync <small>(cross-device)</small>"]
            AI_CFG["AI Config<br/><small>local runtime · provider fallback keys</small>"]
            THEME["Theme Settings"]
        end
    end

    BG["Background Script"] -->|"read/write"| LOCAL
    BG -->|"read/write"| SESSION
    LP["Login Page"] -->|"write auth"| LOCAL
    LP -->|"write token"| SESSION
    SP["Side Panel UI"] -->|"read via Zustand"| SYNC_S
    DAS["DAS Scraper"] -->|"cache mappings"| MAP_C
```

---

## 5. Component Architecture — Side Panel Views

```mermaid
stateDiagram-v2
    [*] --> main : app loads

    state main {
        [*] --> ttv : default tab
        ttv --> emergency : tab switch
        emergency --> ttv : tab switch
        ttv --> agent : tab switch
        agent --> ttv : tab switch
    }

    main --> trajectory : onNavigateToTrajectory()
    trajectory --> main : onBack()
    trajectory --> differential : onNextDifferential()
    differential --> main : onBack()

    state ttv {
        TTVInferenceUI
        SentraUplink
        DoctorPicker
        CDSSWidget
    }

    state emergency {
        EmergencyDashboard
        AlertTimeline
        ActionProtocols
    }

    state trajectory {
        ClinicalTrajectory
        TrendChart
        RiskMatrix
        DosageCalculator
    }

    state differential {
        ClinicalDifferential
        DiagnosisCards
        RedFlagAlerts
        PrescriptionBuilder
    }
```

---

## 6. Key Design Principles

| Principle                   | Implementation                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Background as broker**    | All cross-context communication routes through background.ts. Side Panel never talks to Content Script directly (except one `getPatientInfo` shortcut). |
| **Engines are local-first** | Diagnosis, trajectory, emergency detection all run in-browser with zero API dependency. AI services are optional enhancers.                             |
| **Pattern-as-data**         | 70 clinical patterns are declarative `Criterion[]` arrays, not 70 separate functions. One engine evaluates all.                                         |
| **Enricher pattern**        | Existing detectors (AVPU, HTN, Glucose, Shock) are never modified — they populate derived values consumed by new patterns.                              |
| **Deduplication**           | Pattern Engine skips patterns whose `supersededBy` matches existing buildAlerts() output IDs.                                                           |
| **Negation-aware NLP**      | Indonesian symptom text parsing handles "tidak sesak", "sesak (-)", "menyangkal nyeri" to reduce false positives.                                       |
| **Tiered activation**       | Tier A (vitals only) + Tier B (vitals + keywords) active now. Tier C (needs new UI inputs) defined but gated.                                           |
| **Storage separation**      | Sensitive tokens in `session` (RAM), persistent data in `local`, cross-device config in `sync`.                                                         |

---

## 7. File Map

```
sentra-assist/
├── entrypoints/
│   ├── sidepanel/main.tsx        ← App shell, routing, state
│   ├── sidepanel/style.css       ← All styles (6000+ lines)
│   ├── login/main.tsx            ← Dashboard auth UI
│   ├── background.ts             ← Service worker (1900+ lines)
│   └── content.ts                ← DOM bridge (58KB)
├── components/clinical/
│   ├── TTVInferenceUI.tsx        ← Vital signs + triage (3300+ lines)
│   ├── ClinicalTrajectory.tsx    ← Trajectory dashboard (1368 lines)
│   └── ClinicalDifferential.tsx  ← Differential diagnosis (2597 lines)
├── lib/
│   ├── emergency-detector/       ← GATE v1 + v2 pattern engine
│   │   ├── pattern-engine.ts     ← Core evaluator
│   │   ├── clinical-patterns.ts  ← 70 pattern definitions
│   │   ├── clinical-snapshot.ts  ← Snapshot builder
│   │   ├── symptom-signals.ts    ← Indonesian keyword NLP
│   │   └── action-protocols.ts   ← 9 ABCDE protocols
│   ├── iskandar-diagnosis-engine/← Core diagnosis engine
│   │   └── trajectory-analyzer.ts← Vital trend analysis
│   ├── scraper/adaptive/         ← DAS (AI-powered scraper)
│   ├── api/                      ← Auth, bridge, polling
│   ├── clinical/                 ← Inference, thresholds, dosage
│   └── rag/                      ← ICD-10 search
└── data/                         ← DDI, field mappings, clinical data
```
