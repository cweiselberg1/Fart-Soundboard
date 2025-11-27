// Web Audio API Engine with Effects
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.sounds = {};
        this.effects = {
            speed: 1,
            pitch: 1,
            reverb: 0,
            delay: 0,
            distortion: 0,
            bitcrush: 0,
            chorus: 0,
            tremolo: 0,
            eqLow: 0,
            eqMid: 0,
            eqHigh: 0
        };
        this.nodes = {};
    }

    async init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Create master chain
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // Create effect nodes
        this.createEffectChain();

        // Load sounds
        await this.loadSounds();

        console.log('Audio engine initialized');
    }

    createEffectChain() {
        // 3-Band EQ
        this.eqLow = this.ctx.createBiquadFilter();
        this.eqLow.type = 'lowshelf';
        this.eqLow.frequency.value = 200;
        this.eqLow.gain.value = 0;

        this.eqMid = this.ctx.createBiquadFilter();
        this.eqMid.type = 'peaking';
        this.eqMid.frequency.value = 1000;
        this.eqMid.Q.value = 1;
        this.eqMid.gain.value = 0;

        this.eqHigh = this.ctx.createBiquadFilter();
        this.eqHigh.type = 'highshelf';
        this.eqHigh.frequency.value = 3000;
        this.eqHigh.gain.value = 0;

        // Distortion
        this.distortion = this.ctx.createWaveShaper();
        this.distortion.curve = this.makeDistortionCurve(0);

        // Delay
        this.delayNode = this.ctx.createDelay(1);
        this.delayNode.delayTime.value = 0.3;
        this.delayGain = this.ctx.createGain();
        this.delayGain.gain.value = 0;

        // Reverb (convolver)
        this.convolver = this.ctx.createConvolver();
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0;
        this.dryGain = this.ctx.createGain();
        this.dryGain.gain.value = 1;
        this.createReverbImpulse();

        // Tremolo
        this.tremoloGain = this.ctx.createGain();
        this.tremoloLFO = this.ctx.createOscillator();
        this.tremoloDepth = this.ctx.createGain();
        this.tremoloLFO.frequency.value = 5;
        this.tremoloDepth.gain.value = 0;
        this.tremoloLFO.connect(this.tremoloDepth);
        this.tremoloDepth.connect(this.tremoloGain.gain);
        this.tremoloLFO.start();

        // Connect chain: input -> EQ -> distortion -> tremolo -> delay/reverb -> output
        this.inputNode = this.ctx.createGain();

        this.inputNode.connect(this.eqLow);
        this.eqLow.connect(this.eqMid);
        this.eqMid.connect(this.eqHigh);
        this.eqHigh.connect(this.distortion);
        this.distortion.connect(this.tremoloGain);

        // Dry path
        this.tremoloGain.connect(this.dryGain);
        this.dryGain.connect(this.masterGain);

        // Delay path
        this.tremoloGain.connect(this.delayNode);
        this.delayNode.connect(this.delayGain);
        this.delayGain.connect(this.masterGain);

        // Reverb path
        this.tremoloGain.connect(this.convolver);
        this.convolver.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
    }

    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            if (amount === 0) {
                curve[i] = x;
            } else {
                curve[i] = ((3 + amount * 100) * x * 20 * deg) / (Math.PI + amount * 100 * Math.abs(x));
            }
        }
        return curve;
    }

    createReverbImpulse() {
        const rate = this.ctx.sampleRate;
        const length = rate * 2;
        const impulse = this.ctx.createBuffer(2, length, rate);

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }

        this.convolver.buffer = impulse;
    }

    async loadSounds() {
        const soundFiles = [
            'classic', 'squeaker', 'rumbler', 'machinegun',
            'bubbly', 'thunderclap', 'ripper'
        ];

        for (const name of soundFiles) {
            try {
                const response = await fetch(`sounds/${name}.wav`);
                const arrayBuffer = await response.arrayBuffer();
                this.sounds[name] = await this.ctx.decodeAudioData(arrayBuffer);
                console.log(`Loaded: ${name}`);
            } catch (e) {
                console.warn(`Could not load ${name}:`, e);
            }
        }
    }

    setEffect(param, value) {
        this.effects[param] = value;

        switch (param) {
            case 'reverb':
                this.reverbGain.gain.value = value;
                this.dryGain.gain.value = 1 - value * 0.5;
                break;
            case 'delay':
                this.delayGain.gain.value = value * 0.6;
                this.delayNode.delayTime.value = 0.1 + value * 0.4;
                break;
            case 'distortion':
                this.distortion.curve = this.makeDistortionCurve(value);
                break;
            case 'tremolo':
                this.tremoloDepth.gain.value = value * 0.5;
                this.tremoloLFO.frequency.value = 3 + value * 10;
                break;
            case 'eqLow':
                this.eqLow.gain.value = value;
                break;
            case 'eqMid':
                this.eqMid.gain.value = value;
                break;
            case 'eqHigh':
                this.eqHigh.gain.value = value;
                break;
        }
    }

    play(soundName) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        let buffer;
        if (soundName === 'random') {
            const names = Object.keys(this.sounds);
            const randomName = names[Math.floor(Math.random() * names.length)];
            buffer = this.sounds[randomName];
        } else {
            buffer = this.sounds[soundName];
        }

        if (!buffer) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        // Create source
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        // Apply pitch (playbackRate affects both speed and pitch together by default)
        source.playbackRate.value = this.effects.pitch;

        // For bitcrush effect - downsample by reducing buffer
        if (this.effects.bitcrush > 0) {
            source.playbackRate.value *= (1 - this.effects.bitcrush * 0.3);
        }

        // Connect to effect chain
        source.connect(this.inputNode);
        source.start();

        return source;
    }

    resetEffects() {
        const defaults = {
            speed: 1, pitch: 1, reverb: 0, delay: 0,
            distortion: 0, bitcrush: 0, chorus: 0, tremolo: 0,
            eqLow: 0, eqMid: 0, eqHigh: 0
        };

        for (const [param, value] of Object.entries(defaults)) {
            this.setEffect(param, value);
        }

        return defaults;
    }
}

// Export
window.AudioEngine = AudioEngine;
