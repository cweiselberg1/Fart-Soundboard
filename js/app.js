// Main Application
class FartSoundboard {
    constructor() {
        this.audio = new AudioEngine();
        this.knobs = [];
        this.init();
    }

    async init() {
        // Initialize audio on first user interaction
        document.body.addEventListener('click', async () => {
            if (!this.audioInitialized) {
                await this.audio.init();
                this.audioInitialized = true;
            }
        }, { once: true });

        document.body.addEventListener('touchstart', async () => {
            if (!this.audioInitialized) {
                await this.audio.init();
                this.audioInitialized = true;
            }
        }, { once: true });

        this.setupPads();
        this.setupFxPanel();
        this.setupKnobs();

        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service worker registered');
            } catch (e) {
                console.log('Service worker not registered:', e);
            }
        }
    }

    setupPads() {
        const pads = document.querySelectorAll('.pad');

        pads.forEach(pad => {
            const color = pad.dataset.color;
            pad.style.setProperty('--pad-color', color);

            const playSound = async () => {
                if (!this.audioInitialized) {
                    await this.audio.init();
                    this.audioInitialized = true;
                }

                const soundName = pad.dataset.sound;

                // Visual feedback
                pad.classList.add('playing');
                setTimeout(() => pad.classList.remove('playing'), 1000);


                // Haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(30);
                }

                // Play sound
                this.audio.play(soundName);
            };

            pad.addEventListener('click', playSound);
            pad.addEventListener('touchstart', (e) => {
                e.preventDefault();
                playSound();
            });
        });
    }

    setupFxPanel() {
        const fxToggle = document.getElementById('fxToggle');
        const fxClose = document.getElementById('fxClose');
        const fxPanel = document.getElementById('fxPanel');
        const overlay = document.getElementById('overlay');

        const openPanel = () => {
            fxPanel.classList.add('open');
            overlay.classList.add('visible');
        };

        const closePanel = () => {
            fxPanel.classList.remove('open');
            overlay.classList.remove('visible');
        };

        fxToggle.addEventListener('click', openPanel);
        fxClose.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);

        // Reset button
        const resetBtn = document.getElementById('resetFx');
        resetBtn.addEventListener('click', () => {
            const defaults = this.audio.resetEffects();
            this.knobs.forEach(knob => {
                const defaultVal = parseFloat(knob.element.dataset.default) || 0;
                knob.setValue(defaultVal);
            });

            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([50, 50, 50]);
            }
        });
    }

    setupKnobs() {
        const knobElements = document.querySelectorAll('.knob');

        knobElements.forEach(el => {
            const knob = new Knob(el, (param, value) => {
                this.audio.setEffect(param, value);
            });
            this.knobs.push(knob);
        });
    }
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FartSoundboard();
});
