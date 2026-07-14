export function AdminPagination({
  page,
  total,
  pageSize,
  itemLabel,
  onPageChange,
}: {
  page: number
  total: number
  pageSize: number
  itemLabel: string
  onPageChange: (page: number) => void
}) {
  if (total <= pageSize) return null
  return (
    <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white px-4 py-3">
      <p className="text-xs text-neutral-500">
        Página {page + 1} de {Math.ceil(total / pageSize)} ({total} {itemLabel})
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={(page + 1) * pageSize >= total}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
