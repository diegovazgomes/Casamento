export class Countdown {
    constructor(targetDate, config = {}) {
        this.targetDate = new Date(targetDate).getTime();
        this.config = config;
        this.intervalId = null;
        this.container = document.getElementById('countdownWrap');
        this.elements = {
            days: document.getElementById('cd-days'),
            hours: document.getElementById('cd-hours'),
            minutes: document.getElementById('cd-mins'),
            seconds: document.getElementById('cd-secs')
        };
    }

    hasRequiredElements() {
        return this.container && Object.values(this.elements).every(Boolean);
    }

    formatNumber(value) {
        if (this.config.countdown?.format !== 'two-digits') {
            return String(value);
        }

        return String(value).padStart(2, '0');
    }

    update() {
        const now = Date.now();
        const distance = this.targetDate - now;

        if (distance <= 0) {
            this.stop();
            this.displayFinished();
            return;
        }

        const days = Math.floor(distance / 86400000);
        const hours = Math.floor((distance % 86400000) / 3600000);
        const minutes = Math.floor((distance % 3600000) / 60000);
        const seconds = Math.floor((distance % 60000) / 1000);

        this.elements.days.textContent = this.formatNumber(days);
        this.elements.hours.textContent = this.formatNumber(hours);
        this.elements.minutes.textContent = this.formatNumber(minutes);
        this.elements.seconds.textContent = this.formatNumber(seconds);
    }

    displayFinished() {
        this.elements.days.textContent = '00';
        this.elements.hours.textContent = '00';
        this.elements.minutes.textContent = '00';
        this.elements.seconds.textContent = '00';

        const message = document.createElement('p');
        message.className = 'countdown-finished';
        message.textContent = this.config.texts?.countdownFinished || 'O grande dia chegou.';
        this.container.appendChild(message);
    }

    start() {
        if (!this.hasRequiredElements()) {
            return;
        }

        this.update();
        this.intervalId = window.setInterval(
            () => this.update(),
            Number(this.config.countdown?.updateInterval ?? 1000)
        );
    }

    stop() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
