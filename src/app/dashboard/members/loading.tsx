export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-slate-200 rounded-lg" />
          <div className="h-4 w-56 bg-slate-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-xl" />
      </div>
      <div className="h-12 bg-slate-100 rounded-xl" />
      <div className="card overflow-hidden">
        <div className="h-10 bg-slate-100 border-b border-slate-200" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 border-b border-slate-100 px-3 flex items-center gap-4">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
