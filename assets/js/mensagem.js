import { initExtraPage } from './extra-page.js';
import { setInputPlaceholder, setText } from './utils.js';
import { getLastSubmissionError, saveGuestMessage } from './rsvp-persistence.js';

const DEMO_SUBMISSIONS_BLOCKED_CODE = 'DEMO_PUBLIC_SUBMISSIONS_BLOCKED';

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
            `[${moduleName}] config.rsvp.supabaseEnabled=false Ã© legado e serÃ¡ ignorado. A persistÃªncia permanece habilitada; use config.rsvp.disablePersistence=true para desativar.`
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
            const saved = await saveGuestMessage({
                guestName,
                message: messageBody,
                eventId: config?.rsvp?.eventId,
            }).catch(() => false);

            if (!saved) {
                console.warn('[mensagem] Falha na persistÃªncia da mensagem.');
                feedback.classList.add('is-error');
                const lastSubmissionError = getLastSubmissionError();
                if (lastSubmissionError?.code === DEMO_SUBMISSIONS_BLOCKED_CODE) {
                    feedback.textContent = lastSubmissionError.message || 'Este convite e demonstrativo. RSVP, mensagens e musicas estao desativados no exemplo.';
                } else {
                    feedback.textContent = content?.errorMessage || 'NÃ£o foi possÃ­vel enviar sua mensagem agora. Tente novamente.';
                }
                if (submitButton) {
                    submitButton.disabled = false;
                }
                return;
            }
        } else {
            console.warn('[mensagem] PersistÃªncia desativada (config.rsvp.disablePersistence=true). Mensagem nÃ£o serÃ¡ salva no banco.');
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
