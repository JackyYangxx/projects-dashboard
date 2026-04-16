```markdown
# Design System Documentation

## 1. Overview & Creative North Star: "The Precision Curator"

This design system moves beyond the standard utility of a project management tool to create a "High-End Editorial" experience. The Creative North Star, **The Precision Curator**, focuses on the intersection of authoritative data and sophisticated minimalism. 

Rather than a rigid, boxy grid, we employ intentional asymmetry and tonal layering to guide the user’s eye. We treat data not as a series of rows, but as curated content. By utilizing high-contrast typography scales and overlapping surfaces, we transform a "standard dashboard" into a bespoke command center that feels both expansive and hyper-organized.

---

## 2. Colors

The color palette is rooted in a deep, authoritative blue, balanced by a sophisticated neutral scale. The goal is to provide clarity through tonal shifts rather than structural lines.

### Surface Hierarchy & Nesting
To achieve a premium feel, we follow a strict nesting logic. Instead of drawing lines to separate content, use the `surface-container` tiers to create depth.
- **Base Layer:** `surface` (#f8f9fa).
- **Secondary Sections:** `surface_container_low` (#f3f4f5).
- **Interactive Cards/Primary Content:** `surface_container_lowest` (#ffffff).
- **Active/Hover States:** `surface_container_high` (#e7e8e9).

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off parts of the UI. Separation must be achieved through background color shifts. For example, a project card (`surface_container_lowest`) sits on a dashboard background (`surface`). The transition between these hex codes provides the boundary.

### The "Glass & Gradient" Rule
To add "soul" to the data, use subtle gradients for primary actions and hero states.
- **Main CTAs:** Transition from `primary` (#005bbf) to `primary_container` (#1a73e8).
- **Glassmorphism:** For floating elements like filter menus or date pickers, use `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur. This softens the edges of the data-heavy environment.

---

## 3. Typography

The typography strategy uses a "Dual-Tone" approach: **Manrope** for editorial authority and **Inter** for data-heavy execution.

- **Display & Headlines (Manrope):** These are the "Vision" elements. Use `display-lg` to `headline-sm` to create a sense of hierarchy. The wider tracking and geometric nature of Manrope provide an upscale, modern feel.
- **Body & Labels (Inter):** These are the "Execution" elements. Inter is utilized for `body-md` and `label-sm` levels to ensure maximum legibility in complex tables and charts. 
- **Hierarchy Tip:** Use `on_surface_variant` (#414754) for secondary labels to create a sophisticated, low-contrast look that keeps the focus on the primary data points.

---

## 4. Elevation & Depth

We eschew traditional "drop shadows" in favor of **Tonal Layering** and **Ambient Light simulation.**

### The Layering Principle
Depth is achieved by stacking surface tokens. A `surface_container_lowest` card placed on a `surface_container_low` background creates a "soft lift." This is our primary method of elevation.

### Ambient Shadows
When a component must float (e.g., a primary "Create Project" modal), use the following shadow specification:
- **Color:** `on_surface` (#191c1d) at 4%–6% opacity.
- **Blur:** 24px–40px.
- **Spread:** -4px.
This creates a natural, ambient glow rather than a dated, muddy shadow.

### The "Ghost Border" Fallback
If accessibility requirements demand a container boundary, use a **Ghost Border**: `outline_variant` at 15% opacity. Never use 100% opaque borders.

---

## 5. Components

### Cards
Cards are the primary vessel for project data.
- **Styling:** No borders. Use `surface_container_lowest`. 
- **Spacing:** Utilize `xl` (0.75rem) roundedness for a soft, approachable feel.
- **Layout:** Use generous internal padding (24px+) to let data "breathe."

### Data Tables with Badges
Tables should feel like an editorial list rather than a spreadsheet.
- **Dividers:** Forbid the use of divider lines. Use alternating row colors (`surface` and `surface_container_low`) or simply vertical white space.
- **Badges:** Use `secondary_container` for "Success" and `tertiary_container` for "Warning." Badges should have `full` roundedness and use `label-md` typography.

### Structured Forms
- **Input Fields:** Use `surface_container_high` for the input background with a `md` (0.375rem) corner radius.
- **States:** On focus, transition the background to `surface_container_lowest` and apply a Ghost Border using the `primary` color.

### Filter Chips
- **Action Chips:** Use `surface_container_high` for unselected states.
- **Selection:** When active, use `primary` with `on_primary` text. Use `full` roundedness to distinguish them from project cards.

### Date Pickers
- **Aesthetic:** Use a Glassmorphic container. The calendar grid should avoid internal lines, using `primary_fixed_dim` for the selected date range to create a soft, luminous highlight.

---

## 6. Do’s and Don’ts

### Do:
- **Embrace White Space:** Treat white space as a structural element, not "empty" space.
- **Layer Tones:** Use the difference between `surface` and `surface_container_low` to define different sections of the dashboard.
- **Use Manrope for Impact:** Ensure all large numbers and titles use the headline scale to maintain the "Editorial" feel.

### Don’t:
- **No 1px Borders:** Never use a solid, high-contrast line to separate a sidebar or a header.
- **Avoid Pure Black Shadows:** Never use `#000000` for shadows; always use a tinted version of `on_surface`.
- **Don't Crowd Data:** In data-heavy tables, prioritize legibility. If the table feels cramped, increase the vertical padding rather than shrinking the font.
- **No "Default" Buttons:** Avoid standard rectangular buttons. Use the `md` or `lg` roundedness scale and a subtle gradient to make them feel custom.

---
*This design system is a living document intended to evolve with the complexity of our data while maintaining its core signature of high-end, editorial precision.*```