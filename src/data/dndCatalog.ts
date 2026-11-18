import type {
  AdventureModule,
  ClassDefinition,
  ClassId,
  DmVoiceName,
  Hero,
  HeroStats,
  MapTheme,
  RaceDefinition,
  RaceId,
  SpellOrAbility,
} from '../types/dnd';

export const RACES: RaceDefinition[] = [
  {
    id: 'high_elf',
    name: 'Alto Elfo',
    tagline: 'Linaje Arcano · Visión Nocturna',
    description:
      'Inmortales estudiosos de la magia ancestral. Dominan la arcanidad desde jóvenes y perciben el flujo de maná en la oscuridad.',
    bonuses: { int: 2, dex: 1 },
    speed: 6,
    darkvision: true,
    traits: ['Visión en la Oscuridad (18m)', 'Linaje Feérico (Inmune a sueño)', 'Sentidos Agudos'],
    racialPower: {
      name: 'Paso Feérico',
      description: 'Te envuelves en bruma plateada y te teleportas hasta 3 casillas sin provocar ataques.',
    },
    accentColor: '#38BDF8',
  },
  {
    id: 'mountain_dwarf',
    name: 'Enano de las Montañas',
    tagline: 'Bastión de Hierro · Resistencia Pétrea',
    description:
      'Forjados bajo volcanes dormidos. Su constitución inquebrantable resiste venenos mortales y portan armaduras pesadas con soltura.',
    bonuses: { con: 2, str: 2 },
    speed: 5,
    darkvision: true,
    traits: ['Resistencia Enana (Veneno)', 'Afinidad con la Piedra', 'Maestría en Armaduras'],
    racialPower: {
      name: 'Temple de Roca',
      description: 'Endureces tu postura ganando +3 CA temporal hasta el siguiente turno.',
    },
    accentColor: '#F59E0B',
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    tagline: 'Sangre Infernal · Llamas y Carisma',
    description:
      'Portadores de un antiguo pacto abisal. Sus cuernos y ojos ámbar inspiran respeto o temor, y el fuego apenas roza su piel.',
    bonuses: { cha: 2, int: 1 },
    speed: 6,
    darkvision: true,
    traits: ['Resistencia Infernal (Fuego)', 'Visión en la Oscuridad', 'Presencia Magnética'],
    racialPower: {
      name: 'Reprensión Infernal',
      description: 'Rodeas de llamas escarlata a quien te hiere, infligiendo 2d10 de daño ígneo.',
    },
    accentColor: '#EF4444',
  },
  {
    id: 'dragonborn',
    name: 'Dracónido',
    tagline: 'Aliento Ancestral · Escamas de Guerra',
    description:
      'Descendientes orgullosos de dragones primordiales. Su presencia impone autoridad en el campo de batalla y exhalan furia elemental.',
    bonuses: { str: 2, cha: 1 },
    speed: 6,
    darkvision: false,
    traits: ['Escamas Dracónicas (+1 CA)', 'Resistencia Elemental', 'Honor de Clan'],
    racialPower: {
      name: 'Aliento de Dragón',
      description: 'Exhalas un cono de fuego dracónico que inflige 2d8 de daño en área.',
    },
    accentColor: '#F97316',
  },
  {
    id: 'halfling',
    name: 'Mediano',
    tagline: 'Suerte Prodigiosa · Sombra Ágil',
    description:
      'Pequeños en estatura, inmensos en audacia. La fortuna parece doblar el destino a su favor en los momentos más desesperados.',
    bonuses: { dex: 2, cha: 1 },
    speed: 5,
    darkvision: false,
    traits: ['Suertudo (Repite 1 natural en d20)', 'Valiente ante el Terror', 'Sigilo Natural'],
    racialPower: {
      name: 'Golpe de Fortuna',
      description: 'Conviertes una tirada fallida en un éxito acrobático esquivando peligros.',
    },
    accentColor: '#10B981',
  },
  {
    id: 'human',
    name: 'Humano',
    tagline: 'Versatilidad Heroica · Ambición Pura',
    description:
      'Adaptables, tenaces y capaces de dominar cualquier arte. Compensan su vida breve con una determinación capaz de derrocar imperios.',
    bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    speed: 6,
    darkvision: false,
    traits: ['Versatilidad (+1 a todos los atributos)', 'Determinación Heroica', 'Diplomacia'],
    racialPower: {
      name: 'Ímpetu Humano',
      description: 'Obtienes una acción adicional inmediata o ventaja en tu próxima tirada.',
    },
    accentColor: '#D4A359',
  },
];

export const CLASSES: ClassDefinition[] = [
  {
    id: 'mage',
    name: 'Mago',
    role: 'Artillería Arcana y Control',
    description:
      'Erudito del Tejido Mágico capaz de desatar bolas de fuego, escudos arcanos y descargas de energía pura desde la retaguardia.',
    hitDie: 6,
    baseHp: 18,
    baseMana: 30,
    baseAc: 12,
    primaryStat: 'int',
    baseStats: { str: 8, dex: 14, con: 12, int: 17, wis: 13, cha: 11 },
    startingInventory: ['Báculo de Ébano', 'Grimorio Encuadernado', 'Poción de Maná', 'Polvo de Rubí'],
    startingSpells: ['fireball', 'magic_missile', 'arcane_shield', 'lightning_bolt', 'misty_step'],
    classFeatures: ['Recuperación Arcana', 'Maestría Elemental', 'Detectar Magia'],
  },
  {
    id: 'warrior',
    name: 'Guerrero',
    role: 'Vanguardia y Tanque',
    description:
      'Maestro de armas y tácticas de combate. Soporta los embates más brutales y encadena golpes devastadores.',
    hitDie: 10,
    baseHp: 28,
    baseMana: 10,
    baseAc: 17,
    primaryStat: 'str',
    baseStats: { str: 17, dex: 12, con: 16, int: 9, wis: 11, cha: 10 },
    startingInventory: ['Espada Larga Rúnica', 'Escudo de Torre', 'Cota de Malla', 'Poción de Curación'],
    startingSpells: ['cleave_strike', 'action_surge', 'shield_bash'],
    classFeatures: ['Estilo de Lucha Defensivo', 'Tomar Aliento', 'Oleada de Acción'],
  },
  {
    id: 'rogue',
    name: 'Pícaro',
    role: 'Asesino Furtivo y Exploración',
    description:
      'Especialista en emboscadas, cerraduras y trampas. Golpea los puntos vitales de enemigos distraídos y desaparece entre las sombras.',
    hitDie: 8,
    baseHp: 22,
    baseMana: 14,
    baseAc: 15,
    primaryStat: 'dex',
    baseStats: { str: 10, dex: 17, con: 13, int: 12, wis: 11, cha: 14 },
    startingInventory: ['Dagas Gemelas', 'Ganzúas de Maestro', 'Capa Sombría', 'Vial de Veneno'],
    startingSpells: ['sneak_attack', 'shadow_step', 'poison_blade'],
    classFeatures: ['Ataque Furtivo (+2d6)', 'Acción Astuta', 'Evasión'],
  },
  {
    id: 'cleric',
    name: 'Clérigo',
    role: 'Sanación Divina y Soporte',
    description:
      'Canalizador de la luz sagrada. Sana heridas letales al instante, bendice a sus aliados y calcina a los no-muertos.',
    hitDie: 8,
    baseHp: 24,
    baseMana: 26,
    baseAc: 16,
    primaryStat: 'wis',
    baseStats: { str: 13, dex: 10, con: 14, int: 11, wis: 17, cha: 13 },
    startingInventory: ['Maza Sagrada', 'Símbolo Solar', 'Cota de Escamas', 'Poción de Curación'],
    startingSpells: ['healing_word', 'sacred_flame', 'shield_of_faith', 'turn_undead'],
    classFeatures: ['Canalizar Divinidad', 'Bendición Protectora', 'Expulsar No-Muertos'],
  },
  {
    id: 'ranger',
    name: 'Explorador',
    role: 'Tirador y Rastreador',
    description:
      'Guardián de los bosques antiguos. Abate objetivos a gran distancia con su arco largo e invoca el poder de la naturaleza.',
    hitDie: 10,
    baseHp: 25,
    baseMana: 18,
    baseAc: 15,
    primaryStat: 'dex',
    baseStats: { str: 12, dex: 17, con: 14, int: 10, wis: 15, cha: 9 },
    startingInventory: ['Arco Largo Élfico', 'Carcaj (20 flechas)', 'Armadura de Cuero', 'Brújula Antigua'],
    startingSpells: ['hunters_mark', 'arrow_volley', 'thorn_snare'],
    classFeatures: ['Enemigo Predilecto', 'Explorador Nato', 'Puntería Letal'],
  },
  {
    id: 'bard',
    name: 'Bardo',
    role: 'Magia Sonora e Inspiración',
    description:
      'Tejedor de relatos y melodías arcanas. Inspira proezas imposibles en sus compañeros y confunde a los enemigos con acordes resonantes.',
    hitDie: 8,
    baseHp: 21,
    baseMana: 24,
    baseAc: 14,
    primaryStat: 'cha',
    baseStats: { str: 9, dex: 14, con: 12, int: 13, wis: 11, cha: 17 },
    startingInventory: ['Laúd Encantado', 'Estoque Ligero', 'Capa Carmesí', 'Odre de Hidromiel'],
    startingSpells: ['bardic_inspiration', 'thunderwave', 'vicious_mockery', 'healing_word'],
    classFeatures: ['Inspiración Bárdica', 'Canción de Descanso', 'Polifacético'],
  },
];

export const SPELLS_AND_ABILITIES: Record<string, SpellOrAbility> = {
  fireball: {
    id: 'fireball',
    name: 'Bola de Fuego',
    school: 'Evocación',
    kind: 'spell',
    manaCost: 8,
    rangeCells: 7,
    areaRadius: 2,
    diceFormula: '4d6',
    damageType: 'Fuego',
    description: 'Esfera ígnea devastadora que explota en un radio de 2 casillas.',
  },
  magic_missile: {
    id: 'magic_missile',
    name: 'Proyectil Mágico',
    school: 'Evocación',
    kind: 'spell',
    manaCost: 4,
    rangeCells: 8,
    areaRadius: 0,
    diceFormula: '3d4+3',
    damageType: 'Fuerza',
    description: 'Tres dardos de energía pura que impactan automáticamente sin fallar.',
  },
  arcane_shield: {
    id: 'arcane_shield',
    name: 'Escudo Arcano',
    school: 'Abjuración',
    kind: 'spell',
    manaCost: 4,
    rangeCells: 0,
    areaRadius: 0,
    diceFormula: '1d6+4',
    damageType: 'Protección',
    description: 'Barrera rúnica translúcida que otorga +5 CA temporal.',
  },
  lightning_bolt: {
    id: 'lightning_bolt',
    name: 'Rayo Relampagueante',
    school: 'Evocación',
    kind: 'spell',
    manaCost: 7,
    rangeCells: 8,
    areaRadius: 1,
    diceFormula: '3d8+2',
    damageType: 'Relámpago',
    description: 'Línea eléctrica cegadora que atraviesa armaduras metálicas.',
  },
  misty_step: {
    id: 'misty_step',
    name: 'Paso Brumoso',
    school: 'Conjuración',
    kind: 'spell',
    manaCost: 5,
    rangeCells: 4,
    areaRadius: 0,
    diceFormula: '1d4',
    damageType: 'Teletransporte',
    description: 'Te desvaneces en niebla arcana y reapareces hasta 4 casillas más lejos.',
  },
  healing_word: {
    id: 'healing_word',
    name: 'Palabra de Curación',
    school: 'Divina',
    kind: 'spell',
    manaCost: 5,
    rangeCells: 5,
    areaRadius: 0,
    diceFormula: '2d8+4',
    damageType: 'Curación',
    description: 'Luz cálida que restaura puntos de vida a un aliado herido.',
  },
  sacred_flame: {
    id: 'sacred_flame',
    name: 'Llama Sagrada',
    school: 'Divina',
    kind: 'spell',
    manaCost: 3,
    rangeCells: 6,
    areaRadius: 0,
    diceFormula: '2d8',
    damageType: 'Radiante',
    description: 'Fuego celestial que desciende sobre un enemigo ignorando cobertura.',
  },
  shield_of_faith: {
    id: 'shield_of_faith',
    name: 'Escudo de Fe',
    school: 'Divina',
    kind: 'spell',
    manaCost: 4,
    rangeCells: 5,
    areaRadius: 0,
    diceFormula: '1d4+2',
    damageType: 'Bendición',
    description: 'Aura dorada que protege a un compañero (+2 CA).',
  },
  turn_undead: {
    id: 'turn_undead',
    name: 'Expulsar No-Muertos',
    school: 'Divina',
    kind: 'spell',
    manaCost: 6,
    rangeCells: 4,
    areaRadius: 2,
    diceFormula: '3d6',
    damageType: 'Radiante',
    description: 'Onda consagrada que ahuyenta e hiere a esqueletos, espectros y zombis.',
  },
  cleave_strike: {
    id: 'cleave_strike',
    name: 'Tajo Implacable',
    school: 'Marcial',
    kind: 'martial',
    manaCost: 3,
    rangeCells: 1,
    areaRadius: 1,
    diceFormula: '2d8+4',
    damageType: 'Cortante',
    description: 'Golpe circular brutal con tu arma que hiere a enemigos adyacentes.',
  },
  action_surge: {
    id: 'action_surge',
    name: 'Oleada de Acción',
    school: 'Marcial',
    kind: 'martial',
    manaCost: 5,
    rangeCells: 1,
    areaRadius: 0,
    diceFormula: '2d10+4',
    damageType: 'Contundente',
    description: 'Superas tus límites físicos para descargar un ataque doble.',
  },
  shield_bash: {
    id: 'shield_bash',
    name: 'Embestida de Escudo',
    school: 'Marcial',
    kind: 'martial',
    manaCost: 2,
    rangeCells: 1,
    areaRadius: 0,
    diceFormula: '1d8+3',
    damageType: 'Aturdimiento',
    description: 'Impactas con el escudo intentando derribar o aturdir al rival.',
  },
  sneak_attack: {
    id: 'sneak_attack',
    name: 'Ataque Furtivo',
    school: 'Sombra',
    kind: 'martial',
    manaCost: 3,
    rangeCells: 2,
    areaRadius: 0,
    diceFormula: '3d6+4',
    damageType: 'Perforante',
    description: 'Estocada precisa en un punto vital mientras el enemigo está distraído.',
  },
  shadow_step: {
    id: 'shadow_step',
    name: 'Paso Sombrío',
    school: 'Sombra',
    kind: 'martial',
    manaCost: 4,
    rangeCells: 4,
    areaRadius: 0,
    diceFormula: '1d6',
    damageType: 'Sigilo',
    description: 'Te fundes en la penumbra para reposicionarte tras el objetivo.',
  },
  poison_blade: {
    id: 'poison_blade',
    name: 'Hoja Envenenada',
    school: 'Sombra',
    kind: 'martial',
    manaCost: 4,
    rangeCells: 1,
    areaRadius: 0,
    diceFormula: '2d8+2',
    damageType: 'Veneno',
    description: 'Impregnas tu hoja con toxina paralizante de araña gigante.',
  },
  hunters_mark: {
    id: 'hunters_mark',
    name: 'Marca del Cazador',
    school: 'Naturaleza',
    kind: 'spell',
    manaCost: 3,
    rangeCells: 9,
    areaRadius: 0,
    diceFormula: '2d8+3',
    damageType: 'Perforante',
    description: 'Marcas místicamente a tu presa infligiendo daño extra con cada flecha.',
  },
  arrow_volley: {
    id: 'arrow_volley',
    name: 'Lluvia de Flechas',
    school: 'Naturaleza',
    kind: 'martial',
    manaCost: 6,
    rangeCells: 8,
    areaRadius: 2,
    diceFormula: '3d6+2',
    damageType: 'Perforante',
    description: 'Disparas múltiples saetas en arco sobre una zona enemiga.',
  },
  thorn_snare: {
    id: 'thorn_snare',
    name: 'Zarzas Atrapantes',
    school: 'Naturaleza',
    kind: 'spell',
    manaCost: 4,
    rangeCells: 6,
    areaRadius: 1,
    diceFormula: '2d6',
    damageType: 'Naturaleza',
    description: 'Raíces espinosas brotan del suelo inmovilizando a los rivales.',
  },
  bardic_inspiration: {
    id: 'bardic_inspiration',
    name: 'Inspiración Bárdica',
    school: 'Sonido',
    kind: 'spell',
    manaCost: 4,
    rangeCells: 6,
    areaRadius: 0,
    diceFormula: '1d8+3',
    damageType: 'Inspiración',
    description: 'Acorde heroico que concede ventaja y vigor a un aliado.',
  },
  thunderwave: {
    id: 'thunderwave',
    name: 'Onda Atronadora',
    school: 'Evocación',
    kind: 'spell',
    manaCost: 5,
    rangeCells: 3,
    areaRadius: 2,
    diceFormula: '2d8',
    damageType: 'Trueno',
    description: 'Estallido sónico que empuja a los enemigos cercanos.',
  },
  vicious_mockery: {
    id: 'vicious_mockery',
    name: 'Burla Dañina',
    school: 'Encantamiento',
    kind: 'spell',
    manaCost: 2,
    rangeCells: 6,
    areaRadius: 0,
    diceFormula: '2d4+2',
    damageType: 'Psíquico',
    description: 'Palabras cargadas de magia que confunden y hieren la mente enemiga.',
  },
};

export const ADVENTURE_MODULES: AdventureModule[] = [
  {
    id: 'tavern_start',
    title: 'La Posada del Dragón Dorado',
    setting: 'Taberna fronteriza con rumores de un relicario robado y espías en la sombra',
    mapTheme: 'tavern',
    hook: 'Brindis inicial en la mesa, interrogatorios al tabernero y conspiraciones entre jarras.',
    difficulty: 'Ideal para empezar',
  },
  {
    id: 'crypt_start',
    title: 'La Cripta de los Susurros',
    setting: 'Catacumbas arcanas bajo la Ciudadela de Obsidiana con sellos rúnicos',
    mapTheme: 'crypt',
    hook: 'Un círculo de invocación antiguo palpita bajo tierra custodiado por espectros.',
    difficulty: 'Táctico y oscuro',
  },
  {
    id: 'forest_start',
    title: 'Ruinas de Valenwood',
    setting: 'Templo élfico invadido por líneas ley fracturadas bajo la luna llena',
    mapTheme: 'forest',
    hook: 'Las grietas esmeraldas del bosque están despertando guardianes ancestrales.',
    difficulty: 'Exploración y magia',
  },
  {
    id: 'pirates_start',
    title: 'Corsarios del Mar Maldito',
    setting: 'Taberna portuaria del Caribe fantástico con mapas de tesoros y armadas rivales',
    mapTheme: 'tavern',
    hook: 'Un capitán fantasma ofrece un trato antes de zarpar hacia la isla maldita.',
    difficulty: 'Aventura naval',
  },
  {
    id: 'vega_start',
    title: 'Leyendas de la Vega Mágica',
    setting: 'Huertas encantadas, acequias con espíritus antiguos y la sierra de Orihuela',
    mapTheme: 'forest',
    hook: 'El río antiguo reclama un tributo olvidado mientras las acequias brillan con runas.',
    difficulty: 'Folklore mágico',
  },
  {
    id: 'custom_start',
    title: 'Ambientación Propia',
    setting: '',
    mapTheme: 'tavern',
    hook: 'Describe tu propio mundo, época y conflicto para que Gemini lo dirija.',
    difficulty: 'Mundo libre',
  },
];

export const TONE_OPTIONS = [
  'Épico',
  'Humor',
  'Oscuro',
  'Familiar (apto para niños)',
];

export const LENGTH_OPTIONS = [
  'Una noche (1–2 horas)',
  'Campaña larga (varias sesiones)',
];

export const INGREDIENT_OPTIONS = [
  'Acción',
  'Misterio',
  'Romance ligero',
  'Drama y cotilleo',
  'Comedia',
  'Enigmas',
  'Miedo suave',
];

export const DM_VOICES: Array<{ id: DmVoiceName; label: string }> = [
  { id: 'Charon', label: 'Grave (Charon)' },
  { id: 'Fenrir', label: 'Épica (Fenrir)' },
  { id: 'Kore', label: 'Clara (Kore)' },
  { id: 'Puck', label: 'Ágil (Puck)' },
];

export const MAP_BACKGROUNDS: Record<MapTheme, { label: string; image: string }> = {
  crypt: {
    label: 'Cripta Arcana',
    image: '/src/assets/images/battlemap_dungeon_crypt_1795018109126.jpg',
  },
  forest: {
    label: 'Ruinas del Bosque',
    image: '/src/assets/images/battlemap_forest_ruins_1795018108591.jpg',
  },
  tavern: {
    label: 'Posada del Dragón',
    image: '/src/assets/images/battlemap_tavern_hall_1795018109485.jpg',
  },
};

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_tavern_table_1795018107321.jpg';

export function buildHeroFromTemplate(params: {
  id: string;
  campaignId: string;
  ownerId: string;
  playerName: string;
  name: string;
  raceId: RaceId;
  classId: ClassId;
  gridX: number;
  gridY: number;
  look?: string;
  rasgo?: string;
  bonusItem?: string;
}): Hero {
  const race = RACES.find((r) => r.id === params.raceId) ?? RACES[0];
  const cls = CLASSES.find((c) => c.id === params.classId) ?? CLASSES[0];

  const stats: HeroStats = {
    str: cls.baseStats.str + (race.bonuses.str ?? 0),
    dex: cls.baseStats.dex + (race.bonuses.dex ?? 0),
    con: cls.baseStats.con + (race.bonuses.con ?? 0),
    int: cls.baseStats.int + (race.bonuses.int ?? 0),
    wis: cls.baseStats.wis + (race.bonuses.wis ?? 0),
    cha: cls.baseStats.cha + (race.bonuses.cha ?? 0),
  };

  const conMod = Math.floor((stats.con - 10) / 2);
  const intOrWisOrChaMod = Math.floor((stats[cls.primaryStat] - 10) / 2);
  const maxHp = Math.max(12, cls.baseHp + conMod * 2);
  const maxMana = Math.max(6, cls.baseMana + Math.max(0, intOrWisOrChaMod) * 2);
  const ac = cls.baseAc + (race.id === 'dragonborn' ? 1 : 0);

  const inventory = [...cls.startingInventory];
  if (params.bonusItem && params.bonusItem.trim()) {
    inventory.push(params.bonusItem.trim().slice(0, 60));
  }

  return {
    id: params.id,
    campaignId: params.campaignId,
    ownerId: params.ownerId,
    playerName: params.playerName.trim() || 'Jugador',
    name: params.name.trim() || 'Aventurero',
    raceId: race.id,
    classId: cls.id,
    level: 1,
    hp: maxHp,
    maxHp,
    mana: maxMana,
    maxMana,
    ac,
    gridX: params.gridX,
    gridY: params.gridY,
    color: race.accentColor,
    xp: 0,
    gold: 25,
    look: params.look?.trim() || `${race.name} con atuendo de ${cls.name.toLowerCase()}.`,
    rasgo: params.rasgo?.trim() || 'Siempre atento al próximo botín y a cubrir a sus aliados.',
    stats,
    conditions: [],
    inventory,
    knownSpells: [...cls.startingSpells],
  };
}

export function getPresetParty(campaignId: string, ownerId: string): Hero[] {
  return [
    buildHeroFromTemplate({
      id: 'hero_lyra',
      campaignId,
      ownerId,
      playerName: 'Jugador 1',
      name: 'Lyra Valen',
      raceId: 'high_elf',
      classId: 'mage',
      gridX: 2,
      gridY: 3,
      look: 'Túnica azul medianoche bordada con constelaciones y báculo de cristal.',
      rasgo: 'Anota cada runa extraña que ve antes de preguntar si es peligrosa.',
    }),
    buildHeroFromTemplate({
      id: 'hero_thorin',
      campaignId,
      ownerId,
      playerName: 'Jugador 2',
      name: 'Thorin Forjapiedra',
      raceId: 'mountain_dwarf',
      classId: 'warrior',
      gridX: 3,
      gridY: 4,
      look: 'Barba trenzada con anillos de bronce y escudo abollado en mil batallas.',
      rasgo: 'Nunca rechaza una jarra ni deja a un compañero atrás.',
    }),
    buildHeroFromTemplate({
      id: 'hero_kaelen',
      campaignId,
      ownerId,
      playerName: 'Jugador 3',
      name: 'Kaelen Noctis',
      raceId: 'tiefling',
      classId: 'rogue',
      gridX: 2,
      gridY: 5,
      look: 'Cuernos oscuros envueltos en plata y capa con bolsillos ocultos.',
      rasgo: 'Sonríe cuando las cosas se tuercen y siempre tiene un plan B.',
    }),
    buildHeroFromTemplate({
      id: 'hero_seraphina',
      campaignId,
      ownerId,
      playerName: 'Jugador 4',
      name: 'Seraphina Luz',
      raceId: 'human',
      classId: 'cleric',
      gridX: 1,
      gridY: 4,
      look: 'Cota pulida bajo tabardo solar y amuleto dorado brillante.',
      rasgo: 'Mantiene la calma incluso rodeada de esqueletos.',
    }),
  ];
}

export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(score: number): string {
  const mod = getModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function getRace(raceId: RaceId): RaceDefinition {
  return RACES.find((r) => r.id === raceId) ?? RACES[0];
}

export function getClass(classId: ClassId): ClassDefinition {
  return CLASSES.find((c) => c.id === classId) ?? CLASSES[0];
}

export function rollDiceFormula(formula: string): { total: number; rolls: number[]; bonus: number } {
  const cleaned = formula.toLowerCase().replace(/\s+/g, '');
  const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    const fallback = Math.floor(Math.random() * 20) + 1;
    return { total: fallback, rolls: [fallback], bonus: 0 };
  }
  const count = Math.min(12, Math.max(1, Number(match[1])));
  const sides = Math.min(100, Math.max(2, Number(match[2])));
  const bonus = match[3] ? Number(match[3]) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = Math.max(1, rolls.reduce((a, b) => a + b, 0) + bonus);
  return { total, rolls, bonus };
}

export function coordLabel(x: number, y: number): string {
  const letters = 'ABCDEFGHIJKL';
  return `${letters[x] ?? 'A'}${y + 1}`;
}
