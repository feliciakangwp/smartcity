import { useLandscape } from '@/store/landscape';
import { useWorld } from '@/store/world';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { SystemForm, blankSystem } from '@/components/forms/SystemForm';

export function AddSystemDialog() {
  const zoneId = useWorld((s) => s.addSystemZone);
  const close = useWorld((s) => s.openAddSystem);
  const select = useWorld((s) => s.select);
  const addSystem = useLandscape((s) => s.addSystem);
  const zone = useLandscape((s) => s.zones.find((z) => z.id === zoneId));
  if (!zoneId) return null;
  return (
    <Modal title={`Add a system${zone ? ` to ${zone.name}` : ''}`} onClose={() => close(null)} wide>
      <SystemForm
        initial={blankSystem(zoneId)}
        submitLabel="Add system"
        onCancel={() => close(null)}
        onSubmit={(v) => {
          const id = addSystem(v);
          close(null);
          select({ kind: 'system', id }, true);
          toast(`Added ${v.acronym}. Its building is now in the port.`);
        }}
      />
    </Modal>
  );
}
