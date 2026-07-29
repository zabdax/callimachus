import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { Providers } from '@/app/Providers';

function Probe() {
  const { isLoading } = useQuery({ queryKey: ['x'], queryFn: () => 'ok' });
  return <div>{isLoading ? 'loading' : 'ready'}</div>;
}

describe('Providers', () => {
  it('mounts a QueryClient so children can use queries', () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    expect(screen.getByText(/loading|ready/)).toBeInTheDocument();
  });
});
