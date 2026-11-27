import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Произошла непредвиденная ошибка',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[100dvh] w-screen items-center justify-center bg-[#161817] p-6 text-[#f0efec]">
          <div className="w-full max-w-md border border-white/12 bg-[#1c1f1e] p-5 shadow-2xl">
            <h1 className="text-sm font-semibold text-[#f0efec]">
              Не удалось отобразить сцену
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#a8a69e]">
              Возникла ошибка при работе приложения. Попробуйте обновить страницу.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 border border-[#7a9181]/60 bg-[#253129] px-3 py-1.5 text-xs font-medium text-[#e6f0e9] transition-colors hover:bg-[#314236]"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
