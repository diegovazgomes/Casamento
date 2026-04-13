import { initExtraPage } from './extra-page.js';
import { setInputPlaceholder, setText } from './utils.js';
import { saveGuestMessage } from './rsvp-persistence.js';

function interpolate(template, values) {
    return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function createWhatsAppUrl(destinationPhone, text) {
    const phone = String(destinationPhone ?? '').trim();
    if (!phone) return '';

    const params = new URLSearchParams({ text: String(text ?? '') });
    return `https://wa.me/${encodeURIComponent(phone)}?${params.toString()}`;
}

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

    if (!form || !feedback || !bodyField) {
        return;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const guestName = String(nameField?.value ?? '').trim();
        const messageBody = String(bodyField.value ?? '').trim();
        const destinationPhone = config?.whatsapp?.destinationPhone;
        const recipientName = config?.whatsapp?.recipientName ?? 'noivos';

        setFieldValidity(bodyField, false);
        feedback.classList.remove('is-error');
        feedback.textContent = '';

        if (!messageBody) {
            setFieldValidity(bodyField, true);
            feedback.classList.add('is-error');
            feedback.textContent = 'Escreva sua mensagem antes de continuar.';
            return;
        }

        const template =
            content?.whatsappTemplate ||
            'Olá, {recipientName}!\n\n{guestName} deixou uma mensagem especial:\n\n"{messageBody}"';

        const whatsappMessage = interpolate(template, {
            recipientName,
            guestName: guestName || 'Um convidado',
            messageBody,
        });

        const whatsappUrl = createWhatsAppUrl(destinationPhone, whatsappMessage);
        if (!whatsappUrl) {
            feedback.classList.add('is-error');
            feedback.textContent = content?.errorMessage || 'Não foi possível preparar o envio agora. Tente novamente.';
            return;
        }

        // Salvar no Supabase sem bloquear o fluxo do WhatsApp
        if (window.CONFIG?.rsvp?.supabaseEnabled !== false) {
            saveGuestMessage({
                guestName: guestName,
                message:   messageBody,
                eventId:   window.CONFIG?.rsvp?.eventId,
            }).catch(() => {});
        }

        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        feedback.textContent = content?.successMessage || 'Mensagem preparada. Abra o WhatsApp para finalizar o envio.';
        form.reset();
        setFieldValidity(bodyField, false);
    });
}

initExtraPage({
    pageKey: 'mensagem',
    idPrefix: 'mensagem',
    onReady: (content, config) => bindMessageForm(content, config),
});
