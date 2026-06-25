import { LitElement, html, css } from 'https://unpkg.com/lit@2.0.0/index.js?module';
import { keyed }                 from 'https://unpkg.com/lit@2.0.0/directives/keyed.js?module';
import { styleMap }              from 'https://unpkg.com/lit@2.0.0/directives/style-map.js?module';
import { storage }               from 'https://unpkg.com/home-assistant-frontend@dev/src/common/decorators/storage.js?module';

// chrono-panel-card.js
// Bare-minimum container card for panel views.
// - Fills 100% width/height of its parent (the panel).
// - Accepts multiple child cards via `cards:`.
// - Each child card may carry its own `visibility:` block, using the
//   same simple { condition: state, entity, state } shape as native HA.
// - Visibility is evaluated by this card itself (not by HA's nested-card
//   visibility propagation, which is unreliable for nested cards).
// - A hidden child gets display:none and, because children are absolutely
//   positioned over a single relatively-positioned wrapper, takes up
//   exactly zero layout space. No track/row reservation, ever.


// ─── Version ──────────────────────────────────────────────────────────────────
const CARD_VERSION = '2.0.36';

// ─── Version History ──────────────────────────────────────────────────────────
// v2.0.36: Full rewrite onto LitElement (was a hand-built HTMLElement-based
//          card/editor). Editor's persistent-DOM-skeleton machinery
//          (_buildSkeleton/_updateTabStrip/_updateCardToolbar/_updateInnerTabs/
//          _mountSelectedCardContent/_mountPicker) replaced by a single
//          render() using the keyed() directive, which gives the same
//          "don't tear down a live component unless its key changes"
//          guarantee Lit-natively, without manual DOM surgery. Child card's
//          own editor is now mounted via HA's real hui-card-element-editor
//          component directly, instead of our own hand-rolled
//          loadCardHelpers()/getConfigElement() mounting chain - it handles
//          that same lazy-load/fallback logic internally. Fixed the Copy/Cut
//          clipboard bug: previous versions wrote directly via
//          sessionStorage.setItem(), which never reached hui-card-picker's
//          own in-memory cache (populated once via its @storage-decorated
//          _clipboard property and never re-read from sessionStorage after
//          that). Now writes through the same storage() decorator pattern
//          hui-card-picker and HA's own hui-stack-card-editor use, so the
//          write lands in the same singleton cache the picker reads from.
//          All visibility-condition-editor visuals (banner colors, icons,
//          badges, chevron direction, add-condition button styling) carried
//          over unchanged from v1.1.35 - all were measured/verified against
//          real HA components and remain correct. All bug fixes from the
//          1.0.x/1.1.x history (section 7 of the transfer doc) preserved.
// v1.1.35: Fixed the actual scroll bug - it was the dropdown menu itself (state/numeric_state choices) opening off-screen, not the new condition card. Scroll now triggers on opening the dropdown, using the same shadow-boundary-crossing logic as before. The earlier two attempts (1.1.33, 1.1.34) were both scrolling the wrong element at the wrong moment.
// v1.1.34: Fixed the scroll-into-view fix from 1.1.33, which never actually moved the scrollbar - the real scroll container (HA's .element-editor.ha-scrollbar) sits outside our own shadow boundary (we're inside hui-card-element-editor's shadow root), so plain scrollIntoView()/closest() couldn't reach it. Now walks out via getRootNode().host, finds the real container, and scrolls it directly.
// v1.1.33: Newly added condition card scrolls into view automatically (only on add, not on every edit)
// v1.1.32: "+" tab button is now a real 24x24 SVG icon instead of plain text; condition badge moved 3px right and 3px up; orange (failing) ring color changed to #de6502
// v1.1.31: Used exact colors/sizes measured directly against the real HA component - banner backgrounds (#202b21 visible / #372c18 hidden), eye icon colors (#429f47 visible / #ffa500 hidden), entity-state icon color (#8d8d8d) and size (24x24), badge size (10x10), orange ring border width (2px)
// v1.1.30: Replaced emoji eye icon with real HA open-eye/crossed-eye SVG paths (sized, colored correctly via currentColor); replaced invented "Entity state" icon with the real branching-node path; failing-condition badge is now a hollow ring outline instead of a solid dot; fixed chevron rotation direction (expanded = up, collapsed = down)
// v1.1.29: Fixed "+ Add condition" button colors using exact values measured directly from the real button with Photoshop's color picker (#002e3e resting, #004156 hover, #37c8fd text) instead of CSS variables that weren't resolving to the expected result
// v1.1.28: Rebuilt the editor's rendering mechanism - persistent DOM skeleton built once, each section (tab strip, card toolbar, inner tabs, content area) updates only when it actually changes, instead of wiping and rebuilding the entire editor on every state change. Fixes a real crash (hui-card-picker thrown from inside its own update lifecycle when torn down mid-update during cut) and removes the underlying cause, not just that one occurrence. All existing behavior (tabs, move/copy/cut/delete, Config/Visibility tabs, child editor mounting, YAML toggle, visibility conditions, add-card picker) is unchanged.
// v1.0.27: Fixed Copy/Cut to actually do something useful - now writes to the same sessionStorage key (dashboardCardClipboard) hui-card-picker itself already reads, so the real "paste from clipboard" tile appears automatically in the existing add-card screen; previously copy wrote to an unused in-memory field nothing ever read back
// v1.0.26: Fixed add-condition button colors to use the correct "filled" appearance variables (var(--wa-color-fill-normal) / var(--ha-color-fill-primary-normal-hover)) instead of the "accent/loud" ones, found via ha-button's real source; fixed editor jumping back to Config tab on every condition edit (setConfig now only resets tab/selection state on true first load, not on re-calls echoing our own config-changed)
// v1.0.25: Fixed crash in the Visibility tab - _evaluateVisibility called this._evaluateCondition, which broke when borrowed by the editor via .call() since the editor has no copy of that method; now calls it as a plain function reference instead of through this
// v1.0.24: Fixed "+ Add condition" button to use HA's exact real CSS variables for color, hover color, height, padding, and pill shape, found via devtools on a real ha-button
// v1.0.23: Fixed chevron to rotate up/down (was rotating sideways); switched all hardcoded blue colors to HA's real --primary-color variable so they always match HA's actual theme color exactly
// v1.0.22: Removed the empty-cards rejection entirely (matches vertical-stack's own behavior: zero cards is a normal starting state, not an error) - no more fake placeholder card needed; also: one shared close-any-open-popup mechanism instead of each menu/dropdown managing its own; dropdown rows stop click propagation; condition evaluation array no longer rebuilt every render
// v1.0.21: Code review fixes - added state_not support to the one real evaluator and reused it from the editor (removed duplicate logic that could drift); editor no longer assumes visible when hass is missing; dropdown/menu close on outside click; getStubConfig now returns a valid non-empty config
// v1.0.20: Fixed banner subtitle to correctly distinguish "no conditions set" from "conditions set and currently passing"
// v1.0.19: Fixed chevron icon size to match HA's actual size (was using the right shape but the old, too-small dimensions)
// v1.0.18: Fixed visibility banner to actually evaluate conditions against real entity state instead of only checking if the list is empty
// v1.0.17: Use HA's real expansion-panel chevron icon for the condition card collapse arrow
// v1.0.16: Use HA's real ha-card-condition-state / ha-card-condition-numeric_state components for condition fields instead of hand-built inputs
// v1.0.15: Restyled visibility condition editor to match HA's native look (collapsible cards, icon+dot badge, three-dot menu, pill add button with dropdown)
// v1.0.14: Fixed code/visual toggle icon to swap glyph (braces/list) instead of drawing a border; use native focus outline
// v1.0.13: Added {} GUI/YAML toggle for the selected child's Config tab, using ha-yaml-editor
// v1.0.12: Added inner Config/Visibility tabs per child (HA-style); restyled card-selector tabs and toolbar icons to match HA's look
// v1.0.11: Guarded customElements.define calls against duplicate-registration crash on duplicate resource load
// v1.0.10: Added per-child visibility condition editor (state/numeric_state, add/remove)
// v1.0.9: Added error handling to child editor load chain so a failure (e.g. invalid existing config) shows a fallback message instead of a blank editor area
// v1.0.8: Fixed crash when a child card's getConfigElement() returns sync instead of a Promise
// v1.0.7: Fixed console banner text (SLIDESHOW -> PANEL)
// v1.0.6: Added visual editor (ChronoPanelCardEditor) - add/remove/reorder/copy/cut child cards
// v1.0.5: Added numeric_state condition support to _evaluateVisibility()
// v1.0.4: Initial release

console.info(
  `%c CHRONO-%cPANEL%c-CARD %c v${CARD_VERSION} `,
  'background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 0 2px 4px; border-radius: 3px 0 0 3px;',
  'background-color: #101010; color: #4676d3; font-weight: bold; padding: 2px 0;',
  'background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 4px 2px 0;',
  'background-color: #1E1E1E; color: #FFFFFF; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);

// ─── Card ───────────────────────────────────────────────────────────────────
class ChronoPanelCard extends LitElement {
  static properties = {
    _config: { attribute: false },
    _hass:   { attribute: false },
  };

  static async getConfigElement() {
    return document.createElement("chrono-panel-card-editor");
  }

  static getStubConfig() {
    return { cards: [] };
  }

  setConfig(config) {
    if (!config || !Array.isArray(config.cards)) {
      throw new Error("chrono-panel-card: 'cards' must be an array");
    }
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
  }

  get hass() {
    return this._hass;
  }

  // Calls the plain function reference, not this._evaluateCondition, so this
  // still works correctly when borrowed via .call() from an object that
  // isn't a ChronoPanelCard instance (see the editor's _evaluateConditions /
  // _evaluateOneCondition).
  _evaluateVisibility(visibility, hass) {
    if (!visibility) return true; // no visibility block => always show
    return visibility.every((cond) => ChronoPanelCard.prototype._evaluateCondition(cond, hass));
  }

  _evaluateCondition(cond, hass) {
    if (cond.condition === "state") {
      const entityState = hass.states[cond.entity]?.state;
      if (cond.state !== undefined) return entityState === cond.state;
      if (cond.state_not !== undefined) return entityState !== cond.state_not;
      return true;
    }

    if (cond.condition === "numeric_state") {
      const value = parseFloat(hass.states[cond.entity]?.state);
      if (isNaN(value)) return false;
      if (cond.above !== undefined && !(value > cond.above)) return false;
      if (cond.below !== undefined && !(value < cond.below)) return false;
      return true;
    }

    return true; // unknown types: ignore, don't block
  }

  getCardSize() {
    return 1;
  }

  // Required by HA so the card can report a size hint in sections views.
  getLayoutOptions() {
    return {
      grid_rows: 1,
      grid_columns: 1,
    };
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }
    hui-card {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  `;

  render() {
    if (!this._config) return html``;

    return html`
      <div class="wrapper">
        ${(this._config.cards ?? []).map((cardConfig) => {
          const visibility = cardConfig.visibility || null;
          const isVisible = this._hass
            ? this._evaluateVisibility(visibility, this._hass)
            : false;
          return html`
            <hui-card
              .hass=${this._hass}
              .config=${cardConfig}
              style=${styleMap({ display: isVisible ? "block" : "none" })}
            ></hui-card>
          `;
        })}
      </div>
    `;
  }
}

if (!customElements.get("chrono-panel-card")) {
  customElements.define("chrono-panel-card", ChronoPanelCard);
}

// ─── Editor ─────────────────────────────────────────────────────────────────
// Reimplementation of HA's native stack-card editor UX (tabs + per-card
// toolbar: move/copy/cut/delete, add via hui-card-picker). Built from
// scratch against chrono-panel-card's own `cards:` config shape - no
// borrowing/impersonation of hui-stack-card-editor itself.
class ChronoPanelCardEditor extends LitElement {
  static properties = {
    _config:          { attribute: false },
    _selected:        { state: true },
    _guiMode:         { state: true },
    _innerTab:        { state: true },
    _collapsed:       { state: true },
    _addDropdownOpen: { state: true },
    _openMenuIndex:   { state: true },
    _hass:            { attribute: false },
  };

  // _clipboard is wired up after the class body (see storage(...) call
  // below) rather than via @storage(...) decorator syntax, since this file
  // loads as a plain ES module with no compiler transform available to
  // process decorators - the decorator function is called directly
  // instead, which is exactly what decorator syntax compiles down to
  // anyway. Writing through this property (this._clipboard = ...) goes
  // through the same storage() mechanism hui-card-picker and HA's own
  // hui-stack-card-editor use for the same key - it updates the shared
  // in-memory cache those components read from, not just the raw
  // sessionStorage entry. A direct sessionStorage.setItem() call (the
  // previous, buggy approach) never reaches that cache, so a freshly
  // opened hui-card-picker would keep showing whatever was cached the
  // first time the key was ever read on this page load - see v1.1.x
  // history. This is the fix for that bug.

  constructor() {
    super();
    this._selected = 0;
    this._guiMode = true;
    this._innerTab = "config";
    this._collapsed = {};
    this._addDropdownOpen = false;
    this._openMenuIndex = null;
    this._keys = new Map();
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this._handleOutsideClick);
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._handleOutsideClick);
    super.disconnectedCallback();
  }

  // Closes the add-condition dropdown and the condition-card 3-dot menu on
  // any click outside them. The toggle handlers for both already call
  // ev.stopPropagation(), so a click that actually opened/toggled one of
  // them never reaches this listener for that same click.
  _handleOutsideClick() {
    if (this._addDropdownOpen) this._addDropdownOpen = false;
    if (this._openMenuIndex !== null) this._openMenuIndex = null;
  }

  setConfig(config) {
    this._config = config || { cards: [] };
  }

  set hass(hass) {
    this._hass = hass;
  }

  get hass() {
    return this._hass;
  }

  set lovelace(lovelace) {
    this._lovelace = lovelace;
  }

  get lovelace() {
    return this._lovelace;
  }

  _fireConfigChanged() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  // Stable per-(index,length) key so hui-card-element-editor isn't torn
  // down and recreated on every unrelated render - only when the selected
  // index or card count actually changes shape, same pattern as HA's own
  // hui-stack-card-editor._getKey().
  _getKey(index, length) {
    const key = `${index}-${length}`;
    if (!this._keys.has(key)) {
      this._keys.set(key, Math.random().toString());
    }
    return this._keys.get(key);
  }

  _selectTab(i) {
    this._selected = i;
    this._guiMode = true;
    this._innerTab = "config";
  }

  _addCard() {
    this._selected = this._config.cards.length;
  }

  _toggleGuiMode() {
    this._guiMode = !this._guiMode;
  }

  _setInnerTab(tabId) {
    this._innerTab = tabId;
  }

  _handleChildConfigChanged(ev) {
    ev.stopPropagation();
    const updatedCards = [...this._config.cards];
    const visibility = updatedCards[this._selected].visibility;
    updatedCards[this._selected] = { ...ev.detail.config, visibility };
    this._config = { ...this._config, cards: updatedCards };
    this._fireConfigChanged();
  }

  _handleYamlChanged(ev) {
    ev.stopPropagation();
    if (!ev.detail.isValid) return; // don't commit invalid YAML
    const updatedCards = [...this._config.cards];
    const visibility = updatedCards[this._selected].visibility;
    updatedCards[this._selected] = { ...ev.detail.value, visibility };
    this._config = { ...this._config, cards: updatedCards };
    this._fireConfigChanged();
  }

  _handleCardPicked(ev) {
    ev.stopPropagation();
    const updatedCards = [...this._config.cards, ev.detail.config];
    this._config = { ...this._config, cards: updatedCards };
    this._keys.clear();
    this._fireConfigChanged();
  }

  _setCondition(index, newCondition) {
    const cardConfig = this._config.cards[this._selected];
    const conditions = [...(cardConfig.visibility || [])];
    conditions[index] = newCondition;
    this._updateVisibility(cardConfig, conditions);
  }

  _removeCondition(index) {
    const cardConfig = this._config.cards[this._selected];
    const conditions = [...(cardConfig.visibility || [])];
    conditions.splice(index, 1);
    this._updateVisibility(cardConfig, conditions);
  }

  _updateVisibility(cardConfig, conditions) {
    const updatedCards = [...this._config.cards];
    updatedCards[this._selected] = { ...cardConfig, visibility: conditions };
    this._config = { ...this._config, cards: updatedCards };
    this._fireConfigChanged();
  }

  _move(delta) {
    const cards = [...this._config.cards];
    const [card] = cards.splice(this._selected, 1);
    cards.splice(this._selected + delta, 0, card);
    this._config = { ...this._config, cards };
    this._selected += delta;
    this._keys.clear();
    this._fireConfigChanged();
  }

  // Writes through the storage() decorator's own setter, not raw
  // sessionStorage - see the _clipboard property declaration above.
  _copy() {
    this._clipboard = JSON.parse(JSON.stringify(this._config.cards[this._selected]));
  }

  _cut() {
    this._copy();
    this._delete();
  }

  _delete() {
    const cards = [...this._config.cards];
    cards.splice(this._selected, 1);
    this._config = { ...this._config, cards };
    this._selected = Math.max(0, this._selected - 1);
    this._keys.clear();
    this._fireConfigChanged();
  }

  // Reuse the exact same logic the real running card uses, so the editor's
  // preview can never disagree with actual runtime behavior.
  _evaluateConditions(conditions) {
    if (!this._hass) return false; // no data yet: don't claim visible without checking
    return ChronoPanelCard.prototype._evaluateVisibility.call(this, conditions, this._hass);
  }

  _evaluateOneCondition(cond) {
    if (!this._hass) return false; // no data yet: don't claim visible without checking
    return ChronoPanelCard.prototype._evaluateCondition.call(this, cond, this._hass);
  }

  static styles = css`
    :host {
      display: block;
    }
    .tab-strip {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
      border-bottom: 1px solid #444;
    }
    .tab-strip button {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #e1e1e1;
      font-weight: 400;
      padding: 6px 10px;
      cursor: pointer;
    }
    .tab-strip button.active {
      border-bottom: 2px solid var(--primary-color);
      color: var(--primary-color);
      font-weight: 600;
    }
    .tab-strip .add-btn {
      display: flex;
      align-items: center;
      margin-left: auto;
    }
    .card-toolbar {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      margin-bottom: 8px;
    }
    .card-toolbar .right {
      display: flex;
      gap: 4px;
    }
    .icon-btn {
      background: none;
      border: none;
      border-radius: 50%;
      color: #e1e1e1;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      outline: none;
    }
    .icon-btn:disabled {
      color: #555;
      cursor: default;
    }
    .icon-btn:focus {
      outline: 2px solid var(--primary-color);
    }
    .inner-tabs {
      display: flex;
      border-bottom: 1px solid #444;
      margin-bottom: 12px;
    }
    .inner-tabs button {
      flex: 1;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #e1e1e1;
      font-weight: 500;
      padding: 10px 0;
      cursor: pointer;
    }
    .inner-tabs button.active {
      border-bottom: 2px solid var(--primary-color);
      color: var(--primary-color);
    }
    .status-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      border-radius: 8px;
    }
    .status-banner .line1 {
      font-weight: 600;
      color: #fff;
    }
    .status-banner .line2 {
      font-size: 12px;
      color: #bbb;
    }
    .condition-card {
      border: 1px solid #444;
      border-radius: 8px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .condition-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      cursor: pointer;
    }
    .condition-header .icon-wrap {
      position: relative;
      display: inline-flex;
      color: #8d8d8d;
    }
    .condition-header .badge {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      box-sizing: border-box;
    }
    .condition-header .badge.pass {
      background: #4caf50;
    }
    .condition-header .badge.fail {
      background: none;
      border: 2px solid #de6502;
    }
    .condition-header .label {
      flex: 1;
      font-weight: 600;
    }
    .condition-body {
      padding: 0 12px 12px 12px;
    }
    .menu-wrap {
      position: relative;
    }
    .menu-btn {
      background: none;
      border: none;
      color: #e1e1e1;
      cursor: pointer;
    }
    .menu {
      position: absolute;
      right: 0;
      top: 100%;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 10;
      min-width: 120px;
    }
    .menu-row {
      padding: 10px 14px;
      cursor: pointer;
      color: #e0e0e0;
    }
    .menu-row:hover {
      background: #2a2a2a;
    }
    .add-wrap {
      position: relative;
      margin-top: 8px;
    }
    .add-btn {
      background: #002e3e;
      color: #37c8fd;
      border: none;
      border-radius: var(--ha-border-radius-pill);
      height: 40px;
      padding: 0 var(--ha-space-4);
      font-weight: 600;
      cursor: pointer;
    }
    .add-btn:hover {
      background: #004156;
    }
    .add-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 10;
      min-width: 200px;
    }
    .add-dropdown .row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      color: #e0e0e0;
    }
    .add-dropdown .row:hover {
      background: #2a2a2a;
    }
  `;

  // ── Icon paths (kept identical to v1.1.35 - all verified against the
  //    real HA components, see the transfer document). ──────────────────
  static ICONS = {
    prev: "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",
    next: "M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z",
    copy: "M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",
    cut: "M9.64,7.64C9.88,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.88 7.64,9.64L10,12L7.64,14.36C7.14,14.12 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.88,16.86 9.64,16.36L12,14L19,21H22V20L9.64,7.64M6,8A2,2 0 0,1 4,6A2,2 0 0,1 6,4A2,2 0 0,1 8,6A2,2 0 0,1 6,8M6,20A2,2 0 0,1 4,18A2,2 0 0,1 6,16A2,2 0 0,1 8,18A2,2 0 0,1 6,20M19,3L12,10L14,12L22,4V3H19Z",
    delete: "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",
    code: "M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z",
    list: "M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z",
    add: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
    chevron: "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
    menu: "M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z",
    eyeOpen: "M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z",
    eyeOff: "M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z",
    stateType: "M6.27 17.05C6.72 17.58 7 18.25 7 19C7 20.66 5.66 22 4 22S1 20.66 1 19 2.34 16 4 16C4.18 16 4.36 16 4.53 16.05L7.6 10.69L5.86 9.7L9.95 8.58L11.07 12.67L9.33 11.68L6.27 17.05M20 16C18.7 16 17.6 16.84 17.18 18H11V16L8 19L11 22V20H17.18C17.6 21.16 18.7 22 20 22C21.66 22 23 20.66 23 19S21.66 16 20 16M12 8C12.18 8 12.36 8 12.53 7.95L15.6 13.31L13.86 14.3L17.95 15.42L19.07 11.33L17.33 12.32L14.27 6.95C14.72 6.42 15 5.75 15 5C15 3.34 13.66 2 12 2S9 3.34 9 5 10.34 8 12 8Z",
    numericStateType: "M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z",
  };

  static TYPE_INFO = {
    state: { label: "Entity state", icon: ChronoPanelCardEditor.ICONS.stateType },
    numeric_state: { label: "Entity numeric state", icon: ChronoPanelCardEditor.ICONS.numericStateType },
  };

  _icon(path, size = 24) {
    return html`<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="${path}"></path></svg>`;
  }

  render() {
    if (!this._config) return html``;

    const cards = this._config.cards;
    const numCards = cards.length;
    const showingCard = this._selected < numCards;

    return html`
      <div class="tab-strip">
        ${cards.map((_card, i) => html`
          <button
            class=${i === this._selected ? "active" : ""}
            @click=${() => this._selectTab(i)}
          >${i + 1}</button>
        `)}
        <button class="add-btn" @click=${() => this._addCard()}>
          ${this._icon(ChronoPanelCardEditor.ICONS.add)}
        </button>
      </div>

      ${showingCard
        ? this._renderCardEditor(cards, numCards)
        : html`
            <hui-card-picker
              .hass=${this._hass}
              .lovelace=${this._lovelace}
              @config-changed=${(ev) => this._handleCardPicked(ev)}
            ></hui-card-picker>
          `}
    `;
  }

  _renderCardEditor(cards, numCards) {
    const cardConfig = cards[this._selected];
    const isGuiMode = this._guiMode;

    return html`
      <div class="card-toolbar">
        <button class="icon-btn" @click=${() => this._toggleGuiMode()}>
          ${this._icon(isGuiMode ? ChronoPanelCardEditor.ICONS.code : ChronoPanelCardEditor.ICONS.list, 20)}
        </button>
        <div class="right">
          <button class="icon-btn" ?disabled=${this._selected === 0} @click=${() => this._move(-1)}>
            ${this._icon(ChronoPanelCardEditor.ICONS.prev, 20)}
          </button>
          <button class="icon-btn" ?disabled=${this._selected === numCards - 1} @click=${() => this._move(1)}>
            ${this._icon(ChronoPanelCardEditor.ICONS.next, 20)}
          </button>
          <button class="icon-btn" @click=${() => this._copy()}>
            ${this._icon(ChronoPanelCardEditor.ICONS.copy, 20)}
          </button>
          <button class="icon-btn" @click=${() => this._cut()}>
            ${this._icon(ChronoPanelCardEditor.ICONS.cut, 20)}
          </button>
          <button class="icon-btn" @click=${() => this._delete()}>
            ${this._icon(ChronoPanelCardEditor.ICONS.delete, 20)}
          </button>
        </div>
      </div>

      <div class="inner-tabs">
        ${["config", "visibility"].map((tabId) => html`
          <button
            class=${this._innerTab === tabId ? "active" : ""}
            @click=${() => this._setInnerTab(tabId)}
          >${tabId === "config" ? "Config" : "Visibility"}</button>
        `)}
      </div>

      ${keyed(this._getKey(this._selected, numCards), this._renderContent(cardConfig))}
    `;
  }

  _renderContent(cardConfig) {
    if (this._innerTab === "config" && this._guiMode) {
      // hui-card-element-editor handles lazy-loading the child card type,
      // calling its own getConfigElement(), and falling back to a message
      // if that card type has no visual editor or its setConfig() throws -
      // all internally, the same way HA's own hui-stack-card-editor uses it.
      return html`
        <hui-card-element-editor
          .hass=${this._hass}
          .lovelace=${this._lovelace}
          .value=${cardConfig}
          @config-changed=${(ev) => this._handleChildConfigChanged(ev)}
        ></hui-card-element-editor>
      `;
    }

    if (this._innerTab === "config" && !this._guiMode) {
      return html`
        <ha-yaml-editor
          .hass=${this._hass}
          .autoUpdate=${true}
          .value=${cardConfig}
          @value-changed=${(ev) => this._handleYamlChanged(ev)}
        ></ha-yaml-editor>
      `;
    }

    return this._renderVisibilityEditor(cardConfig);
  }

  _renderVisibilityEditor(cardConfig) {
    const conditions = cardConfig.visibility || [];
    const visible = conditions.length === 0 || this._evaluateConditions(conditions);

    return html`
      <div
        class="status-banner"
        style=${styleMap({ background: visible ? "#202b21" : "#372c18" })}
      >
        <span style=${styleMap({ color: visible ? "#429f47" : "#ffa500", display: "inline-flex" })}>
          ${this._icon(visible ? ChronoPanelCardEditor.ICONS.eyeOpen : ChronoPanelCardEditor.ICONS.eyeOff)}
        </span>
        <div>
          <div class="line1">${visible ? "Current visibility: Visible" : "Current visibility: Hidden"}</div>
          <div class="line2">
            ${conditions.length === 0
              ? "No visibility conditions are set"
              : (visible ? "All visibility conditions are met" : "Not all visibility conditions are met")}
          </div>
        </div>
      </div>

      ${conditions.map((cond, i) => this._renderConditionCard(cond, i))}

      <div class="add-wrap">
        <button class="add-btn" @click=${(ev) => this._toggleAddDropdown(ev)}>
          ${this._icon(ChronoPanelCardEditor.ICONS.add, 16)} Add condition
        </button>
        ${this._addDropdownOpen
          ? html`
              <div class="add-dropdown">
                ${Object.entries(ChronoPanelCardEditor.TYPE_INFO).map(([id, info]) => html`
                  <div class="row" @click=${() => this._addCondition(id)}>
                    ${this._icon(info.icon, 20)}<span>${info.label}</span>
                  </div>
                `)}
              </div>
            `
          : ""}
      </div>
    `;
  }

  _toggleAddDropdown(ev) {
    ev.stopPropagation();
    this._addDropdownOpen = !this._addDropdownOpen;
  }

  _addCondition(typeId) {
    const cardConfig = this._config.cards[this._selected];
    const conditions = cardConfig.visibility || [];
    const newCond = typeId === "state"
      ? customElements.get("ha-card-condition-state").defaultConfig
      : customElements.get("ha-card-condition-numeric_state").defaultConfig;
    this._addDropdownOpen = false;
    this._updateVisibility(cardConfig, [...conditions, { ...newCond }]);
  }

  _renderConditionCard(cond, index) {
    const info = ChronoPanelCardEditor.TYPE_INFO[cond.condition] || { label: cond.condition, icon: "" };
    const conditionPasses = this._evaluateOneCondition(cond);
    const collapsed = !!this._collapsed[index];

    return html`
      <div class="condition-card">
        <div class="condition-header" @click=${() => this._toggleCollapsed(index, collapsed)}>
          <span style="transform:rotate(${collapsed ? "0deg" : "180deg"});transition:transform .15s;display:inline-flex;">
            ${this._icon(ChronoPanelCardEditor.ICONS.chevron)}
          </span>
          <span class="icon-wrap">
            ${this._icon(info.icon)}
            <span class="badge ${conditionPasses ? "pass" : "fail"}"></span>
          </span>
          <span class="label">${info.label}</span>
          <span class="menu-wrap">
            <button class="menu-btn" @click=${(ev) => this._toggleConditionMenu(ev, index)}>
              ${this._icon(ChronoPanelCardEditor.ICONS.menu, 18)}
            </button>
            ${this._openMenuIndex === index
              ? html`
                  <div class="menu">
                    <div class="menu-row" @click=${(ev) => this._deleteConditionFromMenu(ev, index)}>Delete</div>
                  </div>
                `
              : ""}
          </span>
        </div>
        ${!collapsed ? html`<div class="condition-body">${this._renderConditionField(cond, index)}</div>` : ""}
      </div>
    `;
  }

  // ha-card-condition-state / ha-card-condition-numeric_state are real HA
  // components. Lit binds .hass and .condition directly as properties (the
  // leading dot), and listens for the value-changed event they emit with
  // the full new condition object in event.detail.value - the same
  // mounting contract HA's own condition editors use.
  _renderConditionField(cond, index) {
    if (cond.condition === "state") {
      return html`
        <ha-card-condition-state
          .hass=${this._hass}
          .condition=${cond}
          @value-changed=${(ev) => { ev.stopPropagation(); this._setCondition(index, ev.detail.value); }}
        ></ha-card-condition-state>
      `;
    }
    return html`
      <ha-card-condition-numeric_state
        .hass=${this._hass}
        .condition=${cond}
        @value-changed=${(ev) => { ev.stopPropagation(); this._setCondition(index, ev.detail.value); }}
      ></ha-card-condition-numeric_state>
    `;
  }

  _toggleCollapsed(index, collapsed) {
    this._collapsed = { ...this._collapsed, [index]: !collapsed };
  }

  _toggleConditionMenu(ev, index) {
    ev.stopPropagation();
    this._openMenuIndex = this._openMenuIndex === index ? null : index;
  }

  _deleteConditionFromMenu(ev, index) {
    ev.stopPropagation();
    this._openMenuIndex = null;
    this._removeCondition(index);
  }
}

// Applies the storage() decorator function directly to the prototype,
// since this file loads as a plain ES module with no compiler transform
// available to process @decorator syntax. This is functionally identical
// to `@storage({...}) _clipboard;` on the class body - decorator syntax
// compiles down to exactly this kind of call.
storage({
  key: "dashboardCardClipboard",
  state: false,
  subscribe: false,
  storage: "sessionStorage",
})(ChronoPanelCardEditor.prototype, "_clipboard");

if (!customElements.get("chrono-panel-card-editor")) {
  customElements.define("chrono-panel-card-editor", ChronoPanelCardEditor);
}

// Register with HA's card picker so it shows up in the visual editor list.
window.customCards = window.customCards || [];
window.customCards.push({
  type: "chrono-panel-card",
  name: "Chrono Panel Card",
  description:
    "Fills its container 100% and shows whichever child card(s) currently match their visibility condition, with zero reserved space for hidden ones.",
});
