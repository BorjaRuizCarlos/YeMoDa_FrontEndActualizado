import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChatMarkdown } from '../../app/components/ChatMarkdown';

const sample = [
  '# Análisis: ¿Por qué existen varios inputs?',
  '',
  'En el código hay **2 inputs diferentes** (email y password).',
  '',
  '## 1. **Input de Email** (líneas 15-21)',
  '',
  '```html',
  '<input type="email" id="email" name="email" required>',
  '```',
  '',
  '- Captura el **correo electrónico** del usuario',
  '- `type="email"` valida el formato',
  '',
  '---',
  '',
  '## ¿Es esto correcto?',
  '',
  '**Sí, es lo esperado** en un formulario de login.',
].join('\n');

describe('ChatMarkdown', () => {
  it('renders markdown structure instead of raw symbols', () => {
    const { container } = render(<ChatMarkdown content={sample} />);

    // Heading text is present (without the # markers)
    expect(container.textContent).toContain('Análisis: ¿Por qué existen varios inputs?');

    // Bold → <strong>
    const strongs = container.querySelectorAll('strong');
    expect(strongs.length).toBeGreaterThanOrEqual(3);
    expect([...strongs].some((s) => s.textContent === '2 inputs diferentes')).toBe(true);

    // Fenced code → <pre><code> with the code content
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain('type="email"');

    // Horizontal rule
    expect(container.querySelector('hr')).not.toBeNull();

    // List items
    expect(container.querySelectorAll('li').length).toBe(2);

    // Inline code → <code>
    expect(container.querySelector('code')).not.toBeNull();

    // Raw markdown markers should NOT leak into the visible text
    const text = container.textContent ?? '';
    expect(text).not.toContain('**');
    expect(text).not.toContain('## ');
    expect(text).not.toContain('```');
  });
});
