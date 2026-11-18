import React, { useState } from 'react';
import {
  Grid3X3,
  Maximize2,
  Minimize2,
  Shield,
  Skull,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { coordLabel, getClass, getRace, MAP_BACKGROUNDS } from '../data/dndCatalog';
import type { Enemy, Hero, MapTheme, SpellOrAbility } from '../types/dnd';

interface TacticalBoardProps {
  mapTheme: MapTheme;
  onChangeMapTheme: (theme: MapTheme) => void;
  heroes: Hero[];
  enemies: Enemy[];
  activeHeroId: string;
  onSelectHero: (heroId: string) => void;
  onMoveHero: (heroId: string, gridX: number, gridY: number) => void;
  armedSpell: SpellOrAbility | null;
  onCancelArmedSpell: () => void;
  onCastSpellAt: (gridX: number, gridY: number, targetEnemy?: Enemy) => void;
  onSelectEnemyAction: (enemy: Enemy) => void;
  inCombat: boolean;
  roundNumber: number;
  isTvFullscreen: boolean;
  onToggleTvFullscreen: () => void;
}

const COLS = 12;
const ROWS = 8;
const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const TacticalBoard: React.FC<TacticalBoardProps> = ({
  mapTheme,
  onChangeMapTheme,
  heroes,
  enemies,
  activeHeroId,
  onSelectHero,
  onMoveHero,
  armedSpell,
  onCancelArmedSpell,
  onCastSpellAt,
  onSelectEnemyAction,
  inCombat,
  roundNumber,
  isTvFullscreen,
  onToggleTvFullscreen,
}) => {
  const [showCoords, setShowCoords] = useState(true);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  const activeHero = heroes.find((h) => h.id === activeHeroId) ?? heroes[0];
  const mapAsset = MAP_BACKGROUNDS[mapTheme] ?? MAP_BACKGROUNDS.crypt;

  const manhattanDistance = (x1: number, y1: number, x2: number, y2: number) =>
    Math.abs(x1 - x2) + Math.abs(y1 - y2);

  const chebyshevDistance = (x1: number, y1: number, x2: number, y2: number) =>
    Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));

  const handleCellClick = (x: number, y: number) => {
    const enemyHere = enemies.find((e) => !e.isDefeated && e.gridX === x && e.gridY === y);
    const heroHere = heroes.find((h) => h.gridX === x && h.gridY === y);

    if (armedSpell && activeHero) {
      const dist = chebyshevDistance(activeHero.gridX, activeHero.gridY, x, y);
      if (armedSpell.rangeCells === 0 || dist <= armedSpell.rangeCells) {
        onCastSpellAt(x, y, enemyHere);
      }
      return;
    }

    if (heroHere) {
      onSelectHero(heroHere.id);
      return;
    }

    if (enemyHere) {
      onSelectEnemyAction(enemyHere);
      return;
    }

    if (activeHero) {
      onMoveHero(activeHero.id, x, y);
    }
  };

  return (
    <section className="bg-[#141822] border border-stone-800/90 rounded-xl overflow-hidden">
      {/* Board Toolbar */}
      <div className="px-4 py-3 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-4 bg-[#11141d]">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-sm font-semibold text-stone-100 whitespace-nowrap">
            Tablero Táctico
          </h2>
          <span className="text-stone-600" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-stone-400 whitespace-nowrap">
            {inCombat ? (
              <span className="text-red-400 font-semibold inline-flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                Combate · Asalto <span className="font-mono-tabular">{roundNumber || 1}</span>
              </span>
            ) : (
              <span>Exploración · Escala 1,5m / casilla</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {armedSpell && (
            <div className="flex items-center gap-2 px-3 py-1 bg-sky-950/80 border border-sky-500/40 rounded-lg text-xs text-sky-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="whitespace-nowrap">
                Apuntando: <strong>{armedSpell.name}</strong> (Alcance {armedSpell.rangeCells || 'Propio'})
              </span>
              <button
                onClick={onCancelArmedSpell}
                className="text-sky-300 hover:text-white cursor-pointer"
                title="Cancelar hechizo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Map Environment Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-[#0c0f16] border border-stone-800 rounded-lg">
            {(['tavern', 'forest', 'crypt'] as MapTheme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => {
                  setImgError(false);
                  onChangeMapTheme(theme);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mapTheme === theme
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200 border border-transparent'
                }`}
              >
                {MAP_BACKGROUNDS[theme].label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCoords((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showCoords
                ? 'bg-stone-800 text-stone-100 border-stone-700'
                : 'bg-[#0c0f16] text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
            title="Mostrar u ocultar coordenadas de cuadrícula"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Rejilla
          </button>

          <button
            onClick={onToggleTvFullscreen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#0c0f16] hover:bg-stone-800 text-stone-200 border border-stone-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Expandir tablero para pantalla de TV"
          >
            {isTvFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                Vista Normal
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                Modo TV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive 12x8 Battlemap Canvas */}
      <div className="relative w-full aspect-[16/10] bg-[#0b0e14] select-none overflow-hidden">
        {!imgError ? (
          <img
            src={mapAsset.image}
            alt={mapAsset.label}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-[#151a26] to-stone-950" />
        )}

        {/* Measured vignette for high token contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/35 pointer-events-none" />

        {/* 12 x 8 Tactical Grid */}
        <div
          className="relative z-10 w-full h-full grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: ROWS }).map((_, y) =>
            Array.from({ length: COLS }).map((__, x) => {
              const heroHere = heroes.find((h) => h.gridX === x && h.gridY === y);
              const enemyHere = enemies.find((e) => e.gridX === x && e.gridY === y);

              const inSpellRange =
                armedSpell && activeHero
                  ? armedSpell.rangeCells === 0
                    ? activeHero.gridX === x && activeHero.gridY === y
                    : chebyshevDistance(activeHero.gridX, activeHero.gridY, x, y) <=
                      armedSpell.rangeCells
                  : false;

              const inAoEBlast =
                armedSpell &&
                hoverCell &&
                armedSpell.areaRadius > 0 &&
                chebyshevDistance(hoverCell.x, hoverCell.y, x, y) <= armedSpell.areaRadius;

              const heroCanReach =
                !armedSpell &&
                activeHero &&
                !heroHere &&
                !enemyHere &&
                manhattanDistance(activeHero.gridX, activeHero.gridY, x, y) <=
                  getRace(activeHero.raceId).speed;

              const isHovered = hoverCell?.x === x && hoverCell?.y === y;

              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  onMouseEnter={() => setHoverCell({ x, y })}
                  onMouseLeave={() => setHoverCell(null)}
                  onClick={() => handleCellClick(x, y)}
                  aria-label={`Casilla ${coordLabel(x, y)}`}
                  className={`relative flex items-center justify-center transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    showCoords ? 'border border-white/10' : 'border border-transparent'
                  } ${
                    inAoEBlast
                      ? 'bg-orange-500/35 ring-1 ring-inset ring-orange-400/70'
                      : inSpellRange
                      ? 'bg-sky-500/15 hover:bg-sky-500/30'
                      : isHovered && heroCanReach
                      ? 'bg-amber-400/20'
                      : isHovered
                      ? 'bg-white/10'
                      : ''
                  }`}
                >
                  {/* Coordinate stamp */}
                  {showCoords && !heroHere && !enemyHere && (
                    <span className="absolute top-0.5 left-1 text-[9px] font-mono-tabular text-white/30 pointer-events-none">
                      {COL_LETTERS[x]}
                      {y + 1}
                    </span>
                  )}

                  {/* Hero Token */}
                  {heroHere && (
                    <div
                      className={`relative flex flex-col items-center justify-center w-[78%] h-[78%] rounded-full border-2 shadow-lg transition-transform duration-150 ${
                        heroHere.id === activeHeroId
                          ? 'scale-110 ring-4 ring-amber-400/45 border-amber-300'
                          : 'border-stone-200/80 hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: `${heroHere.color}30`,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <span
                        className="font-display text-xs sm:text-sm font-bold text-white drop-shadow"
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                      >
                        {heroHere.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-[9px] font-medium text-stone-100 bg-black/75 px-1.5 rounded leading-tight max-w-full truncate">
                        {heroHere.name.split(' ')[0]}
                      </span>
                      {/* HP Mini Bar */}
                      <div className="absolute -bottom-1.5 left-1 right-1 h-1.5 bg-black/85 rounded-full overflow-hidden border border-stone-700">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-200"
                          style={{
                            width: `${Math.max(0, Math.min(100, (heroHere.hp / heroHere.maxHp) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Enemy Token */}
                  {enemyHere && (
                    <div
                      className={`relative flex flex-col items-center justify-center w-[78%] h-[78%] rounded-xl border-2 shadow-lg transition-transform duration-150 ${
                        enemyHere.isDefeated
                          ? 'opacity-45 border-stone-600 bg-stone-900/80'
                          : enemyHere.threat === 'boss'
                          ? 'border-red-400 bg-red-950/85 ring-2 ring-red-500/40 hover:scale-105'
                          : 'border-rose-500/80 bg-rose-950/80 hover:scale-105'
                      }`}
                    >
                      {enemyHere.isDefeated ? (
                        <Skull className="w-4 h-4 text-stone-400" />
                      ) : (
                        <>
                          <span className="font-display text-xs font-bold text-rose-100 leading-none">
                            {enemyHere.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-[9px] font-medium text-rose-100 bg-black/75 px-1 rounded leading-tight max-w-full truncate mt-0.5">
                            {enemyHere.name.split(' ')[0]}
                          </span>
                          <div className="absolute -bottom-1.5 left-1 right-1 h-1.5 bg-black/85 rounded-full overflow-hidden border border-rose-900">
                            <div
                              className="h-full bg-red-500 transition-all duration-200"
                              style={{
                                width: `${Math.max(0, Math.min(100, (enemyHere.hp / enemyHere.maxHp) * 100))}%`,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Map Legend Bar */}
        <div className="absolute bottom-2.5 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          <div className="bg-black/75 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 text-xs text-stone-200 flex items-center gap-3 pointer-events-auto">
            {activeHero ? (
              <>
                <span className="font-semibold text-amber-300">{activeHero.name}</span>
                <span className="text-stone-500">·</span>
                <span>
                  {getRace(activeHero.raceId).name} {getClass(activeHero.classId).name}
                </span>
                <span className="text-stone-500">·</span>
                <span className="font-mono-tabular text-stone-300">
                  Posición {coordLabel(activeHero.gridX, activeHero.gridY)}
                </span>
                <span className="text-stone-500 hidden sm:inline">·</span>
                <span className="text-stone-400 hidden sm:inline">
                  Haz clic en otra casilla para mover ficha
                </span>
              </>
            ) : (
              <span>Selecciona un héroe para moverlo por el tablero</span>
            )}
          </div>

          {enemies.some((e) => !e.isDefeated) && (
            <div className="bg-black/75 backdrop-blur-sm border border-rose-500/30 rounded-lg px-3 py-1.5 text-xs text-rose-200 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-mono-tabular">
                {enemies.filter((e) => !e.isDefeated).length} amenazas activas
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
