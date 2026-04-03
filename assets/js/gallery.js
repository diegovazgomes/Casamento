/**
 * gallery.js
 * Gerencia a galeria interativa de fotos
 */

class Gallery {
    constructor() {
        this.currentIndex = 0;
        this.slides = document.querySelectorAll('.gallery-slide');
        this.dots = document.querySelectorAll('.dot');
        this.totalSlides = this.slides.length;

        this.elements = {
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            currentSlide: document.getElementById('currentSlide'),
            totalSlides: document.getElementById('totalSlides')
        };

        this.setupEventListeners();
        this.updateCounter();
    }

    setupEventListeners() {
        // Botões de navegação
        this.elements.prevBtn.addEventListener('click', () => this.prev());
        this.elements.nextBtn.addEventListener('click', () => this.next());

        // Dots para navegação
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });
    }

    showSlide(index) {
        // Garante que o índice está dentro do intervalo válido
        if (index >= this.totalSlides) {
            this.currentIndex = 0;
        } else if (index < 0) {
            this.currentIndex = this.totalSlides - 1;
        } else {
            this.currentIndex = index;
        }

        // Remove a classe 'active' de todos os slides
        this.slides.forEach((slide) => slide.classList.remove('active'));
        this.dots.forEach((dot) => dot.classList.remove('active'));

        // Adiciona a classe 'active' ao slide e dot correto
        this.slides[this.currentIndex].classList.add('active');
        this.dots[this.currentIndex].classList.add('active');

        this.updateCounter();
    }

    next() {
        this.showSlide(this.currentIndex + 1);
    }

    prev() {
        this.showSlide(this.currentIndex - 1);
    }

    goToSlide(index) {
        this.showSlide(index);
    }

    updateCounter() {
        this.elements.currentSlide.textContent = this.currentIndex + 1;
        this.elements.totalSlides.textContent = this.totalSlides;
    }

    autoPlay(interval = 5000) {
        setInterval(() => {
            this.next();
        }, interval);
    }
}

// Inicializa a galeria quando o documento carrega
document.addEventListener('DOMContentLoaded', () => {
    const gallery = new Gallery();

    // Descomenta a linha abaixo para ativar o auto-play
    // gallery.autoPlay(5000); // Troca de imagem a cada 5 segundos
});
