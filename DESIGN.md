# Design System Specification: Editorial Minimalism

## Brand Identity

### Organization
**ศูนย์สหกิจศึกษาและพัฒนาอาชีพ มหาวิทยาลัยวลัยลักษณ์**

THE CENTER FOR COOPERATIVE EDUCATION AND CAREER DEVELOPMENT WALAILAK UNIVERSITY

### Logo Usage
![COOP Logo](./voting-system/public/branding/coop-logo.png)

Active logo file: `voting-system/public/branding/coop-logo.png`

### Header Signature Block
Use this exact signature on the homepage and major entry screens.

**ศูนย์สหกิจศึกษาและพัฒนาอาชีพ มหาวิทยาลัยวลัยลักษณ์**

THE CENTER FOR COOPERATIVE EDUCATION AND CAREER DEVELOPMENT WALAILAK UNIVERSITY

### Asset Placement
Place the logo file at:

`voting-system/public/branding/coop-logo.png`

Then reference it in Next.js as:

`/branding/coop-logo.png`

## 1. Overview & Creative North Star
### The Creative North Star: "The Mindful Curator"
This design system rejects the cluttered, "utility-first" appearance of standard assessment tools. Instead, it adopts the persona of a high-end editorial magazine—intentional, spacious, and authoritative. We move beyond the "template" look by utilizing **Sophisticated Asymmetry** and **Tonal Depth**.

The goal is to transform the anxiety of a "test" into the clarity of a "reflection." By leveraging generous whitespace (`spacing.20` and `spacing.24`) and high-contrast typography scales, we guide the user’s focus toward a single thought at a time. The interface shouldn't just be functional; it should feel like a premium, tactile object.

---

## 2. Colors & Surface Philosophy
The palette is a dialogue between the clinical purity of `surface` (#f8f9fa) and the high-energy friction of `primary` (Vibrant Orange) and `secondary` (Deep Purple).

### The "No-Line" Rule
**Strict Prohibition:** 1px solid borders are forbidden for sectioning. 
Boundaries must be defined through **Background Color Shifts**. For example, an assessment question block (`surface-container-low`) should sit on the main `background` without a stroke. The eye perceives the edge through the change in value, creating a softer, more sophisticated transition.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
*   **Base:** `surface` (#f8f9fa)
*   **Sectioning:** `surface-container-low` (#f3f4f5)
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) 

### The "Glass & Gradient" Rule
To avoid a flat, "Bootstrap" feel, use **Glassmorphism** for floating headers or navigation bars. Use `surface` at 80% opacity with a `backdrop-blur` of 20px. 
*   **Signature Textures:** For primary CTAs, use a subtle linear gradient from `primary` (#9f4200) to `primary_container` (#fe6c00) at a 135-degree angle. This adds "soul" and dimension to an otherwise flat design.

---

## 3. Typography: The Editorial Voice
We use IBM Plex Sans Thai Looped as our primary typeface for optimal Thai text readability and modern aesthetic.

*   **Font Family:** IBM Plex Sans Thai Looped (https://fonts.google.com/specimen/IBM+Plex+Sans+Thai+Looped)
*   **Display & Headlines:** Use heavier weights (600-700) with `display-lg` for welcome screens and `headline-md` for assessment questions. The looped design provides excellent readability for Thai characters.
*   **Body & Labels:** Use regular weight (400) for `body-lg` survey descriptions and `label-md` micro-copy. The open letterforms ensure comfortable reading for longer content.

**Editorial Tip:** Use `display-sm` for question numbers (e.g., "01") in a low-opacity `secondary` color to create a background rhythmic element that doesn't distract from the core question.

---

## 4. Elevation & Depth
In this system, depth is a feeling, not a feature.

*   **The Layering Principle:** Avoid shadows where color shifts can do the work. A `surface-container-lowest` card nested within a `surface-container` section creates a natural "lift."
*   **Ambient Shadows:** When a card must float (e.g., a modal or a primary action), use an extra-diffused shadow:
    *   *Shadow:* `0 20px 40px rgba(25, 28, 29, 0.04)` (using the `on-surface` color at 4%).
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use `outline-variant` (#e2bfb0) at **15% opacity**. It should be a whisper, not a shout.

---

## 5. Components

### Input Fields & Question Types
*   **Text Inputs:** Use `surface-container-highest` for the background. No bottom border. On focus, transition the background to `surface-container-lowest` and add a 2px `secondary` (#5f00e3) indicator on the far left or right edge only.
*   **Selection Chips:** For multiple-choice questions, use `md` (0.75rem) rounded corners. Unselected state: `surface-container-high`. Selected state: `secondary_container` with `on_secondary_container` text.

### Buttons
*   **Primary:** High-gloss gradient (Primary to Primary Container). Shape: `full` (pill-shaped) for a friendly, modern feel.
*   **Secondary:** Ghost style. No background, `outline-variant` (at 20% opacity) border, and `secondary` text.

### Cards & Lists
*   **Constraint:** Forbid divider lines.
*   **Implementation:** Separate list items using `spacing.4` (1.4rem) of vertical whitespace. Use a subtle background hover state of `surface-bright` to indicate interactivity.

### Assessment-Specific Components
*   **Progress Curator:** A thin 4px bar at the very top of the viewport using `primary`. Do not enclose it in a container; let it bleed to the edges of the screen.
*   **The "Focus Card":** A large, `xl` (1.5rem) rounded container for the active question, utilizing a `surface-container-lowest` background and a soft Ambient Shadow to isolate the user from background distractions.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Offset your headlines. Place a question on the left and the input on the right with a large gap (`spacing.12`).
*   **Use Generous Leading:** Increase line-height for Thai text to 1.6x or 1.8x to ensure the loops and diacritics breathe.
*   **Tonal Progressions:** Use `secondary_fixed_dim` for "previously completed" states to show progress without the harshness of a "check" mark.

### Don't:
*   **Don't use pure black:** Always use `on_surface` (#191c1d) for text to maintain the premium, soft-minimalist feel.
*   **Don't crowd the screen:** If a question has more than 5 options, use a two-column grid rather than a long vertical list to keep the vertical scroll manageable.
*   **No "Heavy" Borders:** Avoid the standard `outline` (#8e7164) at 100% opacity. It breaks the "Mindful Curator" illusion and makes the app feel like a legacy form.

---
*Director's Note: This design system is about the luxury of space. If you feel the urge to fill a gap, add more margin instead.*