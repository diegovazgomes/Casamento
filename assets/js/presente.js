export class PresentPage {
    constructor() {
        this.copyButtons = Array.from(document.querySelectorAll('[data-copy-value]'));
    }

    init() {
        if (!this.copyButtons.length) {
            return;
        }

        this.copyButtons.forEach((button) => {
            button.addEventListener('click', () => this.handleCopy(button));
        });
    }

    async handleCopy(button) {
        const value = button.dataset.copyValue ?? '';
        const feedback = this.getFeedbackElement(button);
        const originalLabel = button.dataset.defaultLabel || button.textContent.trim();

        if (!button.dataset.defaultLabel) {
            button.dataset.defaultLabel = originalLabel;
        }

        if (!value) {
            this.setFeedback(button, feedback, 'Código Pix indisponível no momento.', false);
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                this.copyWithFallback(value);
            }

            this.setFeedback(button, feedback, 'Código copiado com sucesso.', true);
        } catch (error) {
            this.setFeedback(button, feedback, 'Não foi possível copiar agora.', false);
            console.error('Falha ao copiar o código Pix.', error);
        }
    }

    getFeedbackElement(button) {
        const feedbackId = button.dataset.copyFeedbackTarget;

        if (!feedbackId) {
            return null;
        }

        return document.getElementById(feedbackId);
    }

    setFeedback(button, feedback, message, isSuccess) {
        const originalLabel = button.dataset.defaultLabel || 'Copiar código Pix';

        window.clearTimeout(button._feedbackTimeoutId);
        button.classList.toggle('is-success', isSuccess);
        button.textContent = isSuccess ? 'Código copiado' : originalLabel;

        if (feedback) {
            feedback.textContent = message;
            feedback.classList.add('is-visible');
        }

        button._feedbackTimeoutId = window.setTimeout(() => {
            button.classList.remove('is-success');
            button.textContent = originalLabel;

            if (feedback) {
                feedback.classList.remove('is-visible');
                feedback.textContent = '';
            }
        }, 2400);
    }

    copyWithFallback(value) {
        const temporaryField = document.createElement('textarea');
        temporaryField.value = value;
        temporaryField.setAttribute('readonly', '');
        temporaryField.style.position = 'absolute';
        temporaryField.style.left = '-9999px';
        document.body.appendChild(temporaryField);
        temporaryField.select();
        document.execCommand('copy');
        document.body.removeChild(temporaryField);
    }
}