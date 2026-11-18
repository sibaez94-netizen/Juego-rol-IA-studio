import React, { useState } from 'react';
import {
  Backpack,
  Coins,
  Flame,
  Heart,
  Minus,
  Plus,
  Shield,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  formatModifier,
  getClass,
  getRace,
  SPELLS_AND_ABILITIES,
} from '../data/dndCatalog';
import type { Hero, SpellOrAbility } from '../types/dnd';

interface PartyAndGrimoirePanelProps {
  heroes: Hero[];
  activeHeroId: string;
  onSelectHero: (heroId: string) => void;
  armedSpell: SpellOrAbility | null;
  onArmSpell: (spell: SpellOrAbility) => void;
  onUseRacialPower: (hero: Hero) => void;
  onUseItem: (hero: Hero, item: string) => void;
  onAdjustHeroResource: (heroId: string, resource: 'hp' | 'mana', delta: number) => void;
}

export const PartyAndGrimoirePanel: React.FC<PartyAndGrimoirePanelProps> = ({
  heroes,
  activeHeroId,
  onSelectHero,
  armedSpell,
  onArmSpell,
  onUseRacialPower,
  onUseItem,
  onAdjustHeroResource,
}) => {
  const [tab, setTab] = useState<'spells' | 'stats' | 'bag'>('spells');
  const activeHero = heroes.find((h) => h.id === activeHeroId) ?? heroes[0];

  if (!activeHero) return null;

  const race = getRace(activeHero.raceId);
  const cls = getClass(activeHero.classId);

  return (
    <aside className="bg-[#141822] border border-stone-800/90 rounded-xl flex flex-col overflow-hidden">
      {/* Party Selector Strip */}
      <div className="p-3 border-b border-stone-800/80 bg-[#11141d] space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-stone-100">
            Grupo de Aventureros
          </h2>
          <span className="text-xs text-stone-400 font-mono-tabular">
            {heroes.length} héroes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
          {heroes.map((hero) => {
            const hRace = getRace(hero.raceId);
            const hClass = getClass(hero.classId);
            const isActive = hero.id === activeHero.id;
            return (
              <div
                key={hero.id}
                onClick={() => onSelectHero(hero.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectHero(hero.id);
                  }
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1c2231] border-amber-500/50'
                    : 'bg-[#0e1118] hover:bg-[#171c27] border-stone-800/90'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: hero.color }}
                      />
                      <span className="text-sm font-semibold text-stone-100 truncate">
                        {hero.name}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 truncate mt-0.5">
                      {hero.playerName} · {hRace.name} {hClass.name} · Nv {hero.level}
                    </p>
                  </div>

                  {/* Quick Manual HP/Mana Adjusters */}
                  <div
                    className="flex flex-col items-end gap-1 font-mono-tabular text-[11px] shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAdjustHeroResource(hero.id, 'hp', -1)}
                        className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 grid place-items-center cursor-pointer"
                        title="Restar 1 PV"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-emerald-400 min-w-[54px] text-center">
                        PV {hero.hp}/{hero.maxHp}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdjustHeroResource(hero.id, 'hp', 1)}
                        className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 grid place-items-center cursor-pointer"
                        title="Sumar 1 PV"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAdjustHeroResource(hero.id, 'mana', -1)}
                        className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 grid place-items-center cursor-pointer"
                        title="Restar 1 PM"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-sky-400 min-w-[54px] text-center">
                        PM {hero.mana}/{hero.maxMana}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdjustHeroResource(hero.id, 'mana', 1)}
                        className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 grid place-items-center cursor-pointer"
                        title="Sumar 1 PM"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Hero Inspector */}
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-amber-300">
              {activeHero.name}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {race.name} · {cls.name} · Nivel {activeHero.level}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono-tabular">
            <span className="inline-flex items-center gap-1 text-stone-200">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              CA {activeHero.ac}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Coins className="w-3.5 h-3.5" />
              {activeHero.gold} po
            </span>
          </div>
        </div>

        {(activeHero.look || activeHero.rasgo) && (
          <div className="text-xs space-y-1 bg-[#0e1118] border border-stone-800/80 rounded-lg p-2.5">
            {activeHero.look && <p className="text-stone-300">{activeHero.look}</p>}
            {activeHero.rasgo && (
              <p className="text-stone-400 italic">«{activeHero.rasgo}»</p>
            )}
          </div>
        )}

        {/* HP & Mana Bars */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 inline-flex items-center gap-1">
                <Heart className="w-3 h-3 text-emerald-400" />
                Vida
              </span>
              <span className="font-mono-tabular text-emerald-400">
                {activeHero.hp}/{activeHero.maxHp}
              </span>
            </div>
            <div className="h-2 bg-[#0b0e14] rounded-full overflow-hidden border border-stone-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{
                  width: `${Math.max(0, Math.min(100, (activeHero.hp / activeHero.maxHp) * 100))}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                Maná
              </span>
              <span className="font-mono-tabular text-sky-400">
                {activeHero.mana}/{activeHero.maxMana}
              </span>
            </div>
            <div className="h-2 bg-[#0b0e14] rounded-full overflow-hidden border border-stone-800">
              <div
                className="h-full bg-sky-500 transition-all duration-200"
                style={{
                  width: `${
                    activeHero.maxMana > 0
                      ? Math.max(0, Math.min(100, (activeHero.mana / activeHero.maxMana) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#0c0f16] border border-stone-800 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('spells')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'spells'
                ? 'bg-[#1f2536] text-amber-300'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Grimorio y Artes
          </button>
          <button
            type="button"
            onClick={() => setTab('stats')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'stats'
                ? 'bg-[#1f2536] text-amber-300'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Atributos y Raza
          </button>
          <button
            type="button"
            onClick={() => setTab('bag')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'bag'
                ? 'bg-[#1f2536] text-amber-300'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Equipo ({activeHero.inventory.length})
          </button>
        </div>

        {/* Tab 1: Spells & Abilities */}
        {tab === 'spells' && (
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            <div className="p-2.5 bg-[#0e1118] border border-stone-800 rounded-lg flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  {race.racialPower.name} · Rasgo de {race.name}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">{race.racialPower.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onUseRacialPower(activeHero)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                Usar
              </button>
            </div>

            {activeHero.knownSpells.map((spellId) => {
              const spell = SPELLS_AND_ABILITIES[spellId];
              if (!spell) return null;
              const isArmed = armedSpell?.id === spell.id;
              const enoughMana = activeHero.mana >= spell.manaCost;
              return (
                <div
                  key={spell.id}
                  className={`p-2.5 rounded-lg border transition-colors ${
                    isArmed
                      ? 'bg-sky-950/50 border-sky-400/60'
                      : 'bg-[#0e1118] border-stone-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-stone-100">
                        <Wand2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{spell.name}</span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {spell.school} · {spell.diceFormula} ({spell.damageType}) · Coste{' '}
                        <span className="font-mono-tabular text-sky-300">{spell.manaCost} PM</span>
                      </p>
                      <p className="text-xs text-stone-400 mt-1">{spell.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!enoughMana}
                      onClick={() => onArmSpell(spell)}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isArmed
                          ? 'bg-sky-400 text-stone-950'
                          : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {isArmed ? 'Apuntando' : 'Lanzar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Stats & Racial Traits */}
        {tab === 'stats' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['FUE', activeHero.stats.str],
                  ['DES', activeHero.stats.dex],
                  ['CON', activeHero.stats.con],
                  ['INT', activeHero.stats.int],
                  ['SAB', activeHero.stats.wis],
                  ['CAR', activeHero.stats.cha],
                ] as const
              ).map(([label, val]) => (
                <div
                  key={label}
                  className="bg-[#0e1118] border border-stone-800 rounded-lg p-2 text-center"
                >
                  <div className="text-[11px] text-stone-400">{label}</div>
                  <div className="font-mono-tabular text-base font-bold text-stone-100">
                    {formatModifier(val)}
                  </div>
                  <div className="font-mono-tabular text-[11px] text-stone-500">{val}</div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-xs text-stone-300 pt-1">
              <div className="font-semibold text-stone-200">Rasgos de {race.name}:</div>
              <ul className="space-y-1 text-stone-400">
                {race.traits.map((t) => (
                  <li key={t}>· {t}</li>
                ))}
              </ul>
              <div className="font-semibold text-stone-200 pt-2">
                Competencias de {cls.name}:
              </div>
              <ul className="space-y-1 text-stone-400">
                {cls.classFeatures.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Inventory */}
        {tab === 'bag' && (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {activeHero.inventory.map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="flex items-center justify-between gap-2 p-2.5 bg-[#0e1118] border border-stone-800 rounded-lg text-xs"
              >
                <span className="inline-flex items-center gap-2 text-stone-200">
                  <Backpack className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {item}
                </span>
                <button
                  type="button"
                  onClick={() => onUseItem(activeHero, item)}
                  className="px-2.5 py-1 text-xs font-medium bg-[#1a202e] hover:bg-[#252d40] text-stone-200 border border-stone-700 rounded-md cursor-pointer"
                >
                  Usar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
