# FYCS Study Hub - User Interface (UI) Specification
## Mobile App Design System & Premium Aesthetics Guide

This document defines the exact visual guidelines, typography, components, and layout models required to replicate the **FYCS Study Hub** website's premium visual system inside the native mobile application. The target is a sleek, modern, glassmorphic dark-theme design.

---

## 1. Design Philosophy & Visual Tokens

The website uses a **Premium Cyberpunk Dark / Glassmorphic** theme. The primary accent is gold, representing quality educational resources, while the background remains a deep black to emphasize layout boundaries and readability.

### 1.1 Color Palette

| Token Name | Hex Value | RGBA Value | Role / Usage |
| :--- | :--- | :--- | :--- |
| **System Background** | `#0a0a0a` | `rgb(10, 10, 10)` | Global screen background |
| **Pill/Card Fill** | `#0c0c0e` | `rgb(12, 12, 14)` | Base container background |
| **Primary Text** | `#ffffff` | `rgb(255, 255, 255)` | Headings, labels, and primary buttons |
| **Secondary Text** | `N/A` | `rgba(255, 255, 255, 0.55)` | Descriptions, dates, helper subtitles |
| **Muted Text** | `N/A` | `rgba(255, 255, 255, 0.35)` | Input field placeholders |
| **Accent Gold (Primary)**| `#FFD700` | `rgb(255, 215, 0)` | Primary buttons, active tabs, highlights |
| **Accent Gold (Hover)** | `#FFC107` | `rgb(255, 193, 7)` | Button pressed states |
| **Glass Background** | `N/A` | `rgba(255, 255, 255, 0.08)` | Glassmorphic cards background |
| **Glass Border** | `N/A` | `rgba(255, 255, 255, 0.15)` | Subtle boundaries for cards |
| **Success/Approved** | `#10b981` | `rgba(16, 185, 129, 0.15)` | Approved status background, green badge |
| **Danger/Rejected** | `#f43f5e` | `rgba(244, 63, 94, 0.15)` | Rejected status background, red badge |

### 1.2 Typography (Google Fonts: Inter)
The font family throughout the application is **Inter** (fallback to standard sans-serif system stacks).
* **Main Screen Heading**: 24px (Bold, tracking tight `-0.025em`)
* **Card Heading / Title**: 16px (Bold, tracking tight)
* **Form Labels**: 11px (Extra Bold, uppercase, tracking wide `0.05em`, color `rgba(255, 255, 255, 0.70)`)
* **Select Option / Dropdowns**: 14px (Medium)
* **Status Badges & Info Tags**: 10px (Semi-Bold)
* **Body / Helper Subtitles**: 12px (Regular, color `rgba(255, 255, 255, 0.55)`)

### 1.3 Glassmorphic Styling (`.glass-card`)
To achieve the premium translucent feel, containers should follow this layout model:
* **Background Fill**: `rgba(255, 255, 255, 0.08)`
* **Backdrop Blur**: `blur(10px)` (or `-webkit-backdrop-filter: blur(10px)`)
* **Border Definition**: `1px solid rgba(255, 255, 255, 0.15)`
* **Border Radius**: `16px` (large rounded corners)
* **Shadow Overlay**: Subtle drop shadow (`rgba(0, 0, 0, 0.5)` with `15px` radius)

---

## 2. Core UI Layout & Components

### 2.1 Navigation Bar (Glass Navigation Menu)
* **Position**: Fixed at the bottom of the viewport.
* **Aesthetics**: `background: rgba(0, 0, 0, 0.35)` with a backdrop blur of `24px` and a top border of `1px solid rgba(255, 255, 255, 0.1)`.
* **Icons**: Lucide icons represent active states. Golden accents indicate selection.

```
┌────────────────────────────────────────────────────────┐
│   [🗂️ Library]     [📤 Upload]     [👤 Profile]        │
│      Muted            Gold            Muted            │
└────────────────────────────────────────────────────────┘
```

### 2.2 Segmented Pill Tab Bar
A toggling mechanism placed in the Upload screen to switch between views (e.g. Upload Form and Pending Admin views):
* **Container**: Pill shaped, background `#18181b` (Zinc-900), padding `4px`, border-radius `8px`.
* **Inactive Tab**: Text color `rgba(255, 255, 255, 0.70)`, transparent background.
* **Active Tab**: Text color `#000000` (black), background `#FFD700` (Gold), border-radius `6px`.

```
┌────────────────────────────────────────────────────────┐
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │      Upload (Gold)    │  │     Pending (Muted)   │  │
│  └───────────────────────┘  └───────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 2.3 Custom Select Dropdown
To support dynamic subject selection, custom dropdowns are used instead of browser defaults:
* **Initial State**: A button labeled "Select Subject" with a right-aligned gold chevron arrow.
* **Overlay Dropdown Menu**: A modal or absolute list container:
  * Background: Solid `#0c0c0e` with a backdrop blur of `20px` and rounded corners of `16px`.
  * Highlighted item: Background `rgba(255, 215, 0, 0.15)` (Gold tint), text `#FFD700` with a checkmark on the right.
  * Inactive items: Hover states highlight in `rgba(255, 255, 255, 0.10)`.

```
Select Dropdown Button:
┌────────────────────────────────────────────────────────┐
│  Select Subject...                                  ▼  │
└────────────────────────────────────────────────────────┘

Absolute Dropdown List (Opened):
┌────────────────────────────────────────────────────────┐
│ Applied Mathematics                                    │
├────────────────────────────────────────────────────────┤
│ Applied Physics I                             [Check]  │
├────────────────────────────────────────────────────────┤
│ Introduction to Programming                            │
└────────────────────────────────────────────────────────┘
```

---

## 3. Upload Page Component Specs

### 3.1 User Identity Banner
Shows current credentials at the top of the form, verifying admin status.
* **Background**: `rgba(255, 255, 255, 0.05)` with a border of `1px solid rgba(255, 255, 255, 0.1)`.
* **Layout**: Horizontal Flex Box
  * Left: Avatar Image (40x40px, rounded circle, border `1px solid rgba(255,255,255,0.2)`).
  * Center: Vertical Text Column (Name in bold white, Email in small muted white).
  * Right: Verified Badge (`rgba(59, 130, 246, 0.1)` blue pill with checkmark icon and blue "Verified" text).

### 3.2 File Share Dropzone / Preview Area
The file explorer share trigger redirects files directly here.
* **Aesthetics**: Dashed border `2px dashed rgba(255, 255, 255, 0.15)`.
* **State Highlights**: When a file is received or drag/dropped, the border glows golden `#FFD700`, and the background changes to `rgba(255, 215, 0, 0.05)`.
* **Content Elements**:
  * Upload icon (Lucide `CloudUpload`, colored `#FFD700`).
  * File details text (Muted metadata: name and file size).

### 3.3 File Upload Progress Card
Tracks background upload states for shared files:
* **Icon Indicator**: PDF/Docs show a golden file icon (`File`).
* **File Metadata**: Displays the name of the file, truncated if necessary.
* **Progress Ring (SVG Circular Loader)**: 
  * Background Track: `rgba(255, 255, 255, 0.1)`.
  * Progress Fill: Golden stroke `#FFD700` dynamically calculated based on progress.
* **Completed State**: Replaces the loader with an emerald green badge containing checkmark and text: `"Ready"`.

```
Progress Row Layout:
┌────────────────────────────────────────────────────────┐
│  📄 Unit_3_Physics.pdf               [ (65%) ]   [❌]  │
└────────────────────────────────────────────────────────┘

Completed Row Layout:
┌────────────────────────────────────────────────────────┐
│  📄 Unit_3_Physics.pdf               [ Ready ]   [❌]  │
└────────────────────────────────────────────────────────┘
```

### 3.4 Buttons (Core Actions)
* **Publish Button (`.btn-primary`)**:
  * Fill Color: Solid Gold `#FFD700`.
  * Active/Click Feedback: Scale animation to `0.98`.
  * Text: Heavy black font (`#000000`).
  * Disabled State: Muted grey background (`rgba(255, 255, 255, 0.1)`) and text color `rgba(255, 255, 255, 0.3)`.
* **Danger/Delete Action (`.btn-danger`)**:
  * Background Fill: `rgba(244, 63, 94, 0.10)`.
  * Border: `1px solid rgba(244, 63, 94, 0.2)`.
  * Hover / Press: Highlights to `rgba(244, 63, 94, 0.2)`.

---

## 4. Admin Panel & Moderation Spec

### 4.1 Pending Material Card Layout
Cards in the moderation panel display the layout shown below:

```
┌────────────────────────────────────────────────────────┐
│  [📄 Icon]  Unit 3 Physics Notes                       │
│             Semester 1 • Applied Physics • Notes       │
│             Uploaded by Rishi • 2026-07-05             │
├────────────────────────────────────────────────────────┤
│  [ Approve (Green Badge) ]     [ Reject (Red Badge) ]  │
└────────────────────────────────────────────────────────┘
```

* **Document Type Icons (Lucide Set)**:
  * **Notes**: `FileText` (Colored blue: `text-blue-400`).
  * **Practicals**: `Code` (Colored green: `text-green-400`).
  * **IMP**: `Star` (Colored gold/yellow: `text-yellow-400`).
  * **Assignment**: `Edit3` (Colored purple: `text-purple-400`).
* **Approve Button**: 
  * Style: Emerald green badge (`bg-emerald-500/15`, border `1px solid bg-emerald-500/25`).
  * Icon: Checkmark (`CheckCircle`).
* **Reject Button**: 
  * Style: Rose red badge (`bg-rose-500/10`, border `1px solid bg-rose-500/20`).
  * Icon: Cross (`XCircle`).

---

## 5. Mobile UI Implementation Guidelines

For cross-platform frameworks (React Native, Flutter) or native setups, use the following equivalents to implement the site's layout system.

### 5.1 React Native Styling Rules (Tailwind / Stylesheet)
If using NativeWind (Tailwind wrapper) or standard Stylesheets:

```javascript
const uiTheme = {
  colors: {
    background: '#0a0a0a',
    cardBackground: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.15)',
    gold: '#FFD700',
    goldHover: '#FFC107',
    mutedText: 'rgba(255, 255, 255, 0.55)',
    placeholder: 'rgba(255, 255, 255, 0.35)',
    emerald: '#10b981',
    emeraldBg: 'rgba(16, 185, 129, 0.15)',
    rose: '#f43f5e',
    roseBg: 'rgba(244, 63, 94, 0.1)',
  },
  typography: {
    fontFamily: 'System', // Map to Inter in Xcode/Android assets
    titleSize: 24,
    bodySize: 14,
    labelSize: 11,
  }
};
```

### 5.2 Flutter Visual Styles (BoxDecorations)
Use the following configurations to build container components in Flutter:

```dart
// Dark Glassmorphism Container decoration
final glassCardDecoration = BoxDecoration(
  color: Colors.white.withOpacity(0.08),
  borderRadius: BorderRadius.circular(16.0),
  border: Border.all(
    color: Colors.white.withOpacity(0.15),
    width: 1.0,
  ),
  boxShadow: [
    BoxShadow(
      color: Colors.black.withOpacity(0.5),
      blurRadius: 15,
      offset: Offset(0, 5),
    ),
  ],
);

// Primary Gold Button Style
final primaryButtonStyle = ButtonStyle(
  backgroundColor: MaterialStateProperty.all(const Color(0xFFFFD700)),
  foregroundColor: MaterialStateProperty.all(Colors.black),
  shape: MaterialStateProperty.all(
    RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
  ),
  textStyle: MaterialStateProperty.all(
    const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
  ),
);
```

---
*End of UI Design System.*
