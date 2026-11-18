import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  BookOpen,
  Dices,
  History,
  Mic,
  Play,
  Plus,
  ScrollText,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import {
  ADVENTURE_MODULES,
  coordLabel,
  getPresetParty,
  HERO_BANNER_IMAGE,
  INGREDIENT_OPTIONS,
  LENGTH_OPTIONS,
  rollDiceFormula,
  TONE_OPTIONS,
} from './data/dndCatalog';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  testFirestoreConnection,
} from './lib/firebase';
import {
  addCloudChronicleEntry,
  createCloudCampaign,
  deleteCloudCampaign,
  deleteLocalCampaign,
  loadLocalCampaigns,
  sanitizeId,
  saveLocalCampaignBundle,
  subscribeCampaignDetails,
  subscribeUserCampaigns,
  updateCloudCampaignState,
  updateCloudCampaignSummary,
  updateCloudHeroPosition,
  updateCloudHeroStats,
  upsertCloudEnemy,
  type LocalCampaignBundle,
} from './lib/campaignStore';
import { soundEngine } from './lib/soundEngine';
import type {
  AdventureModule,
  Campaign,
  ChronicleEntry,
  DicePrompt,
  DieType,
  DmTurnResponse,
  DmVoiceName,
  Enemy,
  Hero,
  MapTheme,
  SpellOrAbility,
} from './types/dnd';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar, type AppSection } from './components/TopBar';
import { TacticalBoard } from './components/TacticalBoard';
import { VoiceAndDiceDock } from './components/VoiceAndDiceDock';
import { PartyAndGrimoirePanel } from './components/PartyAndGrimoirePanel';
import { PartyForgeModal } from './components/PartyForgeModal';
import { CompendiumView } from './components/CompendiumView';
import { CampaignsView } from './components/CampaignsView';

function TabletopApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [section, setSection] = useState<AppSection>('home');

  const [cloudCampaigns, setCloudCampaigns] = useState<Campaign[]>([]);
  const [localBundles, setLocalBundles] = useState<LocalCampaignBundle[]>(() =>
    loadLocalCampaigns()
  );

  // Active Game Session State
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [chronicles, setChronicles] = useState<ChronicleEntry[]>([]);
  const [isCloudSession, setIsCloudSession] = useState(false);

  // Tabletop Interaction State
  const [isForgeOpen, setIsForgeOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    'Examinar la sala con atención',
    'Hablar con el personaje más cercano',
    'Preparar conjuros y avanzar con sigilo',
  ]);
  const [dicePrompt, setDicePrompt] = useState<DicePrompt | null>(null);
  const [armedSpell, setArmedSpell] = useState<SpellOrAbility | null>(null);
  const [isTvFullscreen, setIsTvFullscreen] = useState(false);

  // Audio & TTS Preferences
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [dmVoice, setDmVoice] = useState<DmVoiceName>('Charon');
  const [dmSpeed, setDmSpeed] = useState(1.0);
  const [isSpeakingDm, setIsSpeakingDm] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const turnAbortRef = useRef<AbortController | null>(null);
  const chronicleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setCloudCampaigns([]);
      return;
    }
    const unsub = subscribeUserCampaigns(
      user.uid,
      (list) => setCloudCampaigns(list),
      (err) => setStatusError(err.message)
    );
    return () => unsub();
  }, [authReady, user]);

  useEffect(() => {
    if (!authReady || !user || !activeCampaign || !isCloudSession) return;
    const unsub = subscribeCampaignDetails(activeCampaign.id, user.uid, {
      onHeroes: (h) => setHeroes(h),
      onEnemies: (e) => setEnemies(e),
      onChronicles: (c) => setChronicles(c),
      onError: (err) => setStatusError(err.message),
    });
    return () => unsub();
  }, [authReady, user, activeCampaign?.id, isCloudSession]);

  useEffect(() => {
    if (!activeCampaign || isCloudSession) return;
    const bundle: LocalCampaignBundle = {
      campaign: activeCampaign,
      heroes,
      enemies,
      chronicles,
    };
    saveLocalCampaignBundle(bundle);
    setLocalBundles(loadLocalCampaigns());
  }, [activeCampaign, heroes, enemies, chronicles, isCloudSession]);

  useEffect(() => {
    chronicleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chronicles.length]);

  const speakDmText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsSpeakingDm(true);
      try {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        const resp = await fetch('/api/dm/narrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceName: dmVoice }),
        });
        if (!resp.ok) throw new Error('TTS unavailable');
        const data = await resp.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audio.playbackRate = dmSpeed;
          audioPlayerRef.current = audio;
          audio.onended = () => setIsSpeakingDm(false);
          audio.onerror = () => setIsSpeakingDm(false);
          await audio.play();
          return;
        }
      } catch {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = 'es-ES';
          utter.rate = dmSpeed;
          utter.onend = () => setIsSpeakingDm(false);
          utter.onerror = () => setIsSpeakingDm(false);
          window.speechSynthesis.speak(utter);
          return;
        }
      }
      setIsSpeakingDm(false);
    },
    [dmVoice, dmSpeed]
  );

  const maybeSummarizeCampaign = async (
    camp: Campaign,
    allChronicles: ChronicleEntry[],
    isCloud: boolean
  ) => {
    const unsummarized = allChronicles.filter(
      (c) => c.turnNumber > (camp.summaryUpToTurn || 0)
    );
    if (unsummarized.length < 14) return;

    const toSummarize = unsummarized.slice(0, unsummarized.length - 6);
    if (toSummarize.length === 0) return;
    const newUpToTurn = toSummarize[toSummarize.length - 1].turnNumber;

    try {
      const resp = await fetch('/api/dm/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSummary: camp.summary,
          entries: toSummarize.map((e) => ({
            speaker: e.speaker,
            text: e.text,
            diceRoll: e.diceRoll,
          })),
        }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.summary) {
        setActiveCampaign((prev) =>
          prev && prev.id === camp.id
            ? { ...prev, summary: data.summary, summaryUpToTurn: newUpToTurn }
            : prev
        );
        if (isCloud && user) {
          await updateCloudCampaignSummary(camp.id, data.summary, newUpToTurn);
        }
      }
    } catch {
      // non-fatal background summarization
    }
  };

  const applyDmResponse = async (
    dm: DmTurnResponse,
    baseCampaign: Campaign,
    currentHeroes: Hero[],
    currentEnemies: Enemy[],
    currentChronicles: ChronicleEntry[],
    isCloud: boolean,
    ownerId: string,
    nextTurnNumber: number
  ) => {
    const nextMapTheme: MapTheme =
      dm.mapTheme === 'crypt' || dm.mapTheme === 'forest' || dm.mapTheme === 'tavern'
        ? dm.mapTheme
        : baseCampaign.mapTheme;

    const updatedHeroes = currentHeroes.map((h) => {
      const upd = dm.heroUpdates?.find((u) => u.heroId === h.id);
      if (!upd) return h;
      const nextHp = Math.max(0, Math.min(h.maxHp, h.hp + (upd.hpDelta || 0)));
      const nextMana = Math.max(0, Math.min(h.maxMana, h.mana + (upd.manaDelta || 0)));
      const nextXp = Math.max(0, h.xp + (upd.xpDelta || 0));
      const nextGold = Math.max(0, h.gold + (upd.goldDelta || 0));
      let nextConditions = [...h.conditions];
      if (upd.addCondition && !nextConditions.includes(upd.addCondition)) {
        nextConditions = [...nextConditions, upd.addCondition].slice(0, 8);
      }
      if (upd.removeCondition) {
        nextConditions = nextConditions.filter((c) => c !== upd.removeCondition);
      }
      let nextInventory = [...h.inventory];
      if (upd.addItem && nextInventory.length < 20) {
        nextInventory = [...nextInventory, upd.addItem];
      }
      return {
        ...h,
        hp: nextHp,
        mana: nextMana,
        xp: nextXp,
        gold: nextGold,
        conditions: nextConditions,
        inventory: nextInventory,
      };
    });

    const nextEnemies = [...currentEnemies];
    const newEnemiesToPersist: Array<{ enemy: Enemy; isNew: boolean }> = [];

    for (const eu of dm.enemyUpdates ?? []) {
      const existingIdx = nextEnemies.findIndex(
        (e) =>
          (eu.enemyId && e.id === eu.enemyId) ||
          e.name.toLowerCase() === eu.name.toLowerCase()
      );
      if (eu.action === 'spawn' || existingIdx === -1) {
        const newEnemy: Enemy = {
          id: sanitizeId(eu.enemyId || `enemy_${Date.now()}_${Math.floor(Math.random() * 999)}`),
          campaignId: baseCampaign.id,
          ownerId,
          name: (eu.name || 'Enemigo').slice(0, 60),
          archetype: (eu.archetype || 'Monstruo').slice(0, 40),
          maxHp: Math.max(4, eu.maxHp || 18),
          hp: Math.max(1, eu.maxHp || 18),
          ac: Math.max(8, eu.ac || 12),
          gridX: Math.max(0, Math.min(11, eu.gridX ?? 8)),
          gridY: Math.max(0, Math.min(7, eu.gridY ?? 3)),
          threat:
            eu.threat === 'boss' || eu.threat === 'elite' || eu.threat === 'minion'
              ? eu.threat
              : 'minion',
          isDefeated: false,
        };
        nextEnemies.push(newEnemy);
        newEnemiesToPersist.push({ enemy: newEnemy, isNew: true });
      } else {
        const target = nextEnemies[existingIdx];
        const nextHp =
          eu.action === 'defeat'
            ? 0
            : Math.max(0, Math.min(target.maxHp, target.hp + (eu.hpDelta || 0)));
        const updatedEnemy: Enemy = {
          ...target,
          hp: nextHp,
          isDefeated: nextHp <= 0 || eu.action === 'defeat',
          gridX:
            typeof eu.gridX === 'number'
              ? Math.max(0, Math.min(11, eu.gridX))
              : target.gridX,
          gridY:
            typeof eu.gridY === 'number'
              ? Math.max(0, Math.min(7, eu.gridY))
              : target.gridY,
        };
        nextEnemies[existingIdx] = updatedEnemy;
        newEnemiesToPersist.push({ enemy: updatedEnemy, isNew: false });
      }
    }

    const diceEntries: ChronicleEntry[] = (dm.diceLogs ?? []).map((dl, idx) => ({
      id: sanitizeId(`chron_tool_${Date.now()}_${idx}`),
      campaignId: baseCampaign.id,
      ownerId,
      turnNumber: nextTurnNumber,
      speaker: dl.speaker,
      role: 'dice',
      text: dl.text,
      diceRoll: dl.detail,
      timestampMs: Date.now() + idx,
    }));

    const dmChronicle: ChronicleEntry = {
      id: sanitizeId(`chron_dm_${Date.now()}_${Math.floor(Math.random() * 999)}`),
      campaignId: baseCampaign.id,
      ownerId,
      turnNumber: nextTurnNumber,
      speaker: 'Dungeon Master',
      role: 'dm',
      text: dm.narration,
      diceRoll: '',
      timestampMs: Date.now() + 20,
    };

    const updatedCampaign: Campaign = {
      ...baseCampaign,
      mapTheme: nextMapTheme,
      currentSceneTitle: dm.sceneTitle || baseCampaign.currentSceneTitle,
      currentNarration: dm.narration,
      turnNumber: nextTurnNumber,
      inCombat: Boolean(dm.inCombat),
      roundNumber: dm.inCombat ? baseCampaign.roundNumber + 1 : 0,
      updatedAtMs: Date.now(),
    };

    const appendedChronicles = [...currentChronicles, ...diceEntries, dmChronicle];

    setActiveCampaign(updatedCampaign);
    setSuggestedActions(dm.suggestedActions ?? []);
    setDicePrompt(dm.dicePrompt?.required ? dm.dicePrompt : null);

    if (!soundMuted) {
      soundEngine.startAmbient(dm.ambientMood || (dm.inCombat ? 'combat' : 'dungeon'));
    }

    if (isCloud) {
      await updateCloudCampaignState(baseCampaign.id, {
        mapTheme: updatedCampaign.mapTheme,
        currentSceneTitle: updatedCampaign.currentSceneTitle,
        currentNarration: updatedCampaign.currentNarration,
        turnNumber: updatedCampaign.turnNumber,
        inCombat: updatedCampaign.inCombat,
        roundNumber: updatedCampaign.roundNumber,
      });
      for (const h of updatedHeroes) {
        const orig = currentHeroes.find((oh) => oh.id === h.id);
        if (orig && JSON.stringify(orig) !== JSON.stringify(h)) {
          await updateCloudHeroStats(baseCampaign.id, h);
        }
      }
      for (const item of newEnemiesToPersist) {
        await upsertCloudEnemy(baseCampaign.id, ownerId, item.enemy, item.isNew);
      }
      for (const dEntry of diceEntries) {
        await addCloudChronicleEntry(baseCampaign.id, ownerId, dEntry);
      }
      await addCloudChronicleEntry(baseCampaign.id, ownerId, dmChronicle);
    } else {
      setHeroes(updatedHeroes);
      setEnemies(nextEnemies);
      setChronicles(appendedChronicles);
    }

    if (autoNarrate) {
      void speakDmText(dm.voiceScript || dm.narration);
    }

    void maybeSummarizeCampaign(updatedCampaign, appendedChronicles, isCloud);
  };

  const handleCreateCampaign = async (params: {
    title: string;
    module: AdventureModule;
    customSetting: string;
    tone: string;
    lengthMode: string;
    ingredients: string[];
    heroes: Hero[];
  }) => {
    setIsCreatingCampaign(true);
    setStatusError(null);
    try {
      const ownerId = user?.uid ?? 'local';
      const campaignId = sanitizeId(`camp_${Date.now()}`);
      const scopedHeroes = params.heroes.map((h) => ({
        ...h,
        campaignId,
        ownerId,
      }));
      const effectiveSetting =
        params.module.id === 'custom_start'
          ? params.customSetting || 'Aventura de fantasía personalizada'
          : params.module.setting;

      const resp = await fetch('/api/dm/intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: params.title,
          setting: effectiveSetting,
          tone: params.tone,
          lengthMode: params.lengthMode,
          ingredients: params.ingredients,
          mapTheme: params.module.mapTheme,
          heroes: scopedHeroes.map((h) => ({
            id: h.id,
            name: h.name,
            race: h.raceId,
            class: h.classId,
            hp: h.hp,
            mana: h.mana,
            look: h.look,
            rasgo: h.rasgo,
            knownSpells: h.knownSpells,
          })),
        }),
      });

      const dmIntro: DmTurnResponse = await resp.json();
      if (!resp.ok) {
        throw new Error(
          (dmIntro as unknown as { error?: string }).error ||
            'Error iniciando aventura con Gemini'
        );
      }

      const spawnedEnemies: Enemy[] = (dmIntro.enemyUpdates ?? []).map((eu, idx) => ({
        id: sanitizeId(eu.enemyId || `enemy_init_${idx}_${Date.now()}`),
        campaignId,
        ownerId,
        name: eu.name || 'Explorador Hostil',
        archetype: eu.archetype || 'Monstruo',
        maxHp: Math.max(6, eu.maxHp || 16),
        hp: Math.max(6, eu.maxHp || 16),
        ac: Math.max(8, eu.ac || 12),
        gridX: Math.max(0, Math.min(11, eu.gridX ?? 8 + (idx % 2))),
        gridY: Math.max(0, Math.min(7, eu.gridY ?? 2 + idx * 2)),
        threat: eu.threat || 'minion',
        isDefeated: false,
      }));

      const initialChronicle: ChronicleEntry = {
        id: sanitizeId(`chron_0_${Date.now()}`),
        campaignId,
        ownerId,
        turnNumber: 1,
        speaker: 'Dungeon Master',
        role: 'dm',
        text: dmIntro.narration,
        diceRoll: '',
        timestampMs: Date.now(),
      };

      const newCampaign: Campaign = {
        id: campaignId,
        ownerId,
        title: params.title,
        setting: effectiveSetting,
        tone: params.tone,
        lengthMode: params.lengthMode,
        ingredients: params.ingredients,
        summary: '',
        summaryUpToTurn: 0,
        mapTheme:
          dmIntro.mapTheme === 'crypt' ||
          dmIntro.mapTheme === 'forest' ||
          dmIntro.mapTheme === 'tavern'
            ? dmIntro.mapTheme
            : params.module.mapTheme,
        currentSceneTitle: dmIntro.sceneTitle || params.module.title,
        currentNarration: dmIntro.narration,
        turnNumber: 1,
        activeCharacterId: scopedHeroes[0]?.id ?? '',
        status: 'active',
        inCombat: Boolean(dmIntro.inCombat),
        roundNumber: dmIntro.inCombat ? 1 : 0,
        heroCount: scopedHeroes.length,
        updatedAtMs: Date.now(),
      };

      const bundle: LocalCampaignBundle = {
        campaign: newCampaign,
        heroes: scopedHeroes,
        enemies: spawnedEnemies,
        chronicles: [initialChronicle],
      };

      if (user) {
        await createCloudCampaign(bundle, user.uid);
        setIsCloudSession(true);
      } else {
        saveLocalCampaignBundle(bundle);
        setLocalBundles(loadLocalCampaigns());
        setIsCloudSession(false);
      }

      setActiveCampaign(newCampaign);
      setHeroes(scopedHeroes);
      setEnemies(spawnedEnemies);
      setChronicles([initialChronicle]);
      setSuggestedActions(dmIntro.suggestedActions ?? []);
      setDicePrompt(dmIntro.dicePrompt?.required ? dmIntro.dicePrompt : null);
      setIsForgeOpen(false);
      setSection('board');

      if (!soundMuted) {
        soundEngine.startAmbient(dmIntro.ambientMood || 'tavern');
      }
      if (autoNarrate) {
        void speakDmText(dmIntro.voiceScript || dmIntro.narration);
      }
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'No se pudo iniciar la campaña.');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleQuickStart = async () => {
    const campId = `camp_${Date.now()}`;
    const ownerId = user?.uid ?? 'local';
    const presetHeroes = getPresetParty(campId, ownerId);
    await handleCreateCampaign({
      title: 'La Posada del Dragón Dorado',
      module: ADVENTURE_MODULES[0],
      customSetting: '',
      tone: TONE_OPTIONS[0],
      lengthMode: LENGTH_OPTIONS[1],
      ingredients: [INGREDIENT_OPTIONS[0], INGREDIENT_OPTIONS[1]],
      heroes: presetHeroes,
    });
  };

  const handleAbortTurn = () => {
    if (turnAbortRef.current) {
      turnAbortRef.current.abort();
      turnAbortRef.current = null;
      setIsProcessingTurn(false);
    }
  };

  const handleSubmitAction = async (
    actionText: string,
    diceSummary?: string,
    mode: 'action' | 'continue' | 'recap' = 'action'
  ) => {
    if (!activeCampaign || isProcessingTurn) return;
    setIsProcessingTurn(true);
    setStatusError(null);

    const controller = new AbortController();
    turnAbortRef.current = controller;

    const activeHero =
      heroes.find((h) => h.id === activeCampaign.activeCharacterId) ?? heroes[0];
    const ownerId = user?.uid ?? 'local';
    const nextTurn = activeCampaign.turnNumber + 1;

    const playerEntry: ChronicleEntry | null =
      mode === 'continue'
        ? null
        : {
            id: sanitizeId(`chron_pl_${Date.now()}_${Math.floor(Math.random() * 999)}`),
            campaignId: activeCampaign.id,
            ownerId,
            turnNumber: nextTurn,
            speaker: mode === 'recap' ? 'Mesa' : activeHero ? activeHero.name : 'Grupo',
            role: 'player',
            text: mode === 'recap' ? '¿Dónde estamos y qué opciones tenemos?' : actionText,
            diceRoll: diceSummary ?? '',
            timestampMs: Date.now(),
          };

    const currentChronicles = playerEntry ? [...chronicles, playerEntry] : chronicles;

    try {
      if (playerEntry) {
        if (isCloudSession && user) {
          await addCloudChronicleEntry(activeCampaign.id, user.uid, playerEntry);
        } else {
          setChronicles((prev) => [...prev, playerEntry]);
        }
      }

      const resp = await fetch('/api/dm/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          campaignTitle: activeCampaign.title,
          setting: activeCampaign.setting,
          tone: activeCampaign.tone,
          lengthMode: activeCampaign.lengthMode,
          ingredients: activeCampaign.ingredients,
          campaignSummary: activeCampaign.summary,
          mapTheme: activeCampaign.mapTheme,
          turnNumber: nextTurn,
          inCombat: activeCampaign.inCombat,
          heroes: heroes.map((h) => ({
            id: h.id,
            name: h.name,
            playerName: h.playerName,
            race: h.raceId,
            class: h.classId,
            hp: h.hp,
            maxHp: h.maxHp,
            mana: h.mana,
            maxMana: h.maxMana,
            ac: h.ac,
            gridX: h.gridX,
            gridY: h.gridY,
            stats: h.stats,
            knownSpells: h.knownSpells,
            conditions: h.conditions,
            look: h.look,
            rasgo: h.rasgo,
          })),
          enemies: enemies.map((e) => ({
            id: e.id,
            name: e.name,
            hp: e.hp,
            maxHp: e.maxHp,
            ac: e.ac,
            gridX: e.gridX,
            gridY: e.gridY,
            isDefeated: e.isDefeated,
          })),
          recentChronicle: currentChronicles.slice(-8).map((c) => ({
            speaker: c.speaker,
            text: c.text,
            diceRoll: c.diceRoll,
          })),
          playerAction: actionText,
          actorName: activeHero?.name ?? 'El grupo',
          diceResult: diceSummary ?? '',
          mode,
        }),
      });

      const dmData: DmTurnResponse = await resp.json();
      if (!resp.ok) {
        throw new Error(
          (dmData as unknown as { error?: string }).error || 'Error del Dungeon Master'
        );
      }

      await applyDmResponse(
        dmData,
        activeCampaign,
        heroes,
        enemies,
        currentChronicles,
        isCloudSession && Boolean(user),
        ownerId,
        nextTurn + 1
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatusError('Turno detenido por la mesa.');
      } else {
        setStatusError(err instanceof Error ? err.message : 'Error avanzando la historia.');
      }
    } finally {
      turnAbortRef.current = null;
      setIsProcessingTurn(false);
    }
  };

  const handleSelectHero = async (heroId: string) => {
    if (!activeCampaign) return;
    setArmedSpell(null);
    setActiveCampaign((prev) => (prev ? { ...prev, activeCharacterId: heroId } : prev));
    if (isCloudSession && user) {
      await updateCloudCampaignState(activeCampaign.id, { activeCharacterId: heroId });
    }
  };

  const handleMoveHero = async (heroId: string, gridX: number, gridY: number) => {
    if (!activeCampaign) return;
    soundEngine.playTokenMove();
    setHeroes((prev) =>
      prev.map((h) => (h.id === heroId ? { ...h, gridX, gridY } : h))
    );
    if (isCloudSession && user) {
      await updateCloudHeroPosition(activeCampaign.id, heroId, gridX, gridY);
    }
  };

  const handleAdjustHeroResource = async (
    heroId: string,
    resource: 'hp' | 'mana',
    delta: number
  ) => {
    if (!activeCampaign) return;
    const target = heroes.find((h) => h.id === heroId);
    if (!target) return;
    const updated: Hero =
      resource === 'hp'
        ? { ...target, hp: Math.max(0, Math.min(target.maxHp, target.hp + delta)) }
        : { ...target, mana: Math.max(0, Math.min(target.maxMana, target.mana + delta)) };

    setHeroes((prev) => prev.map((h) => (h.id === heroId ? updated : h)));
    if (isCloudSession && user) {
      await updateCloudHeroStats(activeCampaign.id, updated);
    }
  };

  const handleCastSpellAt = async (
    gridX: number,
    gridY: number,
    targetEnemy?: Enemy
  ) => {
    if (!armedSpell || !activeCampaign) return;
    const caster =
      heroes.find((h) => h.id === activeCampaign.activeCharacterId) ?? heroes[0];
    if (!caster) return;

    const spell = armedSpell;
    setArmedSpell(null);

    if (caster.mana < spell.manaCost) {
      setStatusError(`${caster.name} no tiene suficiente maná para ${spell.name}.`);
      return;
    }

    soundEngine.playSpellCast();
    const { total, rolls } = rollDiceFormula(spell.diceFormula);
    const nextMana = Math.max(0, caster.mana - spell.manaCost);
    const updatedCaster: Hero = { ...caster, mana: nextMana };

    setHeroes((prev) => prev.map((h) => (h.id === caster.id ? updatedCaster : h)));
    if (isCloudSession && user) {
      await updateCloudHeroStats(activeCampaign.id, updatedCaster);
    }

    const coord = coordLabel(gridX, gridY);
    const diceDetail = `${spell.diceFormula} [${rolls.join('+')}] = ${total} (${spell.damageType})`;
    const targetDesc = targetEnemy
      ? `sobre ${targetEnemy.name} en ${coord}`
      : `en la casilla ${coord}`;

    await handleSubmitAction(
      `${caster.name} lanza ${spell.name} ${targetDesc} (ya descontados ${spell.manaCost} PM; resultado de dados: ${total} de ${spell.damageType}).`,
      diceDetail
    );
  };

  const handleUseRacialPower = async (hero: Hero) => {
    soundEngine.playSpellCast();
    await handleSubmitAction(
      `${hero.name} activa su poder racial único (${hero.raceId}) en la posición ${coordLabel(hero.gridX, hero.gridY)}.`
    );
  };

  const handleUseItem = async (hero: Hero, item: string) => {
    if (!activeCampaign) return;
    const lower = item.toLowerCase();
    let updated = { ...hero };
    let msg = `${hero.name} utiliza ${item}.`;

    if (lower.includes('poción de curación')) {
      const heal = rollDiceFormula('2d4+2').total;
      updated = {
        ...hero,
        hp: Math.min(hero.maxHp, hero.hp + heal),
        inventory: hero.inventory.filter((_, idx) => idx !== hero.inventory.indexOf(item)),
      };
      msg = `${hero.name} bebe una Poción de Curación y recupera ${heal} PV.`;
    } else if (lower.includes('poción de maná')) {
      const manaGain = rollDiceFormula('2d6+4').total;
      updated = {
        ...hero,
        mana: Math.min(hero.maxMana, hero.mana + manaGain),
        inventory: hero.inventory.filter((_, idx) => idx !== hero.inventory.indexOf(item)),
      };
      msg = `${hero.name} bebe una Poción de Maná y recupera ${manaGain} PM.`;
    }

    setHeroes((prev) => prev.map((h) => (h.id === hero.id ? updated : h)));
    if (isCloudSession && user) {
      await updateCloudHeroStats(activeCampaign.id, updated);
    }
    await handleSubmitAction(msg);
  };

  const handleManualDiceRoll = async (
    _die: DieType,
    _rawRoll: number,
    _total: number,
    detail: string
  ) => {
    if (!activeCampaign) return;
    const activeHero =
      heroes.find((h) => h.id === activeCampaign.activeCharacterId) ?? heroes[0];
    const entry: ChronicleEntry = {
      id: sanitizeId(`chron_dice_${Date.now()}_${Math.floor(Math.random() * 999)}`),
      campaignId: activeCampaign.id,
      ownerId: user?.uid ?? 'local',
      turnNumber: activeCampaign.turnNumber,
      speaker: activeHero?.name ?? 'Dados de Mesa',
      role: 'dice',
      text: `Tirada manual realizada`,
      diceRoll: detail,
      timestampMs: Date.now(),
    };
    if (isCloudSession && user) {
      await addCloudChronicleEntry(activeCampaign.id, user.uid, entry);
    } else {
      setChronicles((prev) => [...prev, entry]);
    }
  };

  const handleResumeCloudCampaign = (camp: Campaign) => {
    setIsCloudSession(true);
    setActiveCampaign(camp);
    setSection('board');
    if (!soundMuted) {
      soundEngine.startAmbient(
        camp.inCombat ? 'combat' : camp.mapTheme === 'tavern' ? 'tavern' : 'dungeon'
      );
    }
  };

  const handleResumeLocalCampaign = (bundle: LocalCampaignBundle) => {
    setIsCloudSession(false);
    setActiveCampaign(bundle.campaign);
    setHeroes(bundle.heroes);
    setEnemies(bundle.enemies);
    setChronicles(bundle.chronicles);
    setSection('board');
    if (!soundMuted) {
      soundEngine.startAmbient(
        bundle.campaign.inCombat
          ? 'combat'
          : bundle.campaign.mapTheme === 'tavern'
          ? 'tavern'
          : 'dungeon'
      );
    }
  };

  const handleMigrateLocalToCloud = async (bundle: LocalCampaignBundle) => {
    if (!user) return;
    await createCloudCampaign(bundle, user.uid);
    deleteLocalCampaign(bundle.campaign.id);
    setLocalBundles(loadLocalCampaigns());
  };

  const activeHero =
    heroes.find((h) => h.id === activeCampaign?.activeCharacterId) ?? heroes[0];

  return (
    <div className="min-h-screen bg-[#0d1017] text-stone-100 flex flex-col">
      {!isTvFullscreen && (
        <TopBar
          activeSection={section}
          onNavigate={setSection}
          user={user}
          onSignIn={() => void signInWithGoogle()}
          onSignOut={() => void signOutUser()}
          hasActiveCampaign={Boolean(activeCampaign)}
        />
      )}

      {statusError && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 px-6 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-4">
          <span>{statusError}</span>
          <button
            type="button"
            onClick={() => setStatusError(null)}
            className="text-rose-300 hover:text-white font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* VIEW 1: HOME HERO */}
      {section === 'home' && (
        <main className="flex-1">
          <div className="max-w-[1440px] mx-auto px-6 py-10 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div className="text-xs font-medium text-amber-400">
                  Mesa de Rol Interactiva · Voz, Tablero TV y Magia
                </div>
                <h1 className="font-display text-4xl sm:text-5xl font-bold text-stone-100 leading-tight">
                  Vuestra mesa de Dragones y Mazmorras, dirigida en vivo
                </h1>
                <p className="text-base text-stone-300 leading-relaxed max-w-xl">
                  Conecta el ordenador a la televisión del salón, reunid las bebidas alrededor de la mesa y hablad libremente. El Dungeon Master con Gemini escucha vuestras voces, tira los dados reales cuando hay riesgo, narra la historia por los altavoces y actualiza el tablero táctico.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgeOpen(true)}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Forjar Nueva Partida
                  </button>

                  <button
                    type="button"
                    disabled={isCreatingCampaign}
                    onClick={() => void handleQuickStart()}
                    className="inline-flex items-center gap-2.5 px-5 py-3.5 bg-[#171c28] hover:bg-[#202636] text-stone-100 font-semibold text-sm rounded-lg border border-stone-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 text-amber-400" />
                    {isCreatingCampaign ? 'Preparando Mesa...' : 'Partida Rápida (4 Héroes)'}
                  </button>
                </div>

                {activeCampaign && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSection('board')}
                      className="text-sm font-medium text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer"
                    >
                      Volver a la partida activa: {activeCampaign.title} (Turno{' '}
                      {activeCampaign.turnNumber})
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[340px] rounded-xl overflow-hidden border border-stone-800 bg-[#141822]">
                  <img
                    src={HERO_BANNER_IMAGE}
                    alt="Mesa de aventuras de Dragones y Mazmorras con mapa, libro de hechizos y dados"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-xs text-amber-300 font-medium">
                        Preparado para pantalla grande
                      </div>
                      <div className="font-display text-lg font-bold text-stone-100 mt-0.5">
                        Tablero 12×8, Turnos Simultáneos, Dados Reales y Voz
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-column Feature Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12 pt-10 border-t border-stone-800/80">
              <div className="bg-[#141822] border border-stone-800 rounded-xl p-5 space-y-2">
                <Mic className="w-5 h-5 text-amber-400" />
                <h3 className="font-display text-base font-semibold text-stone-100">
                  Voz Continua o Por Turnos
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Hablad libremente frente a la TV o declarad acciones simultáneas por jugador. El Master elige voz y velocidad a vuestro gusto.
                </p>
              </div>
              <div className="bg-[#141822] border border-stone-800 rounded-xl p-5 space-y-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <h3 className="font-display text-base font-semibold text-stone-100">
                  6 Razas y Grimorio Arcano
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Elfos, enanos, tieflings, dracónidos, medianos y humanos. Forja conceptos libres con IA y lanza conjuros sobre la rejilla.
                </p>
              </div>
              <div className="bg-[#141822] border border-stone-800 rounded-xl p-5 space-y-2">
                <Swords className="w-5 h-5 text-rose-400" />
                <h3 className="font-display text-base font-semibold text-stone-100">
                  Dados Reales y Tablero TV
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  El servidor ejecuta tiradas reales con ventaja/desventaja y actualiza enemigos y posiciones A1–L8 en tiempo real.
                </p>
              </div>
              <div className="bg-[#141822] border border-stone-800 rounded-xl p-5 space-y-2">
                <Dices className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display text-base font-semibold text-stone-100">
                  Memoria y Base de Datos
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Resúmenes automáticos de campaña para partidas largas y guardado persistente en Cloud Firestore.
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 2: ACTIVE TABLETOP BOARD */}
      {section === 'board' && activeCampaign && (
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Active Scene Narration Banner */}
          <section className="bg-[#141822] border border-stone-800/90 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-amber-300">
                  {activeCampaign.currentSceneTitle}
                </h1>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsSummaryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0e121a] hover:bg-stone-800 text-stone-200 border border-stone-700/80 rounded-lg transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  Historia hasta ahora
                </button>
                <div className="text-xs text-stone-400 font-mono-tabular">
                  {activeCampaign.tone} · Turno {activeCampaign.turnNumber} ·{' '}
                  {isCloudSession ? 'Guardado en Nube' : 'Guardado Local'}
                </div>
              </div>
            </div>
            <p className="text-sm sm:text-base text-stone-200 leading-relaxed max-w-5xl whitespace-pre-line">
              {activeCampaign.currentNarration}
            </p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left/Center: Tactical Board + Voice & Dice Controls */}
            <div
              className={`${
                isTvFullscreen ? 'lg:col-span-12' : 'lg:col-span-8'
              } space-y-5`}
            >
              <TacticalBoard
                mapTheme={activeCampaign.mapTheme}
                onChangeMapTheme={async (theme) => {
                  setActiveCampaign((prev) =>
                    prev ? { ...prev, mapTheme: theme } : prev
                  );
                  if (isCloudSession && user) {
                    await updateCloudCampaignState(activeCampaign.id, {
                      mapTheme: theme,
                    });
                  }
                }}
                heroes={heroes}
                enemies={enemies}
                activeHeroId={activeHero?.id ?? ''}
                onSelectHero={(id) => void handleSelectHero(id)}
                onMoveHero={(id, x, y) => void handleMoveHero(id, x, y)}
                armedSpell={armedSpell}
                onCancelArmedSpell={() => setArmedSpell(null)}
                onCastSpellAt={(x, y, enemy) => void handleCastSpellAt(x, y, enemy)}
                onSelectEnemyAction={(enemy) =>
                  void handleSubmitAction(
                    `${activeHero?.name ?? 'El grupo'} inspecciona o ataca a ${enemy.name} (${enemy.hp}/${enemy.maxHp} PV, CA ${enemy.ac}) en ${coordLabel(enemy.gridX, enemy.gridY)}.`
                  )
                }
                inCombat={activeCampaign.inCombat}
                roundNumber={activeCampaign.roundNumber}
                isTvFullscreen={isTvFullscreen}
                onToggleTvFullscreen={() => setIsTvFullscreen((v) => !v)}
              />

              <VoiceAndDiceDock
                heroes={heroes}
                activeHero={activeHero}
                isProcessingTurn={isProcessingTurn}
                suggestedActions={suggestedActions}
                dicePrompt={dicePrompt}
                onSubmitAction={(txt, dice, mode) =>
                  void handleSubmitAction(txt, dice, mode)
                }
                onAbortTurn={handleAbortTurn}
                onManualDiceRoll={(d, r, t, det) => void handleManualDiceRoll(d, r, t, det)}
                autoNarrate={autoNarrate}
                onToggleAutoNarrate={() => setAutoNarrate((v) => !v)}
                isSpeakingDm={isSpeakingDm}
                onReplayLastNarration={() =>
                  void speakDmText(activeCampaign.currentNarration)
                }
                soundMuted={soundMuted}
                onToggleSoundMuted={() => {
                  const next = !soundMuted;
                  setSoundMuted(next);
                  soundEngine.setMuted(next);
                }}
                dmVoice={dmVoice}
                onChangeDmVoice={setDmVoice}
                dmSpeed={dmSpeed}
                onChangeDmSpeed={setDmSpeed}
              />
            </div>

            {/* Right Column: Party Roster, Grimoire & Chronicle Feed */}
            {!isTvFullscreen && (
              <div className="lg:col-span-4 space-y-5">
                <PartyAndGrimoirePanel
                  heroes={heroes}
                  activeHeroId={activeHero?.id ?? ''}
                  onSelectHero={(id) => void handleSelectHero(id)}
                  armedSpell={armedSpell}
                  onArmSpell={(spell) =>
                    setArmedSpell((prev) => (prev?.id === spell.id ? null : spell))
                  }
                  onUseRacialPower={(h) => void handleUseRacialPower(h)}
                  onUseItem={(h, item) => void handleUseItem(h, item)}
                  onAdjustHeroResource={(id, res, delta) =>
                    void handleAdjustHeroResource(id, res, delta)
                  }
                />

                {/* Persistent Chronicle Log */}
                <section className="bg-[#141822] border border-stone-800/90 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-800/80 bg-[#11141d] flex items-center justify-between">
                    <h2 className="font-display text-sm font-semibold text-stone-100 flex items-center gap-2">
                      <ScrollText className="w-4 h-4 text-amber-400" />
                      Crónica de la Sesión
                    </h2>
                    <span className="text-xs font-mono-tabular text-stone-400">
                      {chronicles.length} registros
                    </span>
                  </div>
                  <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                    {chronicles.map((entry) => (
                      <div
                        key={entry.id}
                        className="text-xs space-y-1 pb-3 border-b border-stone-800/60 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold ${
                              entry.role === 'dm'
                                ? 'text-amber-300'
                                : entry.role === 'dice'
                                ? 'text-emerald-400'
                                : 'text-sky-300'
                            }`}
                          >
                            {entry.speaker}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-stone-500">
                            Turno {entry.turnNumber}
                          </span>
                        </div>
                        <p className="text-stone-300 leading-relaxed">{entry.text}</p>
                        {entry.diceRoll && (
                          <div className="font-mono-tabular text-[11px] text-amber-400">
                            {entry.diceRoll}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chronicleEndRef} />
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      )}

      {/* VIEW 3: SAVED CAMPAIGNS */}
      {section === 'campaigns' && (
        <CampaignsView
          user={user}
          cloudCampaigns={cloudCampaigns}
          localBundles={localBundles}
          onResumeCloudCampaign={handleResumeCloudCampaign}
          onResumeLocalCampaign={handleResumeLocalCampaign}
          onDeleteCloudCampaign={(id) => void deleteCloudCampaign(id)}
          onDeleteLocalCampaign={(id) => {
            deleteLocalCampaign(id);
            setLocalBundles(loadLocalCampaigns());
          }}
          onMigrateLocalToCloud={handleMigrateLocalToCloud}
          onOpenNewCampaign={() => setIsForgeOpen(true)}
          onSignIn={() => void signInWithGoogle()}
        />
      )}

      {/* VIEW 4: COMPENDIUM */}
      {section === 'compendium' && <CompendiumView />}

      {!isTvFullscreen && (
        <footer className="border-t border-stone-800/80 py-5 px-6 mt-auto">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
            <span className="inline-flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-amber-500/70" />
              Crónicas del Abismo · Mesa de Rol Interactiva
            </span>
            <span>
              {user
                ? `Sincronizado como ${user.displayName || user.email}`
                : 'Modo local activo · Conecta Google para respaldo en la nube'}
            </span>
          </div>
        </footer>
      )}

      {/* Story Summary Modal ("La historia hasta ahora") */}
      {isSummaryOpen && activeCampaign && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsSummaryOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[#131722] border border-stone-700/80 rounded-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-amber-300">
                La Historia Hasta Ahora
              </h2>
              <button
                type="button"
                onClick={() => setIsSummaryOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-stone-400">
              {activeCampaign.title} · {activeCampaign.tone} · {activeCampaign.lengthMode}
            </div>
            <p className="text-sm text-stone-200 leading-relaxed whitespace-pre-line">
              {activeCampaign.summary ||
                'Aún estáis en los primeros compases de la aventura. Cuando avancen varios turnos, el cronista generará automáticamente un resumen de lugares, PNJ, pistas y promesas.'}
            </p>
          </div>
        </div>
      )}

      <PartyForgeModal
        isOpen={isForgeOpen}
        onClose={() => setIsForgeOpen(false)}
        onCreateCampaign={handleCreateCampaign}
        isCreating={isCreatingCampaign}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TabletopApp />
    </ErrorBoundary>
  );
}
