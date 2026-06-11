// Pagination component
// Expects the API to return: { data: [...], total: N, page: N, limit: N, totalPages: N }
// Usage: <Pagination page={page} totalPages={total} onChange={setPage} />

export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) pages.push(i)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 16 }}>
      <button
        className="btn btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹ Anterior
      </button>

      {pages.map((p) => (
        <button
          key={p}
          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(p)}
          style={{ minWidth: 32, justifyContent: 'center' }}
        >
          {p}
        </button>
      ))}

      <button
        className="btn btn-ghost btn-sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Següent ›
      </button>

      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text3)' }}>
        Pàgina {page} de {totalPages}
      </span>
    </div>
  )
}
