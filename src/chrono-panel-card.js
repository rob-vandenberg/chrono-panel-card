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
const CARD_VERSION = '1.0.4';

// ─── Version History ──────────────────────────────────────────────────────────
// v1.0.4: Initial release

console.info(
  `%c CHRONO-%cSLIDESHOW%c-CARD %c v${CARD_VERSION} `,
  'background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 0 2px 4px; border-radius: 3px 0 0 3px;',
  'background-color: #101010; color: #4676d3; font-weight: bold; padding: 2px 0;',
  'background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 4px 2px 0;',
  'background-color: #1E1E1E; color: #FFFFFF; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);

class ChronoPanelCard extends HTMLElement {
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
    // Only the simple "state" condition type is implemented, on purpose.
    return visibility.every((cond) => {
      if (cond.condition !== "state") return true; // unknown types: ignore, don't block
      const entityState = hass.states[cond.entity]?.state;
      return entityState === cond.state;
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

customElements.define("chrono-panel-card", ChronoPanelCard);

// Register with HA's card picker so it shows up in the visual editor list.
window.customCards = window.customCards || [];
window.customCards.push({
  type: "chrono-panel-card",
  name: "Chrono Panel Card",
  description:
    "Fills its container 100% and shows whichever child card(s) currently match their visibility condition, with zero reserved space for hidden ones.",
});
