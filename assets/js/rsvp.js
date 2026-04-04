export class RSVP {
    constructor(config = {}) {
        this.config = config;
        this.whatsapp = config.whatsapp ?? null;
        this.form = document.getElementById('rsvpForm');
        this.successBox = document.getElementById('rsvpSuccess');
        this.successMsg = document.getElementById('successMsg');
        this.successSub = document.getElementById('successSub');
        this.attendanceInput = document.getElementById('rsvp-attendance');
        this.buttons = Array.from(document.querySelectorAll('.rsvp-btn-choice'));
        this.fields = {
            name: document.getElementById('rsvp-name'),
            phone: document.getElementById('rsvp-phone')
        };
    }

    init() {
        if (!this.form || !this.successBox || !this.attendanceInput || !this.whatsapp) {
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

        if (!this.validateRequiredField(this.fields.name)) {
            this.fields.name.focus();
            return;
        }

        if (!this.validateRequiredField(this.fields.phone)) {
            this.fields.phone.focus();
            return;
        }

        const whatsappUrl = this.buildWhatsAppUrl();

        if (!whatsappUrl) {
            this.renderError();
            return;
        }

        this.renderSuccess();
        window.location.assign(whatsappUrl);
    }

    validateRequiredField(field) {
        if (!field) {
            return false;
        }

        const value = field.value.trim();
        field.value = value;

        return Boolean(value);
    }

    buildWhatsAppUrl() {
        const template = this.getMessageTemplate();

        if (!template || !this.whatsapp.destinationPhone) {
            return '';
        }

        const text = this.interpolate(template, {
            recipientName: this.whatsapp.recipientName ?? '',
            name: this.fields.name.value.trim(),
            phone: this.fields.phone.value.trim()
        });
        const params = new URLSearchParams({ text });

        return `https://wa.me/${this.whatsapp.destinationPhone}?${params.toString()}`;
    }

    getMessageTemplate() {
        const attending = this.attendanceInput.value === 'yes';

        return attending
            ? this.whatsapp.messages?.attending
            : this.whatsapp.messages?.notAttending;
    }

    interpolate(template, values) {
        return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
    }

    renderSuccess() {
        const firstName = this.fields.name.value.trim().split(/\s+/)[0];
        const attending = this.attendanceInput.value === 'yes';

        this.form.classList.add('is-hidden');

        if (attending) {
            this.successMsg.textContent = firstName ? `Perfeito, ${firstName}.` : 'Perfeito.';
            this.successSub.textContent = 'Estamos abrindo o WhatsApp com a sua confirmação pronta para envio.';
        } else {
            this.successMsg.textContent = 'Mensagem pronta.';
            this.successSub.textContent = 'Estamos abrindo o WhatsApp para você avisar com carinho que não poderá estar presente.';
        }

        this.successBox.classList.add('show');
    }

    renderError() {
        this.successMsg.textContent = 'Não foi possível continuar.';
        this.successSub.textContent = 'Confira os dados informados e tente novamente em instantes.';
        this.successBox.classList.add('show');
    }
}
