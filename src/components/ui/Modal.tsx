import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/45 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`panel flex max-h-[90vh] w-full flex-col ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <h2 className="text-base font-bold text-navy-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-500 hover:bg-ink-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
