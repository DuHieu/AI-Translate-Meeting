# Interactive Meeting Replay & Standardized 3-Tier Pricing

## 1. Problem Statement
- **Replay Player**: How might we empower meeting participants to replay recorded meetings with interactive bilingual transcripts synced second-by-second—allowing them to click any sentence to seek the video and search meeting content like a private search engine, with zero server storage overhead (Client-First)?
- **3-Tier Pricing**: How might we restructure pricing into three crystal-clear value tiers (Starter $\to$ Pro Unlimited $\to$ Enterprise Dedicated) with flexible commitment cycles (1 Month, 1 Quarter, 1 Year, 2 Years) to maximize conversion, boost LTV, and streamline enterprise adoption?

## 2. Recommended Direction

### A. Interactive Meeting Replay & Transcript Player
- **Hybrid Client-First Storage**:
  - Automatically caches in-browser recordings to IndexedDB (`layameet-recordings`).
  - Supports instant drag-and-drop or local file selection for `.webm` / `.mp4` / `.m4a` files.
  - Pro users can optionally stream from cloud recording URL if available.
- **Interactive Transcript Scrubbing**:
  - As video/audio plays, the active speech cue highlights smoothly and scrolls into view.
  - Clicking any transcript bubble seeks the media immediately to that timestamp (`video.currentTime = cueTime`).
  - Integrated search box highlights matching keywords in both source and target language; clicking any match seeks directly to that point.
  - Variable playback speed: 0.75x, 1.0x, 1.25x, 1.5x, 2.0x, plus keyboard controls (Space, J, L).

### B. Standardized 3-Tier Pricing & Multi-Cycle Commitment
- **Starter (Free Forever)**:
  - 1-on-1 unlimited duration; Group meetings up to 40 mins; Live bilingual AI subtitles (<350ms); Basic recap export.
- **Pro Unlimited (Target Conversion Tier)**:
  - Unlimited group duration; Unlimited AI translation minutes; Full Laya Action Items & Decisions; Interactive Replay Player; No brand watermarks.
  - **1 Month**: 99.000đ ($4.99/mo) — Flexible trial.
  - **1 Quarter (3 Months)**: 269.000đ (Save 10% ~ 89.000đ/mo) — Project & freelancer cycle.
  - **1 Year (12 Months)**: 948.000đ (Save 20% ~ 79.000đ/mo) — **Most Popular**.
  - **2 Years (24 Months)**: 1.544.000đ (Save 35% ~ 64.000đ/mo) — **Best Value**.
- **Enterprise Dedicated (High-Value / Corporate)**:
  - Private VPS / Dedicated Server On-Premise; 100% data sovereignty; 99.9% SLA; Custom Webhook integrations (Jira, Trello, Slack); Dedicated PoC support.

## 3. Key Assumptions to Validate
- [ ] Users prefer keeping recordings locally or in IndexedDB without requiring heavy server storage costs.
- [ ] A 3-month (Quarterly) option captures project-based teams who hesitate at annual commitments.
- [ ] Direct VietQR and Polar checkout for all cycles removes international and domestic friction.

## 4. MVP Scope
- Integrated `<InteractiveMeetingReplay />` component in `PublicRecapPage` and meeting recap views.
- IndexedDB recording helper `recordingStorage.ts` for instant recall of recorded sessions.
- Upgraded `PricingSection.tsx` with 3 columns and cycle pills (Monthly, Quarterly, Annual, 2-Year).
- Upgraded `CheckoutModal.tsx` supporting `pro`, `pro_quarterly`, `pro_annual`, `pro_2year`.

## 5. Not Doing (and Why)
- **Server-side video transcoding**: Avoid heavy cloud compute and bandwidth bills; browser-native WebM/MP4 decoding is fast and private.
- **Auto-recurring subscription lock-in**: Stick with pre-paid billing cycles via VietQR and Polar to avoid payment disputes and card chargeback overhead.
