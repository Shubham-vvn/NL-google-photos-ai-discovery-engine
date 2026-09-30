---
name: Sapphire Research Console
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#444653'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#532a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#743d00'
  on-tertiary-container: '#ffa85d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  display-sm:
    fontFamily: Manrope
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: 0em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0.005em
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers an elevated, rigorous research console aesthetic tailored for advanced query discovery, semantic computer vision analysis, and multimodal retrieval benchmarking. It bridges the discipline of Google-grade operational interfaces with the quiet elegance of high-end analytical software.

The visual philosophy relies on structured clarity, razor-sharp information hierarchies, and restrained visual density. Surfaces avoid artificial ornamentation; instead, spatial pacing, precise hairline dividers, and deliberate micro-radii frame complex data arrays. The environment feels analytical, calm, and definitive—enabling researchers, engineers, and machine learning practitioners to parse nuanced confidence signals, retrieval heuristics, and vector clusters without visual fatigue.

## Colors

The palette establishes an authoritative, daylight-calibrated research canvas. The seed deep blue (`#1E40AF`) functions as the definitive primary anchor, signaling active modes, highlighted state indicators, and primary navigational commitments without overwhelming the visual field.

### Palette Architecture
- **Primary Anchor (`#1E40AF`)**: Reserved for primary interaction triggers, active state indicators, and high-priority retrieval markers. Interactive hover transitions shift to `#1D4ED8`; pressed states resolve to `#172554`.
- **Base & Neutral Tier**:
  - `surface-canvas`: `#FFFFFF` (pure canvas background for primary content density)
  - `surface-subtle`: `#F8F9FA` (inset modules, contextual sidebars, and control bars)
  - `surface-muted`: `#F1F3F4` (recessed inputs, inactive tracks, and chip backings)
  - `border-hairline`: `#E5E7EB` (micro-dividers and structural card rules)
  - `border-strong`: `#CBD5E1` (active containment and focused bounds)
- **Typographic Neutral Hierarchy**:
  - `text-primary`: `#111827` (deep graphite-black for headers, metric values, and primary labels)
  - `text-secondary`: `#4B5563` (balanced body and structural documentation)
  - `text-muted`: `#6B7280` (metadata, query timestamps, and schema tags)
- **Diagnostic & Semantic Accents**:
  - `semantic-success`: `#059669` (validated inference, high confidence matches >0.90) paired with `#ECFDF5` container fill.
  - `semantic-warning`: `#D97706` (moderate confidence, vector drift) paired with `#FFFBEB` container fill.
  - `semantic-critical`: `#DC2626` (retrieval mismatch, cluster anomaly) paired with `#FEF2F2` container fill.

## Typography

The typographic pairing pairs `Manrope` for display and headline scales with `Hanken Grotesk` for data labels, metadata tables, and analytical body text. 

`Manrope` brings architectural geometry, structural horizontal stems, and an open aperture that keeps section headings grounded. `Hanken Grotesk` provides a clinical, highly legible baseline with proportional numerals and distinct glyph forms designed for high-density scanning. Numeric tabular figures are applied across metric counters, query latencies, and similarity coefficients to guarantee vertical columnar alignment.

## Layout & Spacing

The layout model is anchored on an 8pt base grid with a 4pt sub-grid reserved for granular micro-alignments, tag paddings, and status markers. 

### Grid Geometry & Breakpoints
- **Desktop (1280px+)**: 12-column adaptive fluid layout with a maximum canvas boundary of 1680px. Gutters hold strictly at `1.5rem` (`24px`), with outer margins set to `2rem` (`32px`). Multi-pane console displays split into a persistent 280px inspection filter rail and an 8-column retrieval viewport.
- **Tablet (768px - 1279px)**: 8-column responsive grid with `1rem` (`16px`) gutters and `1.5rem` margins. Side panels fold into overlay drawer states.
- **Mobile (<768px)**: 4-column flow with `1rem` margins and `0.75rem` gutters. Metric strips collapse into horizontal edge-to-edge carousels.

Spacing rules prioritize relational grouping: elements inside cards use `space-xs` and `space-sm` to maintain analytical tightness, while macro modules use `space-lg` and `space-xl` to establish spatial pause without heavy dividing lines.

## Elevation & Depth

This system avoids expressive drop shadows, relying on calibrated surface tonal layering and hairline structural borders (`1px solid #E5E7EB`). Depth communicates analytical stacking and temporary focus rather than physical skeuomorphic height.

- **Base Layer (Elevation 0)**: `#FFFFFF` primary canvas or `#F8F9FA` background foundation. Outlined purely by hairline boundaries without drops.
- **Inspect / Card Layer (Elevation 1)**: Crisp white cards resting on `#F8F9FA`. Uses a precise boundary shadow: `0 1px 2px 0 rgba(17, 24, 39, 0.05)` coupled with a `1px` border in `#E5E7EB`.
- **Floating Controls / Flyouts (Elevation 2)**: Filter popovers, parameter adjusters, and semantic vector tooltips. Rendered with `0 4px 12px -2px rgba(17, 24, 39, 0.08), 0 2px 4px -1px rgba(17, 24, 39, 0.04)` and a refined border of `#E2E8F0`.
- **Modals & Command Palettes (Elevation 3)**: Deep analytical focus surfaces utilizing a semi-transparent scrim (`#111827` at 20% opacity with a `2px` subtle backdrop blur) and an elevated container with `0 12px 32px -4px rgba(17, 24, 39, 0.12)`.

## Shapes

The design system enforces a soft, micro-radius standard (`roundedness: 1`), creating an engineered instrument feel. 

- **Base Shape (0.25rem / 4px)**: Standard controls, form inputs, metric pills, confidence tags, and table row selection indicators.
- **Structural Modules (`rounded-lg` / 0.5rem / 8px)**: Image retrieval asset cards, inspection inspector panes, code trace containers, and diagnostic cards.
- **Flyouts & Modals (`rounded-xl` / 0.75rem / 12px)**: Floating utility panels, vector projection containers, and dialog shells.

Full circular radii (`rounded-full`) are strictly restricted to state-presence dots, avatars, and pure-icon button triggers.

## Components

### Buttons & Interactive Triggers
- **Primary Action**: Solid `#1E40AF` fill with white `#FFFFFF` text, `4px` radius, `0.5rem 1rem` padding, typography set to `label-lg`. Focus state draws a `2px` offset ring in `#1E40AF`.
- **Secondary Action**: Background transparent, `1px solid #E5E7EB`, text `#111827`. Hover shifts background to `#F8F9FA` and border to `#CBD5E1`.
- **Subtle / Ghost**: `#F1F3F4` resting background or transparent; active hover transitions to `#E5E7EB`. Used for macro toolbars and secondary operational icons.

### Badges, Signals & Chips
- **Semantic Confidence Chips**: Composed of a `4px` radius container, `0.25rem 0.5rem` padding, displaying monospace-styled tabular scores.
  - High Confidence (Score ≥ 0.90): `#ECFDF5` background, `#059669` text, `1px solid #A7F3D0`.
  - Moderate Confidence (0.70 - 0.89): `#FFFBEB` background, `#D97706` text, `1px solid #FDE68A`.
  - Anomaly / Alert: `#FEF2F2` background, `#DC2626` text, `1px solid #FECACA`.
- **Filter Chips**: Muted neutral `#F1F3F4` fill, `#4B5563` text. Active state transitions to `#1E40AF` text, `#EFF6FF` fill, bordered by `#BFDBFE`.

### Input & Query Controls
- **Search & Semantic Retrieval Prompt**: Background `#FFFFFF`, bordered by `1px solid #E5E7EB`, inset height `44px` with `0.75rem` internal horizontal padding. Focus shifts border to `#1E40AF` with a `0 0 0 1px #1E40AF` crisp ring. Clear icon and model switch triggers occupy the trailing inline slot.
- **Checkboxes & Radios**: Micro-radius `3px` box or circle, `16px` dimension, bordered by `#CBD5E1`. Checked state initiates a solid `#1E40AF` fill with an optically centered white mark.

### Data Cards & Retrieval Assets
- **Photo Asset Tile**: Enclosed in a `8px` rounded frame. Displays photo media with a subtle `1px` inner containment border. On hover, reveals an inline translucent control strip at the bottom containing similarity vector cosine scores, image dimensions, and ground-truth metadata tags.
- **Metric Metric / Trace Card**: Flat `#FFFFFF` foundation with `1px solid #E5E7EB` perimeter. Features a micro header tier in `label-md` (`#6B7280`), prominent value in `headline-lg` (`#111827`), and an inline latency delta badge.