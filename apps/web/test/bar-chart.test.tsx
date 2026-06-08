import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BarChart } from '@/components/admin/bar-chart'

describe('BarChart', () => {
  it('renders one labelled bar per datum', () => {
    render(
      <BarChart
        data={[
          { label: '9h', value: 5 },
          { label: '10h', value: 10 },
        ]}
      />
    )
    expect(screen.getByRole('img', { name: 'Bar chart' })).toBeInTheDocument()
    expect(screen.getByTitle('9h: 5')).toBeInTheDocument()
    expect(screen.getByTitle('10h: 10')).toBeInTheDocument()
  })

  it('renders without crashing on empty data', () => {
    render(<BarChart data={[]} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
