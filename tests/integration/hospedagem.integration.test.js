import { beforeEach, describe, expect, it, vi } from 'vitest';

function createHospedagemDom() {
  document.head.innerHTML = '<meta name="description" content="">';
  document.body.innerHTML = `
    <span id="hospedagemTag"></span>
    <h1 id="hospedagemTitle"></h1>
    <p id="hospedagemIntro"></p>
    <h2 id="hospedagemHotelsTitle"></h2>
    <div id="hospedagemHotels"></div>
    <h2 id="hospedagemRestaurantsTitle"></h2>
    <div id="hospedagemRestaurants"></div>
  `;
}

const baseConfig = {
  pages: {
    hospedagem: {
      content: {
        tag: 'Hospedagem',
        title: 'Onde ficar',
        intro: 'Intro',
        hotelsTitle: 'Hotéis',
        hotels: [
          {
            name: 'Hotel Central',
            description: 'Perto da festa.',
            link: 'hotel.example.com',
            linkLabel: 'Ver hotel',
          },
          {
            name: '',
            description: '',
            link: '',
            linkLabel: 'Nao renderizar',
          },
        ],
        restaurantsTitle: 'Restaurantes',
        restaurants: [
          {
            name: 'Restaurante A',
            description: 'Almoço.',
            link: 'https://restaurante.example.com',
            linkLabel: 'Reservar mesa',
          },
        ],
      },
    },
  },
};

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  delete window.CONFIG;
});

describe('hospedagem page', () => {
  it('filtra itens vazios e respeita o linkLabel configurado', async () => {
    createHospedagemDom();

    await import('../../assets/js/hospedagem.js');
    window.dispatchEvent(new CustomEvent('app:ready', { detail: { config: baseConfig } }));

    const hotelCards = document.querySelectorAll('#hospedagemHotels .hospedagem-card');
    const restaurantLink = document.querySelector('#hospedagemRestaurants .hospedagem-card-link');
    const hotelLink = document.querySelector('#hospedagemHotels .hospedagem-card-link');

    expect(hotelCards).toHaveLength(1);
    expect(hotelLink.textContent).toBe('Ver hotel');
    expect(hotelLink.getAttribute('href')).toBe('https://hotel.example.com');
    expect(restaurantLink.textContent).toBe('Reservar mesa');
  });
});
