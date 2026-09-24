/**
 * Starter diagram templates for Mermaid Studio
 * Includes diagrams inspired by the reference tourism dependency explorer
 * as well as representative templates for various Mermaid diagram types.
 */

export const DIAGRAM_TEMPLATES = [
  {
    id: 'dependency-overview',
    title: 'Dependency Tree — Overview',
    category: 'Architecture & Delivery',
    kind: 'flowchart',
    description: 'High-level milestone progression from infrastructure baseline to project completion (from reference).',
    code: `---
config:
  theme: dark
  flowchart:
    useMaxWidth: false
    curve: basis
    nodeSpacing: 45
    rankSpacing: 75
---
flowchart LR
    INFRA[Infrastructure baseline]
    SPLP[Shared PLP]
    SPDP[Shared PDP]
    PASS[Passenger shared]
    PLP[Parallel service PLPs]
    PDP[Parallel service PDPs]
    REVIEW[Parallel service Reviews]
    TRIPS[My Trips by service]
    DONE{{All services complete}}

    INFRA --> SPLP --> PLP
    INFRA --> SPDP --> PDP
    INFRA --> PASS
    PLP -->|QA Gate| PDP
    PDP -->|QA Gate| REVIEW
    PASS --> REVIEW
    REVIEW -->|QA Gate| TRIPS -->|QA Gate| DONE

    classDef infra fill:#202a35,stroke:#94a3b8,color:#fff,stroke-width:3px
    classDef shared fill:#2e2050,stroke:#8b5cf6,color:#fff,stroke-width:2px
    classDef service fill:#123448,stroke:#0ea5e9,color:#fff,stroke-width:2px
    classDef milestone fill:#111827,stroke:#f8fafc,color:#fff,stroke-width:2px
    class INFRA infra
    class SPLP,SPDP,PASS shared
    class PLP,PDP,REVIEW,TRIPS service
    class DONE milestone
`
  },
  {
    id: 'delivery-gantt',
    title: 'Delivery Sequence — Gantt Roadmap',
    category: 'Architecture & Delivery',
    kind: 'gantt',
    description: 'Resource delivery sequence and milestone QA timeline (from reference).',
    code: `---
config:
  gantt:
    useWidth: 2200
    barHeight: 28
    barGap: 10
    topPadding: 60
    leftPadding: 200
    gridLineStartPadding: 45
  theme: dark
---
gantt
    title PLP Shared — Resource Delivery Sequence
    dateFormat YYYY-MM-DD HH:mm
    axisFormat %d %b

    section Infrastructure
    Core Design System Foundation          :infra, 2026-09-22 09:00, 36h

    section Hossein
    SellCalendarPrice Component            :hcalendar, 2026-09-24 09:00, 8h
    SearchForm Service Integration         :hsearch, after hcalendar, 14h

    section Elham
    SuggestionCard Widget                  :esuggestion, 2026-09-24 09:00, 4h
    ActionPrice Matrix                     :eaction, after esuggestion, 6h
    HotelRating Visual                     :erating, after eaction, 4h
    TourismWebPlpCard Container            :ecard, after erating, 18h

    section Reza
    BundleCards Web Flow                   :rbundle, 2026-09-24 09:00, 16h

    section QA & Verification
    PLP Shared Milestone                   :milestone, sharedDone, after hsearch ecard rbundle, 0h
    Automated E2E Tests                    :qa, after sharedDone, 8h
    Design QA Sign-off                     :designqa, after qa, 4h
    CI/CD Production Deployment            :cicd, after designqa, 6h
    Release Ready                          :milestone, ready, after cicd, 0h
`
  },
  {
    id: 'service-architecture',
    title: 'Service Architecture & Dependencies',
    category: 'Architecture & Delivery',
    kind: 'flowchart',
    description: 'Multi-service dependency tree across domestic flight, hotel, and bus verticals.',
    code: `---
config:
  theme: dark
  flowchart:
    curve: natural
---
flowchart TD
    subgraph CorePlatform["Shared Core Platform"]
        Auth[SSO & Auth Gateway]
        DS[Design System UI Tokens]
        Tracking[Analytics & Telemetry]
    end

    subgraph ServiceLines["Customer Facing Verticals"]
        Flight["✈️ Flights Service"]
        Hotel["🏨 Hotel Bookings"]
        Bus["🚌 Bus & Transit"]
    end

    subgraph CheckoutFlow["Universal Checkout"]
        Cart[Booking Cart]
        Payment[Payment Gateway]
        Notify[Notification Hub]
    end

    Auth --> Flight & Hotel & Bus
    DS --> Flight & Hotel & Bus
    Flight --> Cart
    Hotel --> Cart
    Bus --> Cart
    Cart --> Payment --> Notify
    Payment -.-> Tracking

    classDef core fill:#1a2333,stroke:#5794ff,color:#edf4ff,stroke-width:2px;
    classDef vertical fill:#241d3b,stroke:#a78bfa,color:#edf4ff,stroke-width:2px;
    classDef checkout fill:#132d27,stroke:#34d399,color:#edf4ff,stroke-width:2px;
    class Auth,DS,Tracking core;
    class Flight,Hotel,Bus vertical;
    class Cart,Payment,Notify checkout;
`
  },
  {
    id: 'sequence-auth',
    title: 'Sequence — OAuth 2.0 PKCE Flow',
    category: 'Standard Diagrams',
    kind: 'sequence',
    description: 'Detailed sequence diagram of authentication with PKCE authorization code exchange.',
    code: `sequenceDiagram
    autonumber
    actor User as User Browser
    participant App as SPA Client (Mermaid Studio)
    participant Auth as Authorization Server
    participant API as Secure Resource API

    User->>App: Click "Connect Account"
    App->>App: Generate Code Verifier & Challenge
    App->>Auth: GET /authorize?code_challenge=...
    Auth->>User: Prompt Login & Consent Screen
    User->>Auth: Submit Credentials
    Auth-->>App: Redirect with Authorization Code
    App->>Auth: POST /token + Code Verifier
    Auth-->>App: Return Access Token & Refresh Token
    App->>API: GET /user/profile (Bearer Token)
    API-->>App: 200 OK + User Profile JSON
    App->>User: Display Synchronized Workspace
`
  },
  {
    id: 'class-diagram',
    title: 'Class Diagram — Canvas & Renderer Engine',
    category: 'Standard Diagrams',
    kind: 'class',
    description: 'Object-oriented model of canvas viewport, coordinate transforms, and renderer.',
    code: `classDiagram
    direction TB
    class StudioApp {
      +Editor editor
      +Canvas canvas
      +Storage storage
      +init() void
      +loadTemplate(id) void
      +exportDiagram(format) void
    }
    class Canvas {
      -number zoom
      -number panX
      -number panY
      -number velocityX
      -number velocityY
      +applyTransform() void
      +setZoom(val, anchorX, anchorY) void
      +fit(animate) void
      +center(animate) void
      +startInertia(vx, vy) void
    }
    class Editor {
      -string source
      -HTMLElement textarea
      +getValue() string
      +setValue(code) void
      +syncLineNumbers() void
    }
    class Renderer {
      -string theme
      +parse(code) Promise~boolean~
      +render(code, container) Promise~SVGElement~
    }

    StudioApp o-- Canvas
    StudioApp o-- Editor
    StudioApp o-- Renderer
`
  },
  {
    id: 'state-diagram',
    title: 'State Diagram — Diagram Lifecycle',
    category: 'Standard Diagrams',
    kind: 'state',
    description: 'State machine for diagram rendering, error recovery, and auto-saving.',
    code: `stateDiagram-v2
    [*] --> Idle: App Loaded

    state Idle {
        [*] --> Clean
        Clean --> Editing: Keystroke detected
        Editing --> Debouncing: 200ms debounce timer
        Debouncing --> Validating: Run mermaid.parse()
    }

    state Validating {
        [*] --> CheckSyntax
        CheckSyntax --> RenderSVG: Syntax Valid
        CheckSyntax --> ShowError: Syntax Error
    }

    RenderSVG --> Idle: Update Viewport & Auto-save
    ShowError --> Idle: Keep Previous Canvas + Display Banner

    Idle --> Fullscreen: Press Shift+F
    Fullscreen --> Idle: Press Esc
`
  },
  {
    id: 'er-diagram',
    title: 'Entity Relationship — Workspace Schema',
    category: 'Data & Modeling',
    kind: 'er',
    description: 'Relational data schema for users, diagrams, revisions, and exported assets.',
    code: `erDiagram
    USER ||--o{ DIAGRAM : owns
    DIAGRAM ||--|{ REVISION : tracks
    DIAGRAM ||--o{ EXPORT_ASSET : generates
    CATEGORY ||--o{ DIAGRAM : classifies

    USER {
        string user_id PK
        string username
        string email
        timestamp created_at
    }
    DIAGRAM {
        string diagram_id PK
        string user_id FK
        string category_id FK
        string title
        text mermaid_source
        string theme
        timestamp updated_at
    }
    REVISION {
        int rev_number PK
        string diagram_id FK
        text source_diff
        timestamp committed_at
    }
    EXPORT_ASSET {
        string asset_id PK
        string diagram_id FK
        string format
        int width
        int height
    }
`
  },
  {
    id: 'git-graph',
    title: 'Git Graph — Trunk-Based Release Flow',
    category: 'DevOps & Workflows',
    kind: 'gitGraph',
    description: 'Trunk-based development flow with feature branches and production tags.',
    code: `gitGraph
    commit id: "v1.0.0"
    branch feature/canvas-controls
    checkout feature/canvas-controls
    commit id: "add-kinetic-momentum"
    commit id: "support-pinch-zoom"
    checkout main
    merge feature/canvas-controls id: "merge-pr-1"
    branch feature/starter-templates
    checkout feature/starter-templates
    commit id: "add-tourism-templates"
    commit id: "add-export-svg-png"
    checkout main
    merge feature/starter-templates id: "merge-pr-2"
    commit id: "v1.1.0" tag: "v1.1.0"
`
  },
  {
    id: 'mindmap-diagram',
    title: 'Mindmap — Mermaid Studio Architecture',
    category: 'Conceptual & Mindmaps',
    kind: 'mindmap',
    description: 'Mindmap of editor features, canvas mechanics, and export pipeline.',
    code: `mindmap
  root((Mermaid Studio))
    Canvas Engine
      Kinetic Drag & Inertia
      Cursor-centered Zoom
      Touch Pinch & Trackpad
      Fit, Center, 100% Reset
      Fullscreen Mode
    Editor Experience
      Live Debounce Render
      Synced Line Numbers
      Tab Indentation
      Non-destructive Error Guard
    Diagram Catalog
      Dependency Trees
      Gantt Roadmaps
      Service Architectures
      UML & Sequences
    Storage & Exports
      Local Auto-save
      Named Diagram Manager
      Crisp SVG Export
      Retina 2x PNG Export
      Direct .mmd Download
`
  }
];

export function getTemplateById(id) {
  return DIAGRAM_TEMPLATES.find((tpl) => tpl.id === id) || DIAGRAM_TEMPLATES[0];
}
