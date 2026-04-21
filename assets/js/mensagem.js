import { initExtraPage } from './extra-page.js';
import { setInputPlaceholder, setText } from './utils.js';
import { saveGuestMessage } from './rsvp-persistence.js';
import { buildWhatsAppMessage, buildWhatsAppUrl } from './rsvp.js';

function setFieldValidity(field, isInvalid) {
    if (!field) return;
    field.classList.toggle('is-invalid', isInvalid);
    field.setAttribute('aria-invalid', String(isInvalid));
}

function bindMessageForm(content, config) {
    setText('mensagemFormTitle', content?.formTitle);
    setText('mensagemFormSubtitle', content?.formSubtitle);
    setText('mensagemNameLabel', content?.nameLabel);
    setText('mensagemBodyLabel', content?.messageLabel);
    setText('mensagemSubmitButton', content?.submitLabel);

    setInputPlaceholder('mensagemNameInput', content?.namePlaceholder);
    setInputPlaceholder('mensagemBodyInput', content?.messagePlaceholder);

    const form = document.getElementById('mensagemForm');
    const feedback = document.getElementById('mensagemFeedback');
    const nameField = document.getElementById('mensagemNameInput');
    const bodyField = document.getElementById('mensagemBodyInput');
    const submitButton = document.getElementById('mensagemSubmitButton');

    if (!form || !feedback || !bodyField) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (submitButton?.disabled) {
            return;
        }

        const guestName = String(nameField?.value ?? '').trim();
        const messageBody = String(bodyField.value ?? '').trim();

        setFieldValidity(bodyField, false);
        feedback.classList.remove('is-error');
        feedback.textContent = '';

        if (!messageBody) {
            setFieldValidity(bodyField, true);
            feedback.classList.add('is-error');
            feedback.textContent = 'Escreva sua mensagem antes de continuar.';
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        if (config?.rsvp?.supabaseEnabled !== false) {
            const saved = await saveGuestMessage({
                guestName,
                message: messageBody,
                eventId: config?.rsvp?.eventId,
            }).catch(() => false);

            if (!saved) {
                console.warn('[mensagem] Persistência falhou, seguindo fluxo sem bloquear usuário.');
            }
        }

        const destinationPhone = config?.whatsapp?.destinationPhone;
        if (destinationPhone) {
            const template = content?.whatsappTemplate || 'Olá, {recipientName}!\n\nMensagem de {name}:\n{message}';
            const text = buildWhatsAppMessage(template, {
                recipientName: config?.whatsapp?.recipientName || 'noivos',
                name: guestName || 'Convidado',
                message: messageBody,
            });

            const waUrl = buildWhatsAppUrl(destinationPhone, text);
            const opened = window.open(waUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                window.location.assign(waUrl);
            }
        }

        feedback.textContent = content?.successMessage || 'Mensagem enviada com carinho. Obrigado pelo seu recado.';
        form.reset();
        setFieldValidity(bodyField, false);
        if (submitButton) {
            submitButton.disabled = false;
        }
    });
}

initExtraPage({
    pageKey: 'mensagem',
    idPrefix: 'mensagem',
    onReady: (content, config) => bindMessageForm(content, config),
});
