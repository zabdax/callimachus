import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('vitest+RTL sanity', () => {
  it('renders a div via RTL', () => {
    render(<div data-testid="x">hi</div>);
    expect(screen.getByTestId('x')).toHaveTextContent('hi');
  });
});
