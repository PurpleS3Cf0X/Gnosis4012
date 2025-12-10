
# Gnosis4012 - Next-Gen Threat Intelligence Platform (TIP)

**Gnosis4012** is an advanced, AI-driven Threat Intelligence Platform designed to automate the analysis, enrichment, and correlation of security indicators. It leverages the Google Gemini API to provide context-aware risk assessments, threat actor profiling, and executive reporting, bridging the gap between raw data and actionable intelligence.

![Platform Status](https://img.shields.io/badge/Status-Active-success)
![AI Model](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blueviolet)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20Tailwind-blue)

---

## 🚀 Key Features

### 1. AI-Powered Intel Analysis
*   **Automated Enrichment**: Instantly analyzes IPs, Domains, Hashes, and URLs.
*   **Contextual Risk Scoring**: Assigns a 0-100 risk score based on heuristic patterns and known threat data.
*   **Threat Actor Attribution**: Automatically links indicators to known APT groups (e.g., APT29, Lazarus) and malware families.
*   **Mitigation Strategies**: Provides actionable steps to remediate identified threats.

### 2. Vulnerability & Malware Vault
*   **Deep Dive Analysis**: Analyze CVEs and Malware families with real-time web grounding.
*   **AI Detection Engineering**: Automatically generate **YARA**, **Snort**, or **Sigma** detection rules based on technical analysis.
*   **Exploit Status**: Track active exploitation and Proof-of-Concept (PoC) availability.

### 3. Knowledgebase & Threat Graph
*   **Adversary Profiling**: Searchable database of Nation-State and Cybercrime groups.
*   **Relationship Mapping**: Visual graph showing alliances and rivalries between threat groups.
*   **Historical Timeline**: Chronological tracking of major campaigns and TTP shifts.

### 4. Integrated Ecosystem
*   **External Feeds**: Simulates integrations with VirusTotal, AlienVault OTX, AbuseIPDB, and Shodan.
*   **Health Monitoring**: Real-time status checks for all connected API feeds.

### 5. Alerting & Detection Logic
*   **Custom Rules Engine**: Create logic (e.g., `Risk Score > 80` AND `Type == IP`) to trigger alerts.
*   **Incident Management**: Track, acknowledge, and resolve alerts within the platform.
*   **Notification Channels**: Configure Email and Slack webhook destinations.

### 6. Automated Reporting
*   **Executive Briefs**: AI-generated summaries of recent threat activity suitable for C-level review.
*   **Compliance Reports**: Generate Weekly Summaries and Incident Reports in one click.

---

## 📚 Application Walkthrough

### 🔍 Scenario 1: Analyzing a Suspicious Indicator
1.  Navigate to the **Intel Analyzer** tab.
2.  Enter an IoC (e.g., `192.168.1.50` or a malicious hash).
3.  Click **Analyze**.
4.  **Result**: The AI analyzes the format and context.
    *   If external integrations are enabled, it enriches the data with "vendor" scores.
    *   A Risk Score and Verdict (e.g., CRITICAL) are assigned.
    *   Technical details (ASN, Geo, Open Ports) are displayed.

### 🛡️ Scenario 2: Vulnerability Research & Rule Generation
1.  Navigate to **Vuln & Malware Vault**.
2.  Enter a CVE ID (e.g., `CVE-2024-3094`) or a malware name (`LockBit`).
3.  Click **Analyze**.
4.  **Result**: View CVSS scores, affected systems, and a deep technical breakdown.
5.  **Bonus**: Copy the AI-generated YARA or Snort rule directly into your EDR/SIEM.

### 🚨 Scenario 3: Creating a Detection Rule
1.  Go to **Alerts** > **Rules Inventory**.
2.  Click **Create Rule**.
3.  Set the Name (e.g., "Critical Asset Comm").
4.  Define Logic: `Risk Score` `Greater Than` `75`.
5.  Set Severity to **High**.
6.  **Effect**: Any future analysis that meets this criteria will trigger a new entry in the Alerts Dashboard.

### 📖 Scenario 4: Researching a Threat Actor
1.  Navigate to **Knowledgebase**.
2.  Use the **Direct AI Lookup** to search for an alias (e.g., "Cozy Bear").
3.  **Result**: Gnosis4012 retrieves the dossier for **APT29** (the primary name).
    *   View the **Relationship Graph** to see they are a rival of *Equation Group*.
    *   Review their **TTPs** (Tactics, Techniques, and Procedures) mapped to MITRE ATT&CK.

### 📄 Scenario 5: Generating a Weekly Report
1.  Go to **Reporting**.
2.  Click **Generate Report** under "Weekly Threat Summary".
3.  **Result**: The system aggregates recent analyses from the local database.
4.  The AI writes a concise executive summary highlighting trends (e.g., "High volume of C2 traffic detected from Eastern Europe").
5.  The report status updates to **READY** for download.

---

## 🛠️ Technical Architecture

### Core Stack
*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **Charts**: Recharts
*   **Storage**: IndexedDB (Client-side persistence for History, Rules, and Alerts)

### AI Integration
*   **Provider**: Google Gemini API (`@google/genai`)
*   **Model**: `gemini-2.5-flash`
*   **Function**: Used for heuristic analysis, summarization, and generating structured JSON data for threat profiles.

### Data Model
*   **AnalysisResult**: Stores the full context of an analyzed indicator.
*   **AlertRule**: JSON structure defining logic gates for detection.
*   **ThreatActorProfile**: Comprehensive schema for adversary data including relationships and timelines.

---

## 📦 Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-org/gnosis4012.git
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment**:
    *   Ensure your Google Gemini API Key is available in the environment variables.
4.  **Run Development Server**:
    ```bash
    npm start
    ```

---

## 🔒 Security & Privacy
*   **Local Storage**: All analysis history and configuration data are stored locally in the browser's IndexedDB.
*   **API Usage**: IoCs are sent to the Google Gemini API for analysis. Do not submit PII or classified internal data without reviewing your organization's AI policy.

---

*Gnosis4012 v2.8.0-flash | Secure Environment*

<!-- Thank you Jesus -->
