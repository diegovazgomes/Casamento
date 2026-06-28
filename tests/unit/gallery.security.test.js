// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { initGallery } from '../../assets/js/gallery.js';

describe('gallery security rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="gallery"></div>';
  });

  it('escapes image alt text and ignores unsafe image URLs', () => {
    initGallery('gallery', [
      {
        src: '/assets/images/gallery/foto.jpg',
        alt: 'Foto <img src=x onerror=alert(1)>',
      },
      {
        src: 'javascript:alert(1)',
        alt: 'Imagem insegura',
      },
    ]);

    const images = document.querySelectorAll('#gallery img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('/assets/images/gallery/foto.jpg');
    expect(images[0].getAttribute('alt')).toBe('Foto <img src=x onerror=alert(1)>');
    expect(images[0].hasAttribute('onerror')).toBe(false);
    expect(document.getElementById('gallery').innerHTML).not.toContain('javascript:alert');
  });
});
