/**
 * Minimal, dependency-free vertical bar chart (CSS only). Good enough for admin
 * dashboards (event volume, etc.); swap for a charting lib if you need axes,
 * tooltips or legends. Uses the brand color via the semantic `bg-primary` token.
 */
export interface BarDatum {
  label: string
  value: number
}

export function BarChart({
  data,
  height = 160,
}: {
  data: BarDatum[]
  height?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div
      className='flex items-end gap-1'
      style={{ height }}
      role='img'
      aria-label='Bar chart'
    >
      {data.map((datum, index) => (
        <div
          key={`${datum.label}-${index}`}
          className='group relative flex flex-1 items-end'
          style={{ height: '100%' }}
          title={`${datum.label}: ${datum.value}`}
        >
          <div
            className='w-full rounded-t-sm bg-primary/80 transition-colors group-hover:bg-primary'
            style={{
              height: `${Math.round((datum.value / max) * 100)}%`,
              minHeight: datum.value > 0 ? 2 : 0,
            }}
          />
        </div>
      ))}
    </div>
  )
}
