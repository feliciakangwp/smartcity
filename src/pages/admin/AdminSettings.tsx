// Platform settings, graphics quality, export / import and demo reset.
import { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { exportLandscape, useLandscape, validateImport } from '@/store/landscape';
import type { Quality } from '@/types/domain';
import { Button } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { PageHead } from './AdminLayout';

export default function AdminSettings() {
  const platform = useLandscape((s) => s.platform);
  const setPlatform = useLandscape((s) => s.setPlatform);
  const importData = useLandscape((s) => s.importData);
  const resetDemo = useLandscape((s) => s.resetDemo);
  const file = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const download = () => {
    const blob = new Blob([JSON.stringify(exportLandscape(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `port-nexus-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (f: File) => {
    setImportError('');
    try {
      const res = validateImport(JSON.parse(await f.text()));
      if (!res.ok) return setImportError(res.error);
      importData(res.data);
      toast('Imported. The Port World now shows the imported landscape.');
    } catch {
      setImportError('The file is not valid JSON. Choose a file exported from Port Nexus.');
    }
  };

  return (
    <>
      <PageHead eyebrow="Settings" title="Platform settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-[10px] border border-ink-200 bg-surface p-5">
          <h2 className="font-bold text-heading">Branding</h2>
          <label className="flex flex-col gap-1">
            <span className="label">Platform name</span>
            <input id="set-name" className="input" value={platform.name} onChange={(e) => setPlatform({ name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Tagline</span>
            <input id="set-tagline" className="input" value={platform.tagline} onChange={(e) => setPlatform({ tagline: e.target.value })} />
          </label>
        </section>
        <section className="flex flex-col gap-3 rounded-[10px] border border-ink-200 bg-surface p-5">
          <h2 className="font-bold text-heading">Graphics quality</h2>
          <label className="flex flex-col gap-1">
            <span className="label">Quality</span>
            <select id="set-quality" className="input" value={platform.quality} onChange={(e) => setPlatform({ quality: e.target.value as Quality })}>
              <option value="auto">Automatic (adapts to the device)</option>
              <option value="high">High: soft shadows, full resolution</option>
              <option value="medium">Medium</option>
              <option value="low">Low: no shadows, for older laptops and phones</option>
            </select>
          </label>
          <p className="text-xs text-ink-500">Automatic starts high on desktops and low on phones, then steps down if the frame rate drops.</p>
        </section>
        <section className="flex flex-col gap-3 rounded-[10px] border border-ink-200 bg-surface p-5">
          <h2 className="font-bold text-heading">Export and import</h2>
          <p className="text-sm text-ink-700">Export saves every zone, system, integration, journey and vessel as JSON. Import replaces the landscape in this browser.</p>
          <div className="flex flex-wrap gap-2">
            <Button icon={Download} onClick={download}>Export JSON</Button>
            <Button icon={Upload} onClick={() => file.current?.click()}>Import JSON</Button>
            <input ref={file} id="set-import" type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          {importError && <p className="text-sm font-medium text-red-700">{importError}</p>}
        </section>
        <section className="flex flex-col gap-3 rounded-[10px] border border-ink-200 bg-surface p-5">
          <h2 className="font-bold text-heading">Demo data</h2>
          <p className="text-sm text-ink-700">Restore the six seed zones, placeholder systems and demonstration journeys. Your changes in this browser are discarded.</p>
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Discard all changes?
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Keep my changes</Button>
              <Button size="sm" variant="danger" onClick={() => { resetDemo(); setConfirmReset(false); toast('Demo data restored'); }}>Reset demo data</Button>
            </div>
          ) : (
            <div><Button variant="danger" icon={RotateCcw} onClick={() => setConfirmReset(true)}>Reset demo data</Button></div>
          )}
        </section>
      </div>
    </>
  );
}
