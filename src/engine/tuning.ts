/**
 * TUNING.ts — toutes les constantes ajustables du clavier adaptatif.
 *
 * C'EST ICI qu'on fine-tune le comportement. Un seul fichier, zéro magie
 * ailleurs dans le code. Chaque valeur est annotée avec : rôle, plage
 * raisonnable, effet observable si on l'augmente / la diminue.
 *
 * Ces valeurs sont utilisées par défaut au démarrage. L'écran Settings
 * permet de les surcharger en live (cf. native/store/statsStore.ts).
 */

export const TUNING = {
  // ───────────────────────────────────────────────────────────────────────
  // DÉTECTION D'ERREUR — seuil au-dessus duquel une touche commence à bouger
  // ───────────────────────────────────────────────────────────────────────

  /**
   * DEADBAND — taux d'erreur en dessous duquel on ne fait RIEN.
   * C'est la "marge d'erreur naturelle" tolérée.
   *
   * - 0.08 = 8 % d'erreurs tolérées avant d'ajuster la touche.
   * - Baisser (ex: 0.03) → clavier très réactif, bouge vite, peut fatiguer.
   * - Monter (ex: 0.15) → clavier passif, ne réagit qu'aux gros biais.
   *
   * Plage UI slider : 0.03 – 0.20.
   */
  DEADBAND: 0.08,

  /**
   * MIN_SAMPLE_SIZE — nombre min d'appuis sur une touche avant de calculer
   * un taux d'erreur fiable. Évite qu'un 1/3 = 33 % déclenche un ajustement.
   *
   * - 30 est prudent.
   * - Monter = stats plus fiables mais adaptation plus lente au démarrage.
   */
  MIN_SAMPLE_SIZE: 30,

  // ───────────────────────────────────────────────────────────────────────
  // LISSAGE — EMA sur le taux d'erreur
  // ───────────────────────────────────────────────────────────────────────

  /**
   * EMA_ALPHA — poids de la fenêtre récente dans la moyenne exponentielle.
   * ema(t) = alpha * taux_fenêtre + (1 - alpha) * ema(t-1)
   *
   * - 0.2 = la fenêtre récente compte pour 20 %.
   * - Baisser → très lissé, mou, adaptation lente.
   * - Monter → réactif, bruit visible, potentiels à-coups.
   *
   * Plage UI slider : 0.05 – 0.5.
   */
  EMA_ALPHA: 0.2,

  /**
   * ERROR_WINDOW_WORDS — taille de la fenêtre glissante (en mots finalisés)
   * utilisée pour calculer le taux d'erreur instantané qui alimente l'EMA.
   */
  ERROR_WINDOW_WORDS: 20,

  // ───────────────────────────────────────────────────────────────────────
  // MAGNITUDE — de combien une touche s'élargit / se rétrécit
  // ───────────────────────────────────────────────────────────────────────

  /**
   * ADAPT_GAIN — facteur de proportionnalité entre surplus d'erreur et delta.
   * delta = GAIN * (ema - DEADBAND)
   *
   * - 0.5 = calibré pour que 20 % d'erreurs → ~6 % d'élargissement.
   */
  ADAPT_GAIN: 0.5,

  /**
   * MAX_DELTA_RATIO — cap dur. Une touche ne peut JAMAIS s'éloigner de plus
   * de ±15 % de sa largeur de base.
   *
   * - Protège la muscle memory. Sans ça, une touche pourrait doubler de taille.
   * - Plage UI slider : 0.05 – 0.30.
   */
  MAX_DELTA_RATIO: 0.15,

  /**
   * MIN_NEIGHBOR_RATIO — plancher sur le voisin qui cède de la place.
   * Le voisin ne peut pas descendre sous 70 % de sa largeur de base.
   */
  MIN_NEIGHBOR_RATIO: 0.7,

  // ───────────────────────────────────────────────────────────────────────
  // FRÉQUENCE — à quelle vitesse le layout peut bouger
  // ───────────────────────────────────────────────────────────────────────

  /**
   * ADAPT_TRIGGER_WORDS — recalcul après N mots finalisés.
   * Le first-wins entre ça et ADAPT_TRIGGER_MS_MAX déclenche compute().
   */
  ADAPT_TRIGGER_WORDS: 20,

  /**
   * ADAPT_TRIGGER_MS_MAX — délai max entre deux recalculs (ms).
   * 30 s : même sans atteindre 20 mots, on recalcule pour éviter un état figé.
   */
  ADAPT_TRIGGER_MS_MAX: 30_000,

  /**
   * COOLDOWN_MS — après ajustement d'une touche, on la fige pendant ce délai.
   * Évite les oscillations et laisse l'utilisateur s'adapter visuellement.
   *
   * - 120_000 = 2 minutes.
   * - Baisser → clavier vif mais potentiellement instable.
   * - Monter → adaptation plus progressive, plus rassurante.
   */
  COOLDOWN_MS: 120_000,

  /**
   * ANIMATION_MS — durée de l'animation Reanimated quand une touche change
   * de taille. Perceptible = honnête pour l'utilisateur.
   */
  ANIMATION_MS: 400,

  // ───────────────────────────────────────────────────────────────────────
  // AUTOCORRECT — déclenchement et confiance
  // ───────────────────────────────────────────────────────────────────────

  /**
   * AUTOCORRECT_MAX_EDIT_DISTANCE — distance Levenshtein max pour candidat.
   * 2 = 2 substitutions/insertions/suppressions max.
   */
  AUTOCORRECT_MAX_EDIT_DISTANCE: 2,

  /**
   * AUTOCORRECT_MIN_FREQ — fréquence min absolue pour qu'un candidat
   * remplace le mot tapé. Évite de corriger vers un mot obscur du dict.
   * Calibrer selon les fréquences du dictionnaire utilisé (ici ~1-10000).
   */
  AUTOCORRECT_MIN_FREQ: 1,

  /**
   * SUGGESTION_DEBOUNCE_MS — délai après la dernière frappe avant de
   * recalculer les suggestions affichées.
   *
   * - 60 ms = fluide, imperceptible pour l'utilisateur.
   * - Monter → moins de CPU, barre qui "rattrape" la frappe.
   */
  SUGGESTION_DEBOUNCE_MS: 60,

  /**
   * UNDO_AUTOCORRECT_MS — fenêtre pendant laquelle l'utilisateur peut
   * annuler une correction automatique en tapant sur la chip "revert".
   */
  UNDO_AUTOCORRECT_MS: 3_000,

  // ───────────────────────────────────────────────────────────────────────
  // SCORING MATRIX — coûts d'alignement Needleman-Wunsch
  // ───────────────────────────────────────────────────────────────────────

  NW_MATCH: 2,
  NW_SUB_ADJACENT: -1, // touches voisines physiquement
  NW_SUB_DISTANT: -3,
  NW_GAP_OPEN: -2,
  NW_GAP_EXTEND: -1,
  NW_ADJACENCY_RADIUS: 1.5, // en unités de key-width, pour distinguer adj/distant

  // ───────────────────────────────────────────────────────────────────────
  // PERSISTANCE — batching SQLite
  // ───────────────────────────────────────────────────────────────────────

  DB_BATCH_MAX_ROWS: 50,
  DB_BATCH_MAX_MS: 500,
} as const;

/**
 * Type élargi : chaque champ devient `number` (pas le littéral figé par `as const`),
 * ce qui permet aux overrides runtime d'être de simples number.
 */
export type Tuning = { -readonly [K in keyof typeof TUNING]: number };

/**
 * Overrides runtime — mutés par l'écran Settings, lus par compute() et ema().
 * Ne modifie JAMAIS TUNING (les defaults restent la source de vérité).
 * `getTuning()` renvoie la fusion TUNING + overrides.
 */
const RUNTIME_OVERRIDES: Partial<Tuning> = {};

export function setRuntimeTuning(partial: Partial<Tuning>): void {
  Object.assign(RUNTIME_OVERRIDES, partial);
}

export function getTuning(): Tuning {
  return { ...(TUNING as unknown as Tuning), ...RUNTIME_OVERRIDES };
}
