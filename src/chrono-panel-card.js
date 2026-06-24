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
const CARD_VERSION = '1.1.28';

// ─── Version History ──────────────────────────────────────────────────────────
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

class ChronoPanelCard extends HTMLElement {
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
    this._cardEntries = [];

    // Wipe and rebuild on every setConfig (editor live-preview safe).
    this.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    this._wrapper = wrapper;
    this.appendChild(wrapper);

    // HA's documented mechanism for custom cards to create other cards
    // correctly, instead of guessing internal tag names and racing
    // customElements registration.
    window.loadCardHelpers().then((helpers) => {
      config.cards.forEach((cardConfig) => {
        const entry = {
          el: null,
          visibility: cardConfig.visibility || null,
          ready: false,
        };
        this._cardEntries.push(entry);

        // card-mod v4 patches at the hui-card level and expects each
        // card it styles to be wrapped in a <hui-card>. Creating the
        // child card directly (bypassing hui-card) is what caused
        // card_mod-equipped children to misbehave. Use a real
        // hui-card wrapper, exactly like vertical-stack/grid do.
        const huiCard = document.createElement("hui-card");
        huiCard.hass = this._hass;
        huiCard.config = cardConfig;

        huiCard.style.position = "absolute";
        huiCard.style.top = "0";
        huiCard.style.left = "0";
        huiCard.style.width = "100%";
        huiCard.style.height = "100%";
        huiCard.style.display = "none"; // until first hass tick decides

        entry.el = huiCard;
        entry.ready = true;
        wrapper.appendChild(huiCard);

        if (this._hass) {
          const isVisible = this._evaluateVisibility(entry.visibility, this._hass);
          huiCard.style.display = isVisible ? "block" : "none";
        }
      });
    });
  }

  set hass(hass) {
    this._hass = hass;

    this._cardEntries.forEach((entry) => {
      if (!entry.ready) return;

      entry.el.hass = hass;
      const isVisible = this._evaluateVisibility(entry.visibility, hass);
      entry.el.style.display = isVisible ? "block" : "none";
    });
  }

  _evaluateVisibility(visibility, hass) {
    if (!visibility) return true; // no visibility block => always show

    // Support the same array-of-conditions shape HA uses natively.
    // Only "state" and "numeric_state" condition types are implemented,
    // on purpose. Other types: ignore, don't block (unknown types pass).
    // Calls the plain function reference, not this._evaluateCondition,
    // so this still works correctly when borrowed via .call() from an
    // object that isn't a ChronoPanelCard instance (see the editor's
    // _evaluateConditions / _evaluateOneCondition).
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
}

// ─── Editor ─────────────────────────────────────────────────────────────────
// Reimplementation of HA's native stack-card editor UX (tabs + per-card
// toolbar: move/copy/cut/delete, add via hui-card-picker). Built from
// scratch against chrono-panel-card's own `cards:` config shape - no
// borrowing/impersonation of hui-stack-card-editor itself.
class ChronoPanelCardEditor extends HTMLElement {
  setConfig(config) {
    const isFirstLoad = this._config === undefined;
    this._config = config || { cards: [] };
    if (isFirstLoad) {
      this._selected = 0;
      this._guiMode = true;
      this._innerTab = "config";
      this._collapsedConditions = {};
      this._buildSkeleton();
    }
    this._updateTabStrip();
    this._updateContent();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._childEditorEl) this._childEditorEl.hass = hass;
    if (this._pickerEl) this._pickerEl.hass = hass;
  }

  set lovelace(lovelace) {
    this._lovelace = lovelace;
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

  // Built exactly once, on first setConfig. Never wiped afterward. Every
  // later state change only updates the specific pieces below that are
  // actually affected, instead of destroying and recreating everything -
  // a real component (hui-card-picker, ha-yaml-editor, a child card's own
  // editor) can otherwise get torn out from under itself mid-update,
  // which is what previously crashed hui-card-picker during cut.
  _buildSkeleton() {
    this.innerHTML = "";

    this._tabStripEl = document.createElement("div");
    this._tabStripEl.style.display = "flex";
    this._tabStripEl.style.alignItems = "center";
    this._tabStripEl.style.gap = "4px";
    this._tabStripEl.style.marginBottom = "8px";
    this._tabStripEl.style.borderBottom = "1px solid #444";
    this.appendChild(this._tabStripEl);

    this._editorAreaEl = document.createElement("div");
    this.appendChild(this._editorAreaEl);

    this._cardToolbarEl = null; // created on demand inside _updateContent
    this._innerTabsEl = null;
    this._contentEl = null;
  }

  // Rebuilds only the tab strip (card-selector tabs + add button). Cheap,
  // and the only thing inside it (plain buttons) is safe to fully replace
  // every time - nothing here is a real, stateful third-party component.
  _updateTabStrip() {
    this._tabStripEl.innerHTML = "";
    const cards = this._config.cards;

    cards.forEach((_card, i) => {
      const tab = document.createElement("button");
      tab.textContent = String(i + 1);
      const active = i === this._selected;
      tab.style.background = "none";
      tab.style.border = "none";
      tab.style.borderBottom = active ? "2px solid var(--primary-color)" : "2px solid transparent";
      tab.style.color = active ? "var(--primary-color)" : "#e1e1e1";
      tab.style.fontWeight = active ? "600" : "400";
      tab.style.padding = "6px 10px";
      tab.style.cursor = "pointer";
      tab.addEventListener("click", () => {
        this._selected = i;
        this._guiMode = true;
        this._innerTab = "config";
        this._updateTabStrip();
        this._updateContent();
      });
      this._tabStripEl.appendChild(tab);
    });

    const addBtn = document.createElement("button");
    addBtn.textContent = "+";
    addBtn.style.background = "none";
    addBtn.style.border = "none";
    addBtn.style.color = "#e1e1e1";
    addBtn.style.fontSize = "16px";
    addBtn.style.cursor = "pointer";
    addBtn.style.marginLeft = "auto";
    addBtn.addEventListener("click", () => {
      this._selected = this._config.cards.length;
      this._innerTab = "config";
      this._updateTabStrip();
      this._updateContent();
    });
    this._tabStripEl.appendChild(addBtn);
  }

  // Decides what belongs in the editor area below the tab strip, and only
  // replaces the specific piece(s) that actually need to change for the
  // current state, instead of wiping the whole area unconditionally.
  _updateContent() {
    const cards = this._config.cards;
    const numCards = cards.length;
    const showingCard = this._selected < numCards;

    if (!showingCard) {
      // Past the end: only the picker belongs here. Tear down the
      // card-toolbar/inner-tabs if they exist from a previous state,
      // since they don't apply on this screen.
      if (this._cardToolbarEl) { this._cardToolbarEl.remove(); this._cardToolbarEl = null; }
      if (this._innerTabsEl) { this._innerTabsEl.remove(); this._innerTabsEl = null; }
      this._mountPicker();
      return;
    }

    // Showing a selected card: ensure the card toolbar and inner tabs
    // exist (build once if missing), then update them in place.
    if (!this._cardToolbarEl) {
      this._cardToolbarEl = document.createElement("div");
      this._editorAreaEl.insertBefore(this._cardToolbarEl, this._editorAreaEl.firstChild);
    }
    this._updateCardToolbar();

    if (!this._innerTabsEl) {
      this._innerTabsEl = document.createElement("div");
      this._cardToolbarEl.after(this._innerTabsEl);
    }
    this._updateInnerTabs();

    this._mountSelectedCardContent();
  }

  _updateCardToolbar() {
    const numCards = this._config.cards.length;
    this._cardToolbarEl.innerHTML = "";
    this._cardToolbarEl.style.display = "flex";
    this._cardToolbarEl.style.justifyContent = "space-between";
    this._cardToolbarEl.style.gap = "4px";
    this._cardToolbarEl.style.marginBottom = "8px";

    const iconBtn = (svgPath, onClick, disabled) => {
      const btn = document.createElement("button");
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="${svgPath}"/></svg>`;
      btn.style.background = "none";
      btn.style.border = "none";
      btn.style.borderRadius = "50%";
      btn.style.color = disabled ? "#555" : "#e1e1e1";
      btn.style.cursor = disabled ? "default" : "pointer";
      btn.style.padding = "4px";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.outline = "none";
      btn.disabled = !!disabled;
      btn.addEventListener("click", onClick);
      btn.addEventListener("focus", () => { btn.style.outline = "2px solid var(--primary-color)"; });
      btn.addEventListener("blur", () => { btn.style.outline = "none"; });
      return btn;
    };

    const ICONS = {
      prev: "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",
      next: "M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z",
      copy: "M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",
      cut: "M9.64,7.64C9.88,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.88 7.64,9.64L10,12L7.64,14.36C7.14,14.12 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.88,16.86 9.64,16.36L12,14L19,21H22V20L9.64,7.64M6,8A2,2 0 0,1 4,6A2,2 0 0,1 6,4A2,2 0 0,1 8,6A2,2 0 0,1 6,8M6,20A2,2 0 0,1 4,18A2,2 0 0,1 6,16A2,2 0 0,1 8,18A2,2 0 0,1 6,20M19,3L12,10L14,12L22,4V3H19Z",
      delete: "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",
      code: "M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z",
      list: "M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z",
    };

    const codeBtn = iconBtn(this._guiMode ? ICONS.code : ICONS.list, () => {
      this._guiMode = !this._guiMode;
      this._updateCardToolbar();
      this._mountSelectedCardContent();
    });
    this._cardToolbarEl.appendChild(codeBtn);

    const rightButtons = document.createElement("div");
    rightButtons.style.display = "flex";
    rightButtons.style.gap = "4px";
    rightButtons.appendChild(iconBtn(ICONS.prev, () => this._move(-1), this._selected === 0));
    rightButtons.appendChild(iconBtn(ICONS.next, () => this._move(1), this._selected === numCards - 1));
    rightButtons.appendChild(iconBtn(ICONS.copy, () => this._copy()));
    rightButtons.appendChild(iconBtn(ICONS.cut, () => this._cut()));
    rightButtons.appendChild(iconBtn(ICONS.delete, () => this._delete()));
    this._cardToolbarEl.appendChild(rightButtons);
  }

  _updateInnerTabs() {
    this._innerTabsEl.innerHTML = "";
    this._innerTabsEl.style.display = "flex";
    this._innerTabsEl.style.borderBottom = "1px solid #444";
    this._innerTabsEl.style.marginBottom = "12px";

    ["config", "visibility"].forEach((tabId) => {
      const tabBtn = document.createElement("button");
      tabBtn.textContent = tabId === "config" ? "Config" : "Visibility";
      const active = this._innerTab === tabId;
      tabBtn.style.flex = "1";
      tabBtn.style.background = "none";
      tabBtn.style.border = "none";
      tabBtn.style.borderBottom = active ? "2px solid var(--primary-color)" : "2px solid transparent";
      tabBtn.style.color = active ? "var(--primary-color)" : "#e1e1e1";
      tabBtn.style.fontWeight = "500";
      tabBtn.style.padding = "10px 0";
      tabBtn.style.cursor = "pointer";
      tabBtn.addEventListener("click", () => {
        this._innerTab = tabId;
        this._updateInnerTabs();
        this._mountSelectedCardContent();
      });
      this._innerTabsEl.appendChild(tabBtn);
    });
  }

  // Replaces only the actual content area (child editor / YAML editor /
  // visibility editor) - never touches the tab strip, card toolbar, or
  // inner tabs above it. This is the one place a full child-replacement
  // is correct: swapping between these is a genuine content change, not
  // busywork on something that didn't change.
  _mountSelectedCardContent() {
    if (this._contentEl) {
      this._contentEl.remove();
    }
    this._contentEl = document.createElement("div");
    this._innerTabsEl.after(this._contentEl);
    this._childEditorEl = null;

    const cardConfig = this._config.cards[this._selected];

    if (this._innerTab === "config" && this._guiMode) {
      const target = this._contentEl;
      const showFallback = (reason) => {
        const fallback = document.createElement("div");
        fallback.textContent =
          "No visual editor available for this card type. Edit via YAML.";
        target.appendChild(fallback);
        console.warn("chrono-panel-card: child editor failed to load:", reason);
      };
      window.loadCardHelpers().then((helpers) => {
        const tempEl = helpers.createCardElement(cardConfig);
        const tagName = tempEl.localName;

        customElements.whenDefined(tagName).then(() => {
          const ElClass = customElements.get(tagName);
          if (!ElClass || typeof ElClass.getConfigElement !== "function") {
            showFallback("card type has no getConfigElement()");
            return;
          }
          Promise.resolve(ElClass.getConfigElement()).then((editorEl) => {
            editorEl.hass = this._hass;
            editorEl.lovelace = this._lovelace;
            editorEl.setConfig(cardConfig);
            editorEl.addEventListener("config-changed", (ev) => {
              ev.stopPropagation();
              const updatedCards = [...this._config.cards];
              const visibility = updatedCards[this._selected].visibility;
              updatedCards[this._selected] = { ...ev.detail.config, visibility };
              this._config = { ...this._config, cards: updatedCards };
              this._fireConfigChanged();
            });
            this._childEditorEl = editorEl;
            target.appendChild(editorEl);
          }).catch(showFallback);
        }).catch(showFallback);
      }).catch(showFallback);
    } else if (this._innerTab === "config" && !this._guiMode) {
      const yamlEl = document.createElement("ha-yaml-editor");
      yamlEl.hass = this._hass;
      yamlEl.autoUpdate = true;
      yamlEl.value = cardConfig;
      yamlEl.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        if (!ev.detail.isValid) return; // don't commit invalid YAML
        const updatedCards = [...this._config.cards];
        const visibility = updatedCards[this._selected].visibility;
        updatedCards[this._selected] = { ...ev.detail.value, visibility };
        this._config = { ...this._config, cards: updatedCards };
        this._fireConfigChanged();
      });
      this._contentEl.appendChild(yamlEl);
    } else {
      this._contentEl.appendChild(this._renderVisibilityEditor(cardConfig));
    }
  }

  // Mounts the real hui-card-picker for the "past the end" / add-card
  // screen. Only replaces _contentEl - never touches the tab strip.
  _mountPicker() {
    if (this._contentEl) {
      this._contentEl.remove();
    }
    this._contentEl = document.createElement("div");
    this._editorAreaEl.appendChild(this._contentEl);

    const picker = document.createElement("hui-card-picker");
    picker.hass = this._hass;
    picker.lovelace = this._lovelace;
    picker.addEventListener("config-changed", (ev) => {
      ev.stopPropagation();
      const updatedCards = [...this._config.cards, ev.detail.config];
      this._config = { ...this._config, cards: updatedCards };
      this._fireConfigChanged();
      this._updateTabStrip();
      this._updateContent();
    });
    this._pickerEl = picker;
    this._contentEl.appendChild(picker);
  }

  _openPopup(el) {
    this._closeOpenPopup();
    el.style.display = "block";
    this._openPopupEl = el;
    document.addEventListener("click", this._closeOpenPopupHandler = () => this._closeOpenPopup(), { once: true });
  }

  _closeOpenPopup() {
    if (this._openPopupEl) {
      this._openPopupEl.style.display = "none";
      this._openPopupEl = null;
    }
  }

  _evaluateConditions(conditions) {
    if (!this._hass) return false; // no data yet: don't claim visible without checking
    // Reuse the exact same logic the real running card uses, so the
    // editor's preview can never disagree with actual runtime behavior.
    return ChronoPanelCard.prototype._evaluateVisibility.call(this, conditions, this._hass);
  }

  _evaluateOneCondition(cond) {
    if (!this._hass) return false; // no data yet: don't claim visible without checking
    return ChronoPanelCard.prototype._evaluateCondition.call(this, cond, this._hass);
  }

  _renderVisibilityEditor(cardConfig) {
    const container = document.createElement("div");

    const conditions = cardConfig.visibility || [];

    const status = document.createElement("div");
    status.style.display = "flex";
    status.style.alignItems = "center";
    status.style.gap = "8px";
    status.style.padding = "10px 14px";
    status.style.marginBottom = "12px";
    status.style.borderRadius = "8px";

    const visible = conditions.length === 0 || this._evaluateConditions(conditions);
    status.style.background = visible ? "#1f3322" : "#332b14";

    const dot = document.createElement("span");
    dot.textContent = visible ? "👁" : "🚫";
    status.appendChild(dot);

    const textWrap = document.createElement("div");
    const line1 = document.createElement("div");
    line1.textContent = visible ? "Current visibility: Visible" : "Current visibility: Hidden";
    line1.style.fontWeight = "600";
    line1.style.color = "#fff";
    const line2 = document.createElement("div");
    line2.textContent = conditions.length === 0
      ? "No visibility conditions are set"
      : (visible ? "All visibility conditions are met" : "Not all visibility conditions are met");
    line2.style.fontSize = "12px";
    line2.style.color = "#bbb";
    textWrap.appendChild(line1);
    textWrap.appendChild(line2);
    status.appendChild(textWrap);
    container.appendChild(status);

    conditions.forEach((cond, i) => {
      container.appendChild(this._renderConditionCard(cond, i));
    });

    // "+ Add condition" pill button with a dropdown of condition types
    const addWrap = document.createElement("div");
    addWrap.style.position = "relative";
    addWrap.style.marginTop = "8px";

    const addBtn = document.createElement("button");
    addBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align:-3px;margin-right:6px;"><path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>Add condition`;
    addBtn.style.background = "var(--wa-color-fill-normal)";
    addBtn.style.color = "#fff";
    addBtn.style.border = "none";
    addBtn.style.borderRadius = "var(--ha-border-radius-pill)";
    addBtn.style.height = "40px";
    addBtn.style.padding = "0 var(--ha-space-4)";
    addBtn.style.fontWeight = "600";
    addBtn.style.cursor = "pointer";
    addBtn.addEventListener("mouseenter", () => { addBtn.style.background = "var(--ha-color-fill-primary-normal-hover)"; });
    addBtn.addEventListener("mouseleave", () => { addBtn.style.background = "var(--wa-color-fill-normal)"; });

    const dropdown = document.createElement("div");
    dropdown.style.position = "absolute";
    dropdown.style.top = "100%";
    dropdown.style.left = "0";
    dropdown.style.marginTop = "4px";
    dropdown.style.background = "#1e1e1e";
    dropdown.style.border = "1px solid #444";
    dropdown.style.borderRadius = "8px";
    dropdown.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    dropdown.style.display = "none";
    dropdown.style.zIndex = "10";
    dropdown.style.minWidth = "200px";

    const TYPES = [
      { id: "numeric_state", label: "Entity numeric state", icon: "M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z" },
      { id: "state", label: "Entity state", icon: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6L8,12L12,18L16,12L12,6Z" },
    ];

    TYPES.forEach((t) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.padding = "10px 14px";
      row.style.cursor = "pointer";
      row.style.color = "#e0e0e0";
      row.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="${t.icon}"/></svg><span>${t.label}</span>`;
      row.addEventListener("mouseenter", () => { row.style.background = "#2a2a2a"; });
      row.addEventListener("mouseleave", () => { row.style.background = "none"; });
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        const newCond = t.id === "state"
          ? customElements.get("ha-card-condition-state").defaultConfig
          : customElements.get("ha-card-condition-numeric_state").defaultConfig;
        this._updateVisibility(cardConfig, [...conditions, { ...newCond }]);
        this._closeOpenPopup();
      });
      dropdown.appendChild(row);
    });

    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dropdown.style.display === "none") {
        this._openPopup(dropdown);
      } else {
        this._closeOpenPopup();
      }
    });

    addWrap.appendChild(addBtn);
    addWrap.appendChild(dropdown);
    container.appendChild(addWrap);
    return container;
  }

  _renderConditionCard(cond, index) {
    const TYPE_INFO = {
      state: { label: "Entity state", icon: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6L8,12L12,18L16,12L12,6Z" },
      numeric_state: { label: "Entity numeric state", icon: "M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z" },
    };
    const info = TYPE_INFO[cond.condition] || { label: cond.condition, icon: "" };
    const conditionPasses = this._evaluateOneCondition(cond);
    const dotColor = conditionPasses ? "#4caf50" : "#ff9800";
    const collapsed = !!this._collapsedConditions[index];

    const card = document.createElement("div");
    card.style.border = "1px solid #444";
    card.style.borderRadius = "8px";
    card.style.marginBottom = "8px";
    card.style.overflow = "hidden";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "8px";
    header.style.padding = "10px 12px";
    header.style.cursor = "pointer";

    const chevron = document.createElement("span");
    chevron.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" style="transform:rotate(${collapsed ? "180deg" : "0deg"});transition:transform .15s;"><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>`;
    header.appendChild(chevron);

    const iconWrap = document.createElement("span");
    iconWrap.style.position = "relative";
    iconWrap.style.display = "inline-flex";
    iconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="${info.icon}"/></svg>`;
    const badge = document.createElement("span");
    badge.style.position = "absolute";
    badge.style.top = "-2px";
    badge.style.right = "-2px";
    badge.style.width = "8px";
    badge.style.height = "8px";
    badge.style.borderRadius = "50%";
    badge.style.background = dotColor;
    iconWrap.appendChild(badge);
    header.appendChild(iconWrap);

    const label = document.createElement("span");
    label.textContent = info.label;
    label.style.flex = "1";
    label.style.fontWeight = "600";
    header.appendChild(label);

    // Three-dot menu (delete only, for now)
    const menuWrap = document.createElement("span");
    menuWrap.style.position = "relative";
    const menuBtn = document.createElement("button");
    menuBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/></svg>`;
    menuBtn.style.background = "none";
    menuBtn.style.border = "none";
    menuBtn.style.color = "#e1e1e1";
    menuBtn.style.cursor = "pointer";
    const menu = document.createElement("div");
    menu.style.position = "absolute";
    menu.style.right = "0";
    menu.style.top = "100%";
    menu.style.background = "#1e1e1e";
    menu.style.border = "1px solid #444";
    menu.style.borderRadius = "8px";
    menu.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    menu.style.display = "none";
    menu.style.zIndex = "10";
    menu.style.minWidth = "120px";
    const deleteRow = document.createElement("div");
    deleteRow.textContent = "Delete";
    deleteRow.style.padding = "10px 14px";
    deleteRow.style.cursor = "pointer";
    deleteRow.style.color = "#e0e0e0";
    deleteRow.addEventListener("mouseenter", () => { deleteRow.style.background = "#2a2a2a"; });
    deleteRow.addEventListener("mouseleave", () => { deleteRow.style.background = "none"; });
    deleteRow.addEventListener("click", (e) => {
      e.stopPropagation();
      this._closeOpenPopup();
      this._removeCondition(index);
    });
    menu.appendChild(deleteRow);
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menu.style.display === "none") {
        this._openPopup(menu);
      } else {
        this._closeOpenPopup();
      }
    });
    menuWrap.appendChild(menuBtn);
    menuWrap.appendChild(menu);
    header.appendChild(menuWrap);

    header.addEventListener("click", () => {
      this._collapsedConditions[index] = !collapsed;
      this._mountSelectedCardContent();
    });
    card.appendChild(header);

    if (!collapsed) {
      const body = document.createElement("div");
      body.style.padding = "0 12px 12px 12px";

      const tagName = cond.condition === "state"
        ? "ha-card-condition-state"
        : "ha-card-condition-numeric_state";
      const condEl = document.createElement(tagName);
      condEl.hass = this._hass;
      condEl.condition = cond;
      condEl.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._setCondition(index, ev.detail.value);
      });
      body.appendChild(condEl);
      card.appendChild(body);
    }

    return card;
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
    this._mountSelectedCardContent();
  }


  _move(delta) {
    const cards = [...this._config.cards];
    const [card] = cards.splice(this._selected, 1);
    cards.splice(this._selected + delta, 0, card);
    this._config = { ...this._config, cards };
    this._selected += delta;
    this._fireConfigChanged();
    this._updateTabStrip();
    this._updateCardToolbar();
    this._mountSelectedCardContent();
  }

  _copy() {
    sessionStorage.setItem(
      "dashboardCardClipboard",
      JSON.stringify(this._config.cards[this._selected])
    );
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
    this._fireConfigChanged();
    this._updateTabStrip();
    this._updateContent();
  }
}

if (!customElements.get("chrono-panel-card-editor")) {
  customElements.define("chrono-panel-card-editor", ChronoPanelCardEditor);
}

if (!customElements.get("chrono-panel-card")) {
  customElements.define("chrono-panel-card", ChronoPanelCard);
}



// Register with HA's card picker so it shows up in the visual editor list.
window.customCards = window.customCards || [];
window.customCards.push({
  type: "chrono-panel-card",
  name: "Chrono Panel Card",
  description:
    "Fills its container 100% and shows whichever child card(s) currently match their visibility condition, with zero reserved space for hidden ones.",
});
