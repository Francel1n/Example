import { Word, ErrorEvent, KeyId } from '../types';
import { align, normalizeForAlign } from './align';

/**
 * Analyse un mot finalisé et renvoie les events d'erreur, les confusions
 * à ajouter dans la matrice, et les compteurs intended/pressed par touche.
 *
 * Deux chemins :
 *  (A) Reconstruction par position à partir du log brut — capte les
 *      confusions du type "R pressé, BACKSPACE, E pressé" comme R→E.
 *      Pour chaque position visible finale, on regarde l'historique des
 *      presses qui ont atterri à cette position. Si une presse antérieure
 *      diffère de la presse finale, c'est une confusion.
 *  (B) Puis alignement Needleman-Wunsch entre la chaîne "presses finales
 *      par position" et le finalText (qui peut différer via autocorrect)
 *      pour capter les sub / ins / del restants.
 */
export interface DetectResult {
  events: ErrorEvent[];
  confusions: Array<{ pressed: KeyId; intended: KeyId }>;
  intendedCounts: Map<KeyId, number>;
  pressedCounts: Map<KeyId, number>;
}

export function detectErrors(word: Word): DetectResult {
  const events: ErrorEvent[] = [];
  const confusions: Array<{ pressed: KeyId; intended: KeyId }> = [];
  const intendedCounts = new Map<KeyId, number>();
  const pressedCounts = new Map<KeyId, number>();

  // (A) Reconstruction par position depuis le raw log
  const perPos: string[][] = [];
  let cursor = 0;
  for (const kp of word.typedRaw) {
    if (kp.keyId === 'BACKSPACE') {
      if (cursor > 0) cursor--;
      continue;
    }
    if (kp.keyId.length !== 1) continue; // ignore SHIFT etc
    if (kp.keyId === ' ' || kp.keyId === '\n') continue;
    // ponctuation : traitée en boundary par le wordBuilder, mais au cas où
    if ('.,;:!?"\'()'.includes(kp.keyId)) continue;

    if (cursor < perPos.length) {
      perPos[cursor].push(kp.keyId);
    } else {
      perPos.push([kp.keyId]);
    }
    cursor++;
  }

  // Chaîne finale des presses au niveau visible (après backspaces)
  const visible = perPos.slice(0, cursor).map((h) => h[h.length - 1]);
  // Les positions `>= cursor` ont été abandonnées — chaque presse unique
  // comptée comme `del` (lettre en trop).
  for (let i = cursor; i < perPos.length; i++) {
    for (const p of perPos[i]) {
      events.push({ pressedKey: p, intendedKey: '', op: 'del', position: i });
      bump(pressedCounts, p);
    }
  }

  // Pour chaque position visible, si l'historique a > 1 press, les presses
  // antérieures étaient des substitutions vers la presse finale.
  for (let i = 0; i < visible.length; i++) {
    const hist = perPos[i];
    const finalPress = hist[hist.length - 1];
    for (let k = 0; k < hist.length - 1; k++) {
      const earlier = hist[k];
      if (earlier !== finalPress) {
        events.push({
          pressedKey: earlier,
          intendedKey: finalPress,
          op: 'sub',
          position: i,
        });
        confusions.push({ pressed: earlier, intended: finalPress });
      }
    }
  }

  // (B) Align "visible" vs "finalText" pour capter les corrections automatiques
  const a = normalizeForAlign(visible.join(''));
  const b = normalizeForAlign(word.finalText);

  if (a === b) {
    // Tous les visible[i] sont intended = finalPress(=visible[i])
    for (let i = 0; i < visible.length; i++) {
      const c = a[i];
      bump(intendedCounts, c);
      bump(pressedCounts, c);
    }
    return { events, confusions, intendedCounts, pressedCounts };
  }

  const { ops } = align(a, b);
  for (const op of ops) {
    if (op.op === 'match') {
      bump(intendedCounts, op.b);
      bump(pressedCounts, op.a);
    } else if (op.op === 'sub') {
      bump(intendedCounts, op.b);
      bump(pressedCounts, op.a);
      events.push({ pressedKey: op.a, intendedKey: op.b, op: 'sub', position: op.j });
      confusions.push({ pressed: op.a, intended: op.b });
    } else if (op.op === 'ins') {
      bump(intendedCounts, op.b);
      events.push({ pressedKey: '', intendedKey: op.b, op: 'ins', position: op.j });
    } else {
      bump(pressedCounts, op.a);
      events.push({ pressedKey: op.a, intendedKey: '', op: 'del', position: op.i });
    }
  }
  return { events, confusions, intendedCounts, pressedCounts };
}

function bump(m: Map<KeyId, number>, k: KeyId) {
  m.set(k, (m.get(k) ?? 0) + 1);
}
