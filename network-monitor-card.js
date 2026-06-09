/**
 * network-monitor-card.js
 * Carte rÃ©seau Zigbee + Z-Wave pour Home Assistant
 *
 * /config/www/network-monitor-card.js
 * type: custom:network-monitor-card
 *
 * Options :
 *   show_zigbee: true   (dÃ©faut: true)
 *   show_zwave:  true   (dÃ©faut: true)
 *
 * @version 1.1.0
 */

const NMC_VERSION = "1.3.0";
const NMC_NAME    = "network-monitor-card";
const OFFLINE_MS  = 24 * 60 * 60 * 1000;

console.info(
  "%c NETWORK-MONITOR-CARD %c v" + NMC_VERSION + " ",
  "background:#070b12;color:#2ecc71;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;font-family:monospace",
  "background:#0e1420;color:#5d8aaa;font-weight:400;padding:2px 6px;border-radius:0 4px 4px 0;font-family:monospace"
);

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseLastSeen(raw) {
  if (!raw || raw === "unknown" || raw === "unavailable") return { label: null, ms: null };
  try {
    var d = new Date(raw);
    if (isNaN(d.getTime())) return { label: null, ms: null };
    var ms   = Date.now() - d.getTime();
    var diff = Math.floor(ms / 60000);
    var label = diff < 60 ? diff + "m" : diff < 1440 ? Math.floor(diff / 60) + "h" : Math.floor(diff / 1440) + "j";
    return { label: label, ms: ms };
  } catch (e) { return { label: null, ms: null }; }
}

function isOffline(ms) { return ms === null || ms > OFFLINE_MS; }

function ageColor(ms) {
  if (ms === null) return "#4a5c6a";
  if (ms < 60 * 60 * 1000)      return "#2ecc71";
  if (ms < 3  * 60 * 60 * 1000) return "#9acd32";
  if (ms < 12 * 60 * 60 * 1000) return "#e67e22";
  return "#e74c3c";
}

function signalBarsHTML(count, color) {
  var html = "";
  for (var i = 0; i < 4; i++) {
    var h    = 4 + (i + 1) * 2.5;
    var fill = i < count ? color : "#2a3d50";
    html += '<div style="width:3px;height:' + h + 'px;border-radius:1px;background:' + fill + ';align-self:flex-end"></div>';
  }
  return html;
}

// â”€â”€â”€ Couleurs â€” plus lumineuses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function lqiMeta(lqi, offline) {
  if (offline) return { bg: "#141c28", border: "#243040", text: "#4a6070", bars: 0 };
  if (lqi === null) return { bg: "#141c28", border: "#243040", text: "#4a6070", bars: 0 };
  if (lqi >= 150) return { bg: "#0d2518", border: "#1e6b3a", text: "#2ecc71", bars: 4 };
  if (lqi >= 100) return { bg: "#1a2200", border: "#4a6200", text: "#aadd22", bars: 3 };
  if (lqi >= 60)  return { bg: "#261800", border: "#7a4e00", text: "#f39c12", bars: 2 };
  return              { bg: "#260808", border: "#7a1a1a", text: "#e74c3c", bars: 1 };
}

function rssiMeta(rssi, offline) {
  if (offline) return { bg: "#141c28", border: "#243040", text: "#4a6070", bars: 0 };
  if (rssi === null) return { bg: "#141c28", border: "#243040", text: "#4a6070", bars: 0 };
  if (rssi >= -60) return { bg: "#0d2518", border: "#1e6b3a", text: "#2ecc71", bars: 4 };
  if (rssi >= -75) return { bg: "#1a2200", border: "#4a6200", text: "#aadd22", bars: 3 };
  if (rssi >= -85) return { bg: "#261800", border: "#7a4e00", text: "#f39c12", bars: 2 };
  return               { bg: "#260808", border: "#7a1a1a", text: "#e74c3c", bars: 1 };
}

// â”€â”€â”€ Filtres â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

var ZB_FILTERS = [
  { key: "all",     label: "TOUS",       color: "#5d8aaa", test: function(d) { return true; } },
  { key: "ok",      label: "OK",         color: "#2ecc71", test: function(d) { return !d.offline && d.lqi !== null && d.lqi >= 100; } },
  { key: "weak",    label: "FAIBLE",     color: "#f39c12", test: function(d) { return !d.offline && d.lqi !== null && d.lqi < 100; } },
  { key: "offline", label: "HORS LIGNE", color: "#4a6070", test: function(d) { return d.offline; } },
];

var ZW_FILTERS = [
  { key: "all",     label: "TOUS",       color: "#5d8aaa", test: function(d) { return true; } },
  { key: "ok",      label: "OK",         color: "#2ecc71", test: function(d) { return !d.offline && d.rssi !== null && d.rssi >= -75; } },
  { key: "weak",    label: "FAIBLE",     color: "#f39c12", test: function(d) { return !d.offline && d.rssi !== null && d.rssi < -75; } },
  { key: "offline", label: "HORS LIGNE", color: "#4a6070", test: function(d) { return d.offline; } },
];

// â”€â”€â”€ CSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

var COMMON_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  :host{display:block;font-family:'Courier New',monospace}
  .wrap{display:flex;flex-direction:column;gap:8px}

  .section{background:var(--nmc-bg);border-radius:12px;overflow:hidden;border:1px solid #1a2540}
  .shead{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;border-bottom:1px solid transparent;transition:border-color .2s;user-select:none;-webkit-user-select:none}
  .shead.open{border-bottom-color:#1e2e44}

  .sicon{width:34px;height:34px;flex-shrink:0;border-radius:8px;display:flex;align-items:center;justify-content:center}
  .sicon.zb{background:#0d2518;border:1px solid #1e6b3a;animation:zp 2.5s ease-in-out infinite}
  .sicon.zw{background:#0d1a30;border:1px solid #1e4070;animation:wp 2.5s ease-in-out infinite}
  @keyframes zp{0%,100%{box-shadow:0 0 6px #2ecc7133}50%{box-shadow:0 0 18px #2ecc7166}}
  @keyframes wp{0%,100%{box-shadow:0 0 6px #4a9ed433}50%{box-shadow:0 0 18px #4a9ed466}}

  .stitle{font-size:13px;font-weight:700;letter-spacing:.1em}
  .ssub{font-size:10px;color:#3a5570;letter-spacing:.07em;margin-top:2px}

  .sbadges{display:flex;gap:5px;margin-left:auto;align-items:center;flex-wrap:wrap}
  .sbadge{border-radius:5px;padding:3px 9px;font-size:11px;font-weight:700;border:1px solid;letter-spacing:.05em;font-family:monospace}
  .schevron{margin-left:6px;font-size:13px;color:#3a5570;transition:transform .25s;flex-shrink:0}
  .schevron.open{transform:rotate(180deg)}

  .sbody{max-height:0;overflow:hidden;transition:max-height .4s ease;padding:0 16px}
  .sbody.open{max-height:5000px;padding:14px 16px}

  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
  .stbtn{border-radius:8px;padding:12px 6px 10px;text-align:center;border:1px solid;cursor:pointer;background:transparent;font-family:monospace;transition:transform .12s}
  .stbtn:active{transform:scale(.96)}
  .stval{font-size:24px;font-weight:700;line-height:1}
  .stlbl{font-size:9px;letter-spacing:.09em;margin-top:5px}

  .zones{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px}
  .zpill{background:transparent;border:1px solid #1e3050;color:#4a6a80;border-radius:20px;padding:4px 11px;font-size:10px;cursor:pointer;letter-spacing:.08em;font-family:monospace;transition:all .15s}
  .zpill.on{background:#0d1f35;border-color:#4a9ed4;color:#7ac8f0}

  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
  .zgroup{margin-bottom:18px}
  .zlabel{display:flex;align-items:center;gap:7px;font-size:10px;color:#4a6a80;letter-spacing:.14em;margin-bottom:9px}
  .zlabel .ln{flex:1;height:1px;background:#1a2840}

  .dev{border-radius:8px;padding:11px 12px;display:flex;flex-direction:column;gap:7px;border:1px solid;position:relative;overflow:hidden;cursor:pointer;transition:filter .15s,box-shadow .15s}
  .dev:hover{filter:brightness(1.15);box-shadow:0 0 14px rgba(0,0,0,.5)}
  .dev:active{filter:brightness(1.3)}

  .dname{font-size:11px;color:#8aacbe;line-height:1.35}
  .drow{display:flex;align-items:center;justify-content:space-between}
  .bars{display:flex;align-items:flex-end;gap:2px;height:14px}
  .sigval{font-size:22px;font-weight:700;line-height:1}
  .sigunit{font-size:10px;font-weight:400;margin-left:1px;opacity:.8}
  .abadge{font-size:10px;border-radius:5px;padding:2px 6px;border:1px solid;font-family:monospace;font-weight:600}

  .empty{grid-column:1/-1;text-align:center;padding:28px;color:#3a5570;font-size:11px;letter-spacing:.1em}
  .footer{display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid #1a2840;font-size:10px;color:#2e4560;letter-spacing:.07em;margin-top:6px}
  .fver{text-align:right;padding:3px 4px;font-size:9px;color:#1e2e40;letter-spacing:.05em;font-family:monospace}
  .loading{text-align:center;padding:32px;color:#3a5570;font-size:11px;letter-spacing:.15em;animation:bk 1.2s ease-in-out infinite}
  @keyframes bk{0%,100%{opacity:.3}50%{opacity:1}}
`;

// â”€â”€â”€ Web Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class NetworkMonitorCard extends HTMLElement {
  constructor() {
    super();
    this._shadow          = this.attachShadow({ mode: "open" });
    this._rendered        = false;
    this._hass            = null;
    this._config          = {};
    this._openSection     = null;
    this._zbFilter        = "all";
    this._zbZone          = null;
    this._zwFilter        = "all";
    this._zwZone          = null;
    this._areas           = {};
    this._deviceAreas     = {};
    this._entityDevice    = {}; // entity_id â†’ device_id
    this._entityMap       = {}; // entity_id â†’ { device_id, area_id }
    this._registryReady   = false;
    this._registryLoading = false;
    this._zwaveDeviceIds  = {};  // device_id â†’ true  (appareils Z-Wave JS)
    this._deviceEntities  = {};  // device_id â†’ [entity_id, ...]
  }

  // â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Options :
  //   show_zigbee: true/false  (dÃ©faut true)
  //   show_zwave:  true/false  (dÃ©faut true)

  setConfig(config) {
    this._config = config || {};
  }

  get _showZb() { return this._config.show_zigbee !== false; }
  get _showZw() { return this._config.show_zwave  !== false; }
  get _bgColor() { return this._config.background_color || '#0c1220'; }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) { this._render(); this._rendered = true; }
    if (!this._registryReady && !this._registryLoading) {
      this._loadRegistry();
    } else {
      this._update();
    }
  }

  // â”€â”€ Registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _loadRegistry() {
    this._registryLoading = true;
    var self = this;
    Promise.all([
      this._hass.connection.sendMessagePromise({ type: "config/area_registry/list" }),
      this._hass.connection.sendMessagePromise({ type: "config/device_registry/list" }),
      this._hass.connection.sendMessagePromise({ type: "config/entity_registry/list" }),
    ]).then(function(res) {
      var i;
      for (i = 0; i < res[0].length; i++) self._areas[res[0][i].area_id] = { name: res[0][i].name, icon: res[0][i].icon || null };
      for (i = 0; i < res[1].length; i++) {
        var dev = res[1][i];
        if (dev.area_id) self._deviceAreas[dev.id] = dev.area_id;
        // DÃ©tecte les devices Z-Wave JS via identifiers (domain zwave_js)
        if (dev.identifiers) {
          for (var ii = 0; ii < dev.identifiers.length; ii++) {
            if (dev.identifiers[ii][0] === "zwave_js") { self._zwaveDeviceIds[dev.id] = true; break; }
          }
        }
      }
      for (i = 0; i < res[2].length; i++) {
        var ent = res[2][i];
        if (ent.device_id) {
          if (!self._deviceEntities[ent.device_id]) self._deviceEntities[ent.device_id] = [];
          self._deviceEntities[ent.device_id].push(ent.entity_id);
        }
      }
      for (i = 0; i < res[2].length; i++) {
        var e = res[2][i];
        self._entityMap[e.entity_id]    = { device_id: e.device_id || null, area_id: e.area_id || null };
        if (e.device_id) self._entityDevice[e.entity_id] = e.device_id;
      }
      self._registryLoading = false;
      self._registryReady   = true;
      self._update();
    }).catch(function(e) {
      console.warn("[" + NMC_NAME + "] registry error:", e);
      self._registryLoading = false;
      self._registryReady   = true;
      self._update();
    });
  }

  _zoneOf(entityId) {
    var e = this._entityMap[entityId];
    if (!e) return null;
    if (e.area_id && this._areas[e.area_id]) return this._areas[e.area_id];
    if (e.device_id) { var a = this._deviceAreas[e.device_id]; if (a && this._areas[a]) return this._areas[a]; }
    return null;
  }

  _zoneName(z) { return z ? z.name : "â€”"; }
  _zoneIcon(z) { return z ? z.icon : null; }

  // Ouvre la fiche du device parent si possible, sinon de l'entitÃ© signal
  _openMoreInfo(signalEntityId, mainEntityId) {
    // On cherche d'autres entitÃ©s du mÃªme device pour trouver une entitÃ©
    // "principale" (pas un sensor de signal) â€” ou on ouvre le device directement
    var targetEntity = mainEntityId || signalEntityId;
    var ev = new CustomEvent("hass-more-info", {
      composed: true, bubbles: true,
      detail: { entityId: targetEntity }
    });
    this.dispatchEvent(ev);
  }

  // â”€â”€ DÃ©couverte Zigbee â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _discoverZigbee() {
    var states   = this._hass.states;
    var seen     = {};
    var devices  = [];
    var prefixes = ["sensor.", "binary_sensor.", "switch.", "light.", "cover.", "climate.", "lock.", "button."];

    // Passe 1 : attribut linkquality
    for (var eid in states) {
      var attrs = states[eid].attributes || {};
      if (!("linkquality" in attrs)) continue;
      var lqi = parseInt(attrs.linkquality); if (isNaN(lqi)) lqi = null;
      var lsRaw = attrs.last_seen || null;
      if (!lsRaw) { var lse = states["sensor." + eid.split(".")[1] + "_last_seen"]; if (lse) lsRaw = lse.state; }
      var ls = parseLastSeen(lsRaw);
      seen[eid.split(".")[1]] = true;
      devices.push({ signalEntityId: eid, mainEntityId: eid, name: (attrs.friendly_name || eid).replace(/_/g, " "), lqi: lqi, age: ls.label, agems: ls.ms, offline: isOffline(ls.ms), zone: this._zoneOf(eid) || { name: "â€”", icon: null } });
    }

    // Passe 2 : sensor.*_linkquality
    for (var eid in states) {
      if (eid.indexOf("sensor.") !== 0 || eid.slice(-12) !== "_linkquality") continue;
      var base = eid.split(".")[1].slice(0, -12);
      if (seen[base]) continue;
      seen[base] = true;
      var raw = states[eid].state;
      var lqi = (raw && raw !== "unknown" && raw !== "unavailable") ? parseInt(raw) : null; if (isNaN(lqi)) lqi = null;
      var mainId = null, mainAttrs = {};
      for (var pi = 0; pi < prefixes.length; pi++) { if (states[prefixes[pi] + base]) { mainId = prefixes[pi] + base; mainAttrs = states[mainId].attributes || {}; break; } }
      var lsRaw = null;
      var lse2 = states["sensor." + base + "_last_seen"]; if (lse2) lsRaw = lse2.state;
      if (!lsRaw && mainAttrs.last_seen) lsRaw = mainAttrs.last_seen;
      var ls = parseLastSeen(lsRaw);
      var lqiA = states[eid].attributes || {};
      var friendly = (mainAttrs.friendly_name || lqiA.friendly_name || base).replace(/ linkquality$/i, "").replace(/ lqi$/i, "").replace(/_/g, " ");
      var rid = mainId || eid;
      var zone = this._zoneOf(rid) || this._zoneOf(eid) || { name: "â€”", icon: null };
      devices.push({ signalEntityId: eid, mainEntityId: rid, name: friendly, lqi: lqi, age: ls.label, agems: ls.ms, offline: isOffline(ls.ms), zone: zone });
    }

    return devices.sort(function(a, b) { var za = a.zone.name, zb = b.zone.name; return za < zb ? -1 : za > zb ? 1 : a.name < b.name ? -1 : 1; });
  }

  // â”€â”€ DÃ©couverte Z-Wave â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _discoverZwave() {
    var states  = this._hass.states;
    var seen    = {};
    var devices = [];
    // PrioritÃ© pour le more-info : ces domaines sont "intÃ©ressants"
    var goodDomains = ["binary_sensor.", "switch.", "light.", "cover.", "climate.", "lock.", "sensor."];

    for (var eid in states) {
      if (eid.indexOf("sensor.") !== 0 || eid.slice(-16) !== "_signal_strength") continue;

      // VÃ©rifie que ce sensor appartient Ã  un device Z-Wave JS
      var entryMap = this._entityMap[eid];
      if (!entryMap || !entryMap.device_id) continue;
      if (!this._zwaveDeviceIds[entryMap.device_id]) continue;

      var base = eid.split(".")[1].slice(0, -16);
      if (seen[base]) continue;
      seen[base] = true;

      var raw  = states[eid].state;
      var rssi = (raw && raw !== "unknown" && raw !== "unavailable") ? parseFloat(raw) : null;
      if (isNaN(rssi)) rssi = null;

      var lsRaw = null;
      var lse = states["sensor." + base + "_derniere_connexion"]; if (lse) lsRaw = lse.state;
      var ls = parseLastSeen(lsRaw);

      var attrs    = states[eid].attributes || {};
      var friendly = (attrs.friendly_name || base)
        .replace(/ signal strength$/i, "").replace(/ signal$/i, "").replace(/_/g, " ");

      // Cherche la meilleure entitÃ© pour le more-info parmi toutes les entitÃ©s du device
      // PrioritÃ© : non-sensor d'abord, puis sensor autre que _signal_strength/_derniere_connexion
      var mainId   = null;
      var devEnts  = this._deviceEntities[entryMap.device_id] || [];
      var preferred = ["binary_sensor.", "switch.", "light.", "cover.", "climate.", "lock."];
      outer: for (var pi = 0; pi < preferred.length; pi++) {
        for (var ei = 0; ei < devEnts.length; ei++) {
          if (devEnts[ei].indexOf(preferred[pi]) === 0) { mainId = devEnts[ei]; break outer; }
        }
      }
      // Fallback : n'importe quel sensor du device sauf le signal et la connexion
      if (!mainId) {
        for (var ei = 0; ei < devEnts.length; ei++) {
          var candidate = devEnts[ei];
          if (candidate === eid) continue;
          if (candidate.slice(-16) === "_signal_strength") continue;
          if (candidate.indexOf("_derniere_connexion") !== -1) continue;
          if (candidate.indexOf("sensor.") === 0) { mainId = candidate; break; }
        }
      }

      devices.push({
        signalEntityId: eid,
        mainEntityId:   mainId || eid,
        name:           friendly,
        rssi:           rssi,
        age:            ls.label,
        agems:          ls.ms,
        offline:        isOffline(ls.ms),
        zone:           this._zoneOf(eid) || { name: "â€”", icon: null }
      });
    }

    return devices.sort(function(a, b) { var za = a.zone.name, zb = b.zone.name; return za < zb ? -1 : za > zb ? 1 : a.name < b.name ? -1 : 1; });
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _render() {
    var zbHTML = "", zwHTML = "";

    if (this._showZb) zbHTML = `
      <div class="section" id="sec-zb">
        <div class="shead" id="head-zb">
          <div class="sicon zb">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#2ecc71" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#2ecc71" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#2ecc71" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div class="stitle" style="color:#2ecc71">ZIGBEE</div>
            <div class="ssub">SLZB-06M Â· EFR32 Â· COORDINATOR</div>
          </div>
          <div class="sbadges" id="zb-badges"></div>
          <div class="schevron" id="chev-zb">â–¼</div>
        </div>
        <div class="sbody" id="body-zb">
          <div class="stats" id="zb-stats"></div>
          <div class="zones" id="zb-zones"></div>
          <div id="zb-content"><div class="loading">CHARGEMENTâ€¦</div></div>
          <div class="footer"><span id="zb-fl">â€”</span><span id="zb-fr">â€”</span></div>
        </div>
      </div>`;

    if (this._showZw) zwHTML = `
      <div class="section" id="sec-zw">
        <div class="shead" id="head-zw">
          <div class="sicon zw">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5c0-4.14 3.36-7.5 7.5-7.5" stroke="#4a9ed4" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M5 12.5c0 4.14 3.36 7.5 7.5 7.5"  stroke="#4a9ed4" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 12.5c0-2.49 2.01-4.5 4.5-4.5"  stroke="#4a9ed4" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 12.5c0 2.49 2.01 4.5 4.5 4.5"   stroke="#4a9ed4" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="12.5" cy="12.5" r="1.5" fill="#4a9ed4"/>
              <path d="M15.5 9.5c1.66 1.66 1.66 4.34 0 6"  stroke="#4a9ed4" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M18.5 6.5c3.32 3.32 3.32 8.68 0 12" stroke="#4a9ed4" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <div class="stitle" style="color:#4a9ed4">Z-WAVE</div>
            <div class="ssub">Z-WAVE JS UI Â· 700 SERIES</div>
          </div>
          <div class="sbadges" id="zw-badges"></div>
          <div class="schevron" id="chev-zw">â–¼</div>
        </div>
        <div class="sbody" id="body-zw">
          <div class="stats" id="zw-stats"></div>
          <div class="zones" id="zw-zones"></div>
          <div id="zw-content"><div class="loading">CHARGEMENTâ€¦</div></div>
          <div class="footer"><span id="zw-fl">â€”</span><span id="zw-fr">Z-WAVE JS UI</span></div>
        </div>
      </div>`;

    var bg = this._bgColor;
    this._shadow.innerHTML = `
      <style>${COMMON_CSS}</style>
      <div class="wrap" style="--nmc-bg:${bg}">
        ${zbHTML}
        ${zwHTML}
        <div class="fver">${NMC_NAME} v${NMC_VERSION}</div>
      </div>`;

    var self = this;
    if (this._showZb) this._shadow.getElementById("head-zb").addEventListener("click", function() { self._toggle("zb"); });
    if (this._showZw) this._shadow.getElementById("head-zw").addEventListener("click", function() { self._toggle("zw"); });
  }

  // â”€â”€ Accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _toggle(name) {
    this._openSection = this._openSection === name ? null : name;
    this._applyAccordion();
  }

  _applyAccordion() {
    var all = ["zb", "zw"];
    for (var i = 0; i < all.length; i++) {
      var s    = all[i];
      var open = this._openSection === s;
      var body = this._shadow.getElementById("body-" + s);
      var head = this._shadow.getElementById("head-" + s);
      var chev = this._shadow.getElementById("chev-" + s);
      if (body) { open ? body.classList.add("open") : body.classList.remove("open"); }
      if (head) { open ? head.classList.add("open") : head.classList.remove("open"); }
      if (chev) { open ? chev.classList.add("open") : chev.classList.remove("open"); }
    }
  }

  // â”€â”€ Update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _update() {
    if (!this._hass || !this._registryReady) return;
    if (this._showZb) this._updateSection("zb");
    if (this._showZw) this._updateSection("zw");
    this._applyAccordion();
  }

  _updateSection(net) {
    var isZb    = net === "zb";
    var all     = isZb ? this._discoverZigbee() : this._discoverZwave();
    var filters = isZb ? ZB_FILTERS : ZW_FILTERS;
    var self    = this;
    var shadow  = this._shadow;

    // Badges bandeau
    var cOk      = all.filter(filters[1].test).length;
    var cWeak    = all.filter(filters[2].test).length;
    var cOffline = all.filter(filters[3].test).length;
    var okColor  = isZb ? "#2ecc71" : "#4a9ed4";
    shadow.getElementById(net + "-badges").innerHTML =
      '<span class="sbadge" style="color:' + okColor + ';border-color:' + okColor + '44;background:' + okColor + '18">' + cOk + ' OK</span>' +
      (cWeak    ? '<span class="sbadge" style="color:#f39c12;border-color:#f39c1244;background:#f39c1218">' + cWeak + ' âš </span>' : "") +
      (cOffline ? '<span class="sbadge" style="color:#4a6070;border-color:#4a607044;background:#4a607018">' + cOffline + ' OFF</span>' : "");

    // Stat buttons
    var activeFilter = isZb ? this._zbFilter : this._zwFilter;
    var statsHTML = "";
    for (var fi = 1; fi < filters.length; fi++) {
      var f = filters[fi], active = activeFilter === f.key;
      var count = all.filter(f.test).length;
      statsHTML += '<button class="stbtn" data-filter="' + f.key + '" data-net="' + net + '" style="color:' + f.color +
        ';border-color:' + (active ? f.color : f.color + "33") +
        ';background:'   + (active ? f.color + "18" : "transparent") +
        ';box-shadow:'   + (active ? "0 0 14px " + f.color + "44" : "none") + '">' +
        '<div class="stval">' + count + '</div><div class="stlbl">' + f.label + '</div></button>';
    }
    var statsEl = shadow.getElementById(net + "-stats");
    statsEl.innerHTML = statsHTML;
    statsEl.querySelectorAll(".stbtn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        if (btn.dataset.net === "zb") { self._zbFilter = btn.dataset.filter; self._zbZone = null; }
        else                          { self._zwFilter = btn.dataset.filter; self._zwZone = null; }
        self._updateSection(btn.dataset.net);
      });
    });


    // Zone pills
    var zones      = this._uniqueZones(all);
    var activeZone = isZb ? this._zbZone : this._zwZone;
    var zpHTML = '<button class="zpill ' + (!activeZone ? "on" : "") + '" data-zone="" data-net="' + net + '">TOUTES</button>';
    for (var zi = 0; zi < zones.length; zi++) {
      var zn = zones[zi].name, zi2 = zones[zi].icon;
      zpHTML += '<button class="zpill ' + (activeZone === zn ? "on" : "") + '" data-zone="' + zn + '" data-net="' + net + '">' + (zi2 ? '<ha-icon icon="' + zi2 + '" style="--mdc-icon-size:13px;margin-right:4px"></ha-icon>' : '') + zn.toUpperCase() + '</button>';
    }
    var zonesEl = shadow.getElementById(net + "-zones");
    zonesEl.innerHTML = zpHTML;
    zonesEl.querySelectorAll(".zpill").forEach(function(pill) {
      pill.addEventListener("click", function() {
        if (pill.dataset.net === "zb") { self._zbZone = pill.dataset.zone || null; self._zbFilter = "all"; }
        else                           { self._zwZone = pill.dataset.zone || null; self._zwFilter = "all"; }
        self._updateSection(pill.dataset.net);
      });
    });

    // Filtrage
    activeFilter = isZb ? this._zbFilter : this._zwFilter;
    activeZone   = isZb ? this._zbZone   : this._zwZone;
    var ff = filters[0].test;
    for (var fi = 0; fi < filters.length; fi++) { if (filters[fi].key === activeFilter) { ff = filters[fi].test; break; } }
    var filtered = all.filter(ff);
    if (activeZone) { var az = activeZone; filtered = filtered.filter(function(d) { return d.zone.name === az; }); }

    // Contenu
    var content = shadow.getElementById(net + "-content");
    var flat    = activeFilter !== "all" || activeZone;

    if (flat) {
      var html = '<div class="grid">';
      html += filtered.length ? filtered.map(function(d) { return self._deviceHTML(d, isZb); }).join("") : '<div class="empty">AUCUN APPAREIL</div>';
      content.innerHTML = html + '</div>';
    } else {
      var html = "";
      for (var zi = 0; zi < zones.length; zi++) {
        var z    = zones[zi];
        var devs = all.filter(function(d) { return d.zone.name === z.name; });
        if (!devs.length) continue;
        var zIcon = z.icon ? '<ha-icon icon="' + z.icon + '" style="--mdc-icon-size:14px;margin-right:5px;color:#5a7a90"></ha-icon>' : '';
        html += '<div class="zgroup"><div class="zlabel">' + zIcon + '<span>' + z.name.toUpperCase() + '</span><div class="ln"></div><span>' + devs.length + '</span></div><div class="grid">';
        html += devs.map(function(d) { return self._deviceHTML(d, isZb); }).join("");
        html += '</div></div>';
      }
      content.innerHTML = html || '<div class="loading">AUCUN APPAREIL DÃ‰TECTÃ‰</div>';
    }

    // Bind clics more-info sur entitÃ© principale
    content.querySelectorAll(".dev").forEach(function(el) {
      el.addEventListener("click", function() {
        self._openMoreInfo(el.dataset.signal, el.dataset.main);
      });
    });

    // Footer
    shadow.getElementById(net + "-fl").textContent = filtered.length + " / " + all.length + " AFFICHÃ‰S";
    if (isZb) {
      var s = this._hass.states;
      var tC = (s["sensor.slzb_06m_core_temperature"] || s["sensor.slzb_06_core_temperature"] || {}).state;
      var tO = (s["sensor.slzb_06m_coordinator_temperature"] || s["sensor.slzb_06_coordinator_temperature"] || {}).state;
      var parts = [];
      if (tC && tC !== "unavailable") parts.push("CORE "  + parseFloat(tC).toFixed(1) + "Â°C");
      if (tO && tO !== "unavailable") parts.push("COORD " + parseFloat(tO).toFixed(1) + "Â°C");
      shadow.getElementById("zb-fr").textContent = parts.join(" Â· ") || "â€”";
    }
  }

  // â”€â”€ Device HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _deviceHTML(d, isZb) {
    var meta, sigVal, sigUnit;
    if (isZb) {
      meta    = lqiMeta(d.lqi, d.offline);
      sigVal  = d.lqi !== null ? d.lqi : "â€”";
      sigUnit = "";
    } else {
      meta    = rssiMeta(d.rssi, d.offline);
      sigVal  = d.rssi !== null ? d.rssi : "â€”";
      sigUnit = d.rssi !== null ? '<span class="sigunit">dBm</span>' : "";
    }
    var ac   = ageColor(d.agems);
    var bars = signalBarsHTML(meta.bars, meta.text);

    var h = '<div class="dev" data-signal="' + d.signalEntityId + '" data-main="' + d.mainEntityId + '" style="background:' + meta.bg + ';border-color:' + meta.border + '">';
    h += '<div class="dname">' + d.name + '</div>';
    h += '<div class="drow">';
    h += '<div style="display:flex;align-items:center;gap:7px"><div class="bars">' + bars + '</div>';
    h += '<span class="sigval" style="color:' + meta.text + '">' + sigVal + sigUnit + '</span></div>';
    if (d.offline) {
      h += '<span class="abadge" style="color:#4a6070;background:#4a607018;border-color:#4a607044">OFF</span>';
    } else if (d.age) {
      h += '<span class="abadge" style="color:' + ac + ';background:' + ac + '18;border-color:' + ac + '44">' + d.age + '</span>';
    }
    h += '</div></div>';
    return h;
  }

  // â”€â”€ Util â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _uniqueZones(devices) {
    var seen = {}, zones = [];
    for (var i = 0; i < devices.length; i++) {
      var z = devices[i].zone;
      if (!seen[z.name]) { seen[z.name] = true; zones.push(z); }
    }
    return zones.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  }

  static getConfigElement() {
    return document.createElement("network-monitor-card-editor");
  }

  static getStubConfig() {
    return { show_zigbee: true, show_zwave: true, background_color: '#0c1220' };
  }

  getCardSize() { return 3; }
}

// â”€â”€â”€ Ã‰diteur visuel (GUI editor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class NetworkMonitorCardEditor extends HTMLElement {
  setConfig(config) { this._config = config || {}; this._render(); }
  set hass(hass) { this._hass = hass; }

  _render() {
    var self = this;
    var cfg  = this._config;
    var bg   = cfg.background_color || "#0c1220";
    this.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;padding:8px;font-family:sans-serif">
        <div style="font-weight:600;font-size:14px;color:#ccc">RÃ©seaux Ã  afficher</div>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="cb-zb" ${cfg.show_zigbee !== false ? "checked" : ""} style="width:18px;height:18px">
          <span style="color:#2ecc71;font-weight:600">Zigbee</span>
        </label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="cb-zw" ${cfg.show_zwave !== false ? "checked" : ""} style="width:18px;height:18px">
          <span style="color:#4a9ed4;font-weight:600">Z-Wave</span>
        </label>
        <div style="font-weight:600;font-size:14px;color:#ccc;margin-top:4px">Couleur de fond</div>
        <div style="display:flex;align-items:center;gap:12px">
          <input type="color" id="inp-bg" value="${bg}" style="width:48px;height:36px;border:none;background:none;cursor:pointer;padding:0">
          <span id="lbl-bg" style="font-family:monospace;font-size:13px;color:#aaa">${bg}</span>
          <button id="btn-bg-reset" style="font-size:11px;color:#888;background:transparent;border:1px solid #444;border-radius:4px;padding:3px 8px;cursor:pointer">DÃ©faut</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap" id="bg-presets">
          ${["#0c1220","#070b12","#111111","#1a1a2e","#0d1b2a","#12181f","#1c1c1c"].map(function(col) {
            return '<div data-col="' + col + '" style="width:28px;height:28px;border-radius:5px;background:' + col + ';cursor:pointer;border:2px solid ' + (bg === col ? "#fff" : "transparent") + '"></div>';
          }).join("")}
        </div>
      </div>
    `;
    this.querySelector("#cb-zb").addEventListener("change", function(e) { self._fire("show_zigbee", e.target.checked); });
    this.querySelector("#cb-zw").addEventListener("change", function(e) { self._fire("show_zwave",  e.target.checked); });
    var inpBg = this.querySelector("#inp-bg");
    var lblBg = this.querySelector("#lbl-bg");
    inpBg.addEventListener("input", function(e) {
      lblBg.textContent = e.target.value;
      self._fire("background_color", e.target.value);
    });
    this.querySelector("#btn-bg-reset").addEventListener("click", function() {
      inpBg.value = "#0c1220"; lblBg.textContent = "#0c1220";
      self._fire("background_color", "#0c1220");
    });
    this.querySelectorAll("#bg-presets [data-col]").forEach(function(el) {
      el.addEventListener("click", function() {
        var col = el.dataset.col;
        inpBg.value = col; lblBg.textContent = col;
        self._fire("background_color", col);
      });
    });
  }

  _fire(key, value) {
    var newConfig = Object.assign({}, this._config);
    newConfig[key] = value;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
  }
}

customElements.define("network-monitor-card",        NetworkMonitorCard);
customElements.define("network-monitor-card-editor", NetworkMonitorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        "network-monitor-card",
  name:        "Network Monitor Card",
  description: "Surveillance rÃ©seau Zigbee + Z-Wave avec dÃ©couverte automatique",
  preview:     false,
});
