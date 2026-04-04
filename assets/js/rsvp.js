export class RSVP {
    constructor(config = {}) {
        this.config = config;
        this.whatsapp = config.whatsapp ?? null;
        this.redirectDelayMs = this.whatsapp?.redirectDelayMs ?? 2000;
        this.redirectTimeoutId = null;
        this.isPending = false;
        this.section = document.getElementById('rsvpSection');
        this.flow = document.getElementById('rsvpFlow');
        this.form = document.getElementById('rsvpForm');
        this.successBox = document.getElementById('rsvpSuccess');
        this.successMsg = document.getElementById('successMsg');
        this.successSub = document.getElementById('successSub');
        this.successNote = document.getElementById('successNote');
        this.attendanceInput = document.getElementById('rsvp-attendance');
        this.buttons = Array.from(document.querySelectorAll('.rsvp-btn-choice'));
        this.submitButton = this.form?.querySelector('.rsvp-submit') ?? null;
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

        if (this.isPending) {
            return;
        }

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
        this.scheduleRedirect(whatsappUrl);
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
        const feedback = attending
            ? this.whatsapp.feedback?.attending
            : this.whatsapp.feedback?.notAttending;
        const interpolationValues = {
            firstName: firstName || 'querido convidado',
            delaySeconds: String(Math.max(1, Math.round(this.redirectDelayMs / 1000)))
        };

        this.isPending = true;
        if (this.submitButton) {
            this.submitButton.disabled = true;
        }

        this.flow?.classList.add('is-hidden');
        this.section?.classList.add('is-feedback-visible');
        this.successMsg.textContent = this.interpolate(
            feedback?.title ?? 'Sua mensagem está pronta.',
            interpolationValues
        );
        this.successSub.textContent = this.interpolate(
            feedback?.subtitle ?? 'Estamos preparando o redirecionamento para o WhatsApp.',
            interpolationValues
        );
        this.successNote.textContent = this.interpolate(
            feedback?.note ?? '',
            interpolationValues
        );

        this.successBox.classList.add('show');
    }

    renderError() {
        const feedback = this.whatsapp?.feedback?.error ?? {};

        this.successMsg.textContent = feedback.title ?? 'Não foi possível continuar.';
        this.successSub.textContent = feedback.subtitle ?? 'Confira os dados informados e tente novamente em instantes.';
        this.successNote.textContent = feedback.note ?? '';
        this.successBox.classList.add('show');
    }

    scheduleRedirect(whatsappUrl) {
        window.clearTimeout(this.redirectTimeoutId);
        this.redirectTimeoutId = window.setTimeout(() => {
            window.location.assign(whatsappUrl);
        }, this.redirectDelayMs);
    }
}
