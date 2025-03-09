import * as ParticleSystem from './particlesystem.js';

// Expose ParticleSystem to window for better integration with app.js
window.ParticleSystem = ParticleSystem;

// Expose these variables to window for better integration with app.js
window.isPlaybackStarted = false;
window.isAudioPlaying = false;
let particleBehavior = 0;

function init() {
    ParticleSystem.resizeCanvas();
    window.addEventListener('resize', debounce(() => {
        ParticleSystem.resizeCanvas();
        ParticleSystem.updateMusicPlayerPosition();
    }, 250));

    // Get initial audio state
    const audioElement = document.getElementById('audio');
    window.isAudioPlaying = !audioElement.paused;
    
    // Add event listeners to sync with audio element
    audioElement.addEventListener('play', () => {
        console.log('Audio play event detected in main.js');
        window.isPlaybackStarted = true;
        window.isAudioPlaying = true;
        ParticleSystem.ensureParticlesRunning();
    });
    
    audioElement.addEventListener('pause', () => {
        console.log('Audio pause event detected in main.js');
        window.isAudioPlaying = false;
    });
    
    // Add play button event listener as a backup
    document.querySelector('.play-btn').addEventListener('click', () => {
        console.log('Play button clicked in main.js');
        if (audioElement.paused) {
            window.isPlaybackStarted = true;
            // The actual play state will be updated by the audio 'play' event
        }
    });
    
    animate();
}

function animate() {
    if (window.isPlaybackStarted && window.isAudioPlaying) {
        ParticleSystem.animateParticles();
        ParticleSystem.updateParticleBehavior(particleBehavior);
    } else {
        ParticleSystem.clearParticles();
    }
    requestAnimationFrame(animate);
}

window.onload = init;

function changeTrack(direction) {
    window.isPlaybackStarted = true;
    window.isAudioPlaying = true;
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
window.onAudioStart = function() {
    console.log('Audio started from app.js');
    window.isPlaybackStarted = true;
    window.isAudioPlaying = true;
    ParticleSystem.startParticles();
};

window.onAudioStop = function() {
    console.log('Audio stopped from app.js');
    window.isAudioPlaying = false;
    ParticleSystem.clearParticles();
};

window.onPlaybackStart = function() {
    console.log('Playback started from app.js');
    window.isPlaybackStarted = true;
    window.isAudioPlaying = true;
};

window.onPlaybackStop = function() {
    console.log('Playback stopped from app.js');
    window.isAudioPlaying = false;
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
    
    // Instead of immediately calling setMusic, wait for songs to be loaded
    // We'll check if songs are already loaded
    if (window.songs && window.songs.length > 0) {
        console.log('Songs already loaded, initializing music player');
        setMusic(0);
    } else {
        console.log('Waiting for songs to be loaded...');
    }
});

// Add a custom event listener for when songs are ready
window.addEventListener('songsLoaded', () => {
    console.log('Songs loaded event received, initializing music player');
    if (window.songs && window.songs.length > 0) {
        setMusic(0);
    }
});

function setMusic(i) {
    // Check if songs array exists and has the requested index
    if (!window.songs || !window.songs[i]) {
        console.error(`Cannot set music: songs array is not available or index ${i} is out of bounds`);
        return;
    }
    
    // Existing code...
    if (typeof window.updateBackgroundScheme === 'function') {
        window.updateBackgroundScheme(i);
    } else {
        console.error('updateBackgroundScheme is not defined');
    }
    if (typeof window.updateVisualizerColors === 'function' && window.songs && window.songs[i] && window.songs[i].colorScheme) {
        window.updateVisualizerColors(window.songs[i].colorScheme);
    } else {
        console.error('updateVisualizerColors is not defined or song data is missing');
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
