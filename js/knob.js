// Interactive Rotary Knob Controller
class Knob {
    constructor(element, onChange) {
        this.element = element;
        this.onChange = onChange;

        this.min = parseFloat(element.dataset.min) || 0;
        this.max = parseFloat(element.dataset.max) || 1;
        this.default = parseFloat(element.dataset.default) || 0;
        this.param = element.dataset.param;

        this.value = this.default;
        this.angle = this.valueToAngle(this.value);

        this.grip = element.querySelector('.knob-grip');
        this.trackFill = element.querySelector('.track-fill');

        this.isDragging = false;
        this.startY = 0;
        this.startAngle = 0;

        this.bindEvents();
        this.updateVisual();
    }

    bindEvents() {
        // Mouse events
        this.element.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Touch events
        this.element.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('touchend', () => this.endDrag());

        // Double tap/click to reset
        this.element.addEventListener('dblclick', () => this.reset());

        // Scroll wheel
        this.element.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            this.setValue(this.value + (this.max - this.min) * delta);
        });
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        this.startAngle = this.angle;
        this.element.style.cursor = 'grabbing';
    }

    drag(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const deltaY = this.startY - clientY;

        // Sensitivity: 200px drag = full range
        const deltaAngle = (deltaY / 200) * 270;
        let newAngle = this.startAngle + deltaAngle;

        // Clamp to -135 to 135 degrees (270 degree range)
        newAngle = Math.max(-135, Math.min(135, newAngle));

        this.angle = newAngle;
        this.value = this.angleToValue(newAngle);

        this.updateVisual();

        if (this.onChange) {
            this.onChange(this.param, this.value);
        }
    }

    endDrag() {
        this.isDragging = false;
        this.element.style.cursor = 'grab';
    }

    setValue(val) {
        this.value = Math.max(this.min, Math.min(this.max, val));
        this.angle = this.valueToAngle(this.value);
        this.updateVisual();

        if (this.onChange) {
            this.onChange(this.param, this.value);
        }
    }

    reset() {
        this.setValue(this.default);
    }

    valueToAngle(val) {
        const normalized = (val - this.min) / (this.max - this.min);
        return -135 + normalized * 270;
    }

    angleToValue(angle) {
        const normalized = (angle + 135) / 270;
        return this.min + normalized * (this.max - this.min);
    }

    updateVisual() {
        // Rotate the grip indicator
        if (this.grip) {
            this.grip.style.transform = `rotate(${this.angle}deg)`;
        }

        // Update the arc track
        if (this.trackFill) {
            // Track is 270 degrees, stroke-dasharray is ~212 for r=45
            // Full range: dashoffset goes from 212 (empty) to ~70 (full)
            const normalized = (this.value - this.min) / (this.max - this.min);
            const dashoffset = 212 - (normalized * 142);
            this.trackFill.style.strokeDashoffset = dashoffset;
        }

        // Update display value
        this.updateValueDisplay();
    }

    updateValueDisplay() {
        const displayEl = document.getElementById(`${this.param}-val`);
        if (!displayEl) return;

        let displayText;
        if (this.param === 'speed' || this.param === 'pitch') {
            displayText = `${this.value.toFixed(2)}x`;
        } else if (this.param.startsWith('eq')) {
            displayText = `${this.value.toFixed(0)} dB`;
        } else {
            displayText = `${Math.round(this.value * 100)}%`;
        }

        displayEl.textContent = displayText;
    }
}

// Export
window.Knob = Knob;
