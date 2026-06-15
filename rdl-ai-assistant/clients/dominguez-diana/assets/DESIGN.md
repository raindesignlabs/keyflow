---
name: Editorial Estate
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1b1b'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
  deep-charcoal: '#1A1A1A'
  subtle-gray: '#E5E5E5'
  surface-white: '#FFFFFF'
typography:
  display-accent:
    fontFamily: Brittany
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
  headline-lg:
    fontFamily: Brittany
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Brittany
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  section-header:
    fontFamily: Brittany
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
  body-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-point:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-caps:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  label-caps-sm:
    fontFamily: Montserrat
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 2.5rem
  gutter-grid: 1.5rem
  section-gap: 4rem
  container-padding: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
---

## Brand & Style

This design system is built for the high-end real estate market, targeting an audience that values sophistication, clarity, and a premium "concierge" experience. The brand personality is **authoritative yet celebratory**, bridging the gap between rigorous legal transactions and the emotional milestone of property ownership.

The visual style is **Minimalist Editorial**. It draws inspiration from luxury fashion periodicals and architectural digests, utilizing heavy whitespace, a disciplined monochromatic palette, and high-contrast typography pairings. The interface avoids unnecessary ornamentation, allowing the property data and transaction milestones to serve as the focal point within a structured, gallery-like layout.

## Colors

The palette is strictly high-contrast and monochromatic to maintain a premium, architectural feel. 

- **Primary**: Black (`#000000`) is used for all high-signal information, including primary text, borders, and functional labels.
- **Secondary**: A soft off-white (`#F9F9F9`) defines the "Surface-Container" tier, providing a subtle visual distinction for grouped data like timelines and contact cards without the need for shadows.
- **Neutral**: Pure White (`#FFFFFF`) serves as the base canvas, maximizing perceived whitespace and "breathability."
- **Accents**: Deep Charcoal is reserved for secondary data strings to create subtle hierarchy within sans-serif blocks, while Subtle Gray is used exclusively for decorative hair-line dividers.

## Typography

The system employs a "Script-to-Sans" contrast model to distinguish emotional narrative from transactional data.

- **The Script (Brittany)**: Used exclusively for headers, celebratory accents, and section titles. It should never be used for data, labels, or multi-line body text.
- **The Sans (Montserrat)**: The workhorse for all functional content. It provides a clean, modern, and trustworthy feel for property details and legal dates.
- **Formatting Rules**:
    - **Timeline Keys/Labels**: Must be set in `label-caps` using Uppercase with 10% letter spacing.
    - **Date Values**: Must follow the standard `MMM DD, YYYY` format (e.g., OCT 25, 2025) for a consistent, structured appearance.
    - **Primary Data**: Transactional values (Price, Address) use a heavier weight (`600`) to stand out against supporting labels.

## Layout & Spacing

The layout is governed by a **Fixed Grid** philosophy on desktop, transitioning to a single-column stack on mobile.

- **The Grid**: A structured layout featuring a full-width header/status bar, followed by a 3-column summary row, and a 2-column main body (60/40 split between Timeline and Contacts).
- **Rhythm**: Generous vertical margins (Section Gap) are used to separate the property summary from the detailed timeline, ensuring the document never feels crowded.
- **Alignment**: The Timeline uses a "split-alignment" logic: labels are pinned to the left, while the corresponding values are pinned to the right within the same row, creating a clean vertical "gutter" of whitespace in the center of the container.

## Elevation & Depth

This design system is strictly **Flat**. Depth is communicated through color-blocking and linework rather than shadows or blurs.

- **Tonal Layering**: Containers (`#F9F9F9`) sit flush against the background (`#FFFFFF`). The hierarchy is established by the contrast between the two surfaces.
- **Dividers**: 1px solid lines in `Subtle Gray` or `Black` are used to define boundaries. Vertical dividers are specifically used to separate the 3-column property summary to evoke the feel of a newspaper masthead.
- **Zero-Shadow Policy**: No box-shadows or drop-shadows are permitted. Physicality is expressed through bold borders and distinct background fills.

## Shapes

The shape language is **Soft-Geometric**. While the overall layout is rigid and grid-based, individual containers use a medium corner radius to soften the "institutional" nature of real estate data.

- **Containers**: Timeline and Contact sections use the `rounded-lg` (1rem) token to create a friendly, modern container for data.
- **Imagery**: Agent headshots should be contained within a circular frame or a highly rounded (`rounded-xl`) square to contrast with the rectangular grid.
- **Interactive Elements**: Buttons and inputs should maintain consistent `rounded` (0.5rem) corners to match the secondary container aesthetic.

## Components

- **Status Bar**: A full-width `#F9F9F9` banner at the top of the viewport. It uses a `headline-lg` script for the primary message and `label-caps` for the state indicator.
- **Property Summary Cards**: Three equal-width columns separated by vertical `1px` dividers. Each column contains a central-aligned icon, a `label-caps` label, and a `data-point` value.
- **Timeline Rows**: Contained within a `rounded-lg` off-white box. Each row consists of a `label-caps` key on the left and a `data-point` on the right. Rows are separated by `subtle-gray` horizontal rules.
- **Contact Cards**: Styled similarly to the timeline but featuring a profile image, name in `data-point` weight, and contact details in `body-md`.
- **Buttons**: High-contrast, solid black fills with white Montserrat text in `label-caps`. 
- **Icons**: Minimalist, thin-stroke (1.5pt) monochrome icons. No fills or gradients.