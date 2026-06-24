  
 <div align="center">

  [![](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
  [![](https://img.shields.io/badge/License-AGPL_3.0-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/agpl-3.0)
  [![](https://img.shields.io/badge/Version-1.0.34-brightgreen.svg?style=for-the-badge)](#)

  <img src="art/chrono-slideshow-card.svg" width="780" alt="Chrono Slideshow Card Banner">

  <img src="art/banner.png" width="800" alt="Chrono Slideshow Card Banner">

  <p align="center">
    <strong>A photo slideshow card for Home Assistant dashboards.<br>
            Cycles through the photos found by a chrono_folder sensor with smooth<br>
            transitions, a fully configurable overlay grid, and touch/mouse gestures.</strong>
  </p>

  <p align="center">
    <a href="#introduction">Introduction</a> •
    <a href="#key-features">Key Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#configuration">Configuration</a> •
    <a href="#gestures">Gestures</a> •
    <a href="#license">License</a>
  </p>

</div>

---

**Chrono Slideshow Card** turns your photos into a full-screen photo slideshow. Photos cycle on a timer with a choice of transition effects, and a 9-zone overlay grid lets you place clocks, dates, EXIF data, or any other entity or template content on top — each zone independently styled, positioned, and aligned.

The card ships with a complete visual editor covering the vast majority of day-to-day configuration. A handful of more specialized settings — intentionally, to keep the editor from becoming overwhelming — are YAML-only, set via the card's own **Show code editor** view rather than a dedicated field. Every one of those is documented below.

> **Requires** the [chrono_folder](https://github.com/rob-vandenberg/chrono_folder) integration to be installed and configured first — this card displays the photos that chrono_folder finds, it does not access the folders by itself.

---

## 📋 Table of Contents

- [Introduction](#introduction)
- [Key Features](#key-features)
- [Installation](#installation)
  - [HACS (Recommended)](#hacs-recommended)
  - [Manual Installation](#manual-installation)
- [Uninstallation](#uninstallation)
- [Configuration](#configuration)
  - [Card Options](#card-options)
  - [Zone Options](#zone-options)
  - [Item Options (Shared)](#item-options-shared)
  - [Entity Item Options](#entity-item-options)
  - [Template Item Options](#template-item-options)
  - [Advanced: YAML-only Options](#advanced-yaml-only-options)
- [Gestures](#gestures)
- [Examples](#examples)
- [License](#license)
- [Support](#support)

---

## 🚀 Key Features

### 🖼️ Smooth, Self-Warming Transitions
Choose from Fade, four Slide directions, Curtain, Clock, None, or Random (which picks a different real transition every time, never repeating the same one twice in a row by accident — and never silently picking "None"). The next photo is always fully loaded and ready well before its turn arrives, so transitions stay smooth even at the very first photo.

### 🧠 Intelligent Fit Mode
Beyond the standard Cover / Contain / Fill, an **Intelligent** fit mode reduces or eliminates the letterbox bars that Contain leaves around mismatched aspect ratios — using a small, bounded amount of zoom and stretch, tuned by you, falling back cleanly to plain Contain whenever a photo's proportions are too different to fix without it looking wrong (a true portrait photo on a landscape screen, for example).

### 🎛️ 9-Zone Overlay Grid
Top/Middle/Bottom × Left/Center/Right — nine independent zones. Each zone has two settings of its own: whether it stays fixed on screen (**Static**) or transitions together with the photo (**Dynamic**), and how multiple items stacked in that zone align relative to each other (**Alignment**) — independent of which corner or edge the zone itself sits at.

### 📊 Live Jinja2 Template Items, Photo-Aware
Template items evaluate any Jinja2 expression in real time via WebSocket, exactly like a template sensor. Photo-specific fields (filename, EXIF data, and similar) are resolved client-side before the template is even sent to Home Assistant — so a clock or a filename label never opens a subscription it doesn't need.

### 🎨 Full Per-Item Styling, Including Shadow and Stroke
Every item gets font color/size/weight/line-height, background color, border radius, and padding — plus a full text-shadow and stroke system, so light-colored text stays legible over light-colored photos without guesswork.

### 👆 Tap, Hold, Double-Tap, and Swipe
Tap pauses and resumes the slideshow with an on-screen indicator. Swipe left/right moves between photos. Hold, double-tap, and swipe up/down are yours to assign to anything Home Assistant's action system supports — kiosk-mode toggling is a common use, but the card has no opinion on what they do.

### ✏️ Full Visual Editor
Card-wide settings, the 9-zone grid, and every item's styling are configurable through the Lovelace UI editor — no YAML required for the everyday case.

---

## 📦 Installation

### HACS (Recommended)

1. Open **HACS** in your Home Assistant instance.
2. Navigate to **Frontend** and click the three-dot menu in the top right corner.
3. Select **Custom repositories**.
4. Enter `https://github.com/rob-vandenberg/chrono-slideshow-card` and select **Lovelace** as the category.
5. Click **Add**. The repository will appear in the list.
6. Search for `Chrono Slideshow Card` and click **Download**.
7. Reload your browser.

Make sure [chrono_folder](https://github.com/rob-vandenberg/chrono_folder) is installed and has at least one folder watcher configured — this card needs a `sensor.` entity created by it.

### Manual Installation

1. Download `chrono-slideshow-card.js` from the [latest release](https://github.com/rob-vandenberg/chrono-slideshow-card/releases/latest).
2. Copy it to your Home Assistant `config/www/` folder.
3. In Home Assistant, go to **Settings → Dashboards → Resources**.
4. Click **Add Resource**.
5. Enter `/local/chrono-slideshow-card.js` as the URL and select **JavaScript Module**.
6. Click **Create** and reload your browser.

---

## 🗑️ Uninstallation

### Via HACS
1. Open **HACS → Frontend**.
2. Find **Chrono Slideshow Card** and click the three-dot menu.
3. Select **Remove**.
4. Reload your browser.

### Manual
1. Delete `chrono-slideshow-card.js` from `config/www/`.
2. Remove the resource entry from **Settings → Dashboards → Resources**.

---

<img src="art/editor.png" width="800" alt="Chrono Slideshow Card Editor">

---

## ⚙️ Configuration

### Card Options

These properties apply to the entire card. Everything in this table has a dedicated field in the visual editor unless noted otherwise.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `entity` | string | required | The `chrono_folder` sensor to display. The editor's combobox is populated only with entities actually created by chrono_folder. |
| `sort_by` | string | `filename` | `filename`, `filedatetime`, `exifdatetime`, or `random` (a true shuffle — every photo appears exactly once per pass, re-shuffled only when the photo list reloads, not on every lap) |
| `sort_reverse` | boolean | `false` | Reverse the sort order |
| `display_time` | number | `8` | Seconds each photo is shown before advancing |
| `transition` | string | `fade` | `none`, `fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `curtain`, `clock`, or `random` |
| `transition_duration` | number | `0.6` | Seconds the transition animation itself takes |
| `fit_mode` | string | `contain` | `cover`, `contain`, `fill`, or `intelligent` (see [Key Features](#-intelligent-fit-mode)) |
| `zone_modes` | object | see below | Per-zone Static/Dynamic — set via the **Zones configuration** panel |
| `zone_alignment` | object | see below | Per-zone Left/Center/Right internal alignment — set via the **Zones configuration** panel |
| `items` | list | `[]` | Overlay items — added via the **Items configuration** panel |

Several settings are deliberately YAML-only, with no dedicated field — see [Advanced: YAML-only Options](#advanced-yaml-only-options).

---

### Zone Options

`zone_modes` and `zone_alignment` are each an object keyed by zone name: `top-left`, `top-center`, `top-right`, `middle-left`, `middle-center`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right`.

| Setting | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| Transition (mode) | `static`, `dynamic` | `dynamic` for the middle row, `static` everywhere else | Whether the zone's items stay fixed on screen during a transition, or move with the photo |
| Alignment | `left`, `center`, `right` | matches the zone's own column | How multiple items stacked in this zone align relative to each other |

```yaml
zone_modes:
  top-left: static
  top-center: static
  top-right: static
  middle-left: dynamic
  middle-center: dynamic
  middle-right: dynamic
  bottom-left: static
  bottom-center: static
  bottom-right: dynamic
zone_alignment:
  top-left: left
  top-center: center
  top-right: right
  middle-left: left
  middle-center: center
  middle-right: right
  bottom-left: left
  bottom-center: center
  bottom-right: right
```

---

### Item Options (Shared)

Every item — entity or template — supports the following.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `horizontal` | string | `center` | Which column zone the item belongs to: `left`, `center`, `right` |
| `vertical` | string | `middle` | Which row zone the item belongs to: `top`, `middle`, `bottom` |
| `show` | boolean | `true` | Show or hide the item without removing it |
| `font_color` | string | `''` | Text color |
| `font_size` | number | `1.2` | Font size, in em |
| `font_weight` | number | `600` | Font weight |
| `line_height` | number | `1.2` | Line height |
| `border_radius` | number | `50` | Border radius in px — only visible if `background_color` is also set |
| `background_color` | string | `''` | Background color behind the item |
| `padding_top` / `padding_bottom` / `padding_left` / `padding_right` | number | `10` each | Padding in px |
| `text_shadow_color` | string | `''` | Shadow/stroke color — accepts 8-digit hex with alpha (e.g. `#000000AA`). No shadow or stroke renders at all unless this is set. |
| `text_shadow_blur` | number | `0` | Shadow blur radius in px |
| `text_shadow_offset_x` / `text_shadow_offset_y` | number | `0` each | Shadow offset in px — negative values are valid |
| `text_shadow_stroke_width` | number | `0` | Outline width in px, drawn in the same color as the shadow |

---

### Entity Item Options

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `entity` | string | required | Entity ID to track |
| `icon` | string | `''` | MDI icon override |
| `show_state` | boolean | `false` | Show the entity's state alongside the icon |

---

### Template Item Options

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `template` | string | required | A Jinja2 template, e.g. `{{ now().strftime('%H:%M') }}` |

Templates can reference the current photo's own data directly as bare `{{ }}` variables — for example `{{ fileName }}` or `{{ exifModel }}` — resolved before the template ever reaches Home Assistant. If every `{{ }}` block in a template resolves this way, no live state subscription opens at all. The exact set of available photo fields depends on what your chrono_folder sensor provides.

---

### Advanced: YAML-only Options

These have no dedicated field in the visual editor — open the card's **Show code editor** view to set them. This isn't a limitation so much as a deliberate choice: these are settings most people configuring the card will rarely if ever touch, so they don't take up space in the everyday editor.

**Card-level:**

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `letterbox_color` | string | `#000000` | Fills any gap left by `contain` or a partially-resolved `intelligent` result |
| `maxZoom` | number | `0.12` | `intelligent` fit mode only — maximum uniform zoom/crop allowed, as a fraction (`0.12` = 12%) |
| `maxStretch` | number | `0.08` | `intelligent` fit mode only — maximum non-uniform stretch allowed, as a fraction |
| `maxGap` | number | `0` | `intelligent` fit mode only — largest tolerable leftover letterbox fraction before falling back to plain `contain` entirely |
| `hold_action` | action | — | Fires on a long press anywhere on the card |
| `double_tap_action` | action | — | Fires on a double-tap anywhere on the card |
| `swipe_up_action` | action | — | Fires on an upward swipe |
| `swipe_down_action` | action | — | Fires on a downward swipe |

**Item-level:**

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `text_shadow_layers` | number | `2` | Stacks the same shadow this many times — darkens it without changing the blur radius or shape, since stacking layers compounds differently than just raising alpha once |

---

## 👆 Gestures

| Gesture | Behavior | Configurable? |
| :--- | :--- | :--- |
| Tap | Pause / resume, with an on-screen indicator | No — hardcoded |
| Swipe left / right | Next / previous photo | No — hardcoded |
| Hold | Runs `hold_action` | Yes |
| Double-tap | Runs `double_tap_action` | Yes |
| Swipe up | Runs `swipe_up_action` | Yes |
| Swipe down | Runs `swipe_down_action` | Yes |

The four configurable gestures accept any standard Home Assistant action (`navigate`, `call-service` / `perform-action`, `more-info`, `fire-dom-event`, `url`, `toggle`, `none`, etc.) — exactly the same action system used by built-in HA cards. A common use is toggling kiosk-mode dashboards on or off:

```yaml
swipe_up_action:
  action: fire-dom-event
  navigate: https://your-ha-url/your-dashboard
swipe_down_action:
  action: fire-dom-event
  navigate: https://your-ha-url/your-dashboard?disable_km
```

---

## 📄 Examples

### Clock and date overlay, intelligent fit, kiosk-mode swipes

```yaml
type: custom:chrono-slideshow-card
entity: sensor.slideshow_living_room
sort_by: random
display_time: 8
transition: random
transition_duration: 1.5
fit_mode: intelligent
swipe_up_action:
  action: fire-dom-event
  navigate: https://your-ha-url/dashboard-tablet/slideshow
swipe_down_action:
  action: fire-dom-event
  navigate: https://your-ha-url/dashboard-tablet/slideshow?disable_km
zone_alignment:
  bottom-left: center
items:
  - horizontal: left
    vertical: bottom
    template: "{{ now().strftime('%H:%M') }}"
    font_size: 3.5
    font_weight: 300
    text_shadow_color: "#00000088"
    text_shadow_blur: 8
  - horizontal: left
    vertical: bottom
    template: "{{ now().strftime('%A, %d %B %Y') }}"
    font_size: 0.9
    font_weight: 300
    text_shadow_color: "#000000"
    text_shadow_blur: 8
  - horizontal: right
    vertical: bottom
    template: "{{ fileName }}"
    font_color: "#FFFFFF"
    font_size: 0.9
    text_shadow_color: "#000000"
    text_shadow_blur: 1
    text_shadow_offset_x: 1
    text_shadow_offset_y: 1
```

### Minimal — just the photos

```yaml
type: custom:chrono-slideshow-card
entity: sensor.slideshow_living_room
```

---

## ⚖️ License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

This project is licensed under the AGPL-3.0. You are free to use, modify, and distribute this software, provided that any modifications or derivative works that are made available — including over a network — are also distributed under the same license.

Full license text: [https://www.gnu.org/licenses/agpl-3.0](https://www.gnu.org/licenses/agpl-3.0)

Copyright © 2026 Rob Vandenberg. All rights reserved.

---

## ☕ Support

If you find this project useful and wish to support its continued development, please consider a contribution.

[![](https://img.shields.io/badge/Buy_Me_A_Coffee-Support-yellow.svg?style=for-the-badge)](https://www.buymeacoffee.com/)
