import { initExtraPage } from './extra-page.js';
import { setInputPlaceholder, setText } from './utils.js';
import { saveSongSuggestion } from './rsvp-persistence.js';

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

    if (!form || !feedback || !songField) {
        return;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const guestName = String(nameField?.value ?? '').trim();
        const songTitle = String(songField.value ?? '').trim();
        const songArtist = String(artistField?.value ?? '').trim();
        const songNotes = String(notesField?.value ?? '').trim();
        const destinationPhone = config?.whatsapp?.destinationPhone;
        const recipientName = config?.whatsapp?.recipientName ?? 'noivos';

        setFieldValidity(songField, false);
        feedback.classList.remove('is-error');
        feedback.textContent = '';

        if (!songTitle) {
            setFieldValidity(songField, true);
            feedback.classList.add('is-error');
            feedback.textContent = 'Informe o nome da música antes de continuar.';
            return;
        }

        const template =
            content?.whatsappTemplate ||
            'Olá, {recipientName}!\n\n{guestName} sugeriu uma música para a festa:\nMúsica: {songTitle}\nArtista: {songArtist}\nObservações: {songNotes}';

        const whatsappMessage = interpolate(template, {
            recipientName,
            guestName: guestName || 'Um convidado',
            songTitle,
            songArtist: songArtist || 'Não informado',
            songNotes: songNotes || 'Nenhuma observação',
        });

        const whatsappUrl = createWhatsAppUrl(destinationPhone, whatsappMessage);
        if (!whatsappUrl) {
            feedback.classList.add('is-error');
            feedback.textContent = content?.errorMessage || 'Não foi possível preparar o envio agora. Tente novamente.';
            return;
        }

        // Salvar no Supabase sem bloquear o fluxo do WhatsApp
        console.log('[musica] supabaseEnabled:', window.CONFIG?.rsvp?.supabaseEnabled, '| eventId:', window.CONFIG?.rsvp?.eventId);
        if (window.CONFIG?.rsvp?.supabaseEnabled !== false) {
            saveSongSuggestion({
                guestName:  guestName,
                songTitle:  songTitle,
                songArtist: songArtist,
                songNotes:  songNotes,
                eventId:    window.CONFIG?.rsvp?.eventId,
            }).catch(() => {});
        }

        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        feedback.textContent = content?.successMessage || 'Sugestão preparada. Abra o WhatsApp para finalizar o envio.';
        form.reset();
        setFieldValidity(songField, false);
    });
}

initExtraPage({
    pageKey: 'musica',
    idPrefix: 'musica',
    onReady: (content, config) => bindMusicForm(content, config),
});
