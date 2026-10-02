---
name: TechGestor TJRR
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#42474e'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#73777f'
  outline-variant: '#c2c7cf'
  surface-tint: '#3a6188'
  primary: '#002541'
  on-primary: '#ffffff'
  primary-container: '#0b3b60'
  on-primary-container: '#7fa6d0'
  inverse-primary: '#a3caf6'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#002a1a'
  on-tertiary: '#ffffff'
  tertiary-container: '#00422b'
  on-tertiary-container: '#10b981'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e4ff'
  primary-fixed-dim: '#a3caf6'
  on-primary-fixed: '#001d35'
  on-primary-fixed-variant: '#1f496f'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-desktop: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-performance, institutional, and mission-critical environment tailored for the Information Technology Directorate of the Court of Justice of Roraima (TJRR). It bridges judicial solemnity with the agility of modern enterprise IT operations (ITSM/SecOps).

### Design Archetype: Institutional Precision & Ergonomic Modernism
The visual style merges **Corporate / Modern** integrity with high-density data ergonomics. It avoids superfluous decorative elements in favor of sharp typographic structure, deliberate information hierarchy, and calm, functional surfaces that sustain long operational shifts for judicial analysts, systems engineers, and on-call technicians.

### Visual Foundations
- **Authority & Reliability:** Anchored in institutional deep blues, conveying stability, legal compliance, and technological rigor.
- **Cognitive Clarity:** Strict spatial zoning, restrained chromatic accents for triage alerts, and balanced content densities to minimize incident-response fatigue.
- **Tactile Ergonomics:** Subtle micro-elevations, discrete borders, and deliberate focus rings that ensure accessibility across fast-paced keyboard and mouse workflows.

## Colors

The palette directly reflects judicial gravitas and tactical IT observability. The default mode is light, optimized for daytime administrative court offices, with a parallel high-contrast dark mode tailored for continuous NOC/SOC surveillance.

### Role Assignments
- **Primary (`#0b3b60`):** Institutional TJRR Deep Blue. Applied to primary CTAs, active judicial navigation bars, primary header text, and top-level navigation states.
- **Secondary (`#0284c7`):** Technical Electric Sky. Used for active link highlights, interactive metric toggles, ticket assignment indicators, and secondary action buttons.
- **Tertiary (`#10b981`):** Operational Emerald. Reserved for positive SLAs, resolved incidents, online technician presence, and nominal service health badges.
- **Neutral (`#0f172a`):** Slate Obsidian. Forms the foundation for high-contrast primary text, deep UI chrome, and dark-mode background architecture (`#0f172a`, `#1e293b`, with light mode canvas anchored at `#f8fafc`).

### System Alerts & Operational Semantics
- **Critical / SLA Breach (`#ef4444`):** Emergency court disruption, unassigned P1 tickets, critical system outages.
- **Warning / Near Breach (`#f59e0b`):** Approaching SLA limits, pending approvals, degraded services.
- **Neutral Supporting Tones:** Slate 50 (`#f8fafc`) for canvas backgrounds, Slate 100 (`#f1f5f9`) for sub-panels, and Slate 200 (`#e2e8f0`) for low-contrast structure borders in light mode.

## Typography

The typographic hierarchy couples **Plus Jakarta Sans** for structural headers and dashboards with **Inter** for dense transactional interfaces, logs, ticket descriptions, and metadata.

### Hierarchy & Usage
- **Display & Headlines (Plus Jakarta Sans):** Provides an authoritative, contemporary institutional personality. Used strictly on KPI cards, dashboard section titles, modal headers, and main view titles.
- **Body & Data Tables (Inter):** Leveraged for superior legibility at compact sizes, featuring tall x-height and clear distinction between glyphs (crucial for IP addresses, process IDs, judicial case numbers like `CNJ`, and equipment tags).
- **Labels & Priority Tags (Inter Semibold):** Scaled down to 11px and 12px with uppercase or small-caps tracking to serve as instant visual anchors for priority (`URGENTE`, `ALTA`, `NORMAL`) and SLA countdowns.

## Layout & Spacing

The layout is built on an ergonomic 8pt modular system configured for dense, multi-pane administrative panels and operations centers.

### Grid Architecture
- **Desktop (>= 1280px):** 12-column layout with 24px (`1.5rem`) gutters and a flexible sidebar navigation (collapsed at 72px, expanded at 260px). Main workspace scales up to a max-width of 1920px for multi-column triage queues and NOC status matrices.
- **Tablet / Laptop (768px - 1279px):** 8-column layout with 20px (`1.25rem`) gutters. Sidebars fold into an off-canvas drawer or top sub-bar. Split ticket views stack into master-detail accordions.
- **Mobile (< 768px):** 4-column layout with 12px (`0.75rem`) gutters and 16px (`1rem`) outer margins. Critical field-support views prioritize single-column ticket actions and direct contact buttons for technicians on court premises.

### Density Tiers
- **Comfortable (User Portals & Settings):** 16px element gaps, 24px container padding.
- **Compact (Operational Kanban, Triage Lists, Incident Logs):** 8px row gaps, 12px container padding to maximize visible queue lines per screen without scrolling.

## Elevation & Depth

This design system avoids heavy skeuomorphic drop shadows, utilizing **tonal surface stacking** combined with **subtle low-contrast borders** to produce structural depth.

### Depth Rules
- **Base Canvas (Level 0):** Neutral `#f8fafc` in light mode (Slate 50) and `#0f172a` in dark mode. Serves as the backdrop for all views.
- **Structural Surfaces / Cards (Level 1):** Solid white `#ffffff` (light mode) or `#1e293b` (dark mode), framed with a 1px border of `#e2e8f0` (Slate 200) or `#334155` (Slate 700). Elevated by an ultra-soft ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04)`.
- **Interactive Floating Panels / Dropdowns (Level 2):** Elevated with `0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`.
- **Modals / Critical Override Drawers (Level 3):** Highest tier overlay with a dimming scrim (`rgba(15, 23, 42, 0.5)`) and shadow `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

## Shapes

The interface balances the statutory posture of a State Court of Justice with modern digital craftsmanship. It standardizes on a `roundedness: 2` scale, rendering interfaces smooth, approachable, and devoid of sharp, outdated enterprise contours.

### Corner Radius Mapping
- **Default Elements (Inputs, Buttons, Badges):** `rounded` (0.5rem / 8px). Keeps interactive targets sharp and precise.
- **Cards, Panels, and Widget Containers:** `rounded-lg` (1rem / 16px). Formats data islands with distinct, smooth separation.
- **Modals, Floating Toolbars, and Main Hero Banners:** `rounded-xl` (1.5rem / 24px). Creates friendly, premium institutional containment.
- **Status Pills & Live Indicators:** Fully rounded pill-shapes (`9999px`) to immediately distinguish dynamic metadata from interactive rect buttons.

## Components

### Buttons
- **Primary Institutional:** Filled `#0b3b60` with white text, font weight 600, height 40px, padding `0 16px`, border-radius 8px. Hover state shifts to `#134e7c`.
- **Secondary Action:** White background with 1px border `#0284c7`, text `#0284c7`. Hover applies a `#0284c7`/5% tint.
- **Critical / Interruption:** Filled `#ef4444` for emergency ticket halts or system lockouts; text in pure white.
- **Ghost / Utility:** Transparent background, text `#0f172a` (light) / `#f8fafc` (dark), hovering to `#f1f5f9` (light) / `#1e293b` (dark).

### Priority Badges & SLA Chips
- **P1 - Crítica (Breach Hazard):** Light crimson container (`#fef2f2`), text `#b91c1c`, 1px border `#fecaca`. Includes a pulsing red dot indicator.
- **P2 - Alta:** Amber container (`#fffbeb`), text `#b45309`, 1px border `#fde68a`.
- **P3 - Normal:** Sky tint container (`#f0f9ff`), text `#0369a1`, 1px border `#bae6fd`.
- **P4 - Baixa / Planejada:** Slate container (`#f1f5f9`), text `#475569`, 1px border `#cbd5e1`.

### Data Cards & Dashboard Metric Tiles
- Encapsulated in 16px radius (`rounded-lg`) cards with 1px `#e2e8f0` stroke.
- Header zone contains title (Plus Jakarta Sans 14px Semibold) and secondary contextual link or icon button.
- Content zone houses bold metric totals (Plus Jakarta Sans 28px) with delta percentage indicators (green/red) and historical micro-sparklines.

### Input Fields & Filter Bars
- Inputs feature a crisp 1px stroke `#cbd5e1`, 8px corner radius, height 40px, font Inter 14px.
- Focus state switches border to `#0284c7` accompanied by an accessible 3px outer glow in `rgba(2, 132, 199, 0.15)`.
- Multiselect filter bars for Judicial Comarcas (e.g., Boa Vista, Rorainópolis, Caracaraí) are rendered as compact tag lists with clear buttons.

### Specialized Component: Live Technician Presence
- Displays technician avatar (32px circle) overlaid with an absolute-positioned status badge at bottom-right:
  - **Online / Active Dispatch:** `#10b981` (Solid Emerald, 8px circle with 2px white halo).
  - **In Transit / Field Support:** `#0284c7` (Sky Blue).
  - **On Break / Shift End:** `#94a3b8` (Slate Neutral).
- Tooltips surface real-time workload (e.g., "3 chamados atribuídos").

### Specialized Component: Hourly Incident Heatmap / Density Grid
- Matrix grid plotting hours (08:00 to 18:00) against Judicial Departments (Varas Cíveis, Varas Criminais, Juizados Especiais).
- Cells utilize a 5-stop chromatic intensity scale using `#0284c7` transparency tints: from empty (Slate 50) through 20%, 40%, 70%, to 100% `#0b3b60` for peak incident spikes.