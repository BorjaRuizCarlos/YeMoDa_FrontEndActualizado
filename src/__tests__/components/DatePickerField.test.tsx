import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePickerField } from '../../app/components/DatePickerField';

describe('DatePickerField', () => {
  it('allows jumping between months and years from the month picker', async () => {
    const user = userEvent.setup();

    render(<DatePickerField value="2026-09-15" onChange={() => undefined} />);

    await user.click(screen.getByRole('button', { name: /sep 15/i }));
    await user.click(screen.getByRole('button', { name: /september 2026/i }));

    expect(screen.getByRole('button', { name: /previous year/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next year/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next year/i }));
    expect(screen.getByRole('button', { name: /2027/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^january$/i }));

    expect(await screen.findByRole('button', { name: /january 2027/i })).toBeInTheDocument();
  });
});