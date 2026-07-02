// Game content: tactics, seller personalities, scenarios, dialogue.

export const TACTICS = [
  {
    id: 'polite',
    emoji: '😐',
    label: 'Straight offer',
    hint: 'No games. A clean, honest number. Safe with everyone.',
  },
  {
    id: 'flaw',
    emoji: '🔍',
    label: 'Spot a flaw',
    hint: 'Point out a scratch, a squeak, a stain. Pros respect it — the attached don\'t.',
  },
  {
    id: 'silence',
    emoji: '🤫',
    label: 'Silence',
    hint: 'Name your price and say nothing. Talkers can\'t stand the quiet.',
  },
  {
    id: 'cash',
    emoji: '💵',
    label: 'Cash today',
    hint: 'Bills on the table, deal done in five minutes. Irresistible if they need it.',
  },
  {
    id: 'walk',
    emoji: '🚪',
    label: 'Start to leave',
    hint: 'Turn toward the door. Powerful — unless they call your bluff.',
  },
  {
    id: 'flatter',
    emoji: '😊',
    label: 'Flatter',
    hint: 'Admire the item, admire them. Melts the sentimental, bores the sharks.',
  },
];

// Personality knobs:
//  greed        – where their initial hidden "would accept" sits between floor and list
//  concession   – how fast their hidden acceptance price drops per round
//  angerLimit   – anger points before they end the negotiation
//  insultSens   – multiplier on anger from lowball offers
//  affinity     – tactic effectiveness multipliers
//  backfires    – tactics that also generate anger with this seller
export const PERSONALITIES = {
  shark: {
    id: 'shark',
    greed: 0.80,
    concession: 0.16,
    angerLimit: 5,
    insultSens: 0.7,
    affinity: { polite: 0.9, flaw: 1.4, silence: 1.0, cash: 1.1, walk: 0.5, flatter: 0.4 },
    backfires: ['walk'],
    dialogue: {
      counter: [
        'Ha. Cute. {counter} and I\'m already being generous.',
        'I flip these for a living, friend. {counter}. Take it or watch someone else take it.',
        'You\'re not my first buyer today. {counter}.',
        '{counter}. That\'s business, nothing personal.',
      ],
      bigDrop: [
        'Hm. You actually know what you\'re looking at. Fine — {counter}.',
        'Okay, okay. You\'ve got an eye. {counter}, final-ish.',
      ],
      insulted: [
        'Are we negotiating or are you doing stand-up? Don\'t waste my time.',
        'That number is an insult and you know it.',
      ],
      backfire: [
        'Go ahead, walk. The door\'s right there — I\'ll sell it by dinner.',
        'Leaving already? Bluff harder next time.',
      ],
      accept: [
        'Deal at {price}. You\'d have made a decent flipper yourself.',
        '{price}. Fine. Now get out of here before I change my mind.',
      ],
      bust: [
        'We\'re done here. I don\'t deal with clowns.',
      ],
      final: [
        'Last call: {counter}. Yes or no.',
      ],
    },
  },
  sentimental: {
    id: 'sentimental',
    greed: 0.65,
    concession: 0.18,
    angerLimit: 4,
    insultSens: 1.3,
    affinity: { polite: 1.0, flaw: 0.3, silence: 0.8, cash: 0.9, walk: 0.7, flatter: 1.7 },
    backfires: ['flaw'],
    dialogue: {
      counter: [
        'Oh, I don\'t know… it holds so many memories. Maybe {counter}?',
        'My heart says keep it, my head says {counter}.',
        'For someone who\'d take good care of it… {counter}.',
        'I promised myself I wouldn\'t just give it away. {counter}.',
      ],
      bigDrop: [
        'You really see it, don\'t you? The way I do… alright, {counter}.',
        'You know what, I like you. {counter} — because it\'s you.',
      ],
      insulted: [
        'That… that\'s hurtful. This isn\'t junk, you know.',
        'Maybe this was a mistake. It deserves better than that number.',
      ],
      backfire: [
        'A flaw?! There is nothing wrong with it. Nothing!',
        'How dare you. I\'ve cared for this better than most people care for family.',
      ],
      accept: [
        '{price}… promise me you\'ll take good care of it. Promise me.',
        'Alright. {price}. It\'s going to a good home, I can tell.',
      ],
      bust: [
        'No. I\'d rather keep it forever than sell it to you.',
      ],
      final: [
        'This is as low as my heart will let me go: {counter}.',
      ],
    },
  },
  desperate: {
    id: 'desperate',
    greed: 0.55,
    concession: 0.24,
    angerLimit: 5,
    insultSens: 0.7,
    affinity: { polite: 1.0, flaw: 1.1, silence: 1.1, cash: 1.6, walk: 1.4, flatter: 0.8 },
    backfires: [],
    dialogue: {
      counter: [
        'Look, I need this gone by the weekend. {counter} and it\'s yours.',
        'Okay okay — {counter}? I really can\'t sit on it any longer.',
        '{counter}. Please. I\'ve got movers coming Thursday.',
        'You seem serious, so… {counter}?',
      ],
      bigDrop: [
        'You know what, fine — {counter}. I just want this done.',
        'Ugh, deal season. {counter}, and let\'s shake on it soon.',
      ],
      insulted: [
        'Come on, I\'m in a hurry, not stupid.',
        'I\'m desperate, not giving it away.',
      ],
      backfire: [],
      accept: [
        '{price} — SOLD. You have no idea how much you just helped me.',
        'Deal at {price}! Honestly? Relief.',
      ],
      bust: [
        'You know what, forget it. Even I have limits.',
      ],
      final: [
        'Final answer, I swear: {counter}. I need this settled today.',
      ],
    },
  },
  stubborn: {
    id: 'stubborn',
    greed: 0.82,
    concession: 0.10,
    angerLimit: 4,
    insultSens: 1.1,
    affinity: { polite: 1.2, flaw: 0.7, silence: 1.3, cash: 1.0, walk: 0.3, flatter: 0.9 },
    backfires: ['walk'],
    dialogue: {
      counter: [
        'The price is the price. But fine — {counter}.',
        'I know what it\'s worth. {counter}, and that\'s me being flexible.',
        'Mm. {counter}. I\'ve said no to better offers than yours.',
        '{counter}. I\'m in no hurry whatsoever.',
      ],
      bigDrop: [
        'You drive a fair bargain, I\'ll give you that. {counter}.',
        '…Fine. {counter}. Don\'t tell anyone I budged.',
      ],
      insulted: [
        'I\'ve had it for twenty years. I can keep it twenty more.',
        'You clearly don\'t know what quality costs.',
      ],
      backfire: [
        'Then leave. It\'ll still be here tomorrow. So will my price.',
        'The door works fine. Unlike your offer.',
      ],
      accept: [
        '{price}. Hmph. You wore me down — few manage that.',
        'Alright, {price}. Firm handshake. Done.',
      ],
      bust: [
        'No sale. Some things aren\'t worth the aggravation.',
      ],
      final: [
        '{counter}. That number will not move again in this lifetime.',
      ],
    },
  },
  chatty: {
    id: 'chatty',
    greed: 0.70,
    concession: 0.17,
    angerLimit: 5,
    insultSens: 1.0,
    affinity: { polite: 1.0, flaw: 1.0, silence: 1.7, cash: 1.0, walk: 0.9, flatter: 1.1 },
    backfires: [],
    dialogue: {
      counter: [
        'So anyway, like I was saying — oh, right, the price! {counter}, how does that sound?',
        'Funny story about this one, remind me later. {counter}?',
        '{counter} — and honestly you\'re getting the story for free.',
        'My cousin said I should ask double, but for you? {counter}.',
      ],
      bigDrop: [
        'Wow, you\'re… quiet. That\'s unsettling. Okay, {counter}? Say something.',
        'Alright alright, {counter}! The silence was killing me.',
      ],
      insulted: [
        'Wow. Okay. And here I was, being nice to you.',
        'That\'s low — and I don\'t just mean the number.',
      ],
      backfire: [],
      accept: [
        '{price}, deal! Great doing business — hey, want to hear how I got it?',
        'Sold at {price}! You\'re fun. Weird, but fun.',
      ],
      bust: [
        'Annnd we\'re done. I talk a lot but I\'m not a pushover.',
      ],
      final: [
        'Okay, real talk, no more stories: {counter}. Last one.',
      ],
    },
  },
};

// Each scenario picks its price from [priceMin, priceMax] and its hidden
// floor from list * [floorMin, floorMax], seeded by the day.
export const SCENARIOS = [
  {
    id: 'vespa',
    emoji: '🛵',
    item: 'a 1974 Vespa',
    title: '1974 Vespa Primavera',
    sub: 'Mint green. Runs "most days".',
    seller: 'Marcel',
    personality: 'sentimental',
    priceMin: 2000, priceMax: 2800,
    floorMin: 0.58, floorMax: 0.70,
    greeting: 'Marcel polishes the mirror with his sleeve. "She\'s a \'74. I proposed to my wife on this seat. Asking {list} — and frankly, that\'s a steal for a piece of my youth."',
  },
  {
    id: 'gaming-pc',
    emoji: '🖥️',
    item: 'a gaming PC',
    title: 'Gaming PC — RTX, RGB, the works',
    sub: 'Kevin is moving out. Fast.',
    seller: 'Kevin',
    personality: 'desperate',
    priceMin: 900, priceMax: 1400,
    floorMin: 0.50, floorMax: 0.62,
    greeting: 'Kevin glances at the moving boxes stacked behind him. "Built it myself, barely a year old. {list}. My new place is 12 square meters, man. It literally cannot come with me."',
  },
  {
    id: 'sofa',
    emoji: '🛋️',
    item: 'a leather sofa',
    title: 'Chesterfield leather sofa',
    sub: 'Brigitte has stories. So many stories.',
    seller: 'Brigitte',
    personality: 'chatty',
    priceMin: 600, priceMax: 950,
    floorMin: 0.52, floorMax: 0.65,
    greeting: 'Brigitte pats the armrest. "Real leather! My sister-in-law — you\'d love her, terrible cook though — sat here every Sunday for a decade. {list}, and I\'ll tell you the whole saga."',
  },
  {
    id: 'ebike',
    emoji: '🚴',
    item: 'an e-bike',
    title: 'Carbon e-bike, 2 seasons old',
    sub: 'Sofia flips bikes. She knows the market.',
    seller: 'Sofia',
    personality: 'shark',
    priceMin: 1100, priceMax: 1600,
    floorMin: 0.62, floorMax: 0.74,
    greeting: 'Sofia doesn\'t look up from her phone. "Carbon frame, new battery in spring. {list}. I sell three of these a week, so no sob stories, please."',
  },
  {
    id: 'watch',
    emoji: '⌚',
    item: 'a vintage watch',
    title: '"Definitely authentic" vintage watch',
    sub: 'Dimitri swears on his mother\'s life.',
    seller: 'Dimitri',
    personality: 'shark',
    priceMin: 3000, priceMax: 4500,
    floorMin: 0.55, floorMax: 0.68,
    greeting: 'Dimitri produces a velvet box from inside his jacket. "Swiss movement, 1968, papers at home. {list}. My friend, watches like this find *you*."',
  },
  {
    id: 'foodtruck',
    emoji: '🚚',
    item: 'a food truck',
    title: 'Fully-equipped food truck',
    sub: 'Ahmed is retiring after 30 years.',
    seller: 'Ahmed',
    personality: 'sentimental',
    priceMin: 18000, priceMax: 26000,
    floorMin: 0.60, floorMax: 0.72,
    greeting: 'Ahmed runs his hand along the counter. "Thirty years of Friday lunches came out of this kitchen. New fryer, new tires. {list} — but I care more about who takes over than the money. Mostly."',
  },
  {
    id: 'surfboard',
    emoji: '🏄',
    item: 'a surfboard',
    title: 'Hand-shaped longboard',
    sub: 'Léo will talk about waves. At length.',
    seller: 'Léo',
    personality: 'chatty',
    priceMin: 250, priceMax: 420,
    floorMin: 0.50, floorMax: 0.64,
    greeting: 'Léo is mid-sentence when you arrive. "—three-meter faces, no joke! Oh hey. The board? Hand-shaped, single fin, pure glide. {list}. Did I mention the three-meter faces?"',
  },
  {
    id: 'armoire',
    emoji: '🪑',
    item: 'an antique armoire',
    title: 'Oak armoire, circa 1890',
    sub: 'Geneviève does not do discounts.',
    seller: 'Geneviève',
    personality: 'stubborn',
    priceMin: 700, priceMax: 1200,
    floorMin: 0.62, floorMax: 0.75,
    greeting: 'Geneviève stands beside the armoire like a guard. "1890s oak. Dovetail joints. It has outlived two wars and it will outlive your haggling. {list}."',
  },
  {
    id: 'rent',
    emoji: '🏢',
    item: 'the monthly rent',
    title: 'Studio flat — monthly rent',
    sub: 'Bernard owns half the street.',
    seller: 'Bernard',
    personality: 'stubborn',
    priceMin: 780, priceMax: 980,
    floorMin: 0.78, floorMax: 0.88,
    greeting: 'Bernard jangles a ring of forty keys. "South-facing, twenty minutes from everything. {list} a month. I\'ve got three more viewings today, so."',
  },
  {
    id: 'espresso',
    emoji: '☕',
    item: 'an espresso machine',
    title: 'Prosumer espresso machine',
    sub: 'Marco\'s café closed last month.',
    seller: 'Marco',
    personality: 'desperate',
    priceMin: 380, priceMax: 620,
    floorMin: 0.48, floorMax: 0.60,
    greeting: 'Marco sighs at the espresso machine like it\'s an old coworker. "Dual boiler, serviced in January. The café\'s gone, the storage unit isn\'t free. {list} and she\'s yours."',
  },
  {
    id: 'drone',
    emoji: '🛸',
    item: 'a drone',
    title: 'Cinematic drone + 3 batteries',
    sub: 'Jay already ordered the newer model.',
    seller: 'Jay',
    personality: 'shark',
    priceMin: 500, priceMax: 800,
    floorMin: 0.58, floorMax: 0.70,
    greeting: 'Jay flips the drone case open like a briefcase deal. "4K, three batteries, zero crashes — I\'m basically a pilot. {list}. Resale on these is strong, I checked."',
  },
  {
    id: 'piano',
    emoji: '🎹',
    item: 'an upright piano',
    title: 'Upright piano, recently tuned',
    sub: 'Nadia\'s daughter switched to drums.',
    seller: 'Nadia',
    personality: 'desperate',
    priceMin: 1000, priceMax: 1600,
    floorMin: 0.45, floorMax: 0.58,
    greeting: 'A drum kit thunders somewhere upstairs. Nadia winces. "Tuned in March. Lovely tone. {list} — and if you can move it this week, we should talk."',
  },
  {
    id: 'landrover',
    emoji: '🚙',
    item: 'an old Defender',
    title: '\'93 Land Rover Defender',
    sub: 'Gus has never needed anything from anyone.',
    seller: 'Gus',
    personality: 'stubborn',
    priceMin: 9000, priceMax: 14000,
    floorMin: 0.68, floorMax: 0.80,
    greeting: 'Gus kicks the tire affectionately. "Starts in any weather. Rust is structural character. {list}, cash or cows. I don\'t need to sell it — you need to buy it."',
  },
  {
    id: 'neon',
    emoji: '🌆',
    item: 'a neon sign',
    title: 'Neon sign from a closed jazz bar',
    sub: '"Blue Note" — Rita\'s bar, 1989–2024.',
    seller: 'Rita',
    personality: 'sentimental',
    priceMin: 300, priceMax: 550,
    floorMin: 0.50, floorMax: 0.64,
    greeting: 'Rita plugs it in and the room glows blue. "Thirty-five years above my bar. Every night, that hum. {list} — and honestly the memories should cost extra."',
  },
];

export const GRADES = [
  { min: 90, label: 'Silver Tongue', emoji: '👑' },
  { min: 78, label: 'Master Dealmaker', emoji: '🥇' },
  { min: 62, label: 'Sharp Haggler', emoji: '🥈' },
  { min: 45, label: 'Fair Player', emoji: '🥉' },
  { min: 22, label: 'Soft Touch', emoji: '🫠' },
  { min: 1, label: 'Doormat', emoji: '🚪' },
  { min: 0, label: 'Deal Blown', emoji: '💥' },
];

export function gradeFor(score) {
  return GRADES.find((g) => score >= g.min) || GRADES[GRADES.length - 1];
}
