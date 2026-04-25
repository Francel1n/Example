import { DictEntry, SymSpell } from './symspell';
import { normalizeForAlign } from '../correction/align';

/**
 * Dictionnaire FR minimal bundlé pour la démo.
 * ~300 mots les plus fréquents en français (freq approximative — unités
 * arbitraires, seul l'ordre relatif compte pour le ranking).
 *
 * Pour passer en production : remplacer par un import de Lexique 3 ou
 * OpenSubs freq list (~60k mots), puis cacher l'index SymSpell dans SQLite.
 */
const FR_WORDS: Array<[string, number]> = [
  ['le', 10000], ['de', 9500], ['un', 9000], ['être', 8800], ['et', 8700],
  ['à', 8600], ['il', 8500], ['avoir', 8400], ['ne', 8300], ['je', 8200],
  ['son', 8100], ['que', 8000], ['se', 7900], ['qui', 7800], ['ce', 7700],
  ['dans', 7600], ['en', 7500], ['du', 7400], ['elle', 7300], ['au', 7200],
  ['pour', 7100], ['pas', 7000], ['que', 6900], ['vous', 6800], ['par', 6700],
  ['sur', 6600], ['faire', 6500], ['plus', 6400], ['dire', 6300], ['me', 6200],
  ['on', 6100], ['mon', 6000], ['lui', 5900], ['nous', 5800], ['comme', 5700],
  ['mais', 5600], ['pouvoir', 5500], ['avec', 5400], ['tout', 5300], ['y', 5200],
  ['aller', 5100], ['voir', 5000], ['bien', 4900], ['où', 4800], ['sans', 4700],
  ['tu', 4600], ['ou', 4500], ['leur', 4400], ['homme', 4300], ['si', 4200],
  ['deux', 4100], ['mari', 4000], ['moi', 3900], ['vouloir', 3800], ['te', 3700],
  ['femme', 3600], ['venir', 3500], ['quand', 3400], ['grand', 3300], ['celui', 3200],
  ['alors', 3100], ['quel', 3000], ['autre', 2900], ['prendre', 2800], ['même', 2700],
  ['savoir', 2600], ['jour', 2500], ['monsieur', 2400], ['falloir', 2300], ['voilà', 2200],
  ['donner', 2100], ['très', 2000], ['devoir', 1950], ['petit', 1900], ['encore', 1850],
  ['ici', 1800], ['rien', 1750], ['non', 1700], ['temps', 1650], ['ah', 1600],
  ['enfant', 1550], ['passer', 1500], ['oui', 1450], ['aussi', 1400], ['eh', 1350],
  ['comprendre', 1300], ['croire', 1250], ['trouver', 1200], ['regarder', 1150], ['après', 1100],
  ['sous', 1080], ['parler', 1060], ['mettre', 1040], ['heure', 1020], ['laisser', 1000],
  ['oh', 990], ['ah', 980], ['chose', 970], ['vie', 960], ['père', 950],
  ['an', 940], ['dieu', 930], ['main', 920], ['moment', 910], ['toujours', 900],
  ['monde', 890], ['beaucoup', 880], ['maintenant', 870], ['trop', 860], ['bon', 850],
  ['année', 840], ['yeux', 830], ['demander', 820], ['jamais', 810], ['sa', 800],
  ['peut', 790], ['raison', 780], ['cela', 770], ['ça', 760], ['chez', 750],
  ['mort', 740], ['entendre', 730], ['rester', 720], ['arriver', 710], ['paraître', 700],
  ['deux', 690], ['trois', 685], ['quatre', 680], ['cinq', 675], ['six', 670],
  ['sept', 665], ['huit', 660], ['neuf', 655], ['dix', 650], ['cent', 645],
  ['mille', 640], ['dormir', 620], ['manger', 615], ['boire', 610], ['écrire', 605],
  ['lire', 600], ['marcher', 595], ['courir', 590], ['travailler', 585], ['jouer', 580],
  ['chanter', 575], ['danser', 570], ['rire', 565], ['pleurer', 560], ['aimer', 555],
  ['détester', 550], ['vivre', 545], ['mourir', 540], ['naitre', 535], ['commencer', 530],
  ['finir', 525], ['continuer', 520], ['arrêter', 515], ['ouvrir', 510], ['fermer', 505],
  ['entrer', 500], ['sortir', 495], ['monter', 490], ['descendre', 485], ['tomber', 480],
  ['chercher', 475], ['perdre', 470], ['trouver', 465], ['gagner', 460], ['acheter', 455],
  ['vendre', 450], ['payer', 445], ['coûter', 440], ['valoir', 435], ['aider', 430],
  ['appeler', 425], ['attendre', 420], ['choisir', 415], ['décider', 410], ['oublier', 405],
  ['répondre', 400], ['demander', 395], ['poser', 390], ['expliquer', 385], ['raconter',380],
  ['montrer', 375], ['cacher', 370], ['partir', 365], ['revenir', 360], ['rentrer', 355],
  ['voyager', 350], ['visiter', 345], ['habiter', 340], ['travail', 335], ['école', 330],
  ['enfant', 325], ['fille', 320], ['garçon', 315], ['maman', 310], ['papa', 305],
  ['ami', 300], ['amour', 295], ['coeur', 290], ['corps', 285], ['tête', 280],
  ['bras', 275], ['jambe', 270], ['pied', 265], ['pain', 260], ['vin', 255],
  ['eau', 250], ['café', 245], ['thé', 240], ['lait', 235], ['fromage', 230],
  ['viande', 225], ['poisson', 220], ['fruit', 215], ['légume', 210], ['pomme', 205],
  ['orange', 200], ['banane', 195], ['voiture', 190], ['train', 185], ['avion', 180],
  ['bateau', 175], ['vélo', 170], ['rue', 165], ['route', 160], ['chemin', 155],
  ['ville', 150], ['pays', 145], ['maison', 140], ['chambre', 135], ['porte', 130],
  ['fenêtre', 125], ['table', 120], ['chaise', 115], ['lit', 110], ['livre', 105],
  ['stylo', 100], ['papier', 95], ['téléphone', 90], ['ordinateur', 85], ['clavier', 80],
  ['souris', 75], ['écran', 70], ['bureau', 65], ['travail', 60], ['chien', 55],
  ['chat', 50], ['oiseau', 45], ['poisson', 40], ['fleur', 35], ['arbre', 30],
  ['soleil', 25], ['lune', 20], ['étoile', 15], ['ciel', 10], ['bonjour', 9500],
  ['salut', 9000], ['merci', 8500], ['bonsoir', 7000], ['adieu', 500], ['peut-être', 400],
  ['quelquefois', 300], ['souvent', 500], ['parfois', 450], ['enfin', 600], ['bientôt', 400],
  ['hello', 800], ['bonjour', 900],
];

let CACHED: SymSpell | null = null;

export function buildDefaultSymSpell(): SymSpell {
  if (CACHED) return CACHED;
  const entries: DictEntry[] = FR_WORDS.map(([word, freq]) => ({
    word: normalizeForAlign(word),
    display: word,
    freq,
  }));
  // Dédup par forme normalisée : garde la plus grande freq
  const byKey = new Map<string, DictEntry>();
  for (const e of entries) {
    const cur = byKey.get(e.word);
    if (!cur || cur.freq < e.freq) byKey.set(e.word, e);
  }
  const sym = new SymSpell();
  sym.loadDictionary(Array.from(byKey.values()));
  CACHED = sym;
  return sym;
}

export function rawDictionary(): Array<[string, number]> {
  return FR_WORDS;
}
