import React, { useEffect, useRef, useState } from 'react';
import {
  Dices,
  FastForward,
  HelpCircle,
  Mic,
  MicOff,
  Radio,
  Send,
  Settings2,
  Sparkles,
  Square,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { DicePrompt, DieType, DmVoiceName, Hero } from '../types/dnd';
import { DM_VOICES, formatModifier, rollDiceFormula } from '../data/dndCatalog';
import { soundEngine } from '../lib/soundEngine';

interface VoiceAndDiceDockProps {
  heroes: Hero[];
  activeHero: Hero | undefined;
  isProcessingTurn: boolean;
  suggestedActions: string[];
  dicePrompt: DicePrompt | null;
  onSubmitAction: (
    actionText: string,
    diceSummary?: string,
    mode?: 'action' | 'continue' | 'recap'
  ) => void;
  onAbortTurn: () => void;
  onManualDiceRoll: (die: DieType, rawRoll: number, total: number, detail: string) => void;
  autoNarrate: boolean;
  onToggleAutoNarrate: () => void;
  isSpeakingDm: boolean;
  onReplayLastNarration: () => void;
  soundMuted: boolean;
  onToggleSoundMuted: () => void;
  dmVoice: DmVoiceName;
  onChangeDmVoice: (voice: DmVoiceName) => void;
  dmSpeed: number;
  onChangeDmSpeed: (speed: number) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const VoiceAndDiceDock: React.FC<VoiceAndDiceDockProps> = ({
  heroes,
  activeHero,
  isProcessingTurn,
  suggestedActions,
  dicePrompt,
  onSubmitAction,
  onAbortTurn,
  onManualDiceRoll,
  autoNarrate,
  onToggleAutoNarrate,
  isSpeakingDm,
  onReplayLastNarration,
  soundMuted,
  onToggleSoundMuted,
  dmVoice,
  onChangeDmVoice,
  dmSpeed,
  onChangeDmSpeed,
}) => {
  const [inputMode, setInputMode] = useState<'table' | 'party'>('table');
  const [actionInput, setActionInput] = useState('');
  const [partyInputs, setPartyInputs] = useState<Record<string, string>>({});
  const [activeMicHeroId, setActiveMicHeroId] = useState<string | null>(null);

  const [isHandsFreeListening, setIsHandsFreeListening] = useState(false);
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const [lastDiceBanner, setLastDiceBanner] = useState<{
    die: string;
    raw: number;
    total: number;
    crit?: 'crit' | 'fumble';
  } | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<number | null>(null);
  const transcriptBufferRef = useRef('');
  const isHandsFreeRef = useRef(false);

  useEffect(() => {
    isHandsFreeRef.current = isHandsFreeListening;
  }, [isHandsFreeListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const triggerActionSubmit = (text: string, diceSummary?: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessingTurn) return;
    setActionInput('');
    transcriptBufferRef.current = '';
    onSubmitAction(trimmed, diceSummary, 'action');
  };

  const submitSimultaneousPartyActions = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isProcessingTurn) return;
    const lines = heroes
      .map((h) => {
        const val = (partyInputs[h.id] || '').trim();
        return val ? `- ${h.name} (${h.playerName}): ${val}` : null;
      })
      .filter((x): x is string => Boolean(x));

    if (lines.length === 0) {
      setVoiceError('Escribe o dicta la acción de al menos un héroe, o pulsa «Que siga».');
      return;
    }

    setVoiceError(null);
    setPartyInputs({});
    onSubmitAction(
      `Acciones simultáneas del grupo:\n${lines.join('\n')}`,
      undefined,
      'action'
    );
  };

  const toggleHandsFreeVoice = (targetHeroId?: string) => {
    setVoiceError(null);
    if (isHandsFreeListening) {
      setIsHandsFreeListening(false);
      setActiveMicHeroId(null);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceError(
        'Tu navegador no soporta escucha continua directa; usa "Grabar Voz (Gemini)".'
      );
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;
    setActiveMicHeroId(targetHeroId ?? null);

    recognition.onresult = (event) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript ?? '';
        if (res.isFinal) {
          finalChunk += ` ${text}`;
        } else {
          interim += ` ${text}`;
        }
      }

      if (finalChunk.trim()) {
        transcriptBufferRef.current = `${transcriptBufferRef.current} ${finalChunk}`.trim();
      }
      const combined = `${transcriptBufferRef.current} ${interim}`.trim();

      if (targetHeroId) {
        setPartyInputs((prev) => ({ ...prev, [targetHeroId]: combined }));
      } else {
        setActionInput(combined);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (combined.length >= 6) {
          silenceTimerRef.current = window.setTimeout(() => {
            const toSend = transcriptBufferRef.current.trim() || combined;
            if (toSend.length >= 6 && !isProcessingTurn) {
              triggerActionSubmit(toSend);
            }
          }, 2300);
        }
      }
    };

    recognition.onerror = (ev) => {
      if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        setVoiceError(`Micrófono: ${ev.error}. Puedes usar Grabar Voz (Gemini).`);
        setIsHandsFreeListening(false);
        setActiveMicHeroId(null);
      }
    };

    recognition.onend = () => {
      if (isHandsFreeRef.current && !targetHeroId) {
        try {
          recognition.start();
        } catch {
          setIsHandsFreeListening(false);
        }
      } else if (targetHeroId) {
        setIsHandsFreeListening(false);
        setActiveMicHeroId(null);
      }
    };

    try {
      transcriptBufferRef.current = targetHeroId ? partyInputs[targetHeroId] || '' : '';
      recognition.start();
      recognitionRef.current = recognition;
      setIsHandsFreeListening(true);
    } catch {
      setVoiceError('No se pudo activar el micrófono.');
    }
  };

  const toggleGeminiAudioClip = async () => {
    setVoiceError(null);
    if (isRecordingClip && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingClip(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 200) return;

        setIsTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = String(reader.result || '');
              const idx = result.indexOf(',');
              resolve(idx >= 0 ? result.slice(idx + 1) : result);
            };
            reader.onerror = () => reject(new Error('Error leyendo audio'));
            reader.readAsDataURL(blob);
          });

          const resp = await fetch('/api/dm/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: blob.type || 'audio/webm',
            }),
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || 'Error al transcribir');
          if (data.text) {
            triggerActionSubmit(data.text);
          }
        } catch (err) {
          setVoiceError(err instanceof Error ? err.message : 'Error transcribiendo audio.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingClip(true);
    } catch {
      setVoiceError('Permite el acceso al micrófono para escuchar a la mesa.');
    }
  };

  const rollSingleDie = (die: DieType, skillLabel?: string, dc?: number) => {
    soundEngine.playDiceRoll();
    const { total: raw } = rollDiceFormula(`1${die}`);
    let mod = 0;
    if (die === 'd20' && activeHero) {
      const s = activeHero.stats;
      mod = Math.floor((Math.max(s.str, s.dex, s.int, s.wis, s.cha) - 10) / 2);
    }
    const finalTotal = raw + mod;
    const crit =
      die === 'd20' && raw === 20
        ? 'crit'
        : die === 'd20' && raw === 1
        ? 'fumble'
        : undefined;

    if (crit === 'crit') soundEngine.playCritSuccess();
    if (crit === 'fumble') soundEngine.playCritFail();

    const modStr = mod !== 0 ? ` ${mod >= 0 ? '+' : ''}${mod}` : '';
    const detail = `${die.toUpperCase()}: ${raw}${modStr} = ${finalTotal}${
      dc ? ` (CD ${dc} · ${finalTotal >= dc ? 'ÉXITO' : 'FALLO'})` : ''
    }`;

    setLastDiceBanner({
      die: die.toUpperCase(),
      raw,
      total: finalTotal,
      crit,
    });

    onManualDiceRoll(die, raw, finalTotal, detail);

    if (skillLabel) {
      triggerActionSubmit(
        `${activeHero?.name ?? 'El grupo'} realiza la tirada de ${skillLabel} y obtiene ${finalTotal} (${detail}).`,
        detail
      );
    }
  };

  const diceList: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

  return (
    <section className="bg-[#141822] border border-stone-800/90 rounded-xl p-4 space-y-4">
      {/* Requested Dice Check Alert from Gemini DM */}
      {dicePrompt && dicePrompt.required && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-amber-300">
              Tirada solicitada para {dicePrompt.heroName} · {dicePrompt.skill} (CD {dicePrompt.dc})
            </p>
            <p className="text-xs text-stone-300">{dicePrompt.reason}</p>
          </div>
          <button
            onClick={() => rollSingleDie(dicePrompt.dieType, dicePrompt.skill, dicePrompt.dc)}
            disabled={isProcessingTurn}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Dices className="w-4 h-4" />
            Tirar {dicePrompt.dieType.toUpperCase()}
          </button>
        </div>
      )}

      {/* Mode Switch + Quick Tabletop Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#0c0f16] border border-stone-800 rounded-lg">
          <button
            type="button"
            onClick={() => setInputMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              inputMode === 'table'
                ? 'bg-[#1f2536] text-amber-300'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Voz de Mesa (TV)
          </button>
          <button
            type="button"
            onClick={() => setInputMode('party')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              inputMode === 'party'
                ? 'bg-[#1f2536] text-amber-300'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Turnos Simultáneos ({heroes.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isProcessingTurn ? (
            <button
              type="button"
              onClick={onAbortTurn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600/25 hover:bg-rose-600/35 text-rose-200 border border-rose-500/50 rounded-lg transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3" />
              Detener Narrador
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  onSubmitAction(
                    'Los héroes observan la escena sin intervenir aún; haz avanzar la situación con un nuevo suceso o intervención.',
                    undefined,
                    'continue'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a202e] hover:bg-[#232a3c] text-stone-200 border border-stone-700/80 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5 text-amber-400" />
                Que siga
              </button>
              <button
                type="button"
                onClick={() =>
                  onSubmitAction(
                    '¿Dónde estamos exactamente y qué opciones tenemos ahora?',
                    undefined,
                    'recap'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a202e] hover:bg-[#232a3c] text-stone-200 border border-stone-700/80 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                ¿Qué pasa ahora?
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode 1: Single Table Microphone + Global Input */}
      {inputMode === 'table' && (
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => toggleHandsFreeVoice()}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isHandsFreeListening && !activeMicHeroId
                  ? 'bg-emerald-600/20 border-emerald-400 text-emerald-200'
                  : 'bg-[#1a202e] hover:bg-[#22293b] border-stone-700 text-stone-200'
              }`}
            >
              {isHandsFreeListening && !activeMicHeroId ? (
                <>
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Escuchando Mesa
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-amber-400" />
                  Modo Escucha TV
                </>
              )}
            </button>

            <button
              type="button"
              onClick={toggleGeminiAudioClip}
              disabled={isTranscribing}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isRecordingClip
                  ? 'bg-red-600/25 border-red-400 text-red-200'
                  : 'bg-[#1a202e] hover:bg-[#22293b] border-stone-700 text-stone-200'
              }`}
            >
              {isRecordingClip ? (
                <>
                  <MicOff className="w-4 h-4 text-red-400" />
                  Enviar Audio
                </>
              ) : isTranscribing ? (
                <>
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Transcribiendo...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-sky-400" />
                  Grabar Voz (Gemini)
                </>
              )}
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              triggerActionSubmit(actionInput);
            }}
            className="flex-1 flex items-center gap-2"
          >
            <input
              type="text"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder={
                activeHero
                  ? `¿Qué hace ${activeHero.name}? (Habla al micrófono o escribe aquí...)`
                  : 'Describe la acción del grupo...'
              }
              className="flex-1 min-w-0 bg-[#0d1017] border border-stone-700/90 focus:border-amber-400 rounded-lg px-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isProcessingTurn || !actionInput.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isProcessingTurn ? 'Narrando...' : 'Actuar'}
            </button>
          </form>
        </div>
      )}

      {/* Mode 2: Simultaneous Per-Hero Rows (inspired by El Narrador) */}
      {inputMode === 'party' && (
        <form onSubmit={submitSimultaneousPartyActions} className="space-y-2.5">
          {heroes.map((hero) => {
            const micActive = isHandsFreeListening && activeMicHeroId === hero.id;
            return (
              <div key={hero.id} className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold w-28 truncate shrink-0"
                  style={{ color: hero.color }}
                >
                  {hero.name.split(' ')[0]}
                </span>
                <input
                  type="text"
                  value={partyInputs[hero.id] || ''}
                  onChange={(e) =>
                    setPartyInputs((prev) => ({ ...prev, [hero.id]: e.target.value }))
                  }
                  disabled={isProcessingTurn}
                  placeholder={`¿Qué hace ${hero.name.split(' ')[0]}? (${hero.playerName})`}
                  className="flex-1 min-w-0 bg-[#0d1017] border border-stone-700/90 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => toggleHandsFreeVoice(hero.id)}
                  title={`Dictar acción de ${hero.name}`}
                  className={`p-2 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                    micActive
                      ? 'bg-red-600/25 border-red-400 text-red-200'
                      : 'bg-[#1a202e] hover:bg-[#232a3c] border-stone-700 text-stone-300'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isProcessingTurn}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isProcessingTurn ? 'Resolviendo Turno...' : 'Enviar Turno del Grupo'}
            </button>
          </div>
        </form>
      )}

      {voiceError && <p className="text-xs text-rose-400">{voiceError}</p>}

      {/* Suggested Actions from DM */}
      {suggestedActions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-400 mr-1">Sugerencias:</span>
          {suggestedActions.map((act, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isProcessingTurn}
              onClick={() => triggerActionSubmit(act)}
              className="px-3 py-1.5 text-xs font-medium bg-[#1b202d] hover:bg-[#252c3d] text-stone-200 border border-stone-700/80 rounded-lg transition-colors text-left cursor-pointer disabled:opacity-50"
            >
              {act}
            </button>
          ))}
        </div>
      )}

      {/* Dice Tray + TV Audio Controls */}
      <div className="pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-stone-400 mr-1 inline-flex items-center gap-1.5">
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            Dados:
          </span>
          {diceList.map((die) => (
            <button
              key={die}
              type="button"
              onClick={() => rollSingleDie(die)}
              className="px-2.5 py-1.5 text-xs font-mono-tabular font-semibold bg-[#0e121a] hover:bg-amber-500/15 hover:text-amber-300 hover:border-amber-500/40 text-stone-200 border border-stone-800 rounded-md transition-colors cursor-pointer"
            >
              {die.toUpperCase()}
            </button>
          ))}
          {activeHero && (
            <span className="text-[11px] text-stone-500 ml-2 hidden sm:inline">
              Bono d20 ({activeHero.name.split(' ')[0]}):{' '}
              <span className="font-mono-tabular text-stone-300">
                {formatModifier(
                  Math.max(
                    activeHero.stats.str,
                    activeHero.stats.dex,
                    activeHero.stats.int,
                    activeHero.stats.wis,
                    activeHero.stats.cha
                  )
                )}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {lastDiceBanner && (
            <div
              className={`px-3 py-1 rounded-lg border text-xs font-mono-tabular ${
                lastDiceBanner.crit === 'crit'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : lastDiceBanner.crit === 'fumble'
                  ? 'bg-red-950/60 border-red-500/50 text-red-300'
                  : 'bg-[#0e121a] border-stone-700 text-amber-300'
              }`}
            >
              {lastDiceBanner.die}: <strong>{lastDiceBanner.total}</strong>
              {lastDiceBanner.crit === 'crit' ? ' · CRÍTICO' : ''}
              {lastDiceBanner.crit === 'fumble' ? ' · PIFIA' : ''}
            </div>
          )}

          <button
            type="button"
            onClick={onReplayLastNarration}
            disabled={isSpeakingDm}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#1a202e] hover:bg-[#232a3c] text-stone-200 border border-stone-700/80 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            {isSpeakingDm ? 'Narrando...' : 'Leer Escena'}
          </button>

          <button
            type="button"
            onClick={onToggleAutoNarrate}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              autoNarrate
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-[#0e121a] border-stone-800 text-stone-400'
            }`}
          >
            Voz DM: {autoNarrate ? 'Activa' : 'Manual'}
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceSettings((v) => !v)}
            title="Configurar voz y velocidad del narrador"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showVoiceSettings
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-[#0e121a] hover:bg-stone-800 border-stone-800 text-stone-300'
            }`}
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSoundMuted}
            title={soundMuted ? 'Activar música y efectos' : 'Silenciar música y efectos'}
            className="p-1.5 rounded-lg bg-[#0e121a] hover:bg-stone-800 border border-stone-800 text-stone-300 cursor-pointer"
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4 text-stone-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* DM Voice & Speed Settings Drawer */}
      {showVoiceSettings && (
        <div className="pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-stone-400">Voz del Narrador:</span>
            {DM_VOICES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onChangeDmVoice(v.id)}
                className={`px-2.5 py-1 rounded-md border cursor-pointer ${
                  dmVoice === v.id
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-semibold'
                    : 'bg-[#0e121a] border-stone-800 text-stone-300'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400">Velocidad:</span>
            {[
              { val: 0.88, label: 'Pausada' },
              { val: 1.0, label: 'Normal' },
              { val: 1.15, label: 'Ágil' },
            ].map((sp) => (
              <button
                key={sp.val}
                type="button"
                onClick={() => onChangeDmSpeed(sp.val)}
                className={`px-2.5 py-1 rounded-md border cursor-pointer ${
                  dmSpeed === sp.val
                    ? 'bg-sky-500/20 border-sky-400/60 text-sky-200 font-semibold'
                    : 'bg-[#0e121a] border-stone-800 text-stone-300'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
