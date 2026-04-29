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

function normalizePhoneDigits(value) {
    const digits = String(value ?? '').replace(/\D/g, '');

    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
        return digits.slice(2);
    }

    return digits;
}

function shouldPersistToDatabase(config, moduleName) {
    const rsvpConfig = config?.rsvp ?? {};

    if (rsvpConfig.disablePersistence === true) {
        return false;
    }

    if (rsvpConfig.supabaseEnabled === false) {
        console.warn(
            `[${moduleName}] config.rsvp.supabaseEnabled=false é legado e será ignorado. A persistência permanece habilitada; use config.rsvp.disablePersistence=true para desativar.`
        );
    }

    return true;
}

export class RSVP {
    constructor(config = {}, guestTokenData = null, refreshSlots = null) {
        this.config = config;
        this.guestTokenData = guestTokenData;
        this.refreshSlots = refreshSlots;
        this.whatsapp = config.whatsapp ?? null;
        this.isPending = false;
        this.section = document.getElementById('rsvpSection');
        this.flow = document.getElementById('rsvpFlow');
        this.form = document.getElementById('rsvpForm');
        this.successBox = document.getElementById('rsvpSuccess');
        this.successMsg = document.getElementById('successMsg');
        this.successSub = document.getElementById('successSub');
        this.successNote = document.getElementById('successNote');
        this.successHint = document.getElementById('successHint');
        this.successContactButton = document.getElementById('successContactButton');
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

        this.isPending = true;
        if (this.submitButton) {
            this.submitButton.disabled = true;
        }

        const eventId = this.config?.rsvp?.eventId || 'wedding-event';
        const marketingConsent = document.getElementById('rsvp-marketing-consent')?.checked ?? false;

        if (shouldPersistToDatabase(this.config, 'rsvp')) {
            const saved = await saveRsvpConfirmation({
                name: this.fields.name.value.trim(),
                phone: this.fields.phone.value.trim(),
                attendance: this.attendanceInput.value,
                eventId,
                tokenId: this.guestTokenData?.token_id || null,
                groupName: this.guestTokenData?.group_name || null,
                groupMaxConfirmations: this.guestTokenData?.max_confirmations || null,
                marketingConsent,
            }).catch(() => false);

            if (!saved) {
                console.warn('[rsvp] Persistência falhou. Mantendo formulário liberado para nova tentativa.');
                this.renderError({
                    title: 'Não foi possível registrar sua confirmação agora.',
                    subtitle: 'Seus dados parecem corretos, mas tivemos um problema ao salvar sua resposta. Tente novamente em instantes.',
                    note: ''
                });
                return;
            }
        } else {
            console.warn('[rsvp] Persistência desativada (config.rsvp.disablePersistence=true), seguindo fluxo.');
        }

        this.markSubmittedThisSession();
        this.renderSuccess();
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

        const digits = normalizePhoneDigits(value);
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

    getContactWhatsAppUrl() {
        const template = this.getMessageTemplate();

        if (!template || !this.whatsapp?.destinationPhone) {
            return '';
        }

        const text = buildWhatsAppMessage(template, {
            recipientName: this.whatsapp.recipientName ?? '',
            name: this.fields.name.value.trim(),
            phone: this.fields.phone.value.trim()
        });

        return buildWhatsAppUrl(this.whatsapp.destinationPhone, text);
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
            firstName: firstName || 'querido convidado'
        };
        const contactUrl = this.getContactWhatsAppUrl();

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
            feedback?.subtitle ?? 'Sua resposta foi registrada com sucesso.',
            interpolationValues
        );
        this.successNote.textContent = this.interpolate(
            feedback?.note ?? '',
            interpolationValues
        );
        if (this.successHint) {
            this.successHint.textContent = this.config.texts?.rsvpSuccessFaqHint ?? 'Se ainda tiver dúvidas, a área de FAQ acima pode te ajudar. Se preferir falar diretamente com a gente, use o botão abaixo.';
            this.successHint.hidden = false;
        }
        if (this.successContactButton) {
            if (contactUrl) {
                const label = this.config.texts?.rsvpSuccessContactButton ?? 'Falar com os noivos no WhatsApp';
                this.successContactButton.textContent = label;
                this.successContactButton.setAttribute('aria-label', label);
                this.successContactButton.setAttribute('href', contactUrl);
                this.successContactButton.hidden = false;
            } else {
                this.successContactButton.hidden = true;
                this.successContactButton.removeAttribute('href');
            }
        }

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
        if (this.successHint) {
            this.successHint.textContent = '';
            this.successHint.hidden = true;
        }
        if (this.successContactButton) {
            this.successContactButton.hidden = true;
            this.successContactButton.removeAttribute('href');
        }
        this.isPending = false;
        if (this.submitButton) {
            this.submitButton.disabled = false;
        }
        this.successBox.classList.add('show');
    }
}
