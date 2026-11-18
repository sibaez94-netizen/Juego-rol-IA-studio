import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { Campaign, ChronicleEntry, Enemy, Hero, MapTheme } from '../types/dnd';

const LOCAL_STORAGE_KEY = 'cronicas_abismo_local_campaigns_v1';

export interface LocalCampaignBundle {
  campaign: Campaign;
  heroes: Hero[];
  enemies: Enemy[];
  chronicles: ChronicleEntry[];
}

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned || `id_${Date.now()}`;
}

function sanitizeHeroForFirestore(hero: Hero, ownerId: string) {
  return {
    id: sanitizeId(hero.id),
    campaignId: sanitizeId(hero.campaignId),
    ownerId,
    playerName: (hero.playerName || 'Jugador').trim().slice(0, 60),
    name: (hero.name || 'Aventurero').trim().slice(0, 60),
    raceId: hero.raceId,
    classId: hero.classId,
    level: Math.max(1, Math.min(20, Math.round(hero.level))),
    hp: Math.max(0, Math.min(500, Math.round(hero.hp))),
    maxHp: Math.max(1, Math.min(500, Math.round(hero.maxHp))),
    mana: Math.max(0, Math.min(500, Math.round(hero.mana))),
    maxMana: Math.max(0, Math.min(500, Math.round(hero.maxMana))),
    ac: Math.max(5, Math.min(35, Math.round(hero.ac))),
    gridX: Math.max(0, Math.min(11, Math.round(hero.gridX))),
    gridY: Math.max(0, Math.min(7, Math.round(hero.gridY))),
    color: (hero.color || '#D4A359').slice(0, 20),
    xp: Math.max(0, Math.min(1000000, Math.round(hero.xp))),
    gold: Math.max(0, Math.min(1000000, Math.round(hero.gold))),
    look: (hero.look || '').trim().slice(0, 240),
    rasgo: (hero.rasgo || '').trim().slice(0, 240),
    stats: {
      str: Math.max(1, Math.min(30, Math.round(hero.stats.str))),
      dex: Math.max(1, Math.min(30, Math.round(hero.stats.dex))),
      con: Math.max(1, Math.min(30, Math.round(hero.stats.con))),
      int: Math.max(1, Math.min(30, Math.round(hero.stats.int))),
      wis: Math.max(1, Math.min(30, Math.round(hero.stats.wis))),
      cha: Math.max(1, Math.min(30, Math.round(hero.stats.cha))),
    },
    conditions: hero.conditions.slice(0, 8).map((c) => c.slice(0, 80)),
    inventory: hero.inventory.slice(0, 20).map((i) => i.slice(0, 80)),
    knownSpells: hero.knownSpells.slice(0, 15).map((s) => s.slice(0, 80)),
    updatedAt: serverTimestamp(),
  };
}

function sanitizeEnemyForFirestore(enemy: Enemy, ownerId: string) {
  return {
    id: sanitizeId(enemy.id),
    campaignId: sanitizeId(enemy.campaignId),
    ownerId,
    name: (enemy.name || 'Enemigo').trim().slice(0, 60),
    archetype: (enemy.archetype || 'Monstruo').trim().slice(0, 40),
    hp: Math.max(0, Math.min(1000, Math.round(enemy.hp))),
    maxHp: Math.max(1, Math.min(1000, Math.round(enemy.maxHp))),
    ac: Math.max(5, Math.min(35, Math.round(enemy.ac))),
    gridX: Math.max(0, Math.min(11, Math.round(enemy.gridX))),
    gridY: Math.max(0, Math.min(7, Math.round(enemy.gridY))),
    threat: enemy.threat,
    isDefeated: Boolean(enemy.isDefeated),
    updatedAt: serverTimestamp(),
  };
}

export function loadLocalCampaigns(): LocalCampaignBundle[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalCampaignBundle[];
  } catch {
    return [];
  }
}

export function saveLocalCampaignBundle(bundle: LocalCampaignBundle): void {
  try {
    const existing = loadLocalCampaigns();
    const idx = existing.findIndex((b) => b.campaign.id === bundle.campaign.id);
    if (idx >= 0) {
      existing[idx] = bundle;
    } else {
      existing.unshift(bundle);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 12)));
  } catch (err) {
    console.error('Failed saving local campaign:', err);
  }
}

export function deleteLocalCampaign(campaignId: string): void {
  try {
    const existing = loadLocalCampaigns().filter((b) => b.campaign.id !== campaignId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed deleting local campaign:', err);
  }
}

export function subscribeUserCampaigns(
  ownerId: string,
  onData: (campaigns: Campaign[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'campaigns';
  const q = query(collection(db, path), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const items: Campaign[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: data.id,
            ownerId: data.ownerId,
            title: data.title,
            setting: data.setting,
            tone: data.tone ?? 'Épico',
            lengthMode: data.lengthMode ?? 'Campaña larga (varias sesiones)',
            ingredients: data.ingredients ?? [],
            summary: data.summary ?? '',
            summaryUpToTurn: data.summaryUpToTurn ?? 0,
            mapTheme: data.mapTheme as MapTheme,
            currentSceneTitle: data.currentSceneTitle,
            currentNarration: data.currentNarration,
            turnNumber: data.turnNumber,
            activeCharacterId: data.activeCharacterId,
            status: data.status,
            inCombat: data.inCombat,
            roundNumber: data.roundNumber,
            heroCount: data.heroCount,
            updatedAtMs: data.updatedAt?.toMillis?.() ?? Date.now(),
          };
        })
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeCampaignDetails(
  campaignId: string,
  ownerId: string,
  callbacks: {
    onHeroes: (heroes: Hero[]) => void;
    onEnemies: (enemies: Enemy[]) => void;
    onChronicles: (entries: ChronicleEntry[]) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const heroesPath = `campaigns/${campaignId}/heroes`;
  const enemiesPath = `campaigns/${campaignId}/enemies`;
  const chroniclesPath = `campaigns/${campaignId}/chronicles`;

  const unsubHeroes = onSnapshot(
    query(collection(db, heroesPath), where('ownerId', '==', ownerId)),
    (snap) => {
      const heroes = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id,
          campaignId: data.campaignId,
          ownerId: data.ownerId,
          playerName: data.playerName,
          name: data.name,
          raceId: data.raceId,
          classId: data.classId,
          level: data.level,
          hp: data.hp,
          maxHp: data.maxHp,
          mana: data.mana,
          maxMana: data.maxMana,
          ac: data.ac,
          gridX: data.gridX,
          gridY: data.gridY,
          color: data.color,
          xp: data.xp,
          gold: data.gold,
          look: data.look ?? '',
          rasgo: data.rasgo ?? '',
          stats: data.stats,
          conditions: data.conditions ?? [],
          inventory: data.inventory ?? [],
          knownSpells: data.knownSpells ?? [],
        } as Hero;
      });
      callbacks.onHeroes(heroes);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, heroesPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubEnemies = onSnapshot(
    query(collection(db, enemiesPath), where('ownerId', '==', ownerId)),
    (snap) => {
      const enemies = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id,
          campaignId: data.campaignId,
          ownerId: data.ownerId,
          name: data.name,
          archetype: data.archetype,
          hp: data.hp,
          maxHp: data.maxHp,
          ac: data.ac,
          gridX: data.gridX,
          gridY: data.gridY,
          threat: data.threat,
          isDefeated: Boolean(data.isDefeated),
        } as Enemy;
      });
      callbacks.onEnemies(enemies);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, enemiesPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubChronicles = onSnapshot(
    query(
      collection(db, chroniclesPath),
      where('ownerId', '==', ownerId),
      orderBy('turnNumber', 'asc')
    ),
    (snap) => {
      const entries = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id,
          campaignId: data.campaignId,
          ownerId: data.ownerId,
          turnNumber: data.turnNumber,
          speaker: data.speaker,
          role: data.role,
          text: data.text,
          diceRoll: data.diceRoll ?? '',
          timestampMs: data.createdAt?.toMillis?.() ?? Date.now(),
        } as ChronicleEntry;
      });
      callbacks.onChronicles(entries);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, chroniclesPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  return () => {
    unsubHeroes();
    unsubEnemies();
    unsubChronicles();
  };
}

export async function createCloudCampaign(
  bundle: LocalCampaignBundle,
  ownerId: string
): Promise<void> {
  const cId = sanitizeId(bundle.campaign.id);
  const campaignPath = `campaigns/${cId}`;
  try {
    await setDoc(doc(db, 'campaigns', cId), {
      id: cId,
      ownerId,
      title: bundle.campaign.title.trim().slice(0, 100) || 'Nueva Campaña',
      setting: bundle.campaign.setting.trim().slice(0, 300) || 'Aventura',
      tone: (bundle.campaign.tone || 'Épico').trim().slice(0, 50),
      lengthMode: (bundle.campaign.lengthMode || 'Campaña larga (varias sesiones)').trim().slice(0, 60),
      ingredients: (bundle.campaign.ingredients ?? []).slice(0, 10).map((x) => x.slice(0, 80)),
      summary: (bundle.campaign.summary || '').slice(0, 2500),
      summaryUpToTurn: Math.max(0, Math.min(10000, bundle.campaign.summaryUpToTurn || 0)),
      mapTheme: bundle.campaign.mapTheme,
      currentSceneTitle: bundle.campaign.currentSceneTitle.trim().slice(0, 120) || 'Inicio',
      currentNarration: bundle.campaign.currentNarration.trim().slice(0, 4000) || 'La aventura comienza.',
      turnNumber: Math.max(0, Math.min(10000, bundle.campaign.turnNumber)),
      activeCharacterId: sanitizeId(bundle.campaign.activeCharacterId),
      status: 'active',
      inCombat: Boolean(bundle.campaign.inCombat),
      roundNumber: Math.max(0, Math.min(1000, bundle.campaign.roundNumber)),
      heroCount: Math.max(1, Math.min(6, bundle.heroes.length)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const batch = writeBatch(db);
    for (const hero of bundle.heroes.slice(0, 6)) {
      const hId = sanitizeId(hero.id);
      batch.set(
        doc(db, `campaigns/${cId}/heroes`, hId),
        sanitizeHeroForFirestore({ ...hero, campaignId: cId }, ownerId)
      );
    }
    for (const enemy of bundle.enemies.slice(0, 20)) {
      const eId = sanitizeId(enemy.id);
      batch.set(
        doc(db, `campaigns/${cId}/enemies`, eId),
        sanitizeEnemyForFirestore({ ...enemy, campaignId: cId }, ownerId)
      );
    }
    for (const entry of bundle.chronicles.slice(0, 40)) {
      const entryId = sanitizeId(entry.id);
      batch.set(doc(db, `campaigns/${cId}/chronicles`, entryId), {
        id: entryId,
        campaignId: cId,
        ownerId,
        turnNumber: Math.max(0, Math.min(10000, entry.turnNumber)),
        speaker: (entry.speaker || 'Dungeon Master').slice(0, 60),
        role: entry.role,
        text: (entry.text || '...').slice(0, 4000),
        diceRoll: (entry.diceRoll || '').slice(0, 120),
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, campaignPath);
  }
}

export async function updateCloudCampaignState(
  campaignId: string,
  updates: Partial<
    Pick<
      Campaign,
      | 'mapTheme'
      | 'currentSceneTitle'
      | 'currentNarration'
      | 'turnNumber'
      | 'activeCharacterId'
      | 'inCombat'
      | 'roundNumber'
    >
  >
): Promise<void> {
  const cId = sanitizeId(campaignId);
  const path = `campaigns/${cId}`;
  try {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.mapTheme !== undefined) payload.mapTheme = updates.mapTheme;
    if (updates.currentSceneTitle !== undefined) {
      payload.currentSceneTitle = updates.currentSceneTitle.trim().slice(0, 120) || 'Escena';
    }
    if (updates.currentNarration !== undefined) {
      payload.currentNarration = updates.currentNarration.trim().slice(0, 4000) || '...';
    }
    if (updates.turnNumber !== undefined) {
      payload.turnNumber = Math.max(0, Math.min(10000, updates.turnNumber));
    }
    if (updates.activeCharacterId !== undefined) {
      payload.activeCharacterId = sanitizeId(updates.activeCharacterId);
    }
    if (updates.inCombat !== undefined) payload.inCombat = Boolean(updates.inCombat);
    if (updates.roundNumber !== undefined) {
      payload.roundNumber = Math.max(0, Math.min(1000, updates.roundNumber));
    }
    await updateDoc(doc(db, 'campaigns', cId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateCloudCampaignSummary(
  campaignId: string,
  summary: string,
  summaryUpToTurn: number
): Promise<void> {
  const cId = sanitizeId(campaignId);
  const path = `campaigns/${cId}`;
  try {
    await updateDoc(doc(db, 'campaigns', cId), {
      summary: summary.slice(0, 2500),
      summaryUpToTurn: Math.max(0, Math.min(10000, Math.round(summaryUpToTurn))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateCloudHeroPosition(
  campaignId: string,
  heroId: string,
  gridX: number,
  gridY: number
): Promise<void> {
  const cId = sanitizeId(campaignId);
  const hId = sanitizeId(heroId);
  const path = `campaigns/${cId}/heroes/${hId}`;
  try {
    await updateDoc(doc(db, `campaigns/${cId}/heroes`, hId), {
      gridX: Math.max(0, Math.min(11, Math.round(gridX))),
      gridY: Math.max(0, Math.min(7, Math.round(gridY))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateCloudHeroStats(campaignId: string, hero: Hero): Promise<void> {
  const cId = sanitizeId(campaignId);
  const hId = sanitizeId(hero.id);
  const path = `campaigns/${cId}/heroes/${hId}`;
  try {
    await updateDoc(doc(db, `campaigns/${cId}/heroes`, hId), {
      level: Math.max(1, Math.min(20, Math.round(hero.level))),
      hp: Math.max(0, Math.min(500, Math.round(hero.hp))),
      maxHp: Math.max(1, Math.min(500, Math.round(hero.maxHp))),
      mana: Math.max(0, Math.min(500, Math.round(hero.mana))),
      maxMana: Math.max(0, Math.min(500, Math.round(hero.maxMana))),
      ac: Math.max(5, Math.min(35, Math.round(hero.ac))),
      gridX: Math.max(0, Math.min(11, Math.round(hero.gridX))),
      gridY: Math.max(0, Math.min(7, Math.round(hero.gridY))),
      xp: Math.max(0, Math.min(1000000, Math.round(hero.xp))),
      gold: Math.max(0, Math.min(1000000, Math.round(hero.gold))),
      conditions: hero.conditions.slice(0, 8).map((c) => c.slice(0, 80)),
      inventory: hero.inventory.slice(0, 20).map((i) => i.slice(0, 80)),
      knownSpells: hero.knownSpells.slice(0, 15).map((s) => s.slice(0, 80)),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function upsertCloudEnemy(
  campaignId: string,
  ownerId: string,
  enemy: Enemy,
  isNew: boolean
): Promise<void> {
  const cId = sanitizeId(campaignId);
  const eId = sanitizeId(enemy.id);
  const path = `campaigns/${cId}/enemies/${eId}`;
  try {
    if (isNew) {
      await setDoc(
        doc(db, `campaigns/${cId}/enemies`, eId),
        sanitizeEnemyForFirestore({ ...enemy, campaignId: cId }, ownerId)
      );
    } else {
      await updateDoc(doc(db, `campaigns/${cId}/enemies`, eId), {
        hp: Math.max(0, Math.min(1000, Math.round(enemy.hp))),
        isDefeated: Boolean(enemy.isDefeated),
        gridX: Math.max(0, Math.min(11, Math.round(enemy.gridX))),
        gridY: Math.max(0, Math.min(7, Math.round(enemy.gridY))),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function addCloudChronicleEntry(
  campaignId: string,
  ownerId: string,
  entry: ChronicleEntry
): Promise<void> {
  const cId = sanitizeId(campaignId);
  const entryId = sanitizeId(entry.id);
  const path = `campaigns/${cId}/chronicles/${entryId}`;
  try {
    await setDoc(doc(db, `campaigns/${cId}/chronicles`, entryId), {
      id: entryId,
      campaignId: cId,
      ownerId,
      turnNumber: Math.max(0, Math.min(10000, Math.round(entry.turnNumber))),
      speaker: (entry.speaker || 'Dungeon Master').slice(0, 60),
      role: entry.role,
      text: (entry.text || '...').slice(0, 4000),
      diceRoll: (entry.diceRoll || '').slice(0, 120),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteCloudCampaign(campaignId: string): Promise<void> {
  const cId = sanitizeId(campaignId);
  const path = `campaigns/${cId}`;
  try {
    await deleteDoc(doc(db, 'campaigns', cId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
