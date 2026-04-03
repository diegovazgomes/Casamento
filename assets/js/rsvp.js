export class RSVP {
    constructor(config = {}) {
        this.config = config;
        this.form = document.getElementById('rsvpForm');
        this.successBox = document.getElementById('rsvpSuccess');
        this.successMsg = document.getElementById('successMsg');
        this.successSub = document.getElementById('successSub');
        this.attendanceInput = document.getElementById('rsvp-attendance');
        this.buttons = Array.from(document.querySelectorAll('.rsvp-btn-choice'));
        this.fields = {
            name: document.getElementById('rsvp-name'),
            phone: document.getElementById('rsvp-phone'),
            guests: document.getElementById('rsvp-guests')
        };
    }

    init() {
        if (!this.form || !this.successBox || !this.attendanceInput) {
            return;
        }

        this.bindAttendanceButtons();
        this.form.addEventListener('submit', (event) => this.handleSubmit(event));
    }

    bindAttendanceButtons() {
        this.buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const attending = button.dataset.attend === 'yes';
                this.setAttendance(attending);
            });
        });
    }

    setAttendance(attending) {
        this.attendanceInput.value = attending ? 'yes' : 'no';

        this.buttons.forEach((button) => {
            const isActive = button.dataset.attend === (attending ? 'yes' : 'no');
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    handleSubmit(event) {
        event.preventDefault();

        if (!this.fields.name.value.trim()) {
            this.fields.name.focus();
            return;
        }

        this.persistConfirmation();
        this.renderSuccess();
    }

    persistConfirmation() {
        const confirmations = JSON.parse(localStorage.getItem('weddingConfirmations') || '[]');
        confirmations.push({
            name: this.fields.name.value.trim(),
            phone: this.fields.phone.value.trim(),
            guests: this.fields.guests.value || '0',
            attendance: this.attendanceInput.value,
            timestamp: new Date().toISOString()
        });

        localStorage.setItem('weddingConfirmations', JSON.stringify(confirmations));
    }

    renderSuccess() {
        const firstName = this.fields.name.value.trim().split(/\s+/)[0];
        const attending = this.attendanceInput.value === 'yes';

        this.form.classList.add('is-hidden');

        if (attending) {
            this.successMsg.textContent = firstName ? `Até lá, ${firstName}.` : 'Até lá.';
            this.successSub.textContent = 'Sua presença foi registrada. Mal podemos esperar para celebrar com você.';
        } else {
            this.successMsg.textContent = 'Que pena.';
            this.successSub.textContent = 'Obrigado por nos avisar. Vamos sentir sua falta neste dia tão especial.';
        }

        this.successBox.classList.add('show');
    }
}
