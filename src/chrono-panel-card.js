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
const CARD_VERSION = '1.0.6';

// ─── Version History ──────────────────────────────────────────────────────────
// v1.0.6: Added visual editor (ChronoPanelCardEditor) - add/remove/reorder/copy/cut child cards
// v1.0.5: Added numeric_state condition support to _evaluateVisibility()
// v1.0.4: Initial release

console.info(
  `%c CHRONO-%cSLIDESHOW%c-CARD %c v${CARD_VERSION} `,
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
    if (!config || !Array.isArray(config.cards) || config.cards.length === 0) {
      throw new Error("chrono-panel-card: 'cards' must be a non-empty array");
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
    return visibility.every((cond) => {
      if (cond.condition === "state") {
        const entityState = hass.states[cond.entity]?.state;
        return entityState === cond.state;
      }

      if (cond.condition === "numeric_state") {
        const value = parseFloat(hass.states[cond.entity]?.state);
        if (isNaN(value)) return false;
        if (cond.above !== undefined && !(value > cond.above)) return false;
        if (cond.below !== undefined && !(value < cond.below)) return false;
        return true;
      }

      return true; // unknown types: ignore, don't block
    });
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
    this._config = config || { cards: [] };
    this._selected = 0;
    this._guiMode = true;
    this._render();
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

  _render() {
    this.innerHTML = "";
    const cards = this._config.cards;
    const numCards = cards.length;

    // Tab strip + add button
    const toolbar = document.createElement("div");
    toolbar.style.display = "flex";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "4px";
    toolbar.style.marginBottom = "8px";

    cards.forEach((_card, i) => {
      const tab = document.createElement("button");
      tab.textContent = String(i + 1);
      tab.style.fontWeight = i === this._selected ? "bold" : "normal";
      tab.addEventListener("click", () => {
        this._selected = i;
        this._guiMode = true;
        this._render();
      });
      toolbar.appendChild(tab);
    });

    const addBtn = document.createElement("button");
    addBtn.textContent = "+";
    addBtn.addEventListener("click", () => {
      this._selected = this._config.cards.length;
      this._render();
    });
    toolbar.appendChild(addBtn);
    this.appendChild(toolbar);

    const editorArea = document.createElement("div");
    this.appendChild(editorArea);

    if (this._selected < numCards) {
      // Per-card toolbar: move prev/next, copy, cut, delete
      const cardToolbar = document.createElement("div");
      cardToolbar.style.display = "flex";
      cardToolbar.style.justifyContent = "flex-end";
      cardToolbar.style.gap = "4px";
      cardToolbar.style.marginBottom = "8px";

      const movePrev = document.createElement("button");
      movePrev.textContent = "←";
      movePrev.disabled = this._selected === 0;
      movePrev.addEventListener("click", () => this._move(-1));
      cardToolbar.appendChild(movePrev);

      const moveNext = document.createElement("button");
      moveNext.textContent = "→";
      moveNext.disabled = this._selected === numCards - 1;
      moveNext.addEventListener("click", () => this._move(1));
      cardToolbar.appendChild(moveNext);

      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => this._copy());
      cardToolbar.appendChild(copyBtn);

      const cutBtn = document.createElement("button");
      cutBtn.textContent = "Cut";
      cutBtn.addEventListener("click", () => this._cut());
      cardToolbar.appendChild(cutBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => this._delete());
      cardToolbar.appendChild(deleteBtn);

      editorArea.appendChild(cardToolbar);

      // Selected child's own editor (Strategy 1: lazy-load-trigger the
      // child's type, then call its own static getConfigElement()).
      const cardConfig = cards[this._selected];
      window.loadCardHelpers().then((helpers) => {
        const tempEl = helpers.createCardElement(cardConfig);
        const tagName = tempEl.localName;

        customElements.whenDefined(tagName).then(() => {
          const ElClass = customElements.get(tagName);
          if (!ElClass || typeof ElClass.getConfigElement !== "function") {
            const fallback = document.createElement("div");
            fallback.textContent =
              "No visual editor available for this card type. Edit via YAML.";
            editorArea.appendChild(fallback);
            return;
          }
          ElClass.getConfigElement().then((editorEl) => {
            editorEl.hass = this._hass;
            editorEl.lovelace = this._lovelace;
            editorEl.setConfig(cardConfig);
            editorEl.addEventListener("config-changed", (ev) => {
              ev.stopPropagation();
              const updatedCards = [...this._config.cards];
              updatedCards[this._selected] = ev.detail.config;
              this._config = { ...this._config, cards: updatedCards };
              this._fireConfigChanged();
            });
            this._childEditorEl = editorEl;
            editorArea.appendChild(editorEl);
          });
        });
      });
    } else {
      // Past the end: show HA's native card-type picker to add a new card.
      const picker = document.createElement("hui-card-picker");
      picker.hass = this._hass;
      picker.lovelace = this._lovelace;
      picker.addEventListener("config-changed", (ev) => {
        ev.stopPropagation();
        const updatedCards = [...this._config.cards, ev.detail.config];
        this._config = { ...this._config, cards: updatedCards };
        this._fireConfigChanged();
        this._render();
      });
      this._pickerEl = picker;
      editorArea.appendChild(picker);
    }
  }

  _move(delta) {
    const cards = [...this._config.cards];
    const [card] = cards.splice(this._selected, 1);
    cards.splice(this._selected + delta, 0, card);
    this._config = { ...this._config, cards };
    this._selected += delta;
    this._fireConfigChanged();
    this._render();
  }

  _copy() {
    this._clipboard = JSON.parse(
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
    this._render();
  }
}

customElements.define("chrono-panel-card-editor", ChronoPanelCardEditor);

customElements.define("chrono-panel-card", ChronoPanelCard);



// Register with HA's card picker so it shows up in the visual editor list.
window.customCards = window.customCards || [];
window.customCards.push({
  type: "chrono-panel-card",
  name: "Chrono Panel Card",
  description:
    "Fills its container 100% and shows whichever child card(s) currently match their visibility condition, with zero reserved space for hidden ones.",
});
