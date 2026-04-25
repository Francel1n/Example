import { SymSpell, Suggestion } from './symspell';
import { getTuning } from '../tuning';

/**
 * Wrapper qui combine :
 *  - suggestions pour affichage dans la SuggestionBar
 *  - décision auto-correct (remplacement silencieux) à la finalisation
 */
export class Suggester {
  constructor(private sym: SymSpell) {}

  suggestions(input: string, topN = 3): Suggestion[] {
    return this.sym.lookup(input, topN);
  }

  /**
   * Retourne le mot de remplacement à appliquer automatiquement (ou null).
   * Appelé à la finalisation (espace / ponctuation).
   * L'utilisateur peut annuler via la chip "revert" pendant UNDO_AUTOCORRECT_MS.
   */
  pickAutocorrect(input: string): { replacement: string; original: string } | null {
    if (!input) return null;
    const sugs = this.sym.lookup(input, 3);
    if (sugs.length === 0) return null;
    const best = sugs[0];
    // Si le mot tapé est DÉJÀ dans le dict à distance 0, ne rien faire.
    if (best.distance === 0) return null;
    // Filtre fréquence : on ne remplace pas vers un mot obscur.
    if (best.freq < getTuning().AUTOCORRECT_MIN_FREQ) return null;
    return { replacement: best.word, original: input };
  }
}
