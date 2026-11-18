export type RaceId =
  | 'human'
  | 'high_elf'
  | 'mountain_dwarf'
  | 'tiefling'
  | 'dragonborn'
  | 'halfling';

export type ClassId =
  | 'mage'
  | 'warrior'
  | 'rogue'
  | 'cleric'
  | 'ranger'
  | 'bard';

export type MapTheme = 'crypt' | 'forest' | 'tavern';
export type AmbientMood = 'tavern' | 'dungeon' | 'combat' | 'mystery' | 'victory';
export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
export type DmVoiceName = 'Charon' | 'Fenrir' | 'Kore' | 'Puck';

export interface HeroStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface RaceDefinition {
  id: RaceId;
  name: string;
  tagline: string;
  description: string;
  bonuses: Partial<HeroStats>;
  speed: number;
  darkvision: boolean;
  traits: string[];
  racialPower: {
    name: string;
    description: string;
  };
  accentColor: string;
}

export interface SpellOrAbility {
  id: string;
  name: string;
  school: string;
  kind: 'spell' | 'martial' | 'racial';
  manaCost: number;
  rangeCells: number;
  areaRadius: number;
  diceFormula: string;
  damageType: string;
  description: string;
  classIds?: ClassId[];
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  role: string;
  description: string;
  hitDie: number;
  baseHp: number;
  baseMana: number;
  baseAc: number;
  primaryStat: keyof HeroStats;
  baseStats: HeroStats;
  startingInventory: string[];
  startingSpells: string[];
  classFeatures: string[];
}

export interface Hero {
  id: string;
  campaignId: string;
  ownerId: string;
  playerName: string;
  name: string;
  raceId: RaceId;
  classId: ClassId;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  ac: number;
  gridX: number;
  gridY: number;
  color: string;
  xp: number;
  gold: number;
  look: string;
  rasgo: string;
  stats: HeroStats;
  conditions: string[];
  inventory: string[];
  knownSpells: string[];
}

export interface Enemy {
  id: string;
  campaignId: string;
  ownerId: string;
  name: string;
  archetype: string;
  hp: number;
  maxHp: number;
  ac: number;
  gridX: number;
  gridY: number;
  threat: 'minion' | 'elite' | 'boss';
  isDefeated: boolean;
}

export interface ChronicleEntry {
  id: string;
  campaignId: string;
  ownerId: string;
  turnNumber: number;
  speaker: string;
  role: 'dm' | 'player' | 'dice' | 'spell' | 'system';
  text: string;
  diceRoll: string;
  timestampMs: number;
}

export interface Campaign {
  id: string;
  ownerId: string;
  title: string;
  setting: string;
  tone: string;
  lengthMode: string;
  ingredients: string[];
  summary: string;
  summaryUpToTurn: number;
  mapTheme: MapTheme;
  currentSceneTitle: string;
  currentNarration: string;
  turnNumber: number;
  activeCharacterId: string;
  status: 'active' | 'completed';
  inCombat: boolean;
  roundNumber: number;
  heroCount: number;
  updatedAtMs: number;
}

export interface DicePrompt {
  required: boolean;
  heroName: string;
  dieType: 'd20' | 'd12' | 'd10' | 'd8' | 'd6';
  skill: string;
  dc: number;
  reason: string;
}

export interface DmDiceLog {
  speaker: string;
  text: string;
  detail: string;
}

export interface DmTurnResponse {
  sceneTitle: string;
  narration: string;
  voiceScript: string;
  mapTheme: MapTheme;
  inCombat: boolean;
  ambientMood: AmbientMood;
  suggestedActions: string[];
  dicePrompt?: DicePrompt;
  diceLogs?: DmDiceLog[];
  heroUpdates: Array<{
    heroId: string;
    hpDelta: number;
    manaDelta: number;
    xpDelta: number;
    goldDelta: number;
    addCondition?: string;
    removeCondition?: string;
    addItem?: string;
  }>;
  enemyUpdates: Array<{
    action: 'spawn' | 'damage' | 'defeat' | 'move';
    enemyId?: string;
    name: string;
    archetype: string;
    threat: 'minion' | 'elite' | 'boss';
    hpDelta: number;
    maxHp: number;
    ac: number;
    gridX: number;
    gridY: number;
  }>;
}

export interface AdventureModule {
  id: string;
  title: string;
  setting: string;
  mapTheme: MapTheme;
  hook: string;
  difficulty: string;
}
