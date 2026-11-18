import React, { useState } from 'react';
import { BookOpen, Shield, Sparkles, Swords } from 'lucide-react';
import { CLASSES, RACES, SPELLS_AND_ABILITIES } from '../data/dndCatalog';

export const CompendiumView: React.FC = () => {
  const [filter, setFilter] = useState<'races' | 'classes' | 'spells'>('races');

  const spellsList = Object.values(SPELLS_AND_ABILITIES);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-800 pb-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-stone-100">
            Compendio de Razas, Clases y Magia
          </h1>
          <p className="text-sm text-stone-400 max-w-2xl">
            Consulta los linajes jugables, rasgos raciales, estilos de combate y conjuros arcanos disponibles en la mesa.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#141822] border border-stone-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setFilter('races')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'races'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Razas ({RACES.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('classes')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'classes'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Clases ({CLASSES.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('spells')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'spells'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Grimorio ({spellsList.length})
          </button>
        </div>
      </div>

      {filter === 'races' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RACES.map((race) => (
            <article
              key={race.id}
              className="bg-[#141822] border border-stone-800 rounded-xl p-6 space-y-4"
            >
              <div>
                <div className="text-xs font-medium text-amber-400">{race.tagline}</div>
                <h2 className="font-display text-xl font-bold text-stone-100 mt-1">
                  {race.name}
                </h2>
              </div>
              <p className="text-sm text-stone-300 leading-relaxed">{race.description}</p>
              <div className="pt-3 border-t border-stone-800/80 space-y-2 text-xs">
                <div className="text-stone-200 font-semibold">
                  Bonificadores:{' '}
                  <span className="font-mono-tabular text-amber-300">
                    {Object.entries(race.bonuses)
                      .map(([k, v]) => `${k.toUpperCase()} +${v}`)
                      .join(' · ')}
                  </span>
                </div>
                <div className="text-stone-400">
                  Velocidad <span className="font-mono-tabular">{race.speed} casillas</span> ·{' '}
                  {race.darkvision ? 'Visión en Oscuridad' : 'Visión Normal'}
                </div>
                <div className="pt-1 space-y-1 text-stone-300">
                  {race.traits.map((t) => (
                    <div key={t}>· {t}</div>
                  ))}
                </div>
                <div className="pt-2 text-amber-300 font-medium">
                  Poder: {race.racialPower.name} —{' '}
                  <span className="text-stone-400 font-normal">
                    {race.racialPower.description}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {filter === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CLASSES.map((cls) => (
            <article
              key={cls.id}
              className="bg-[#141822] border border-stone-800 rounded-xl p-6 space-y-4"
            >
              <div>
                <div className="text-xs font-medium text-sky-400">{cls.role}</div>
                <h2 className="font-display text-xl font-bold text-stone-100 mt-1">
                  {cls.name}
                </h2>
              </div>
              <p className="text-sm text-stone-300 leading-relaxed">{cls.description}</p>
              <div className="pt-3 border-t border-stone-800/80 grid grid-cols-3 gap-2 text-xs font-mono-tabular">
                <div className="bg-[#0d1017] p-2 rounded border border-stone-800">
                  <div className="text-stone-400">PV Base</div>
                  <div className="text-emerald-400 font-semibold">{cls.baseHp}</div>
                </div>
                <div className="bg-[#0d1017] p-2 rounded border border-stone-800">
                  <div className="text-stone-400">Maná</div>
                  <div className="text-sky-400 font-semibold">{cls.baseMana}</div>
                </div>
                <div className="bg-[#0d1017] p-2 rounded border border-stone-800">
                  <div className="text-stone-400">CA Base</div>
                  <div className="text-amber-300 font-semibold">{cls.baseAc}</div>
                </div>
              </div>
              <div className="text-xs text-stone-300 space-y-1">
                <div className="font-semibold text-stone-200">Rasgos de Clase:</div>
                {cls.classFeatures.map((feat) => (
                  <div key={feat} className="text-stone-400">
                    · {feat}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {filter === 'spells' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spellsList.map((spell) => (
            <article
              key={spell.id}
              className="bg-[#141822] border border-stone-800 rounded-xl p-5 flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
                  {spell.kind === 'spell' ? (
                    <Sparkles className="w-3.5 h-3.5" />
                  ) : spell.kind === 'martial' ? (
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Shield className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {spell.school} · {spell.damageType}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-stone-100">
                  {spell.name}
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">{spell.description}</p>
              </div>
              <div className="text-right font-mono-tabular text-xs shrink-0 space-y-1 bg-[#0d1017] border border-stone-800 rounded-lg px-3 py-2">
                <div className="text-amber-300 font-semibold">{spell.diceFormula}</div>
                <div className="text-sky-400">{spell.manaCost} PM</div>
                <div className="text-stone-400 flex items-center justify-end gap-1">
                  <BookOpen className="w-3 h-3" />
                  {spell.rangeCells > 0 ? `${spell.rangeCells} cas.` : 'Propio'}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
