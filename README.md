[![GitHub Release][releases-shield]][releases]
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![Community Forum][forum-shield]][forum]


# 📡 network-monitor-card

Carte Lovelace pour Home Assistant affichant l'état du réseau **Zigbee** et **Z-Wave** en temps réel, avec découverte automatique des appareils.

---

## ✨ Fonctionnalités

- 🔍 **Découverte automatique** — aucune liste manuelle, les appareils sont détectés via les entités HA
- 📶 **Zigbee** — LQI coloré, barres de signal, âge de la dernière communication
- 📻 **Z-Wave** — RSSI en dBm, barres de signal, dernière connexion
- 🗂️ **Groupement par pièce** — zones HA automatiquement récupérées via le registry
- 🎛️ **Filtres cliquables** — OK / Faible / Hors ligne
- 💊 **Filtre par zone** — pills cliquables pour isoler une pièce
- 🪗 **Accordion** — un seul réseau visible à la fois, les deux bandeaux toujours visibles
- 🖱️ **Clic sur un appareil** — ouvre le dialog natif HA (more-info)
- ⏱️ **Critère hors ligne** — appareil sans communication depuis plus de 24h
- 🌡️ **Températures coordinateur** — Core et Coord SLZB-06M affichées en pied de section Zigbee

---

## 📥 Installation

### Via HACS (recommandé) 🔄
1. Ajoutez ce dépôt à HACS :
   **Dépôts personnalisés** → **Ajouter un dépôt personnalisé** → `https://github.com/developpeurbox/somfy-protexial-card/`

### Ou manuellement 🛠️

1. Télécharger le fichier `somfy-protexial-card.js`
2. Le copier dans le répertoire `/config/www/` de Home Assistant
3. Dans HA : **Paramètres → Tableaux de bord → Ressources → Ajouter une ressource**
   - URL : `/local/somfy-protexial-card.js`
   - Type : **Module JavaScript**
4. Vider le cache du navigateur ou de l'app Android (**Paramètres → Compagnon → Vider le cache**)


---

---

## 🔍 Découverte des appareils

### Zigbee (Zigbee2MQTT)

La carte détecte automatiquement les appareils Zigbee selon deux stratégies :

| Mode | Condition |
|------|-----------|
| **Attribut** | L'entité principale expose `linkquality` dans ses attributs |
| **Entité séparée** | Présence d'une entité `sensor.<nom>_linkquality` |

La date de dernière communication est lue depuis `sensor.<nom>_last_seen` ou l'attribut `last_seen`.

### Z-Wave (Z-Wave JS UI)

Détection via les entités `sensor.<nom>_signal_strength` (RSSI en dBm).  
La dernière connexion est lue depuis `sensor.<nom>_derniere_connexion`.

---

## 🎨 Code couleur

### Zigbee — LQI

| Couleur | Seuil | Qualité |
|---------|-------|---------|
| 🟢 Vert | ≥ 150 | Excellent |
| 🟡 Olive | ≥ 100 | Bon |
| 🟠 Orange | ≥ 60 | Faible |
| 🔴 Rouge | < 60 | Critique |
| ⚫ Gris | — | Hors ligne (> 24h) |

### Z-Wave — RSSI (dBm)

| Couleur | Seuil | Qualité |
|---------|-------|---------|
| 🟢 Vert | ≥ -60 dBm | Excellent |
| 🟡 Olive | ≥ -75 dBm | Bon |
| 🟠 Orange | ≥ -85 dBm | Faible |
| 🔴 Rouge | < -85 dBm | Critique |
| ⚫ Gris | — | Hors ligne (> 24h) |

---

## 🌡️ Températures coordinateur Zigbee

La carte lit automatiquement les entités suivantes (SLZB-06M) :

- `sensor.slzb_06m_core_temperature`
- `sensor.slzb_06m_coordinator_temperature`

---

## 🗺️ Zones (pièces)

Les zones sont récupérées depuis le **registry HA** via WebSocket :

1. Area assignée directement à **l'entité**
2. Area assignée au **device** parent

Pour assigner une zone : **Paramètres → Appareils & Services → Appareils → [appareil] → Modifier → Zone**

---

## 📋 Prérequis

- Home Assistant 2023.x ou supérieur
- Zigbee2MQTT (intégration HA)
- Z-Wave JS UI (intégration HA)
- Lovelace en mode YAML ou interface graphique

---

## 🔄 Changelog

### v1.0.0
- 🎉 Version initiale
- Découverte dynamique Zigbee (attribut + entité séparée)
- Découverte dynamique Z-Wave
- Accordion Zigbee / Z-Wave
- Filtres OK / Faible / Hors ligne
- Zones dynamiques via registry HA
- Clic more-info natif HA
- Console log au chargement

---

## ⚙️ Options de configuration

```yaml
type: custom:network-monitor-card
show_zigbee: true   # Afficher le bandeau Zigbee (défaut: true)
show_zwave: true    # Afficher le bandeau Z-Wave (défaut: true)
```

L'éditeur visuel de Lovelace propose des cases à cocher pour ces deux options.



[releases-shield]: https://img.shields.io/github/v/release/developpeurbox/network-monitor-card/?style=for-the-badge
[releases]: https://github.com/developpeurbox/network-monitor-card/releases
[hacs-badge]: https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge
[hacs]: https://github.com/hacs/integration
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io
/
