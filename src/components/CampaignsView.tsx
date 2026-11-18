import React from 'react';
import type { User } from 'firebase/auth';
import { Cloud, HardDrive, Play, Plus, Trash2, UploadCloud } from 'lucide-react';
import { MAP_BACKGROUNDS } from '../data/dndCatalog';
import type { Campaign } from '../types/dnd';
import type { LocalCampaignBundle } from '../lib/campaignStore';

interface CampaignsViewProps {
  user: User | null;
  cloudCampaigns: Campaign[];
  localBundles: LocalCampaignBundle[];
  onResumeCloudCampaign: (campaign: Campaign) => void;
  onResumeLocalCampaign: (bundle: LocalCampaignBundle) => void;
  onDeleteCloudCampaign: (campaignId: string) => void;
  onDeleteLocalCampaign: (campaignId: string) => void;
  onMigrateLocalToCloud: (bundle: LocalCampaignBundle) => Promise<void>;
  onOpenNewCampaign: () => void;
  onSignIn: () => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  user,
  cloudCampaigns,
  localBundles,
  onResumeCloudCampaign,
  onResumeLocalCampaign,
  onDeleteCloudCampaign,
  onDeleteLocalCampaign,
  onMigrateLocalToCloud,
  onOpenNewCampaign,
  onSignIn,
}) => {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-800 pb-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl font-bold text-stone-100">
            Archivo de Campañas
          </h1>
          <p className="text-sm text-stone-400">
            Retoma cualquier partida guardada con el estado exacto del tablero, personajes, inventario y crónicas.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewCampaign}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Campaña
        </button>
      </div>

      {/* Cloud Firestore Campaigns */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-stone-100 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-amber-400" />
            Base de Datos en la Nube
          </h2>
          {!user && (
            <button
              type="button"
              onClick={onSignIn}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              Conectar cuenta Google para sincronizar partidas
            </button>
          )}
        </div>

        {!user ? (
          <div className="bg-[#141822] border border-stone-800 rounded-xl p-6 text-sm text-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p>
              Inicia sesión con Google para guardar y sincronizar tus campañas en la base de datos Firestore entre sesiones y dispositivos.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Conectar Google
            </button>
          </div>
        ) : cloudCampaigns.length === 0 ? (
          <div className="bg-[#141822] border border-stone-800 rounded-xl p-8 text-center text-sm text-stone-400">
            Aún no tienes campañas guardadas en la nube. Crea una nueva partida o sube una local.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cloudCampaigns.map((camp) => (
              <article
                key={camp.id}
                className="bg-[#141822] border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-amber-400 font-medium">
                      {MAP_BACKGROUNDS[camp.mapTheme]?.label ?? camp.setting} · Turno{' '}
                      <span className="font-mono-tabular">{camp.turnNumber}</span>
                    </span>
                    <span className="text-xs text-stone-500 font-mono-tabular">
                      {camp.heroCount} héroes
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-stone-100">
                    {camp.title}
                  </h3>
                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {camp.currentSceneTitle}: {camp.currentNarration}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-800/80">
                  <button
                    type="button"
                    onClick={() => onResumeCloudCampaign(camp)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Reanudar en Tablero
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCloudCampaign(camp.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Local Table Campaigns */}
      {localBundles.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-stone-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-sky-400" />
            Partidas Guardadas en Este Equipo
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {localBundles.map((bundle) => (
              <article
                key={bundle.campaign.id}
                className="bg-[#141822] border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-sky-400 font-medium">
                      Local · Turno{' '}
                      <span className="font-mono-tabular">{bundle.campaign.turnNumber}</span>
                    </span>
                    <span className="text-stone-500 font-mono-tabular">
                      {bundle.heroes.length} héroes
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-stone-100">
                    {bundle.campaign.title}
                  </h3>
                  <p className="text-xs text-stone-400 line-clamp-2">
                    {bundle.campaign.currentSceneTitle}: {bundle.campaign.currentNarration}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResumeLocalCampaign(bundle)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1e2433] hover:bg-[#272f42] text-stone-100 font-semibold text-xs rounded-lg border border-stone-700 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                      Reanudar
                    </button>
                    {user && (
                      <button
                        type="button"
                        onClick={() => void onMigrateLocalToCloud(bundle)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-semibold text-xs rounded-lg border border-sky-500/30 cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Subir a Nube
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteLocalCampaign(bundle.campaign.id)}
                    className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
