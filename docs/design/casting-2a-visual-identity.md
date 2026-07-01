<!-- Designer: Gemini (via scripts/gemini.sh, 2026-07-01). Architect arbitration (rule 3),
recorded before freeze: §5 'Cleanup on Replace/Remove deletes the old storage object first'
and State 3's 'clears DB and Storage' are OVERRULED — the build clears the DB columns only
and never deletes storage objects in 2a (delete-then-update inverts failure ordering: a
failed row update after a successful delete manufactures the State-6 dangling path; orphaned
objects are cheap and an explicit later chore — see the impl spec). The Remove confirm copy
drops the word 'Permanently delete' accordingly. Everything else binds as written. -->

# Casting Phase-2a: Visual Identity (Design Spec)

## 1. Feature Architecture & Placement

Visual Identity introduces a symmetric flow to the existing Voice Casting Studio. Instead of merging them into a single overloaded modal, Visual Identity gets its own dedicated entry point on the **Character Dossier** to maintain scope discipline and logical separation.

### 1.1 The Character Dossier (Entry Point & Display)
*   **Visual ID Attachment (`.dossier-visual-attachment`):** When a character is "Visually Cast" (has a locked image), a photo attachment appears clipped to the top-right or left margin of the dossier card, overlapping the border to sell the paper/brass aesthetic.
    *   **Styling:** Renders as a Polaroid/ID badge with a brass paperclip element (`--bg-paper`, `--shadow-elevation-2`, subtle 2deg rotation).
    *   **Content:** Contains the image (fetched via Signed URL) and a typewriter-font caption displaying the `visual_style` descriptor.
*   **Empty State:** If not cast, a faint dashed outline of a photo sits in that space with the text "NO VISUAL ID ON FILE".
*   **Action Button (`.btn-visual-cast`):** Located next to the existing Voice CAST/RECAST button.
    *   **Text:** `[ VISUAL CAST ]` (Empty) or `[ RECAST VISUAL ]` (Locked).
    *   **Action:** Opens the **Visual Identity Studio Modal**.

## 2. Visual Identity Studio Modal

A focused, single-purpose modal overlay (`.visual-studio-modal`) that traps focus and allows the operator to upload, preview, and lock a single reference image and visual style descriptor.

### 2.1 Layout & Typography tokens
*   **Backdrop:** `--overlay-dim` (dark translucent), clicks outside do *not* close if there are unsaved changes.
*   **Panel:** Manila folder background (`--color-paper`), inset border (`--border-ink-faint`), brass-colored header divider.
*   **Header:** "VISUAL IDENTITY ARCHIVE" (`--font-serif`, uppercase, tracking-wide).
*   **Close Button (X):** Top right. Restores focus to the triggering dossier button on close.

### 2.2 Modal Flow States

#### State 1: Empty / Prompt (`.visual-studio--empty`)
*   **Instructions:** "Generate your character reference elsewhere (Midjourney, Gemini, etc.), then upload the final image here to lock their visual identity." (Typewriter font, `--color-ink-muted`).
*   **Dropzone (`.upload-dropzone`):** A large, dashed-border area.
    *   *Icon:* A line-art camera or paper-clip icon.
    *   *Text:* "Drag & Drop reference image or Click to Browse"
    *   *Subtext:* "JPEG, PNG, WEBP. Max 5MB."

#### State 2: Preview / Unsaved (`.visual-studio--preview`)
*   Triggered immediately after user selects a valid file. File is held in memory (Blob URL), *not yet uploaded*.
*   **Preview Image (`.preview-thumbnail`):** Constrained to max 300px height, centered. Faint drop shadow to look like a physical photo sitting on the dossier.
*   **Style Descriptor Input (`.visual-style-input`):**
    *   Appears directly beneath the photo.
    *   *Label:* "Visual Style Descriptor (Required)"
    *   *Input:* Single-line text input (`type="text"`, max 100 chars). E.g., "Cyberpunk detective, neon rim lighting".
*   **Action Bar:**
    *   **Discard (`.btn-discard`):** Secondary ghost button. Clears preview, returns to State 1.
    *   **Lock Identity (`.btn-lock`):** Primary solid button (dark ink). Disabled until the visual style input has at least 3 characters.

#### State 3: Locked (`.visual-studio--locked`)
*   Triggered when opening the modal for an already visually-cast character.
*   **Image Display:** Fetched via Signed URL. Displays the image with a red/blue "ARCHIVED" or "LOCKED" stamp graphic overlaid in the corner.
*   **Style Display:** Read-only text block looking like a typewriter-stamped label.
*   **Action Bar:**
    *   **Remove (`.btn-remove`):** Destructive text link/button (red ink). Prompts a native `window.confirm` ("Permanently delete this visual identity?"), then clears DB and Storage.
    *   **Replace Image (`.btn-replace`):** Primary solid button. Clears current view and returns to State 1 to start a new upload flow.

#### State 4: Upload In-Flight (`.visual-studio--loading`)
*   Triggered after clicking "Lock Identity".
*   **Visual:** The preview image fades to 50% opacity. An indeterminate circular loader (brass colored) spins over the image.
*   **Text:** "Archiving to Secure Storage..."
*   **Lock:** All inputs and buttons are disabled. Focus remains trapped in modal.

#### State 5: Errors (`.visual-studio--error`)
*   **Client Validation Error (File Selection):** If >5MB or wrong format. Red ink text (`--color-error`) appears inside the empty dropzone. Shake animation (respects `prefers-reduced-motion`).
*   **Upload/Network Error:** If Supabase upload fails. A banner appears above the preview: "Failed to secure image. Check network connection." Action buttons re-enable.

#### State 6: Missing / Dangling Path (`.visual-studio--missing`)
*   Occurs if DB has `reference_image_url` but the Storage object fetch fails.
*   **Visual:** A torn-photo placeholder graphic.
*   **Text:** "ARCHIVE CORRUPTED: Image missing from secure storage."
*   **Action Bar:** Only "Remove" and "Replace" buttons are available.

## 3. Component Specs & Accessibility (WCAG 2.2 AA)

### 3.1 Dropzone Component (`.upload-dropzone`)
*   **Role:** `<button>` or `<div role="button" tabindex="0">` to ensure keyboard triggerability.
*   **Aria:** `aria-label="Upload reference image"`
*   **States:**
    *   *Default:* Dashed border (`--color-ink-faint`), light paper background.
    *   *Hover/Drag-over:* Background slightly darkens (`--color-paper-darker`), border turns solid brass (`--color-brass`), cursor changes to pointer.
    *   *Focus:* Visible 2px outline (`--color-focus-ring`), offset by 2px.
    *   *Active (Click):* Background deepens, brief scale down to 0.98 (if motion allowed).
    *   *Disabled/Loading:* `aria-disabled="true"`, opacity 50%, grayscale, `pointer-events: none`.

### 3.2 Visual Style Input (`.visual-style-input`)
*   **Role:** `<input type="text">` with associated `<label>`.
*   **States:**
    *   *Default:* Bottom-border only (line on paper), typewriter font (`--font-mono`), transparent background.
    *   *Hover:* Bottom-border thickens.
    *   *Focus:* Bottom-border turns to `--color-brass`, standard focus ring applied.
    *   *Empty:* Placeholder text "e.g. Scruffy smuggler, cinematic lighting...".
    *   *Error (Submit with empty):* Bottom-border turns red, `aria-invalid="true"`.

### 3.3 Buttons (`.btn-lock`, `.btn-discard`, `.btn-remove`)
*   **A11y:** Standard `<button>`, minimum touch target 44x44px on mobile.
*   **Lock Button States:**
    *   *Default:* `--bg-ink-dark`, `--text-paper`.
    *   *Hover:* Slight brightness increase, shadow elevation.
    *   *Focus:* Solid focus ring.
    *   *Disabled:* When input is empty. Opacity 40%, `cursor: not-allowed`.
    *   *Loading:* Shows text "LOCKING..." and inline spinner.

## 4. Responsive Behavior

*   **1120px / 768px (Desktop/Tablet):** Modal is 500px wide, centered. Dossier attachment sits off the top-right corner of the card.
*   **412px / 320px (Mobile):**
    *   Modal becomes full-width, anchored to the bottom (bottom-sheet style) or full-screen to maximize upload hit-area.
    *   Dropzone height reduces from 300px to 200px.
    *   Image preview uses `max-width: 100%; height: auto`.
    *   Dossier attachment shifts to inline below the character name rather than overlapping the right border, preventing horizontal overflow.

## 5. Security & Data Implementation Notes

*   **Signed URLs:** The UI must handle the asynchronous loading of the image in the Locked state. Use a shimmer skeleton loader matching the photo dimensions while the Signed URL is generated from the `reference_image_url` path.
*   **Never Public:** The `<img>` `src` must never map to a public Supabase URL.
*   **File Path Generation:** On upload, generate a deterministic or UUID-based path scoped to the owner to prevent collision (e.g., `character-refs/{user_id}/{character_id}/{uuid}.jpg`).
*   **Cleanup on Replace:** When "Replace" or "Remove" is clicked, the app must delete the old object from the `character-refs` bucket before updating the character record to avoid orphaned files.
