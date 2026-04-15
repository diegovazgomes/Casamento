import { saveRsvpConfirmation } from './rsvp-persistence.js';

export function interpolateTemplate(template, values) {
    return String(template ?? '').replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

export function buildWhatsAppMessage(template, values) {
    if (!template) {
        return '';
    }

    return interpolateTemplate(template, values);
}

export function buildWhatsAppUrl(destinationPhone, text) {
    if (!destinationPhone || !text) {
        return '';
    }

    const params = new URLSearchParams({ text });
    return `https://wa.me/${destinationPhone}?${params.toString()}`;
}

export class RSVP {
    constructor(config = {}, guestTokenData = null, refreshSlots = null) {
        this.config = config;
        this.guestTokenData = guestTokenData;
        this.refreshSlots = refreshSlots;
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
        this.nameError = document.getElementById('rsvp-name-error');
        this.phoneError = document.getElementById('rsvp-phone-error');
        this.buttons = Array.from(document.querySelectorAll('.rsvp-btn-choice'));
        this.submitButton = this.form?.querySelector('.rsvp-submit') ?? null;
        this.fields = {
            name: document.getElementById('rsvp-name'),
            phone: document.getElementById('rsvp-phone')
        };
        this.validationMessages = {
            form: 'Revise os campos destacados para continuar.',
            nameRequired: 'Informe seu nome completo.',
            phoneRequired: 'Informe seu WhatsApp.',
            phoneInvalid: 'Informe um WhatsApp válido com DDD (10 ou 11 dígitos).'
        };
    }

    init() {
        if (!this.form || !this.successBox || !this.attendanceInput || !this.whatsapp) {
            return;
        }

        if (this.guestTokenData) {
            this.showSlotCounter();
            if (this.isSlotsFull() || this.wasAlreadySubmittedThisSession()) {
                this.blockForm();
                return;
            }
        }

        this.bindAttendanceButtons();
        this.bindFieldValidation();
        this.form.addEventListener('submit', (event) => this.handleSubmit(event));
    }

    showSlotCounter() {
        const { confirmation_count, max_confirmations } = this.guestTokenData;
        const counter = document.getElementById('rsvpSlotCounter');
        if (counter) {
            counter.textContent = `${confirmation_count} de ${max_confirmations} vagas confirmadas neste convite`;
            counter.removeAttribute('hidden');
        }
    }

    isSlotsFull() {
        return this.guestTokenData.confirmation_count >= this.guestTokenData.max_confirmations;
    }

    wasAlreadySubmittedThisSession() {
        if (!this.guestTokenData?.token_id) return false;
        try {
            return sessionStorage.getItem(`rsvp-done-${this.guestTokenData.token_id}`) === 'true';
        } catch {
            return false;
        }
    }

    markSubmittedThisSession() {
        if (!this.guestTokenData?.token_id) return;
        try {
            sessionStorage.setItem(`rsvp-done-${this.guestTokenData.token_id}`, 'true');
            // Incrementa localmente para que o bfcache restaure com o valor correto
            this.guestTokenData.confirmation_count = (this.guestTokenData.confirmation_count || 0) + 1;
        } catch {}
    }

    blockForm() {
        if (this.form) {
            this.form.setAttribute('hidden', '');
        }
        const blocked = document.getElementById('rsvpBlocked');
        if (blocked) {
            blocked.removeAttribute('hidden');
        }
    }

    bindFieldValidation() {
        this.fields.name?.addEventListener('input', () => {
            if (this.fields.name.getAttribute('aria-invalid') === 'true') {
                this.validateName();
            }
        });

        this.fields.phone?.addEventListener('input', () => {
            if (this.fields.phone.getAttribute('aria-invalid') === 'true') {
                this.validatePhone();
            }
        });

        this.fields.name?.addEventListener('blur', () => this.validateName());
        this.fields.phone?.addEventListener('blur', () => this.validatePhone());
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

    async handleSubmit(event) {
        event.preventDefault();

        if (this.isPending) {
            return;
        }

        // Revalida vagas no servidor antes de qualquer ação
        if (this.guestTokenData && this.refreshSlots) {
            const fresh = await this.refreshSlots();
            if (fresh) {
                this.guestTokenData = fresh;
                this.showSlotCounter();
                if (this.isSlotsFull()) {
                    this.blockForm();
                    return;
                }
            }
        }

        const validation = this.validateForm();
        if (!validation.isValid) {
            validation.firstInvalidField?.focus();
            this.renderError({
                title: 'Faltam alguns dados.',
                subtitle: this.validationMessages.form,
                note: ''
            });
            return;
        }

        const whatsappUrl = this.buildWhatsAppUrl();

        if (!whatsappUrl) {
            this.renderError();
            return;
        }

        // Salvar no Supabase sem bloquear o fluxo do WhatsApp
        const eventId = window.CONFIG?.rsvp?.eventId || 'wedding-event';
        const marketingConsent = document.getElementById('rsvp-marketing-consent')?.checked ?? false;
        if (window.CONFIG?.rsvp?.supabaseEnabled !== false) {
            saveRsvpConfirmation({
                name:            this.fields.name.value.trim(),
                phone:           this.fields.phone.value.trim(),
                attendance:      this.attendanceInput.value,
                eventId:         eventId,
                tokenId:         this.guestTokenData?.token_id || null,
                marketingConsent,
            }).catch(() => {
                // Silencioso — não afeta a experiência do convidado
            });
        }

        this.markSubmittedThisSession();
        this.renderSuccess();
        this.scheduleRedirect(whatsappUrl);
    }

    validateForm() {
        const isNameValid = this.validateName();
        const isPhoneValid = this.validatePhone();

        return {
            isValid: isNameValid && isPhoneValid,
            firstInvalidField: !isNameValid
                ? this.fields.name
                : (!isPhoneValid ? this.fields.phone : null)
        };
    }

    validateName() {
        const field = this.fields.name;
        if (!field) return false;

        const value = field.value.trim();
        field.value = value;

        if (!value) {
            this.setFieldError('name', this.validationMessages.nameRequired);
            return false;
        }

        this.clearFieldError('name');
        return true;
    }

    validatePhone() {
        const field = this.fields.phone;
        if (!field) return false;

        const value = field.value.trim();
        field.value = value;

        if (!value) {
            this.setFieldError('phone', this.validationMessages.phoneRequired);
            return false;
        }

        const digits = value.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 11) {
            this.setFieldError('phone', this.validationMessages.phoneInvalid);
            return false;
        }

        this.clearFieldError('phone');
        return true;
    }

    setFieldError(fieldKey, message) {
        const field = this.fields[fieldKey];
        const feedback = fieldKey === 'name' ? this.nameError : this.phoneError;
        if (!field || !feedback) return;

        feedback.textContent = message;
        feedback.hidden = false;
        field.classList.add('is-invalid');
        field.setAttribute('aria-invalid', 'true');
    }

    clearFieldError(fieldKey) {
        const field = this.fields[fieldKey];
        const feedback = fieldKey === 'name' ? this.nameError : this.phoneError;
        if (!field || !feedback) return;

        feedback.textContent = '';
        feedback.hidden = true;
        field.classList.remove('is-invalid');
        field.setAttribute('aria-invalid', 'false');
    }

    buildWhatsAppUrl() {
        const template = this.getMessageTemplate();

        if (!template || !this.whatsapp.destinationPhone) {
            return '';
        }

        const text = buildWhatsAppMessage(template, {
            recipientName: this.whatsapp.recipientName ?? '',
            name: this.fields.name.value.trim(),
            phone: this.fields.phone.value.trim()
        });

        return buildWhatsAppUrl(this.whatsapp.destinationPhone, text);
    }

    getMessageTemplate() {
        const attending = this.attendanceInput.value === 'yes';

        return attending
            ? this.whatsapp.messages?.attending
            : this.whatsapp.messages?.notAttending;
    }

    interpolate(template, values) {
        return interpolateTemplate(template, values);
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
        this.successBox.classList.remove('is-error');
        this.successBox.setAttribute('role', 'status');
        this.successBox.setAttribute('aria-live', 'polite');
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

    renderError(customFeedback = null) {
        const feedback = this.whatsapp?.feedback?.error ?? {};
        const effectiveFeedback = customFeedback ?? feedback;

        this.successBox.classList.add('is-error');
        this.successBox.setAttribute('role', 'alert');
        this.successBox.setAttribute('aria-live', 'assertive');
        this.successMsg.textContent = effectiveFeedback.title ?? 'Não foi possível continuar.';
        this.successSub.textContent = effectiveFeedback.subtitle ?? 'Confira os dados informados e tente novamente em instantes.';
        this.successNote.textContent = effectiveFeedback.note ?? '';
        this.successBox.classList.add('show');
    }

    scheduleRedirect(whatsappUrl) {
        window.clearTimeout(this.redirectTimeoutId);
        this.redirectTimeoutId = window.setTimeout(() => {
            window.location.assign(whatsappUrl);
        }, this.redirectDelayMs);
    }
}
