/** 画面下から出るシート */
export default function Sheet({ title, onClose, right, children }: { title: string; onClose: () => void; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-5"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold">{title}</h3>
          {right ?? (
            <button onClick={onClose} className="h-10 shrink-0 rounded-full bg-stone-100 px-4 text-stone-600">
              閉じる
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
