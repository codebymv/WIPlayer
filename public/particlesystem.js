let canvas = document.getElementById('particles');
let ctx = canvas.getContext('2d');
let particles = [];
let particleBehavior = 0;
let time = 0;
let audioData = new Uint8Array(128);

export function initParticleSystem() {
    const isMobile = window.innerWidth <= 768;
    const particleCount = isMobile ? 50 : 100;
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
    }
}

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticleSystem();
}

export function startParticles() {
    initParticleSystem();
}

export function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isMobile = window.innerWidth <= 768;
    time += isMobile ? 0.015 : 0.01;

    particles.forEach((particle, index) => {
        updateParticle(particle, index);
        drawParticle(particle);
    });
}

export function updateParticleBehavior(behavior) {
    particleBehavior = behavior;
}

export function clearParticles() {
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function updateAudioData(newAudioData) {
    audioData = newAudioData;
}

export function ensureParticlesRunning() {
    if (particles.length === 0) {
        initParticleSystem();
    }
}

function createParticle() {
    const isMobile = window.innerWidth <= 768;
    const size = isMobile ? Math.random() * 8 + 3 : Math.random() * 5 + 1;
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: size,
        speedX: Math.random() * 3 - 1.5,
        speedY: Math.random() * 3 - 1.5,
        opacity: 1,
        initialX: 0,
        initialY: 0,
        initialSize: size
    };
}

function getPauseButtonPosition() {
    const playBtn = document.querySelector('.play-btn');
    const rect = playBtn.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
    };
}

function updateParticle(particle, index) {
    const isMobile = window.innerWidth <= 768;
    const isVerySmall = window.innerWidth <= 375;
    
    const baseSize = isVerySmall ? 5 : (isMobile ? 7 : 9);
    const baseOpacity = isMobile ? 0.8 : 1;
    
    const scaleFactor = isVerySmall ? 0.6 : (isMobile ? 0.8 : 1);

    const pauseButtonPos = getPauseButtonPosition();
    
    switch (particleBehavior) {
        case 0: // Float (bouncing) behavior
            if (particle.initialX === 0 && particle.initialY === 0) {
                particle.initialX = particle.x;
                particle.initialY = particle.y;
            }
            const floatAmplitude = isMobile ? 25 * scaleFactor : 35 * scaleFactor;
            particle.y = particle.initialY + Math.sin(time + index) * floatAmplitude;
            particle.x += Math.sin(time * 0.2 + index) * (isMobile ? 3 * scaleFactor : 2 * scaleFactor);
            particle.size = baseSize * 1.2;
            break;
        case 1: // Swirl behavior
            if (particle.initialX === 0 && particle.initialY === 0) {
                particle.initialX = particle.x;
                particle.initialY = particle.y;
            }
            const swirlRadius = isMobile ? 50 * scaleFactor : 60 * scaleFactor;
            particle.x = particle.initialX + Math.cos(time * 0.75 + index) * swirlRadius;
            particle.y = particle.initialY + Math.sin(time * 2.5 + index) * swirlRadius;
            particle.size = baseSize * 1.5;
            break;
        case 2: // Pulse behavior
            if (particle.initialX === 0 && particle.initialY === 0) {
                particle.initialX = particle.x;
                particle.initialY = particle.y;
                particle.initialSize = baseSize * 1; // Significantly increased initial size
            }
            const pulseSpeed = isMobile ? 2 : 1.75;
            const sizeVariation = isMobile ? 8 * scaleFactor : 7 * scaleFactor; // Increased size variation
            const pulseRadius = isMobile ? 35 * scaleFactor : 40 * scaleFactor;
            particle.size = particle.initialSize + Math.sin(time * pulseSpeed + index * 0.1) * sizeVariation;
            const angle = time * 0.75 + index * 0.1;
            particle.x = particle.initialX + Math.cos(angle) * pulseRadius;
            particle.y = particle.initialY + Math.sin(angle) * pulseRadius;
            break;
    }

    // Wrap around screen
    particle.x = (particle.x + canvas.width) % canvas.width;
    particle.y = (particle.y + canvas.height) % canvas.height;

    // Prevent particles from appearing below the pause button
    if (particle.y > (pauseButtonPos.top + pauseButtonPos.height) || 
        (particle.x > pauseButtonPos.left && particle.x < pauseButtonPos.left + pauseButtonPos.width)) {
        particle.opacity = 0;
    } else {
        particle.opacity = baseOpacity;
    }

    // Respond to audio
    if (audioData.length > 0) {
        let audioIndex = Math.floor(index / particles.length * audioData.length);
        particle.size *= Math.max(0.8, audioData[audioIndex] / 128);
        particle.opacity *= Math.max(0.3, audioData[audioIndex] / 256);
    }

    // Adjust particle visibility for mobile
    if (isMobile) {
        const middleThreshold = canvas.height * 0.6;
        if (particle.y > middleThreshold) {
            const distanceFromMiddle = particle.y - middleThreshold;
            const fadeRange = canvas.height * 0.2;
            const opacity = 1 - (distanceFromMiddle / fadeRange);
            particle.opacity *= Math.max(0, opacity);
        }
    }
}

function drawParticle(particle) {
    const isMobile = window.innerWidth <= 768;
    const particleColor = isMobile ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)';

    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = particleColor;

    switch (particleBehavior) {
        case 0: // Float - Circle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 1: // Swirl - Square
            ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
            break;
        case 2: // Pulse - Triangle
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y - particle.size);
            ctx.lineTo(particle.x - particle.size, particle.y + particle.size);
            ctx.lineTo(particle.x + particle.size, particle.y + particle.size);
            ctx.closePath();
            ctx.fill();
            break;
    }

    ctx.globalAlpha = 1;
}
export function updateMusicPlayerPosition() {
    // Implement if needed
}

window.addEventListener('resize', () => {
    resizeCanvas();
});