import * as ParticleSystem from './particlesystem.js';

let isPlaybackStarted = false;
let isAudioPlaying = false;
let particleBehavior = 0;

function init() {
    ParticleSystem.resizeCanvas();
    window.addEventListener('resize', debounce(() => {
        ParticleSystem.resizeCanvas();
        ParticleSystem.updateMusicPlayerPosition();
    }, 250));

    animate();
}

function animate() {
    if (isPlaybackStarted && isAudioPlaying) {
        ParticleSystem.animateParticles();
        ParticleSystem.updateParticleBehavior(particleBehavior);
    } else {
        ParticleSystem.clearParticles();
    }
    requestAnimationFrame(animate);
}

window.onload = init;

document.querySelector('.play-btn').addEventListener('click', () => {
    if (!isPlaybackStarted) {
        isPlaybackStarted = true;
        isAudioPlaying = true;
        ParticleSystem.startParticles();
    } else {
        isAudioPlaying = !isAudioPlaying;
        if (isAudioPlaying) {
            ParticleSystem.startParticles();
        } else {
            ParticleSystem.clearParticles();
        }
    }
});

function changeTrack(direction) {
    isPlaybackStarted = true;
    isAudioPlaying = true;
    ParticleSystem.ensureParticlesRunning();
}

document.querySelector('.backward-btn').addEventListener('click', () => changeTrack('previous'));
document.querySelector('.forward-btn').addEventListener('click', () => changeTrack('next'));

document.querySelector('.button-container').addEventListener('click', (event) => {
    if (event.target.closest('.state-button')) {
        particleBehavior = parseInt(event.target.closest('.state-button').id.replace('state', ''), 10) - 1;
        console.log('Particle behavior changed to:', particleBehavior);
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Expose functions to window for use in other scripts
window.onAudioPlay = () => {
    isAudioPlaying = true;
    ParticleSystem.startParticles();
};

window.onAudioStop = () => {
    isAudioPlaying = false;
    ParticleSystem.clearParticles();
};

window.onPlaybackStart = () => {
    isPlaybackStarted = true;
};

window.onPlaybackStop = () => {
    isPlaybackStarted = false;
};

window.setParticleBehavior = (behavior) => {
    particleBehavior = behavior;
};

window.updateParticleAudioData = (audioData) => {
    ParticleSystem.updateAudioData(audioData);
};

document.addEventListener('DOMContentLoaded', () => {
    // Other initialization code...
    if (typeof window.updateVisualizerColors === 'function') {
        window.updateVisualizerColors('background-scheme-1'); // Set a default scheme
    } else {
        console.error('updateVisualizerColors is not defined');
    }
    setMusic(0); // Initialize with the first track
});

function setMusic(i) {
    // Existing code...
    if (typeof window.updateBackgroundScheme === 'function') {
        window.updateBackgroundScheme(i);
    } else {
        console.error('updateBackgroundScheme is not defined');
    }
    if (typeof window.updateVisualizerColors === 'function') {
        window.updateVisualizerColors(window.songs[i].colorScheme);
    } else {
        console.error('updateVisualizerColors is not defined');
    }
}

function getVisualizerColor(value) {
    const { r, g, b } = visualizerColors; // Get the color functions
    const red = r(value); // Calculate red value
    const green = g(value); // Calculate green value
    const blue = b(value); // Calculate blue value
    console.log(`Color values - R: ${red}, G: ${green}, B: ${blue}`); // Debugging line
    return `rgb(${red}, ${green}, ${blue})`; // Return the RGB string
}

function toggleMenu() {
    const menu = document.getElementById('menu');
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
}
