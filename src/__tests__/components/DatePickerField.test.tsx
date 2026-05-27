import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePickerField } from '../../app/components/DatePickerField';

describe('DatePickerField', () => {
  it('allows jumping between months and years from the month picker', async () => {
    const user = userEvent.setup();

    render(<DatePickerField value="2026-09-15" onChange={() => undefined} />);

    await user.click(screen.getByRole('button', { name: /15 de/i }));
    await user.click(screen.getByRole('button', { name: /septiembre 2026/i }));

    expect(screen.getByRole('button', { name: /año anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /año siguiente/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /año siguiente/i }));
    expect(screen.getByRole('button', { name: /2027/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^enero$/i }));

    expect(await screen.findByRole('button', { name: /enero 2027/i })).toBeInTheDocument();
  });
});