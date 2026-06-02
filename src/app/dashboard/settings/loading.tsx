export default function Loading() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-slate-200 rounded-lg" />
        <div className="h-4 w-56 bg-slate-100 rounded" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-40 bg-slate-200 rounded-2xl" />
      ))}
    </div>
  );
}
