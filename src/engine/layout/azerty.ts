import { KeyDescriptor, KeyId } from '../types';

/**
 * Layout AZERTY FR statique — 4 rangées.
 * baseWidth : unités relatives. Les touches standard = 1.
 * La somme d'une rangée définit la largeur totale (invariant à préserver).
 */

export const AZERTY_LETTERS: KeyDescriptor[][] = [
  // Rangée 0
  row([
    k('a'), k('z'), k('e'), k('r'), k('t'),
    k('y'), k('u'), k('i'), k('o'), k('p'),
  ], 0),
  // Rangée 1
  row([
    k('q'), k('s'), k('d'), k('f'), k('g'),
    k('h'), k('j'), k('k'), k('l'), k('m'),
  ], 1),
  // Rangée 2 : shift à gauche, backspace à droite
  row([
    km('SHIFT', '⇧', 1.5),
    k('w'), k('x'), k('c'), k('v'), k('b'), k('n'),
    km('BACKSPACE', '⌫', 1.5),
  ], 2),
  // Rangée 3 : switch layout, virgule, espace, point, enter
  row([
    km('LAYOUT_123', '123', 1.5),
    k(',', ',', 'symbol'),
    km('SPACE', ' ', 5),
    k('.', '.', 'symbol'),
    km('ENTER', '↵', 1.5),
  ], 3),
];

export const AZERTY_DIGITS: KeyDescriptor[][] = [
  row([
    k('1'), k('2'), k('3'), k('4'), k('5'),
    k('6'), k('7'), k('8'), k('9'), k('0'),
  ], 0, 'digit'),
  row([
    k('@', '@', 'symbol'), k('#', '#', 'symbol'), k('€', '€', 'symbol'),
    k('_', '_', 'symbol'), k('&', '&', 'symbol'), k('-', '-', 'symbol'),
    k('+', '+', 'symbol'), k('(', '(', 'symbol'),
    k(')', ')', 'symbol'), k('/', '/', 'symbol'),
  ], 1),
  row([
    km('LAYOUT_SYM', '=\\<', 1.5),
    k('*', '*', 'symbol'), k('"', '"', 'symbol'), k("'", "'", 'symbol'),
    k(':', ':', 'symbol'), k(';', ';', 'symbol'), k('!', '!', 'symbol'),
    k('?', '?', 'symbol'),
    km('BACKSPACE', '⌫', 1.5),
  ], 2),
  row([
    km('LAYOUT_ABC', 'ABC', 1.5),
    k(',', ',', 'symbol'),
    km('SPACE', ' ', 5),
    k('.', '.', 'symbol'),
    km('ENTER', '↵', 1.5),
  ], 3),
];

function k(id: KeyId, label?: string, kind: 'letter' | 'digit' | 'symbol' = 'letter'): KeyDescriptor {
  return { id, label: label ?? id.toUpperCase(), row: 0, col: 0, baseWidth: 1, kind };
}

function km(id: KeyId, label: string, width: number): KeyDescriptor {
  return { id, label, row: 0, col: 0, baseWidth: width, kind: 'modifier' };
}

function row(keys: KeyDescriptor[], rowIndex: number, defaultKind?: 'digit'): KeyDescriptor[] {
  return keys.map((key, col) => ({
    ...key,
    row: rowIndex,
    col,
    kind: defaultKind && key.kind === 'letter' ? 'digit' : key.kind,
  }));
}

/** Somme des baseWidth d'une rangée. */
export function rowWidth(r: KeyDescriptor[]): number {
  return r.reduce((s, key) => s + key.baseWidth, 0);
}

export function flattenLayout(layout: KeyDescriptor[][]): KeyDescriptor[] {
  return layout.flat();
}

/** Récupère tous les ID de touches "lettre" du layout (utilisé par l'engine adapt). */
export function lettersOnly(layout: KeyDescriptor[][]): KeyDescriptor[] {
  return flattenLayout(layout).filter((k) => k.kind === 'letter');
}
