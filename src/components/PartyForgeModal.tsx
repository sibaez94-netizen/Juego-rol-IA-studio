import React, { useState } from 'react';
import { Plus, Sparkles, Trash2, Users, Wand2, X } from 'lucide-react';
import {
  ADVENTURE_MODULES,
  buildHeroFromTemplate,
  CLASSES,
  getClass,
  getPresetParty,
  getRace,
  INGREDIENT_OPTIONS,
  LENGTH_OPTIONS,
  RACES,
  SPELLS_AND_ABILITIES,
  TONE_OPTIONS,
} from '../data/dndCatalog';
import type { AdventureModule, ClassId, Hero, RaceId } from '../types/dnd';

interface HeroDraft {
  id: string;
  playerName: string;
  name: string;
  concept: string;
  raceId: RaceId;
  classId: ClassId;
  look: string;
  rasgo: string;
  bonusItem: string;
}

interface PartyForgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCampaign: (params: {
    title: string;
    module: AdventureModule;
    customSetting: string;
    tone: string;
    lengthMode: string;
    ingredients: string[];
    heroes: Hero[];
  }) => Promise<void>;
  isCreating: boolean;
}

export const PartyForgeModal: React.FC<PartyForgeModalProps> = ({
  isOpen,
  onClose,
  onCreateCampaign,
  isCreating,
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState(ADVENTURE_MODULES[0].id);
  const [customSetting, setCustomSetting] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('La Posada del Dragón Dorado');
  const [tone, setTone] = useState(TONE_OPTIONS[0]);
  const [lengthMode, setLengthMode] = useState(LENGTH_OPTIONS[1]);
  const [ingredients, setIngredients] = useState<string[]>(['Acción', 'Misterio']);
  const [isForgingWithAi, setIsForgingWithAi] = useState(false);
  const [forgeError, setForgeError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<HeroDraft[]>([
    {
      id: 'hero_1',
      playerName: 'Jugador 1',
      name: 'Lyra Valen',
      concept: 'Maga elfa curiosa que colecciona runas antiguas',
      raceId: 'high_elf',
      classId: 'mage',
      look: 'Túnica azul medianoche bordada con constelaciones y báculo de cristal.',
      rasgo: 'Anota cada runa extraña que ve antes de preguntar si es peligrosa.',
      bonusItem: '',
    },
    {
      id: 'hero_2',
      playerName: 'Jugador 2',
      name: 'Thorin Forjapiedra',
      concept: 'Enano guerrero leal, gruñón y amante de la buena cerveza',
      raceId: 'mountain_dwarf',
      classId: 'warrior',
      look: 'Barba trenzada con anillos de bronce y escudo abollado en mil batallas.',
      rasgo: 'Nunca rechaza una jarra ni deja a un compañero atrás.',
      bonusItem: '',
    },
    {
      id: 'hero_3',
      playerName: 'Jugador 3',
      name: 'Kaelen Noctis',
      concept: 'Pícaro tiefling sarcástico con talento para abrir cerraduras',
      raceId: 'tiefling',
      classId: 'rogue',
      look: 'Cuernos oscuros envueltos en plata y capa con bolsillos ocultos.',
      rasgo: 'Sonríe cuando las cosas se tuercen y siempre tiene un plan B.',
      bonusItem: '',
    },
  ]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);

  if (!isOpen) return null;

  const activeModule =
    ADVENTURE_MODULES.find((m) => m.id === selectedModuleId) ?? ADVENTURE_MODULES[0];
  const currentDraft = drafts[selectedDraftIndex] ?? drafts[0];
  const previewRace = getRace(currentDraft.raceId);
  const previewClass = getClass(currentDraft.classId);

  const updateDraft = (patch: Partial<HeroDraft>) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === selectedDraftIndex ? { ...d, ...patch } : d))
    );
  };

  const toggleIngredient = (item: string) => {
    setIngredients((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const addHeroSlot = () => {
    if (drafts.length >= 6) return;
    const nextIdx = drafts.length + 1;
    const presetRaces: RaceId[] = [
      'human',
      'dragonborn',
      'halfling',
      'high_elf',
      'tiefling',
      'mountain_dwarf',
    ];
    const presetClasses: ClassId[] = [
      'cleric',
      'bard',
      'ranger',
      'mage',
      'rogue',
      'warrior',
    ];
    setDrafts((prev) => [
      ...prev,
      {
        id: `hero_${Date.now()}_${nextIdx}`,
        playerName: `Jugador ${nextIdx}`,
        name: `Aventurero ${nextIdx}`,
        concept: '',
        raceId: presetRaces[nextIdx % presetRaces.length],
        classId: presetClasses[nextIdx % presetClasses.length],
        look: '',
        rasgo: '',
        bonusItem: '',
      },
    ]);
    setSelectedDraftIndex(drafts.length);
  };

  const removeHeroSlot = (idx: number) => {
    if (drafts.length <= 1) return;
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
    setSelectedDraftIndex(Math.max(0, idx - 1));
  };

  const handleLoadQuickParty = () => {
    const preset = getPresetParty('temp', 'local');
    setDrafts(
      preset.map((h) => ({
        id: h.id,
        playerName: h.playerName,
        name: h.name,
        concept: '',
        raceId: h.raceId,
        classId: h.classId,
        look: h.look,
        rasgo: h.rasgo,
        bonusItem: '',
      }))
    );
    setSelectedDraftIndex(0);
  };

  const handleAiForgeConcepts = async () => {
    setForgeError(null);
    setIsForgingWithAi(true);
    try {
      const effectiveSetting =
        activeModule.id === 'custom_start'
          ? customSetting.trim() || 'Fantasía épica'
          : activeModule.setting;

      const resp = await fetch('/api/dm/forge-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting: effectiveSetting,
          tone,
          ingredients,
          players: drafts.map((d) => ({
            playerName: d.playerName,
            concept: d.concept,
            raceId: d.raceId,
            classId: d.classId,
          })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error generando personajes con IA');

      if (data.campaignTitle) {
        setCampaignTitle(String(data.campaignTitle));
      }
      if (Array.isArray(data.heroes)) {
        setDrafts((prev) =>
          prev.map((d, idx) => {
            const gen = data.heroes[idx];
            if (!gen) return d;
            return {
              ...d,
              name: gen.name || d.name,
              raceId: (RACES.some((r) => r.id === gen.raceId) ? gen.raceId : d.raceId) as RaceId,
              classId: (CLASSES.some((c) => c.id === gen.classId)
                ? gen.classId
                : d.classId) as ClassId,
              look: gen.look || d.look,
              rasgo: gen.rasgo || d.rasgo,
              bonusItem: gen.bonusItem || '',
            };
          })
        );
      }
    } catch (err) {
      setForgeError(
        err instanceof Error ? err.message : 'No se pudieron generar los detalles con IA.'
      );
    } finally {
      setIsForgingWithAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModule.id === 'custom_start' && !customSetting.trim()) {
      setForgeError('Describe brevemente tu ambientación personalizada.');
      return;
    }

    const cId = `camp_${Date.now()}`;
    const builtHeroes = drafts.map((d, idx) =>
      buildHeroFromTemplate({
        id: `${d.id}_${idx}`,
        campaignId: cId,
        ownerId: 'local',
        playerName: d.playerName,
        name: d.name,
        raceId: d.raceId,
        classId: d.classId,
        gridX: 1 + (idx % 3),
        gridY: 2 + Math.floor(idx / 2) * 2,
        look: d.look,
        rasgo: d.rasgo,
        bonusItem: d.bonusItem,
      })
    );

    await onCreateCampaign({
      title: campaignTitle.trim() || activeModule.title,
      module: activeModule,
      customSetting: customSetting.trim(),
      tone,
      lengthMode,
      ingredients,
      heroes: builtHeroes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#131722] border border-stone-700/80 rounded-xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between gap-4 bg-[#0f131c] shrink-0">
          <div>
            <h2 className="font-display text-xl font-bold text-amber-300">
              Forja de Campaña y Héroes
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Elige mundo, tono, ingredientes narrativos y personaliza cada héroe o deja que Gemini los forge a partir de una frase
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Step 1: Adventure & Title */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-300">
                Nombre de la Crónica
              </label>
              <input
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                maxLength={100}
                required
                className="w-full bg-[#0b0e14] border border-stone-700 focus:border-amber-400 rounded-lg px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none"
              />
            </div>

            <div className="lg:col-span-2 space-y-2">
              <label className="block text-xs font-semibold text-stone-300">
                Ambientación y Tablero Inicial
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ADVENTURE_MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setSelectedModuleId(mod.id);
                      if (mod.id !== 'custom_start') {
                        setCampaignTitle(mod.title);
                      }
                    }}
                    className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      selectedModuleId === mod.id
                        ? 'bg-amber-500/15 border-amber-400/70'
                        : 'bg-[#0b0e14] border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-stone-100 truncate">
                      {mod.title}
                    </div>
                    <div className="text-[11px] text-amber-400/90 mt-0.5">
                      {mod.difficulty}
                    </div>
                  </button>
                ))}
              </div>
              {activeModule.id === 'custom_start' ? (
                <textarea
                  value={customSetting}
                  onChange={(e) => setCustomSetting(e.target.value)}
                  maxLength={280}
                  placeholder="Describe tu mundo: época, lugar, conflicto y atmósfera..."
                  className="w-full mt-2 bg-[#0b0e14] border border-stone-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none min-h-[64px]"
                />
              ) : (
                <p className="text-xs text-stone-400 pt-1">{activeModule.hook}</p>
              )}
            </div>
          </div>

          {/* Step 2: Tone, Duration & Ingredients */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-stone-800 pt-5">
            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold text-stone-300 mb-1.5">
                  Tono de la Partida
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTone(opt)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        tone === opt
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                          : 'bg-[#0b0e14] text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-stone-300 mb-1.5">
                  Duración Estimada
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LENGTH_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLengthMode(opt)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        lengthMode === opt
                          ? 'bg-sky-500/20 text-sky-200 border-sky-400/60 font-semibold'
                          : 'bg-[#0b0e14] text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-stone-300 mb-1.5">
                Ingredientes Narrativos (elige los que queráis)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INGREDIENT_OPTIONS.map((ing) => {
                  const active = ingredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      type="button"
                      onClick={() => toggleIngredient(ing)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 text-amber-200 border-amber-400/60'
                          : 'bg-[#0b0e14] text-stone-400 border-stone-800 hover:text-stone-200'
                      }`}
                    >
                      {ing}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 3: Party Builder */}
          <div className="border-t border-stone-800 pt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {drafts.map((d, idx) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDraftIndex(idx)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      idx === selectedDraftIndex
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-[#0b0e14] text-stone-200 border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <span>{d.name || `Héroe ${idx + 1}`}</span>
                    {drafts.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHeroSlot(idx);
                        }}
                        className="opacity-70 hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
                {drafts.length < 6 && (
                  <button
                    type="button"
                    onClick={addHeroSlot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a202e] hover:bg-[#242b3d] text-stone-200 border border-stone-700 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Jugador
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isForgingWithAi}
                  onClick={() => void handleAiForgeConcepts()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {isForgingWithAi ? 'Forjando con IA...' : 'Enriquecer Héroes con IA'}
                </button>
                <button
                  type="button"
                  onClick={handleLoadQuickParty}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  Grupo Clásico (4)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#0d1017] border border-stone-800 rounded-xl p-4">
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1">
                      Nombre del Jugador
                    </label>
                    <input
                      type="text"
                      value={currentDraft.playerName}
                      onChange={(e) => updateDraft({ playerName: e.target.value })}
                      maxLength={60}
                      required
                      className="w-full bg-[#151924] border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1">
                      Nombre del Personaje
                    </label>
                    <input
                      type="text"
                      value={currentDraft.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      maxLength={60}
                      required
                      className="w-full bg-[#151924] border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Idea o Concepto en 1 frase (opcional — pulsa &quot;Enriquecer Héroes con IA&quot;)
                  </label>
                  <input
                    type="text"
                    value={currentDraft.concept}
                    onChange={(e) => updateDraft({ concept: e.target.value })}
                    placeholder="Ej.: Enana herrera gruñona que odia la magia pero adora los acertijos"
                    maxLength={140}
                    className="w-full bg-[#151924] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    Raza
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RACES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => updateDraft({ raceId: r.id })}
                        className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          currentDraft.raceId === r.id
                            ? 'bg-[#1f2536] border-amber-400 text-stone-100'
                            : 'bg-[#141822] border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <div className="text-xs font-semibold">{r.name}</div>
                        <div className="text-[11px] text-stone-400 truncate">{r.tagline}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    Clase
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CLASSES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateDraft({ classId: c.id })}
                        className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          currentDraft.classId === c.id
                            ? 'bg-[#1f2536] border-sky-400 text-stone-100'
                            : 'bg-[#141822] border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <div className="text-xs font-semibold">{c.name}</div>
                        <div className="text-[11px] text-stone-400 truncate">{c.role}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="lg:col-span-5 bg-[#141822] border border-stone-800 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-amber-400 font-semibold">
                    {previewRace.name} · {previewClass.name}
                  </div>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    {previewRace.description}
                  </p>
                  <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                    {previewClass.description}
                  </p>
                </div>

                {(currentDraft.look || currentDraft.rasgo) && (
                  <div className="border-t border-stone-800 pt-2.5 space-y-1 text-xs">
                    {currentDraft.look && (
                      <p className="text-stone-300">
                        <strong className="text-stone-200">Aspecto:</strong> {currentDraft.look}
                      </p>
                    )}
                    {currentDraft.rasgo && (
                      <p className="text-stone-400 italic">«{currentDraft.rasgo}»</p>
                    )}
                  </div>
                )}

                <div className="border-t border-stone-800 pt-2.5 space-y-1.5">
                  <div className="text-xs font-semibold text-stone-200">
                    Poder Racial: {previewRace.racialPower.name}
                  </div>
                  <p className="text-xs text-stone-400">{previewRace.racialPower.description}</p>
                </div>

                <div className="border-t border-stone-800 pt-2.5 space-y-1.5">
                  <div className="text-xs font-semibold text-sky-300">
                    Hechizos y Habilidades Iniciales
                  </div>
                  <div className="space-y-1">
                    {previewClass.startingSpells.slice(0, 4).map((sid) => {
                      const sp = SPELLS_AND_ABILITIES[sid];
                      if (!sp) return null;
                      return (
                        <div key={sid} className="text-xs text-stone-300 flex justify-between gap-2">
                          <span>· {sp.name}</span>
                          <span className="font-mono-tabular text-sky-400">{sp.diceFormula}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {forgeError && <p className="text-xs text-rose-400">{forgeError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-stone-300 hover:text-stone-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isCreating ? 'Invocando Aventura...' : 'Comenzar Partida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
