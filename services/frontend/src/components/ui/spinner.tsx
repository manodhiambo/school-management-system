export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent h-4 w-4 ${className}`} />
  );
}
