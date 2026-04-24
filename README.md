# Clavier adaptatif — POC React Native / Expo

Clavier in-app qui redimensionne ses touches en fonction des erreurs de
frappe détectées. Si l'utilisateur presse souvent R à la place de E, E
s'élargit progressivement vers la droite jusqu'à un cap de ±15 %.

Stack : Expo SDK 52, TypeScript, Reanimated, Gesture Handler, expo-sqlite,
Zustand. 100 % local, aucune donnée ne quitte l'appareil.

---

## Démarrage

```bash
npm install
npm start
# puis scanner le QR code avec Expo Go sur un appareil Android
# OU lancer l'émulateur : npm run android
```

L'app contient trois écrans (bottom-tab) :

- **Demo** : une zone de texte + le clavier adaptatif en bas. C'est ici qu'on
  frappe.
- **Stats** : heatmap du taux d'erreur par touche, top 10 des confusions,
  deltas de largeur `current vs base`.
- **Settings** : toggles adaptatif / autocorrect + sliders sur les seuils.

Script utiles :
- `npm test` — tests unitaires de l'engine (5 suites, 26 tests, ~1 s)
- `npm run typecheck` — vérif TypeScript

---

## Où fine-tuner

**TOUS** les seuils sont regroupés dans un seul fichier :

👉 **[`src/engine/tuning.ts`](src/engine/tuning.ts)**

Chaque constante y est documentée avec son rôle, sa plage raisonnable et
l'effet observable. Les valeurs les plus importantes pour ajuster le
comportement :

| Knob | Défaut | Effet |
|---|---|---|
| `DEADBAND` | `0.08` | **Taux d'erreur minimum** pour qu'une touche bouge. 8 % par défaut — sous ce seuil, marge d'erreur naturelle tolérée. |
| `MIN_SAMPLE_SIZE` | `30` | Nombre d'appuis avant de prendre en compte les stats d'une touche. |
| `EMA_ALPHA` | `0.2` | Vitesse d'adaptation. Haut = réactif, bas = lissé. |
| `ADAPT_GAIN` | `0.5` | Proportionnalité entre surplus d'erreur et élargissement. |
| `MAX_DELTA_RATIO` | `0.15` | Cap absolu : ±15 % de la largeur de base par touche. |
| `MIN_NEIGHBOR_RATIO` | `0.7` | Plancher sur le voisin qui cède de la place (ne peut pas descendre sous 70 %). |
| `ADAPT_TRIGGER_WORDS` | `20` | Recalcul après N mots finalisés. |
| `ADAPT_TRIGGER_MS_MAX` | `30_000` | Délai max entre deux recalculs (ms). |
| `COOLDOWN_MS` | `120_000` | Blocage post-ajustement d'une touche (2 min). |
| `ANIMATION_MS` | `400` | Durée de la transition visuelle quand une touche change de taille. |
| `AUTOCORRECT_MAX_EDIT_DISTANCE` | `2` | Distance Levenshtein max pour proposer / appliquer une correction. |
| `AUTOCORRECT_MIN_FREQ` | `1` | Freq min du candidat pour auto-remplacement. |
| `SUGGESTION_DEBOUNCE_MS` | `60` | Délai après la dernière frappe avant recalcul de la barre de suggestions. |
| `UNDO_AUTOCORRECT_MS` | `3_000` | Durée de la chip "revert" pour annuler un autocorrect. |
| `NW_MATCH` / `NW_SUB_ADJACENT` / `NW_SUB_DISTANT` / `NW_GAP_OPEN` / `NW_GAP_EXTEND` | | Coûts Needleman-Wunsch pour l'alignement tapé / final. Plus négatif = plus pénalisant. |

**Deux façons d'override** :

1. **En dur** : éditer `src/engine/tuning.ts`. Les tests reprennent ces valeurs comme defaults.
2. **En live** via l'écran Settings : pour les sliders (deadband, max delta,
   EMA, cooldown, autocorrect). Les valeurs sont injectées via
   `setRuntimeTuning({ DEADBAND: 0.12 })` et prennent effet au prochain
   recalcul (sans redémarrage).

---

## Comment la correction est détectée

Deux chemins, combinés dans [`src/engine/correction/detect.ts`](src/engine/correction/detect.ts) :

### A. Édition manuelle (backspace)
Le `WordBuilder` garde le log brut de chaque touche appuyée, y compris
celles effacées par un backspace (marquées `deleted=true`). À la finalisation,
on reconstruit l'historique par position : si l'utilisateur a tapé R, puis
backspace, puis E, la position 0 contient `[R, E]`. On en déduit une
confusion R → E.

### B. Autocorrect
Quand la finalisation (espace, ponctuation) déclenche une correction
automatique (ex: "bonjoue" → "bonjour"), on aligne ce qui a été tapé
contre le mot final via **Needleman-Wunsch** avec coûts pondérés par la
**distance physique clavier** (touches adjacentes : coût −1, touches
éloignées : coût −3). Les opérations `sub` alimentent la matrice de
confusion, `ins` / `del` sont stats mais pas confusions.

Voir [`src/engine/correction/align.ts`](src/engine/correction/align.ts) et [`src/engine/correction/scoringMatrix.ts`](src/engine/correction/scoringMatrix.ts).

---

## Comment l'adaptation décide

Séquence (tous les 20 mots OU toutes les 30 s, first-wins), par touche :

1. Calcul du taux d'erreur : `erreurs / intendedCount`.
2. Mise à jour de l'EMA : `ema = α × taux + (1 − α) × ema_précédent`.
3. Si `intendedCount < MIN_SAMPLE_SIZE` → skip (stats pas fiables).
4. Si `ema < DEADBAND` → skip (marge d'erreur tolérée).
5. Si `now < cooldownUntilTs` → skip (ajustement récent).
6. Sinon :
   - `topConfuser` = touche la plus souvent pressée à la place.
   - Si c'est un voisin immédiat gauche/droite de la même rangée, on élargit dans sa direction.
   - `delta = min(MAX_DELTA_RATIO × base, GAIN × (ema − DEADBAND) × base)`.
   - Le voisin rétrécit d'autant (invariant de rangée strict : somme des widths inchangée).
   - Cooldown de 2 min sur la touche.
7. Reanimated anime la nouvelle largeur sur `ANIMATION_MS` (400 ms par défaut).

Voir [`src/engine/adapt/compute.ts`](src/engine/adapt/compute.ts).

---

## Architecture

```
src/
├── engine/                # Pure TypeScript, zéro dépendance React Native.
│   ├── tuning.ts          # ⚙ TOUS LES SEUILS AJUSTABLES
│   ├── types.ts
│   ├── layout/            # AZERTY, géométrie
│   ├── log/wordBuilder.ts # Reconstruction mot + gestion backspaces
│   ├── correction/        # Needleman-Wunsch + detect
│   ├── autocorrect/       # SymSpell-lite + dict FR bundlé
│   ├── stats/             # Matrice de confusion + per-key stats
│   ├── adapt/             # Formule adaptative + redistribution
│   ├── persistence/       # Interface Repo + impl memoire (tests)
│   └── index.ts           # Façade Engine (unique point d'entrée)
└── native/                # Couche React Native / Expo
    ├── db/sqlite.ts       # Impl Repo via expo-sqlite
    ├── store/             # Zustand : keyboardStore + settingsStore
    ├── keyboard/          # Keyboard, Key, SuggestionBar (Reanimated)
    └── screens/           # Demo / Stats / Settings

__tests__/engine/          # Jest, pur Node, aucune dépendance RN
```

La frontière est stricte : l'engine ne connaît rien de React, RN ou Expo.
La persistance est inversée via l'interface `Repo` (définie côté engine,
implémentée côté native). Conséquence : un éventuel port en **IME Android
natif (Kotlin)** pourra réutiliser tout l'engine sans modification — seule
la couche `native/` sera à réécrire.

---

## Dictionnaire FR

Bundlé dans [`src/engine/autocorrect/dictionary.ts`](src/engine/autocorrect/dictionary.ts) : ~300 mots les plus fréquents
en français, suffisant pour la démo. Pour la production, remplacer par un
import de Lexique 3 ou OpenSubs freq list (~60k mots) et cacher l'index
SymSpell dans SQLite pour éviter de le reconstruire au démarrage.

---

## Tester le POC

1. Lance l'app : `npm start` → ouvrir avec Expo Go.
2. Sur l'écran Demo, tape une vingtaine de mots. Force volontairement des
   confusions en pressant R au lieu de E, ou A au lieu de Q.
3. Va sur Stats : la heatmap devrait colorer en jaune/rouge les touches où
   tu as fait des erreurs, et la liste "Top confusions" doit les lister.
4. Après ~20 mots finalisés, la touche attendue s'élargit visuellement
   (animation 400 ms). Son voisin rétrécit en miroir.
5. Dans Settings, descendre `DEADBAND` à 3 % ou augmenter `MAX_DELTA_RATIO`
   à 25 % pour rendre l'effet plus prononcé.

---

## Limites connues (v1)

- **Cible mouvante** : le layout qui bouge peut causer de nouvelles erreurs
  de muscle memory. Le cooldown 2 min + cap ±15 % + animation 400 ms
  atténuent, mais à considérer selon l'usage.
- **Redistribution voisins seulement** : si le top confuser n'est pas un
  voisin immédiat de la même rangée, la touche ne bouge pas en v1.
- **Dictionnaire léger (~300 mots)** : proper nouns, argot, verlan
  déclencheront des faux autocorrects → fausses confusions dans la matrice.
- **Pas d'IME système** : c'est un clavier in-app uniquement. Pour un IME
  Android réel, il faudra réécrire `src/native/` en Kotlin (mais `src/engine/`
  est portable mécaniquement).
