import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Ha ocurrido un error inesperado en la mesa.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1017] text-stone-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#151924] border border-stone-800 rounded-xl p-8 space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h2 className="text-xl font-semibold">Interrupción en la Crónica</h2>
            </div>
            <p className="text-sm text-stone-300 leading-relaxed break-words">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Recargar Mesa
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
