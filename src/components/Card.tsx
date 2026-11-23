export default function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(120,60,70,0.06)]">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-700">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
