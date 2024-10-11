document.addEventListener('DOMContentLoaded', () => {
    let currentMusic = 0;
    let audioContext, analyser, dataArray, source, gainNode;
    let isVisualizerStarted = false;
    
    const music = document.getElementById('audio');
    const seekBar = document.querySelector('.seek-bar');
    const songName = document.querySelector('.music-name');
    const artistName = document.querySelector('.artist-name');
    const disk = document.querySelector('.disk');
    const currentTime = document.querySelector('.current-time');
    const musicDuration = document.querySelector('.song-duration');
    const playBtn = document.querySelector('.play-btn');
    const forwardBtn = document.querySelector('.forward-btn');
    const backwardsBtn = document.querySelector('.backward-btn');
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    
    const volumeBar = document.querySelector('.custom-volume-bar');
    const volumeFill = document.querySelector('.volume-fill');
    const volumeHandle = document.querySelector('.volume-handle');
    const volumeDown = document.querySelector('.volume-down');
    const volumeUp = document.querySelector('.volume-up');

    const backgroundSchemes = [
        'background-scheme-1',
        'background-scheme-2',
        'background-scheme-3',
        'background-scheme-4'
    ];

    let visualizerColors = {
        r: value => value,
        g: value => value,
        b: value => value
    };

    // Set initial volume
    setVolume(1);

    // Volume control events
    volumeBar.addEventListener('mousedown', handleVolumeStart);
    document.addEventListener('mousemove', handleVolumeMove);
    document.addEventListener('mouseup', handleVolumeEnd);
    volumeBar.addEventListener('touchstart', handleVolumeStart, { passive: false });
    document.addEventListener('touchmove', handleVolumeMove, { passive: false });
    document.addEventListener('touchend', handleVolumeEnd, { passive: false });

    let isAdjusting = false;

    const hamburger = document.querySelector('.hamburger');
    hamburger.addEventListener('click', toggleMenu);
    hamburger.addEventListener('touchend', toggleMenu, { passive: false });

// Make the function globally accessible
function toggleMenu(event) {
    event.preventDefault(); // Prevent default action
    const menu = document.getElementById('menu');
    menu.classList.toggle('show');

    // If the menu is being shown, set visibility to visible
    if (menu.classList.contains('show')) {
        menu.style.visibility = 'visible';
    } else {
        setTimeout(() => {
            if (!menu.classList.contains('show')) {
                menu.style.visibility = 'hidden';
            }
        }, 300); // Match with CSS transition duration
    }
}



        // Make the function globally accessible
window.updateVisualizerColors = function(scheme) {
    visualizerColors = getVisualizerColorsForScheme(scheme);
};


    function handleVolumeStart(event) {
        event.preventDefault();
        isAdjusting = true;
        adjustVolume(event);
    }

    function handleVolumeMove(event) {
        if (isAdjusting) {
            event.preventDefault();
            adjustVolume(event);
        }
    }

    function handleVolumeEnd() {
        isAdjusting = false;
    }

    function adjustVolume(event) {
        const rect = volumeBar.getBoundingClientRect();
        const clientX = event.clientX || (event.touches ? event.touches[0].clientX : 0);
        let newVolume = (clientX - rect.left) / rect.width;
        setVolume(newVolume);
    }

    function setVolume(newVolume) {
        newVolume = Math.max(0, Math.min(1, newVolume));
        if (gainNode) {
            gainNode.gain.setValueAtTime(newVolume, audioContext.currentTime);
        }
        music.volume = newVolume;
        volumeFill.style.width = `${newVolume * 100}%`;
        volumeHandle.style.left = `calc(${newVolume * 100}% - 10px)`;
        console.log('Volume changed:', newVolume, 'Actual audio volume:', music.volume);
    }

    volumeDown.addEventListener('click', () => {
        setVolume(Math.max(0, music.volume - 0.1));
    });

    volumeUp.addEventListener('click', () => {
        setVolume(Math.min(1, music.volume + 0.1));
    });

    music.addEventListener('volumechange', () => {
        console.log('Volume change event fired. New volume:', music.volume);
    });

    function updateAudioData(newAudioData) {
        if (window.updateParticleAudioData) {
            window.updateParticleAudioData(newAudioData);
        }
    }

    function updateBackgroundScheme(index) {
        const musicPlayer = document.querySelector('.music-player');
        const visualizerContainer = document.querySelector('.visualizer-container');
        const newScheme = songs[index].colorScheme;
    
        musicPlayer.classList.remove(...backgroundSchemes);
        musicPlayer.classList.add(newScheme);
        
        visualizerContainer.classList.remove(...backgroundSchemes);
        visualizerContainer.classList.add(newScheme);
    
        updateVisualizerColors(newScheme);
    
        if (window.setBackgroundScheme) {
            window.setBackgroundScheme(backgroundSchemes.indexOf(newScheme));
        }
    }

    function updateVisualizerColors(scheme) {
        visualizerColors = getVisualizerColorsForScheme(scheme);
    }

    function getVisualizerColorsForScheme(scheme) {
        const colorSchemes = {
            'background-scheme-1': {
                r: value => Math.min(255, value * 0.8 + 50),
                g: value => Math.min(175, value * 0.5 + 30),
                b: value => Math.min(150, value * 0.4 + 20)
            },
            'background-scheme-2': {
                r: value => Math.min(100, value * 0.3 + 20),
                g: value => Math.min(180, value * 0.6 + 40),
                b: value => Math.min(200, value * 0.7 + 50)
            },
            'background-scheme-3': { 
                r: value => Math.min(80, value * 0.2 + 30),
                g: value => Math.min(200, value * 0.7 + 50),
                b: value => Math.min(150, value * 0.4 + 40)
            },
            'background-scheme-4': {
                r: value => Math.min(150, value * 0.5 + 40),
                g: value => Math.min(100, value * 0.3 + 30),
                b: value => Math.min(180, value * 0.6 + 50)
            }
        };
    
        return colorSchemes[scheme] || {
            r: value => value,
            g: value => value,
            b: value => value
        };
    }

    function setMusic(i) {
        seekBar.value = 0;
        const song = songs[i];
        currentMusic = i;
        music.src = song.path;

        songName.textContent = song.name;
        artistName.textContent = song.artist;
        disk.style.backgroundImage = `url('${song.cover}')`;

        currentTime.textContent = '00:00';
        musicDuration.textContent = 'Loading...';

        music.addEventListener('loadedmetadata', () => {
            seekBar.max = music.duration;
            musicDuration.textContent = formatTime(music.duration);
        });

        updateBackgroundScheme(i); // Update background scheme
        updateVisualizerColors(song.colorScheme); // Set visualizer colors based on the song's color scheme
    }

    function formatTime(time) {
        const min = String(Math.floor(time / 60)).padStart(2, '0');
        const sec = String(Math.floor(time % 60)).padStart(2, '0');
        return `${min}:${sec}`;
    }

    function updateTime() {
        seekBar.value = music.currentTime;
        currentTime.textContent = formatTime(music.currentTime);
        if (!isNaN(music.duration)) {
            musicDuration.textContent = formatTime(music.duration);
        }
    }

    music.addEventListener('timeupdate', updateTime);

    seekBar.addEventListener('input', () => {
        music.currentTime = seekBar.value;
    });

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            source = audioContext.createMediaElementSource(music);
            gainNode = audioContext.createGain();
            source.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(audioContext.destination);
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
    }

    function togglePlayPause() {
        if (music.paused) {
            playMusic();
        } else {
            pauseMusic();
        }
    }

    function updatePlayPauseButtonState() {
        playBtn.classList.toggle('pause', !music.paused);
    }

    function playMusic() {
        initAudio();
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                actuallyPlayMusic();
            }).catch(handleAudioError);
        } else {
            actuallyPlayMusic();
        }
    }

    function actuallyPlayMusic() {
        music.play().then(() => {
            updatePlayPauseButtonState();
            disk.classList.add('play');
            if (!isVisualizerStarted) {
                drawVisualizer();
                isVisualizerStarted = true;
            }
            if (window.onAudioPlay) {
                window.onAudioPlay();
            }
            if (window.onPlaybackStart) {
                window.onPlaybackStart();
            }
            console.log('Music playing, volume:', music.volume);
        }).catch(handleAudioError);
    }

    function pauseMusic() {
        music.pause();
        updatePlayPauseButtonState();
        disk.classList.remove('play');
        if (window.onAudioStop) {
            window.onAudioStop();
        }
        if (window.onPlaybackStop) {
            window.onPlaybackStop();
        }
        console.log('Music paused, volume:', music.volume);
    }

    function handleAudioError(error) {
        console.error('Audio playback error:', error);
        // Implement additional error handling or user feedback here
    }

    playBtn.addEventListener('click', togglePlayPause);

    document.addEventListener('keydown', e => {
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        }
    });

    forwardBtn.addEventListener('click', () => {
        currentMusic = (currentMusic + 1) % songs.length;
        setMusic(currentMusic);
        playMusic();
    });

    backwardsBtn.addEventListener('click', () => {
        currentMusic = (currentMusic - 1 + songs.length) % songs.length;
        setMusic(currentMusic);
        playMusic();
    });

    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);

        analyser.getByteFrequencyData(dataArray);
        updateAudioData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const isMobile = window.innerWidth <= 375 && window.innerHeight <= 667;
        const barWidth = isMobile ? (canvas.width / dataArray.length) * 1.2 : (window.innerWidth <= 768 ? (canvas.width / dataArray.length) * 1.5 : (canvas.width / dataArray.length) * 2.5);
        let x = 0;

        dataArray.forEach(value => {
            const barHeight = isMobile ? value * 1.5 : (window.innerWidth <= 768 ? value * 1.8 : value * 2);
            const color = getVisualizerColor(value);
            ctx.fillStyle = color;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        });
    }

    function getVisualizerColor(value) {
        const { r, g, b } = visualizerColors; // Get the color functions
        const red = r(value); // Calculate red value
        const green = g(value); // Calculate green value
        const blue = b(value); // Calculate blue value
        console.log(`Color values - R: ${red}, G: ${green}, B: ${blue}`); // Debugging line
        return `rgb(${red}, ${green}, ${blue})`; // Return the RGB string
    }
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    const debouncedResize = debounce(() => {
        resizeCanvas();
        if (window.updateMusicPlayerPosition) {
            window.updateMusicPlayerPosition();
        }
    }, 250);

    window.addEventListener('resize', debouncedResize);
    resizeCanvas();

    // Initialize with the first track and set initial visualizer colors
    setMusic(0);
    updateVisualizerColors('background-scheme-1');

    // Particle behavior buttons
    document.querySelector('.button-container').addEventListener('click', (event) => {
        if (event.target.closest('.state-button')) {
            const button = event.target.closest('.state-button');
            const index = ['state1', 'state2', 'state3'].indexOf(button.id);
            if (index !== -1 && window.setParticleBehavior) {
                window.setParticleBehavior(index);
            }
            
            document.querySelectorAll('.state-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            if (window.innerWidth <= 768) {
                setTimeout(() => button.classList.remove('active'), 1000);
            } else {
                setTimeout(() => button.classList.remove('active'), 300);
            }
        }
    });

    // Update button state when audio plays or pauses due to other reasons
    music.addEventListener('play', updatePlayPauseButtonState);
    music.addEventListener('pause', updatePlayPauseButtonState);

    // Add event listener for when a song ends 
    music.addEventListener('ended', () => {
        currentMusic = (currentMusic + 1) % songs.length;
        setMusic(currentMusic);
        playMusic();
    });

    // Debounce function
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
});