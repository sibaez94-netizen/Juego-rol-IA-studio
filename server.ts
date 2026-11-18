import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
  type FunctionDeclaration,
} from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

function getGeminiClient(apiVersion = "v1beta"): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment.");
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = getErrorMessage(err);
      const isTransient =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED");
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }
  throw lastErr;
}

async function runWithModelFallback<T>(
  runner: (model: string) => Promise<T>
): Promise<T> {
  try {
    return await withRetry(() => runner("gemini-4-hydrogen"), 2);
  } catch (err) {
    const msg = getErrorMessage(err);
    if (msg.includes("503") || msg.includes("UNAVAILABLE")) {
      return await withRetry(() => runner("gemini-3.1-flash-lite"), 2);
    }
    throw err;
  }
}

function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function fmtSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

interface HeroPayload {
  id: string;
  name: string;
  playerName?: string;
  race?: string;
  class?: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  ac: number;
  gridX: number;
  gridY: number;
  stats?: Record<string, number>;
  knownSpells?: string[];
  conditions?: string[];
  look?: string;
  rasgo?: string;
}

interface DiceLogEntry {
  speaker: string;
  text: string;
  detail: string;
}

const STAT_SPANISH: Record<string, string> = {
  str: "Fuerza",
  dex: "Destreza",
  con: "Constitución",
  int: "Inteligencia",
  wis: "Sabiduría",
  cha: "Carisma",
};

const tirarPruebaDeclaration: FunctionDeclaration = {
  name: "tirar_prueba",
  description:
    "Tira 1d20 + el modificador de atributo de un héroe contra una dificultad CD para resolver cualquier acción arriesgada, ataque, sigilo o conjuro incierto. Úsala ANTES de narrar el resultado.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      heroName: {
        type: Type.STRING,
        description: "Nombre del héroe o del jugador que realiza la prueba.",
      },
      stat: {
        type: Type.STRING,
        description: "Atributo: str, dex, con, int, wis o cha.",
      },
      cd: {
        type: Type.INTEGER,
        description: "Dificultad: 8 muy fácil, 10 fácil, 13 normal, 16 difícil, 19 heroica.",
      },
      motivo: {
        type: Type.STRING,
        description: "Descripción breve de la prueba (ej. Abrir cerradura, Percepción, Ataque con espada).",
      },
      ventaja: {
        type: Type.STRING,
        description: "Uno de: normal, ventaja, desventaja.",
      },
    },
    required: ["heroName", "stat", "cd", "motivo"],
  },
};

const tirarDadosDeclaration: FunctionDeclaration = {
  name: "tirar_dados",
  description:
    "Tira dados con una expresión tipo 2d6+3 o 1d8 para calcular daño, ataques enemigos, curaciones o cantidades aleatorias.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      expresion: {
        type: Type.STRING,
        description: "Fórmula de dados como 1d8+2, 3d6, 1d20.",
      },
      motivo: {
        type: Type.STRING,
        description: "Motivo de la tirada (ej. Daño de goblin, Daño de Bola de Fuego).",
      },
    },
    required: ["expresion", "motivo"],
  },
};

const dmTurnResponseSchema = {
  type: Type.OBJECT,
  properties: {
    sceneTitle: {
      type: Type.STRING,
      description: "Evocative short scene title in Spanish (max 60 chars).",
    },
    narration: {
      type: Type.STRING,
      description:
        "Vivid Dungeon Master narration in Spanish (90-220 words, second person plural to the party, dialogue in «», ends with an open question). Never decide what player characters feel or say.",
    },
    voiceScript: {
      type: Type.STRING,
      description:
        "Concise dramatic spoken summary in Spanish (max 340 chars) ideal for reading aloud to friends around a TV.",
    },
    mapTheme: {
      type: Type.STRING,
      description: "One of: crypt, forest, tavern",
    },
    inCombat: {
      type: Type.BOOLEAN,
      description: "True if hostile enemies are actively engaged in combat.",
    },
    ambientMood: {
      type: Type.STRING,
      description: "One of: tavern, dungeon, combat, mystery, victory",
    },
    suggestedActions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 to 4 concise action ideas in Spanish players can say or click.",
    },
    dicePrompt: {
      type: Type.OBJECT,
      properties: {
        required: { type: Type.BOOLEAN },
        heroName: { type: Type.STRING },
        dieType: {
          type: Type.STRING,
          description: "One of: d20, d12, d10, d8, d6",
        },
        skill: { type: Type.STRING },
        dc: { type: Type.INTEGER },
        reason: { type: Type.STRING },
      },
      required: ["required", "heroName", "dieType", "skill", "dc", "reason"],
    },
    heroUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heroId: { type: Type.STRING },
          hpDelta: { type: Type.INTEGER },
          manaDelta: { type: Type.INTEGER },
          xpDelta: { type: Type.INTEGER },
          goldDelta: { type: Type.INTEGER },
          addCondition: { type: Type.STRING },
          removeCondition: { type: Type.STRING },
          addItem: { type: Type.STRING },
        },
        required: ["heroId", "hpDelta", "manaDelta", "xpDelta", "goldDelta"],
      },
    },
    enemyUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "One of: spawn, damage, defeat, move",
          },
          enemyId: { type: Type.STRING },
          name: { type: Type.STRING },
          archetype: { type: Type.STRING },
          threat: {
            type: Type.STRING,
            description: "One of: minion, elite, boss",
          },
          hpDelta: { type: Type.INTEGER },
          maxHp: { type: Type.INTEGER },
          ac: { type: Type.INTEGER },
          gridX: { type: Type.INTEGER },
          gridY: { type: Type.INTEGER },
        },
        required: [
          "action",
          "name",
          "archetype",
          "threat",
          "hpDelta",
          "maxHp",
          "ac",
          "gridX",
          "gridY",
        ],
      },
    },
  },
  required: [
    "sceneTitle",
    "narration",
    "voiceScript",
    "mapTheme",
    "inCombat",
    "ambientMood",
    "suggestedActions",
    "heroUpdates",
    "enemyUpdates",
  ],
};

const forgePartySchema = {
  type: Type.OBJECT,
  properties: {
    campaignTitle: {
      type: Type.STRING,
      description: "Evocative campaign title in Spanish, max 6 words.",
    },
    heroes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          playerName: { type: Type.STRING },
          name: { type: Type.STRING },
          raceId: {
            type: Type.STRING,
            description: "One of: human, high_elf, mountain_dwarf, tiefling, dragonborn, halfling",
          },
          classId: {
            type: Type.STRING,
            description: "One of: mage, warrior, rogue, cleric, ranger, bard",
          },
          look: {
            type: Type.STRING,
            description: "Visual appearance in one vivid sentence in Spanish.",
          },
          rasgo: {
            type: Type.STRING,
            description: "Personality quirk or catchphrase in one sentence in Spanish.",
          },
          bonusItem: {
            type: Type.STRING,
            description: "One flavorful personal trinket or starting item.",
          },
        },
        required: ["playerName", "name", "raceId", "classId", "look", "rasgo", "bonusItem"],
      },
    },
  },
  required: ["campaignTitle", "heroes"],
};

function executeDmToolCall(
  name: string,
  args: Record<string, unknown>,
  heroes: HeroPayload[],
  diceLogs: DiceLogEntry[]
): Record<string, unknown> {
  if (name === "tirar_prueba") {
    const heroQuery = String(args.heroName || "").toLowerCase().trim();
    const hero =
      heroes.find(
        (h) =>
          h.name.toLowerCase() === heroQuery ||
          (h.playerName && h.playerName.toLowerCase() === heroQuery)
      ) ||
      heroes.find(
        (h) =>
          heroQuery &&
          (h.name.toLowerCase().includes(heroQuery) ||
            heroQuery.includes(h.name.toLowerCase().split(" ")[0]))
      );

    const statKey = String(args.stat || "dex").toLowerCase();
    const validStat = ["str", "dex", "con", "int", "wis", "cha"].includes(statKey)
      ? statKey
      : "dex";
    const score = hero?.stats?.[validStat] ?? 12;
    const mod = getModifier(score);
    const cd = Math.max(5, Math.min(30, Number(args.cd) || 13));
    const ventaja = String(args.ventaja || "normal").toLowerCase();
    const a = rollDie(20);
    const b = rollDie(20);
    const raw =
      ventaja === "ventaja"
        ? Math.max(a, b)
        : ventaja === "desventaja"
        ? Math.min(a, b)
        : a;
    const total = raw + mod;
    const success = raw === 20 || (raw !== 1 && total >= cd);
    const outcome =
      raw === 20 ? "¡CRÍTICO!" : raw === 1 ? "¡PIFIA!" : success ? "Éxito" : "Fallo";
    const statLabel = STAT_SPANISH[validStat] ?? validStat.toUpperCase();
    const motivo = String(args.motivo || "Prueba");
    const actor = hero?.name ?? String(args.heroName || "Héroe");

    const detail = `1d20 (${raw}${
      ventaja !== "normal" ? `, ${ventaja}: ${a}/${b}` : ""
    }) ${fmtSigned(mod)} = ${total} vs CD ${cd} · ${outcome}`;

    diceLogs.push({
      speaker: actor,
      text: `${motivo} (${statLabel})`,
      detail,
    });

    return {
      personaje: actor,
      tirada: raw,
      modificador: mod,
      total,
      cd,
      exito: success,
      critico: raw === 20,
      pifia: raw === 1,
    };
  }

  if (name === "tirar_dados") {
    const expr = String(args.expresion || "1d6").replace(/\s+/g, "").toLowerCase();
    const match = expr.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    const count = match ? Math.min(12, Math.max(1, Number(match[1] || 1))) : 1;
    const sides = match ? Math.min(100, Math.max(2, Number(match[2]))) : 6;
    const bonus = match && match[3] ? Number(match[3]) : 0;
    const rolls = Array.from({ length: count }, () => rollDie(sides));
    const total = Math.max(1, rolls.reduce((acc, x) => acc + x, 0) + bonus);
    const motivo = String(args.motivo || "Tirada de dados");
    const detail = `${expr} [${rolls.join(", ")}]${bonus ? ` ${fmtSigned(bonus)}` : ""} = ${total}`;

    diceLogs.push({
      speaker: "Dados de Mesa",
      text: motivo,
      detail,
    });

    return { total, dados: rolls, expresion: expr };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/dm/forge-party", async (req, res) => {
    try {
      const { setting, tone, ingredients, players } = req.body ?? {};
      const ai = getGeminiClient();

      const prompt = `Eres diseñador de partidas de Dragones y Mazmorras en español.
Ambientación: ${String(setting || "Fantasía épica")}
Tono: ${String(tone || "Épico")}
Ingredientes: ${Array.isArray(ingredients) && ingredients.length ? ingredients.join(", ") : "Aventura clásica"}
Jugadores y conceptos:
${JSON.stringify(players || [], null, 2)}

Reglas:
- Si un jugador ya eligió raceId o classId concretos, respétalos; si dejó alguno abierto o escribió un concepto libre, elige el raceId (human, high_elf, mountain_dwarf, tiefling, dragonborn, halfling) y classId (mage, warrior, rogue, cleric, ranger, bard) que mejor encaje con su idea.
- Si no puso nombre de personaje, invéntale uno épico y original en español.
- Crea para cada héroe un "look" (aspecto en 1 frase), un "rasgo" (personalidad o manía en 1 frase) y un "bonusItem" (objeto personal curioso).
- Crea también un título evocador para la campaña (máximo 6 palabras).`;

      const response = await runWithModelFallback((model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: forgePartySchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      console.error("Forge party error:", err);
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  app.post("/api/dm/intro", async (req, res) => {
    try {
      const { title, setting, tone, lengthMode, ingredients, mapTheme, heroes } =
        req.body ?? {};
      const ai = getGeminiClient();

      const prompt = `Eres el Dungeon Master de "Crónicas del Abismo", dirigiendo una partida presencial de Dragones y Mazmorras en español frente a una TV.
Crea la escena inicial con fuerza.

Título: ${String(title || "Crónicas del Abismo")}
Ambientación: ${String(setting || "Cripta de los Susurros")}
Tono: ${String(tone || "Épico")} | Duración: ${String(lengthMode || "Campaña larga")}
Ingredientes deseados: ${Array.isArray(ingredients) && ingredients.length ? ingredients.join(", ") : "Acción y misterio"}
Mapa inicial: ${String(mapTheme || "tavern")}
Grupo de héroes:
${JSON.stringify(heroes || [], null, 2)}

Reglas de narración:
- Español de España, segunda persona del plural al grupo, diálogos de PNJ entre comillas «».
- Presenta brevemente a cada héroe integrando su raza, clase, aspecto o rasgo y plantea un gancho inmediato.
- El tablero mide 12x8 (gridX: 0..11, gridY: 0..7). Héroes en gridX 1..3; enemigos iniciales (si hay) en gridX 7..10.
- Responde siguiendo el esquema JSON.`;

      const response = await runWithModelFallback((model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: dmTurnResponseSchema,
          },
        })
      );

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      console.error("DM intro error:", err);
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  app.post("/api/dm/turn", async (req, res) => {
    try {
      const {
        campaignTitle,
        setting,
        tone,
        lengthMode,
        ingredients,
        campaignSummary,
        mapTheme,
        turnNumber,
        inCombat,
        heroes,
        enemies,
        recentChronicle,
        playerAction,
        actorName,
        diceResult,
        mode,
      } = req.body ?? {};

      const ai = getGeminiClient();
      const typedHeroes: HeroPayload[] = Array.isArray(heroes) ? heroes : [];
      const diceLogs: DiceLogEntry[] = [];

      let modeInstruction = "";
      if (mode === "continue") {
        modeInstruction =
          "MODO QUE SIGA: Los jugadores observan o debaten sin proponer acción nueva. Haz avanzar la escena con un suceso vivo, un PNJ que interviene o un giro que les invite a actuar.";
      } else if (mode === "recap") {
        modeInstruction =
          "MODO RECAPITULACIÓN: Los jugadores preguntan '¿Qué pasa ahora?'. Recuérdales en 90-130 palabras dónde están, el peligro o misterio inmediato y 3-4 opciones claras sin decidir por ellos.";
      }

      const systemPrompt = `Eres el Dungeon Master de "Crónicas del Abismo", dirigiendo una partida de rol de mesa en español para amigos alrededor de una TV.

CONFIGURACIÓN DE CAMPAÑA:
- Campaña: ${String(campaignTitle || "")}
- Ambientación: ${String(setting || "")}
- Tono: ${String(tone || "Épico")} | Duración: ${String(lengthMode || "Campaña larga")}
- Ingredientes: ${Array.isArray(ingredients) && ingredients.length ? ingredients.join(", ") : "Equilibrado"}
${String(lengthMode || "").startsWith("Una noche") ? "- Ritmo de partida de una noche: dirige la trama hacia un clímax épico alrededor del turno 15-22." : ""}

ESTADO ACTUAL:
- Mapa: ${String(mapTheme || "crypt")} | Turno: ${Number(turnNumber || 1)} | Combate: ${Boolean(inCombat)}
- Resumen anterior: ${String(campaignSummary || "(inicio de campaña)")}
- Héroes (tablero 12x8):
${JSON.stringify(typedHeroes, null, 2)}
- Enemigos activos:
${JSON.stringify(enemies || [], null, 2)}
- Últimos sucesos:
${JSON.stringify(recentChronicle || [], null, 2)}

ACCIÓN ACTUAL:
- Protagonista: ${String(actorName || "La mesa")}
- Declaración: ${String(playerAction || "")}
- Tirada ya realizada por el jugador (si hubo): ${String(diceResult || "Ninguna")}
${modeInstruction}

REGLAS DE DIRECCIÓN Y HERRAMIENTAS:
1. NUNCA inventes números de tiradas. Si la acción tiene riesgo, ataque, sigilo o salvación y NO hay tirada previa del jugador, llama primero a \`tirar_prueba\` o \`tirar_dados\` para obtener el resultado real antes de narrar.
2. En combate ágil, resuelve el turno del jugador y haz que los enemigos activos respondan (usa \`tirar_dados\` para su daño si impactan y aplica \`hpDelta\` negativo a los héroes afectados).
3. Respeta el género de cada personaje, usa español de España en segunda persona del plural, diálogos entre «», y termina SIEMPRE con una pregunta o situación abierta.
4. No decidas nunca qué dicen, piensan o sienten los personajes jugadores.
5. Si un jugador usa un hechizo que ya descontó maná según la declaración, pon manaDelta=0 para ese héroe.`;

      const contents: Content[] = [{ role: "user", parts: [{ text: systemPrompt }] }];
      const tools = [{ functionDeclarations: [tirarPruebaDeclaration, tirarDadosDeclaration] }];

      // Tool-calling loop (up to 3 rounds) so real dice are rolled server-side
      for (let round = 0; round < 3; round++) {
        const stepResp = await runWithModelFallback((model) =>
          ai.models.generateContent({
            model,
            contents,
            config: { tools },
          })
        );

        const candidateContent = stepResp.candidates?.[0]?.content;
        const calls = stepResp.functionCalls;
        if (!calls || calls.length === 0 || !candidateContent) {
          break;
        }

        contents.push(candidateContent);

        const responseParts = calls.map((fc) => {
          const result = executeDmToolCall(
            fc.name ?? "",
            (fc.args as Record<string, unknown>) ?? {},
            typedHeroes,
            diceLogs
          );
          return {
            functionResponse: {
              id: fc.id,
              name: fc.name ?? "",
              response: result,
            },
          };
        });

        contents.push({ role: "user", parts: responseParts });
      }

      // Final structured JSON pass incorporating all executed dice results
      contents.push({
        role: "user",
        parts: [
          {
            text: "Ahora genera la respuesta definitiva siguiendo estrictamente el esquema JSON, integrando en la narración y en heroUpdates/enemyUpdates los resultados reales de las tiradas ejecutadas.",
          },
        ],
      });

      const finalResponse = await runWithModelFallback((model) =>
        ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: dmTurnResponseSchema,
          },
        })
      );

      const parsed = JSON.parse((finalResponse.text ?? "{}").trim());
      res.json({ ...parsed, diceLogs });
    } catch (err) {
      console.error("DM turn error:", err);
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  app.post("/api/dm/summarize", async (req, res) => {
    try {
      const { currentSummary, entries } = req.body ?? {};
      const ai = getGeminiClient();

      const prompt = `Eres el cronista de una partida de Dragones y Mazmorras. Actualiza el resumen de la campaña incorporando los nuevos sucesos.
Máximo 220 palabras, en español, en prosa clara: lugares visitados, PNJ con nombre, pistas descubiertas, enemigos vencidos, promesas y objetivos abiertos.

RESUMEN ACTUAL:
${String(currentSummary || "(vacío)")}

SUCESOS NUEVOS:
${JSON.stringify(entries || [], null, 2)}

Devuelve únicamente el texto del resumen actualizado.`;

      const response = await runWithModelFallback((model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      res.json({ summary: (response.text ?? "").trim().slice(0, 2400) });
    } catch (err) {
      console.error("Summarize error:", err);
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  app.post("/api/dm/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body ?? {};
      if (!audioBase64 || typeof audioBase64 !== "string") {
        res.status(400).json({ error: "Falta audioBase64." });
        return;
      }

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: typeof mimeType === "string" ? mimeType : "audio/webm",
                  data: audioBase64,
                },
              },
              {
                text: "Transcribe exactamente lo que dicen los jugadores de rol en español en la mesa. Devuelve únicamente el texto transcrito, sin comentarios extra.",
              },
            ],
          },
        })
      );

      res.json({ text: (response.text ?? "").trim() });
    } catch (err) {
      console.error("Transcribe error:", err);
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  app.post("/api/dm/narrate", async (req, res) => {
    try {
      const { text, voiceName } = req.body ?? {};
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Falta el texto a narrar." });
        return;
      }

      const allowedVoices = ["Charon", "Fenrir", "Kore", "Puck", "Zephyr"];
      const chosenVoice = allowedVoices.includes(String(voiceName))
        ? String(voiceName)
        : "Charon";

      const cleanText = text.slice(0, 900);
      const ai = getGeminiClient("v1beta");
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style:
                      "Dramatic, atmospheric Spanish Dungeon Master narrator at a fantasy tabletop game",
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        })
      );

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(500).json({ error: "No se generó audio de narración." });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: "audio/wav" });
    } catch (err) {
      console.error("TTS narration error:", err);
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Crónicas del Abismo server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
