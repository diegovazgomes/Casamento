import { initExtraPage } from './extra-page.js';
import { setInputPlaceholder, setText } from './utils.js';
import { saveGuestMessage } from './rsvp-persistence.js';

function setFieldValidity(field, isInvalid) {
    if (!field) return;
    field.classList.toggle('is-invalid', isInvalid);
    field.setAttribute('aria-invalid', String(isInvalid));
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

        if (shouldPersistToDatabase(config, 'mensagem')) {
            console.log('[mensagem] Enviando mensagem para persistência.', {
                eventId: config?.rsvp?.eventId || 'wedding-event',
                hasGuestName: Boolean(guestName),
                messageLength: messageBody.length,
            });

            const saved = await saveGuestMessage({
                guestName,
                message: messageBody,
                eventId: config?.rsvp?.eventId,
            }).catch(() => false);

            if (!saved) {
                console.warn('[mensagem] Falha na persistência da mensagem.');
                feedback.classList.add('is-error');
                feedback.textContent = content?.errorMessage || 'Não foi possível enviar sua mensagem agora. Tente novamente.';
                if (submitButton) {
                    submitButton.disabled = false;
                }
                return;
            }

            console.log('[mensagem] Mensagem persistida com sucesso.');
        } else {
            console.warn('[mensagem] Persistência desativada (config.rsvp.disablePersistence=true). Mensagem não será salva no banco.');
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
