import { create } from 'zustand';

const useToast = create<{ msg: string | null; id: number }>(() => ({ msg: null, id: 0 }));
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string) {
  useToast.setState((s) => ({ msg, id: s.id + 1 }));
  clearTimeout(timer);
  timer = setTimeout(() => useToast.setState({ msg: null }), 2800);
}

export function Toaster() {
  const msg = useToast((s) => s.msg);
  if (!msg) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-panel">
      {msg}
    </div>
  );
}
