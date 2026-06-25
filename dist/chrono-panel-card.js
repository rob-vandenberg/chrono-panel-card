import{LitElement,html,css}from"https://unpkg.com/lit@2.0.0/index.js?module";import{keyed}from"https://unpkg.com/lit@2.0.0/directives/keyed.js?module";import{styleMap}from"https://unpkg.com/lit@2.0.0/directives/style-map.js?module";import{storage}from"https://unpkg.com/home-assistant-frontend@dev/src/common/decorators/storage.js?module";const CARD_VERSION="2.0.36";console.info("%c CHRONO-%cPANEL%c-CARD %c v2.0.36 ","background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 0 2px 4px; border-radius: 3px 0 0 3px;","background-color: #101010; color: #4676d3; font-weight: bold; padding: 2px 0;","background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 4px 2px 0;","background-color: #1E1E1E; color: #FFFFFF; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;");class ChronoPanelCard extends LitElement{static properties={_config:{attribute:!1},_hass:{attribute:!1}};static async getConfigElement(){return document.createElement("chrono-panel-card-editor")}static getStubConfig(){return{cards:[]}}setConfig(t){if(!t||!Array.isArray(t.cards))throw new Error("chrono-panel-card: 'cards' must be an array");this._config=t}set hass(t){this._hass=t}get hass(){return this._hass}_evaluateVisibility(t,i){return!t||t.every(t=>ChronoPanelCard.prototype._evaluateCondition(t,i))}_evaluateCondition(t,i){if("state"===t.condition){const e=i.states[t.entity]?.state;return void 0!==t.state?e===t.state:void 0===t.state_not||e!==t.state_not}if("numeric_state"===t.condition){const e=parseFloat(i.states[t.entity]?.state);return!isNaN(e)&&((void 0===t.above||e>t.above)&&(void 0===t.below||e<t.below))}return!0}getCardSize(){return 1}getLayoutOptions(){return{grid_rows:1,grid_columns:1}}static styles=css`
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
  `;render(){return this._config?html`
      <div class="wrapper">
        ${(this._config.cards??[]).map(t=>{const i=t.visibility||null,e=!!this._hass&&this._evaluateVisibility(i,this._hass);return html`
            <hui-card
              .hass=${this._hass}
              .config=${t}
              style=${styleMap({display:e?"block":"none"})}
            ></hui-card>
          `})}
      </div>
    `:html``}}customElements.get("chrono-panel-card")||customElements.define("chrono-panel-card",ChronoPanelCard);class ChronoPanelCardEditor extends LitElement{static properties={_config:{attribute:!1},_selected:{state:!0},_guiMode:{state:!0},_innerTab:{state:!0},_collapsed:{state:!0},_addDropdownOpen:{state:!0},_openMenuIndex:{state:!0},_hass:{attribute:!1}};constructor(){super(),this._selected=0,this._guiMode=!0,this._innerTab="config",this._collapsed={},this._addDropdownOpen=!1,this._openMenuIndex=null,this._keys=new Map,this._handleOutsideClick=this._handleOutsideClick.bind(this)}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this._handleOutsideClick)}disconnectedCallback(){document.removeEventListener("click",this._handleOutsideClick),super.disconnectedCallback()}_handleOutsideClick(){this._addDropdownOpen&&(this._addDropdownOpen=!1),null!==this._openMenuIndex&&(this._openMenuIndex=null)}setConfig(t){this._config=t||{cards:[]}}set hass(t){this._hass=t}get hass(){return this._hass}set lovelace(t){this._lovelace=t}get lovelace(){return this._lovelace}_fireConfigChanged(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_getKey(t,i){const e=`${t}-${i}`;return this._keys.has(e)||this._keys.set(e,Math.random().toString()),this._keys.get(e)}_selectTab(t){this._selected=t,this._guiMode=!0,this._innerTab="config"}_addCard(){this._selected=this._config.cards.length}_toggleGuiMode(){this._guiMode=!this._guiMode}_setInnerTab(t){this._innerTab=t}_handleChildConfigChanged(t){t.stopPropagation();const i=[...this._config.cards],e=i[this._selected].visibility;i[this._selected]={...t.detail.config,visibility:e},this._config={...this._config,cards:i},this._fireConfigChanged()}_handleYamlChanged(t){if(t.stopPropagation(),!t.detail.isValid)return;const i=[...this._config.cards],e=i[this._selected].visibility;i[this._selected]={...t.detail.value,visibility:e},this._config={...this._config,cards:i},this._fireConfigChanged()}_handleCardPicked(t){t.stopPropagation();const i=[...this._config.cards,t.detail.config];this._config={...this._config,cards:i},this._keys.clear(),this._fireConfigChanged()}_setCondition(t,i){const e=this._config.cards[this._selected],o=[...e.visibility||[]];o[t]=i,this._updateVisibility(e,o)}_removeCondition(t){const i=this._config.cards[this._selected],e=[...i.visibility||[]];e.splice(t,1),this._updateVisibility(i,e)}_updateVisibility(t,i){const e=[...this._config.cards];e[this._selected]={...t,visibility:i},this._config={...this._config,cards:e},this._fireConfigChanged()}_move(t){const i=[...this._config.cards],[e]=i.splice(this._selected,1);i.splice(this._selected+t,0,e),this._config={...this._config,cards:i},this._selected+=t,this._keys.clear(),this._fireConfigChanged()}_copy(){this._clipboard=JSON.parse(JSON.stringify(this._config.cards[this._selected]))}_cut(){this._copy(),this._delete()}_delete(){const t=[...this._config.cards];t.splice(this._selected,1),this._config={...this._config,cards:t},this._selected=Math.max(0,this._selected-1),this._keys.clear(),this._fireConfigChanged()}_evaluateConditions(t){return!!this._hass&&ChronoPanelCard.prototype._evaluateVisibility.call(this,t,this._hass)}_evaluateOneCondition(t){return!!this._hass&&ChronoPanelCard.prototype._evaluateCondition.call(this,t,this._hass)}static styles=css`
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
  `;static ICONS={prev:"M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",next:"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z",copy:"M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",cut:"M9.64,7.64C9.88,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.88 7.64,9.64L10,12L7.64,14.36C7.14,14.12 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.88,16.86 9.64,16.36L12,14L19,21H22V20L9.64,7.64M6,8A2,2 0 0,1 4,6A2,2 0 0,1 6,4A2,2 0 0,1 8,6A2,2 0 0,1 6,8M6,20A2,2 0 0,1 4,18A2,2 0 0,1 6,16A2,2 0 0,1 8,18A2,2 0 0,1 6,20M19,3L12,10L14,12L22,4V3H19Z",delete:"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",code:"M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z",list:"M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z",add:"M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",chevron:"M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",menu:"M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z",eyeOpen:"M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z",eyeOff:"M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z",stateType:"M6.27 17.05C6.72 17.58 7 18.25 7 19C7 20.66 5.66 22 4 22S1 20.66 1 19 2.34 16 4 16C4.18 16 4.36 16 4.53 16.05L7.6 10.69L5.86 9.7L9.95 8.58L11.07 12.67L9.33 11.68L6.27 17.05M20 16C18.7 16 17.6 16.84 17.18 18H11V16L8 19L11 22V20H17.18C17.6 21.16 18.7 22 20 22C21.66 22 23 20.66 23 19S21.66 16 20 16M12 8C12.18 8 12.36 8 12.53 7.95L15.6 13.31L13.86 14.3L17.95 15.42L19.07 11.33L17.33 12.32L14.27 6.95C14.72 6.42 15 5.75 15 5C15 3.34 13.66 2 12 2S9 3.34 9 5 10.34 8 12 8Z",numericStateType:"M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z"};static TYPE_INFO={state:{label:"Entity state",icon:ChronoPanelCardEditor.ICONS.stateType},numeric_state:{label:"Entity numeric state",icon:ChronoPanelCardEditor.ICONS.numericStateType}};_icon(t,i=24){return html`<svg viewBox="0 0 24 24" width="${i}" height="${i}"><path fill="currentColor" d="${t}"></path></svg>`}render(){if(!this._config)return html``;const t=this._config.cards,i=t.length,e=this._selected<i;return html`
      <div class="tab-strip">
        ${t.map((t,i)=>html`
          <button
            class=${i===this._selected?"active":""}
            @click=${()=>this._selectTab(i)}
          >${i+1}</button>
        `)}
        <button class="add-btn" @click=${()=>this._addCard()}>
          ${this._icon(ChronoPanelCardEditor.ICONS.add)}
        </button>
      </div>

      ${e?this._renderCardEditor(t,i):html`
            <hui-card-picker
              .hass=${this._hass}
              .lovelace=${this._lovelace}
              @config-changed=${t=>this._handleCardPicked(t)}
            ></hui-card-picker>
          `}
    `}_renderCardEditor(t,i){const e=t[this._selected],o=this._guiMode;return html`
      <div class="card-toolbar">
        <button class="icon-btn" @click=${()=>this._toggleGuiMode()}>
          ${this._icon(o?ChronoPanelCardEditor.ICONS.code:ChronoPanelCardEditor.ICONS.list,20)}
        </button>
        <div class="right">
          <button class="icon-btn" ?disabled=${0===this._selected} @click=${()=>this._move(-1)}>
            ${this._icon(ChronoPanelCardEditor.ICONS.prev,20)}
          </button>
          <button class="icon-btn" ?disabled=${this._selected===i-1} @click=${()=>this._move(1)}>
            ${this._icon(ChronoPanelCardEditor.ICONS.next,20)}
          </button>
          <button class="icon-btn" @click=${()=>this._copy()}>
            ${this._icon(ChronoPanelCardEditor.ICONS.copy,20)}
          </button>
          <button class="icon-btn" @click=${()=>this._cut()}>
            ${this._icon(ChronoPanelCardEditor.ICONS.cut,20)}
          </button>
          <button class="icon-btn" @click=${()=>this._delete()}>
            ${this._icon(ChronoPanelCardEditor.ICONS.delete,20)}
          </button>
        </div>
      </div>

      <div class="inner-tabs">
        ${["config","visibility"].map(t=>html`
          <button
            class=${this._innerTab===t?"active":""}
            @click=${()=>this._setInnerTab(t)}
          >${"config"===t?"Config":"Visibility"}</button>
        `)}
      </div>

      ${keyed(this._getKey(this._selected,i),this._renderContent(e))}
    `}_renderContent(t){return"config"===this._innerTab&&this._guiMode?html`
        <hui-card-element-editor
          .hass=${this._hass}
          .lovelace=${this._lovelace}
          .value=${t}
          @config-changed=${t=>this._handleChildConfigChanged(t)}
        ></hui-card-element-editor>
      `:"config"!==this._innerTab||this._guiMode?this._renderVisibilityEditor(t):html`
        <ha-yaml-editor
          .hass=${this._hass}
          .autoUpdate=${!0}
          .value=${t}
          @value-changed=${t=>this._handleYamlChanged(t)}
        ></ha-yaml-editor>
      `}_renderVisibilityEditor(t){const i=t.visibility||[],e=0===i.length||this._evaluateConditions(i);return html`
      <div
        class="status-banner"
        style=${styleMap({background:e?"#202b21":"#372c18"})}
      >
        <span style=${styleMap({color:e?"#429f47":"#ffa500",display:"inline-flex"})}>
          ${this._icon(e?ChronoPanelCardEditor.ICONS.eyeOpen:ChronoPanelCardEditor.ICONS.eyeOff)}
        </span>
        <div>
          <div class="line1">${e?"Current visibility: Visible":"Current visibility: Hidden"}</div>
          <div class="line2">
            ${0===i.length?"No visibility conditions are set":e?"All visibility conditions are met":"Not all visibility conditions are met"}
          </div>
        </div>
      </div>

      ${i.map((t,i)=>this._renderConditionCard(t,i))}

      <div class="add-wrap">
        <button class="add-btn" @click=${t=>this._toggleAddDropdown(t)}>
          ${this._icon(ChronoPanelCardEditor.ICONS.add,16)} Add condition
        </button>
        ${this._addDropdownOpen?html`
              <div class="add-dropdown">
                ${Object.entries(ChronoPanelCardEditor.TYPE_INFO).map(([t,i])=>html`
                  <div class="row" @click=${()=>this._addCondition(t)}>
                    ${this._icon(i.icon,20)}<span>${i.label}</span>
                  </div>
                `)}
              </div>
            `:""}
      </div>
    `}_toggleAddDropdown(t){t.stopPropagation(),this._addDropdownOpen=!this._addDropdownOpen}_addCondition(t){const i=this._config.cards[this._selected],e=i.visibility||[],o="state"===t?customElements.get("ha-card-condition-state").defaultConfig:customElements.get("ha-card-condition-numeric_state").defaultConfig;this._addDropdownOpen=!1,this._updateVisibility(i,[...e,{...o}])}_renderConditionCard(t,i){const e=ChronoPanelCardEditor.TYPE_INFO[t.condition]||{label:t.condition,icon:""},o=this._evaluateOneCondition(t),n=!!this._collapsed[i];return html`
      <div class="condition-card">
        <div class="condition-header" @click=${()=>this._toggleCollapsed(i,n)}>
          <span style="transform:rotate(${n?"0deg":"180deg"});transition:transform .15s;display:inline-flex;">
            ${this._icon(ChronoPanelCardEditor.ICONS.chevron)}
          </span>
          <span class="icon-wrap">
            ${this._icon(e.icon)}
            <span class="badge ${o?"pass":"fail"}"></span>
          </span>
          <span class="label">${e.label}</span>
          <span class="menu-wrap">
            <button class="menu-btn" @click=${t=>this._toggleConditionMenu(t,i)}>
              ${this._icon(ChronoPanelCardEditor.ICONS.menu,18)}
            </button>
            ${this._openMenuIndex===i?html`
                  <div class="menu">
                    <div class="menu-row" @click=${t=>this._deleteConditionFromMenu(t,i)}>Delete</div>
                  </div>
                `:""}
          </span>
        </div>
        ${n?"":html`<div class="condition-body">${this._renderConditionField(t,i)}</div>`}
      </div>
    `}_renderConditionField(t,i){return"state"===t.condition?html`
        <ha-card-condition-state
          .hass=${this._hass}
          .condition=${t}
          @value-changed=${t=>{t.stopPropagation(),this._setCondition(i,t.detail.value)}}
        ></ha-card-condition-state>
      `:html`
      <ha-card-condition-numeric_state
        .hass=${this._hass}
        .condition=${t}
        @value-changed=${t=>{t.stopPropagation(),this._setCondition(i,t.detail.value)}}
      ></ha-card-condition-numeric_state>
    `}_toggleCollapsed(t,i){this._collapsed={...this._collapsed,[t]:!i}}_toggleConditionMenu(t,i){t.stopPropagation(),this._openMenuIndex=this._openMenuIndex===i?null:i}_deleteConditionFromMenu(t,i){t.stopPropagation(),this._openMenuIndex=null,this._removeCondition(i)}}storage({key:"dashboardCardClipboard",state:!1,subscribe:!1,storage:"sessionStorage"})(ChronoPanelCardEditor.prototype,"_clipboard"),customElements.get("chrono-panel-card-editor")||customElements.define("chrono-panel-card-editor",ChronoPanelCardEditor),window.customCards=window.customCards||[],window.customCards.push({type:"chrono-panel-card",name:"Chrono Panel Card",description:"Fills its container 100% and shows whichever child card(s) currently match their visibility condition, with zero reserved space for hidden ones."});