import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  interpolateTemplate
} from '../../assets/js/rsvp.js';

describe('RSVP message helpers', () => {
  it('interpolates placeholders', () => {
    const out = interpolateTemplate('Oi {name}', { name: 'Ana' });
    expect(out).toBe('Oi Ana');
  });

  it('buildWhatsAppMessage returns empty when no template', () => {
    expect(buildWhatsAppMessage('', { name: 'Ana' })).toBe('');
  });

  it('buildWhatsAppUrl encodes text', () => {
    const url = buildWhatsAppUrl('5511999999999', 'Olá, tudo bem?');
    expect(url).toContain('https://wa.me/5511999999999?text=');

    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe('Olá, tudo bem?');
  });

  it('buildWhatsAppUrl returns empty without destination or text', () => {
    expect(buildWhatsAppUrl('', 'x')).toBe('');
    expect(buildWhatsAppUrl('5511', '')).toBe('');
  });
});