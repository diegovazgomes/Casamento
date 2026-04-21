import { initExtraPage } from './extra-page.js';
import { setInputPlaceholder, setText } from './utils.js';
import { saveSongSuggestion } from './rsvp-persistence.js';
import { buildWhatsAppMessage, buildWhatsAppUrl } from './rsvp.js';

function setFieldValidity(field, isInvalid) {
    if (!field) return;
    field.classList.toggle('is-invalid', isInvalid);
    field.setAttribute('aria-invalid', String(isInvalid));
}

function bindMusicForm(content, config) {
    setText('musicaFormTitle', content?.formTitle);
    setText('musicaFormSubtitle', content?.formSubtitle);
    setText('musicaNameLabel', content?.nameLabel);
    setText('musicaSongLabel', content?.songLabel);
    setText('musicaArtistLabel', content?.artistLabel);
    setText('musicaNotesLabel', content?.notesLabel);
    setText('musicaSubmitButton', content?.submitLabel);

    setInputPlaceholder('musicaNameInput', content?.namePlaceholder);
    setInputPlaceholder('musicaSongInput', content?.songPlaceholder);
    setInputPlaceholder('musicaArtistInput', content?.artistPlaceholder);
    setInputPlaceholder('musicaNotesInput', content?.notesPlaceholder);

    const form = document.getElementById('musicaForm');
    const feedback = document.getElementById('musicaFeedback');
    const nameField = document.getElementById('musicaNameInput');
    const songField = document.getElementById('musicaSongInput');
    const artistField = document.getElementById('musicaArtistInput');
    const notesField = document.getElementById('musicaNotesInput');
    const submitButton = document.getElementById('musicaSubmitButton');

    if (!form || !feedback || !songField) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (submitButton?.disabled) {
            return;
        }

        const guestName = String(nameField?.value ?? '').trim();
        const songTitle = String(songField.value ?? '').trim();
        const songArtist = String(artistField?.value ?? '').trim();
        const songNotes = String(notesField?.value ?? '').trim();

        setFieldValidity(songField, false);
        feedback.classList.remove('is-error');
        feedback.textContent = '';

        if (!songTitle) {
            setFieldValidity(songField, true);
            feedback.classList.add('is-error');
            feedback.textContent = 'Informe o nome da música antes de continuar.';
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        if (config?.rsvp?.supabaseEnabled !== false) {
            const saved = await saveSongSuggestion({
                guestName,
                songTitle,
                songArtist,
                songNotes,
                eventId: config?.rsvp?.eventId,
            }).catch(() => false);

            if (!saved) {
                console.warn('[musica] Persistência falhou, seguindo fluxo sem bloquear usuário.');
            }
        }

        const destinationPhone = config?.whatsapp?.destinationPhone;
        if (destinationPhone) {
            const template = content?.whatsappTemplate || 'Olá, {recipientName}!\n\nSugestão de {name}:\nMúsica: {songTitle}\nArtista: {songArtist}\nObservações: {songNotes}';
            const text = buildWhatsAppMessage(template, {
                recipientName: config?.whatsapp?.recipientName || 'noivos',
                name: guestName || 'Convidado',
                songTitle,
                songArtist: songArtist || '-',
                songNotes: songNotes || '-',
            });

            const waUrl = buildWhatsAppUrl(destinationPhone, text);
            const opened = window.open(waUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                window.location.assign(waUrl);
            }
        }

        feedback.textContent = content?.successMessage || 'Sugestão enviada com sucesso. Obrigado por participar da nossa festa.';
        form.reset();
        setFieldValidity(songField, false);
        if (submitButton) {
            submitButton.disabled = false;
        }
    });
}

initExtraPage({
    pageKey: 'musica',
    idPrefix: 'musica',
    onReady: (content, config) => bindMusicForm(content, config),
});
