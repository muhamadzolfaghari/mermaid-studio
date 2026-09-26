/**
 * Mermaid AI Assistant
 * Natural language diagram generator & assistant inspired by mermaid.ai / Mermaid Chart.
 */

export const AI_SUGGESTIONS = [
  {
    title: 'AWS Serverless Architecture',
    kind: 'flowchart',
    prompt: 'Cloud serverless stack with Route53, API Gateway, Cognito Auth, Lambda functions, DynamoDB, and S3 event triggers',
  },
  {
    title: 'OAuth2 & JWT Auth Sequence',
    kind: 'sequence',
    prompt: 'OAuth2 Authorization Code Flow with PKCE between User, SPA Client, Auth0 Provider, and Resource API',
  },
  {
    title: 'E-Commerce Database Schema',
    kind: 'er',
    prompt: 'PostgreSQL relational database schema for users, orders, order items, products, categories, and payments',
  },
  {
    title: 'Order Processing State Machine',
    kind: 'state',
    prompt: 'State machine for e-commerce order lifecycle: Created, Pending Payment, Paid, Processing, Shipped, Delivered, or Cancelled',
  },
  {
    title: 'CI/CD Pipeline with Blue/Green',
    kind: 'flowchart',
    prompt: 'Git commit trigger, automated testing, docker build, staging deployment, QA verification gate, and blue/green production release',
  },
  {
    title: 'Git Trunk-Based Release Flow',
    kind: 'gitGraph',
    prompt: 'Trunk-based development flow with feature branches, PR reviews, release tags, and hotfixes',
  },
  {
    title: 'Incident Management Escalation',
    kind: 'flowchart',
    prompt: 'Alert triggered, PagerDuty triage, On-call engineer escalation, incident mitigation, and blameless post-mortem',
  },
];

export class AIAssistant {
  constructor(options) {
    this.container = options.container;
    this.onApplyCode = options.onApplyCode || (() => {});
    this.onInsertCode = options.onInsertCode || (() => {});
    this.promptInput = null;
    this.generateBtn = null;
    this.resultContainer = null;
    this.generatedCode = '';

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="ai-drawer-header">
        <div class="ai-drawer-title-row">
          <div class="ai-sparkle-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#aiGradient)" stroke="none" />
              <defs>
                <linearGradient id="aiGradient" x1="2" y1="2" x2="22" y2="22">
                  <stop stop-color="#818cf8"/>
                  <stop offset="1" stop-color="#c084fc"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h2 class="ai-title">Mermaid AI Studio</h2>
            <p class="ai-subtitle">Generate diagrams with natural language prompts</p>
          </div>
        </div>
        <button id="closeAiDrawerBtn" class="drawer-close-btn" type="button" aria-label="Close AI Assistant">✕</button>
      </div>

      <div class="ai-drawer-body">
        <div class="ai-input-card">
          <label class="ai-label" for="aiPromptText">What diagram would you like to build?</label>
          <textarea id="aiPromptText" class="ai-prompt-input" rows="3" placeholder="e.g. Design a microservices payment architecture with Stripe, Kafka, and PostgreSQL..."></textarea>
          <div class="ai-actions-row">
            <button id="aiGenerateBtn" class="btn btn-ai-primary" type="button">
              <span class="ai-btn-icon">✨</span>
              <span>Generate with AI</span>
            </button>
          </div>
        </div>

        <div class="ai-suggestions-section">
          <div class="ai-suggestions-header">Quick Prompt Ideas</div>
          <div class="ai-pills-list" id="aiPillsList">
            ${AI_SUGGESTIONS.map((item, idx) => `
              <button class="ai-pill-btn" data-index="${idx}" type="button">
                <span class="pill-kind">${item.kind}</span>
                <span class="pill-text">${item.title}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div id="aiResultCard" class="ai-result-card" style="display: none;">
          <div class="ai-result-header">
            <span class="ai-result-tag">Generated Diagram</span>
            <div class="ai-result-actions">
              <button id="aiCopyBtn" class="editor-tool-btn" type="button" title="Copy code">📋 Copy</button>
              <button id="aiApplyBtn" class="btn btn-primary btn-sm" type="button">Apply to Canvas</button>
            </div>
          </div>
          <pre id="aiResultCode" class="ai-result-code"></pre>
        </div>
      </div>
    `;

    this.promptInput = this.container.querySelector('#aiPromptText');
    this.generateBtn = this.container.querySelector('#aiGenerateBtn');
    this.resultContainer = this.container.querySelector('#aiResultCard');
    this.resultCode = this.container.querySelector('#aiResultCode');
  }

  bindEvents() {
    // Generate click
    this.generateBtn.addEventListener('click', () => this.handleGenerate());

    // Enter + Cmd/Ctrl generates
    this.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.handleGenerate();
      }
    });

    // Preset pills click
    this.container.querySelectorAll('.ai-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = AI_SUGGESTIONS[parseInt(btn.dataset.index, 10)];
        if (item) {
          this.promptInput.value = item.prompt;
          this.handleGenerate();
        }
      });
    });

    // Apply button
    this.container.querySelector('#aiApplyBtn').addEventListener('click', () => {
      if (this.generatedCode) {
        const rawPrompt = this.promptInput.value.trim();
        const title = rawPrompt ? (rawPrompt.length > 36 ? rawPrompt.slice(0, 34) + '…' : rawPrompt) : 'AI Generated Diagram';
        this.onApplyCode(this.generatedCode, title);
      }
    });

    // Copy button
    this.container.querySelector('#aiCopyBtn').addEventListener('click', async () => {
      if (this.generatedCode) {
        await navigator.clipboard.writeText(this.generatedCode);
        const btn = this.container.querySelector('#aiCopyBtn');
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => (btn.textContent = orig), 1800);
      }
    });
  }

  async handleGenerate() {
    const prompt = this.promptInput.value.trim();
    if (!prompt) {
      this.promptInput.focus();
      return;
    }

    // Loading state
    this.generateBtn.disabled = true;
    this.generateBtn.innerHTML = `
      <span class="ai-spinner"></span>
      <span>Generating...</span>
    `;

    await new Promise((r) => setTimeout(r, 450));

    try {
      const code = this.synthesizeDiagramFromPrompt(prompt);
      this.generatedCode = code;
      this.resultCode.textContent = code;
      this.resultContainer.style.display = 'block';
      this.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
      this.generateBtn.disabled = false;
      this.generateBtn.innerHTML = `
        <span class="ai-btn-icon">✨</span>
        <span>Generate with AI</span>
      `;
    }
  }

  synthesizeDiagramFromPrompt(prompt) {
    const p = prompt.toLowerCase();

    // 1. Sequence Diagram check
    if (p.includes('sequence') || p.includes('oauth') || p.includes('jwt') || p.includes('login') || p.includes('webhook') || p.includes('auth flow')) {
      return `sequenceDiagram
    autonumber
    actor User as Client / User
    participant App as Web / Mobile App
    participant Auth as Auth Server (OAuth2/OIDC)
    participant API as Backend API
    participant DB as Database

    User->>App: Click "Sign in with SSO"
    App->>Auth: Request Authorization Code (PKCE challenge)
    Auth-->>User: Present Login & Consent screen
    User->>Auth: Submit credentials
    Auth-->>App: Return Auth Code & Redirect
    App->>Auth: Exchange Code + PKCE Verifier for Tokens
    Auth-->>App: Issue ID Token & Access Token (JWT)
    App->>API: GET /api/v1/profile (Bearer token)
    API->>API: Validate JWT Signature & Scopes
    API->>DB: Query user records
    DB-->>API: Return account profile
    API-->>App: 200 OK (User Profile JSON)
    App-->>User: Display authenticated dashboard`;
    }

    // 2. ER Diagram check
    if (p.includes('er') || p.includes('database') || p.includes('schema') || p.includes('relational') || p.includes('postgres') || p.includes('sql') || p.includes('tables')) {
      return `erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ REVIEWS : writes
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : ordered_in
    PRODUCTS }|--|| CATEGORIES : belongs_to
    ORDERS ||--|| PAYMENTS : settled_by

    USERS {
        uuid id PK
        string email UK
        string full_name
        string role
        timestamp created_at
    }

    ORDERS {
        uuid id PK
        uuid user_id FK
        decimal total_amount
        string status
        timestamp placed_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }

    PRODUCTS {
        uuid id PK
        uuid category_id FK
        string sku UK
        string name
        decimal price
        int stock_level
    }

    CATEGORIES {
        uuid id PK
        string slug UK
        string name
    }

    PAYMENTS {
        uuid id PK
        uuid order_id FK
        string provider
        decimal amount
        string status
        timestamp processed_at
    }`;
    }

    // 3. State Machine check
    if (p.includes('state') || p.includes('lifecycle') || p.includes('status')) {
      return `stateDiagram-v2
    [*] --> Draft : Create New

    Draft --> InReview : Submit for Review
    InReview --> ChangesRequested : Request Revisions
    ChangesRequested --> InReview : Re-submit

    InReview --> Approved : Approve
    Approved --> Scheduled : Schedule Delivery
    Scheduled --> InProgress : Start Execution

    InProgress --> QA_Verification : Complete Tasks
    QA_Verification --> InProgress : QA Failed
    QA_Verification --> ReadyToDeploy : QA Passed

    ReadyToDeploy --> Deployed : Canary / Production Release
    Deployed --> Closed : Verified in Prod

    Draft --> Cancelled : Discard
    InReview --> Cancelled : Reject
    Cancelled --> [*]
    Closed --> [*]`;
    }

    // 4. Git Graph check
    if (p.includes('git') || p.includes('branch') || p.includes('trunk') || p.includes('merge')) {
      return `gitGraph
    commit id: "Initial project setup"
    branch develop
    checkout develop
    commit id: "Setup CI test suite"
    branch feat/auth
    checkout feat/auth
    commit id: "Add JWT auth controller"
    commit id: "Add login page UI"
    checkout develop
    merge feat/auth id: "Merge PR #14: Auth feature"
    branch release/v1.0
    checkout release/v1.0
    commit id: "Bump version to 1.0.0"
    checkout main
    merge release/v1.0 tag: "v1.0.0" id: "Production release v1.0.0"
    checkout develop
    merge release/v1.0 id: "Sync release back to develop"`;
    }

    // 5. Cloud / Microservices / Architecture Flowchart (Default & Highly Versatile)
    if (p.includes('aws') || p.includes('cloud') || p.includes('microservice') || p.includes('kubernetes') || p.includes('docker') || p.includes('kafka') || p.includes('serverless')) {
      return `flowchart TD
    subgraph Clients["Edge & Clients"]
        WEB["🌐 Web Application (React/Next.js)"]
        MOBILE["📱 iOS & Android Mobile Apps"]
        CDN["⚡ Cloudflare / CloudFront CDN"]
    end

    subgraph Edge["Security & Gateway"]
        WAF["🛡️ AWS WAF & Rate Limiter"]
        APIGW["🚪 Kong / API Gateway"]
        AUTH["🔐 Auth0 / Cognito Service"]
    end

    subgraph CoreServices["Microservices Mesh"]
        AUTH_SVC["User & Auth Service"]
        ORDER_SVC["Order Processing Service"]
        PAY_SVC["Payment & Billing Service"]
        NOTIF_SVC["Notification Engine"]
    end

    subgraph Messaging["Event Stream & Queue"]
        KAFKA{{"📨 Apache Kafka / RabbitMQ"}}
    end

    subgraph DataTier["Persistence & Cache"]
        REDIS[("⚡ Redis Cluster (Cache & Sessions)")]
        POSTGRES[("🐘 PostgreSQL Primary (ACID Data)")]
        S3[("🪣 Amazon S3 Object Storage")]
    end

    WEB & MOBILE --> CDN --> WAF --> APIGW
    APIGW -.->|Validate JWT| AUTH
    APIGW --> AUTH_SVC
    APIGW --> ORDER_SVC
    APIGW --> PAY_SVC

    AUTH_SVC & ORDER_SVC & PAY_SVC <--> REDIS
    AUTH_SVC & ORDER_SVC & PAY_SVC --> POSTGRES
    PAY_SVC --> S3

    ORDER_SVC -->|Publish Event| KAFKA
    KAFKA -->|Consume Message| NOTIF_SVC
    KAFKA -->|Consume Message| PAY_SVC

    classDef edge fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#fff
    classDef service fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff
    classDef broker fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#fff
    classDef storage fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff

    class WEB,MOBILE,CDN,WAF,APIGW edge
    class AUTH_SVC,ORDER_SVC,PAY_SVC,NOTIF_SVC service
    class KAFKA broker
    class REDIS,POSTGRES,S3 storage`;
    }

    // 6. Generic intelligent flowchart synthesis based on user keywords
    const words = prompt.split(/[\s,\-\–\—>]+/).filter((w) => w.length > 2);
    const nodes = words.slice(0, 7).map((word, i) => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '');
      const label = clean.charAt(0).toUpperCase() + clean.slice(1);
      return { id: `N${i + 1}`, label: `${label} Service` };
    });

    if (nodes.length < 3) {
      nodes.push({ id: 'N1', label: 'User Request' });
      nodes.push({ id: 'N2', label: 'Processing Engine' });
      nodes.push({ id: 'N3', label: 'Verified Output' });
    }

    let links = '';
    for (let i = 0; i < nodes.length - 1; i++) {
      links += `    ${nodes[i].id} -->|Step ${i + 1}| ${nodes[i + 1].id}\n`;
    }

    return `flowchart LR
    ${nodes.map((n) => `${n.id}["${n.label}"]`).join('\n    ')}

${links}
    classDef default fill:#111827,stroke:#6366f1,stroke-width:2px,color:#fff`;
  }
}
