// Ensure this function is defined globally
window.getVisualizerColorsForScheme = function(scheme) {
    console.log('Getting visualizer colors for scheme:', scheme);
    switch (scheme) {
        case 'background-scheme-1':
            return {
                r: value => Math.min(255, value * 0.8 + 50),
                g: value => Math.min(175, value * 0.5 + 30),
                b: value => Math.min(150, value * 0.4 + 20)
            };
        case 'background-scheme-2':
            return {
                r: value => Math.min(100, value * 0.3 + 20),
                g: value => Math.min(180, value * 0.6 + 40),
                b: value => Math.min(200, value * 0.7 + 50)
            };
        case 'background-scheme-3':
            return {
                r: value => Math.min(80, value * 0.2 + 30),
                g: value => Math.min(200, value * 0.7 + 50),
                b: value => Math.min(150, value * 0.4 + 40)
            };
        case 'background-scheme-4':
            return {
                r: value => Math.min(150, value * 0.5 + 40),
                g: value => Math.min(100, value * 0.3 + 30),
                b: value => Math.min(180, value * 0.6 + 50)
            };
        default:
            console.warn('Unknown color scheme:', scheme);
            return {
                r: value => value,
                g: value => value,
                b: value => value
            };
    }
};

// Ensure this function is defined globally
window.updateVisualizerColors = function(scheme) {
    console.log('Updating visualizer colors for scheme:', scheme);
    window.visualizerColors = window.getVisualizerColorsForScheme(scheme);
    console.log('New visualizer colors:', window.visualizerColors);
};

// Make sure these variables are defined globally
window.visualizerColors = {
    r: value => value,
    g: value => value,
    b: value => value
};

window.backgroundSchemes = ['background-scheme-1', 'background-scheme-2', 'background-scheme-3', 'background-scheme-4'];

document.addEventListener('DOMContentLoaded', () => {
    let currentMusic = 0;
    let audioContext, analyser, dataArray, source, gainNode;
    let isVisualizerStarted = false;

    let music = document.getElementById('audio');
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

    let songs = [];

    // Add this function to get a random color scheme
    function getRandomColorScheme() {
        return window.backgroundSchemes[Math.floor(Math.random() * window.backgroundSchemes.length)];
    }

    fetch('/api/songs')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Fetched songs:', data);
        
        // Check if we have valid song data
        if (!data || data.length === 0) {
            throw new Error('No songs available');
        }
        
        // Validate song paths
        data.forEach((song, index) => {
            console.log(`Song ${index}: ${song.name}, Path: ${song.path}`);
            if (!song.path) {
                console.error(`Song ${index} (${song.name}) has no path`);
            }
        });
        
        songs = data.map((song, index) => {
            // Always assign a new random color scheme, except for the first song
            if (index === 0) {
                song.colorScheme = 'background-scheme-1';
            } else {
                song.colorScheme = getRandomColorScheme();
            }
            return song;
        });
        
        if (songs.length > 0) {
            console.log('Setting initial song...');
            setMusic(0);
        } else {
            console.error('No songs available to play.');
            alert('No songs available to play.');
        }
        
        // Log the assigned color schemes for debugging
        songs.forEach((song, index) => {
            console.log(`Song ${index + 1}: ${song.name} - Scheme: ${song.colorScheme}`);
        });
    })
    .catch(error => {
        console.error('Error fetching songs:', error);
        alert('Error loading songs: ' + error.message);
    });

    // Add this function to refresh signed URLs when needed
    async function refreshSignedUrl(key) {
        try {
            console.log('Refreshing signed URL for:', key);
            const response = await fetch(`/api/refresh-url/${key}`);
            if (!response.ok) {
                throw new Error(`Failed to refresh URL: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Received new signed URL');
            return data.url;
        } catch (error) {
            console.error('Error refreshing signed URL:', error);
            return null;
        }
    }

    // Add this function to handle audio errors
    function handleAudioError(audioElement, sourcePath) {
        console.error('Audio playback error for source:', sourcePath);
        
        // Display a user-friendly error message
        showErrorMessage(`Unable to play "${songs[currentMusic].name}". The audio file may be unavailable in S3 storage. Please try again later or contact support.`);
        
        // Log detailed error information for debugging
        if (audioElement.error) {
            console.error('Media error code:', audioElement.error.code);
            console.error('Media error message:', audioElement.error.message);
        }
        
        // Update UI to reflect the error state
        pauseMusic();
        disk.classList.remove('play');
        
        // Optionally, try to play the next song if available
        if (songs.length > 1) {
            console.log('Attempting to play next song...');
            setTimeout(() => {
                currentMusic = (currentMusic + 1) % songs.length;
                setMusic(currentMusic);
                playMusic();
            }, 2000); // Wait 2 seconds before trying the next song
        }
    }
    
    // Function to show error messages to the user
    function showErrorMessage(message) {
        console.error(message);
        
        // Create or update error message element
        let errorElement = document.getElementById('player-error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'player-error-message';
            errorElement.style.color = 'red';
            errorElement.style.padding = '10px';
            errorElement.style.margin = '10px 0';
            errorElement.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            errorElement.style.borderRadius = '5px';
            errorElement.style.textAlign = 'center';
            
            // Insert after the player controls
            const playerControls = document.querySelector('.music-player');
            if (playerControls) {
                playerControls.parentNode.insertBefore(errorElement, playerControls.nextSibling);
            } else {
                document.body.appendChild(errorElement);
            }
        }
        
        errorElement.textContent = message;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 10000);
    }

    function setMusic(i) {
        try {
            console.log('Songs array:', songs);  // Log the songs array
            console.log('Setting song at index:', i);  // Log the index being set
    
            // Check if songs array is populated
            if (songs.length === 0) {
                throw new Error('No songs available to play. The songs array is empty.');
            }
    
            // Check if the index is valid
            if (i < 0 || i >= songs.length) {
                throw new Error(`Invalid index: ${i}. Index must be between 0 and ${songs.length - 1}.`);
            }
    
            const song = songs[i];
    
            // Check if the song object is valid
            if (!song || !song.path || !song.name || !song.artist || !song.cover) {
                throw new Error(`Song data is missing or incomplete at index ${i}. Please check the song object: ${JSON.stringify(song)}`);
            }
    
            // Proceed with setting the song
            seekBar.value = 0;
            currentMusic = i;
            
            // Log the audio source URL for debugging
            console.log('Setting audio source to:', song.path);
            
            // Clear any previous errors and event listeners
            music.removeAttribute('crossorigin');
            music.src = '';
            
            // Remove any previous event listeners to avoid duplicates
            const clonedAudio = music.cloneNode(false);
            music.parentNode.replaceChild(clonedAudio, music);
            music = clonedAudio;
            
            // Add crossorigin attribute for S3 URLs
            if (song.path.includes('amazonaws.com') || song.path.startsWith('/api/stream/')) {
                music.setAttribute('crossorigin', 'anonymous');
                console.log('Added crossorigin attribute for S3 URL');
            }
            
            // Set the source
            music.src = song.path;
            console.log('Audio element src set to:', music.src);
            
            // Force a reload of the audio element
            music.load();
            console.log('Audio element reloaded');
    
            // Update UI elements
            songName.textContent = song.name;
            artistName.textContent = song.artist;
            
            // Log the cover image URL for debugging
            console.log('Setting disk image to:', song.cover);
            
            // Handle S3 URLs for cover images
            disk.style.backgroundImage = `url('${song.cover}')`;
    
            currentTime.textContent = '00:00';
            musicDuration.textContent = 'Loading...';

            attachAudioEventListeners();

            // Try to play automatically when ready
            music.play().catch(e => {
                console.error('Error playing audio:', e);
            });
        } catch (error) {
            console.error('Error in setMusic:', error.message);
            alert('Error setting music: ' + error.message);
        }
    }

    function attachAudioEventListeners() {
        music.addEventListener('loadedmetadata', () => {
            console.log('Audio metadata loaded');
            console.log('Duration:', music.duration);
            
            // Set the max value of the seek bar to the duration of the song
            seekBar.max = music.duration;
            
            // Update the duration display
            musicDuration.textContent = formatTime(music.duration);
            
            // Try to play automatically when ready
            music.play().catch(e => {
                console.error('Error playing audio:', e);
            });
        });
        
        // Handle music playback errors
        music.addEventListener('error', async (e) => {
            console.error('Audio playback error:', e);
            console.error('Audio error code:', music.error ? music.error.code : 'unknown');
            console.error('Audio error message:', music.error ? music.error.message : 'unknown');
            console.error('Audio source that failed:', music.src);
            
            // Handle the error with improved S3-specific error handling
            handleAudioError(music, songs[currentMusic].path);
        });
        
        // Add canplay event listener
        music.addEventListener('canplay', () => {
            console.log('Audio can play now');
            // Try to play automatically when ready
            music.play().catch(e => {
                console.error('Error playing audio:', e);
            });
        });

        // Add timeupdate event listener to update the seek bar and time display during playback
        music.addEventListener('timeupdate', updateTime);
        
        // Update visuals
        if (songs && songs[currentMusic]) {
            console.log('Setting music for index:', currentMusic);
            console.log('Song color scheme:', songs[currentMusic].colorScheme);
            updateBackgroundScheme(currentMusic); // Update background scheme
            window.updateVisualizerColors(songs[currentMusic].colorScheme); // Set visualizer colors
        }
    }

    function updateTime() {
        // Check if the audio is actually playing and has a valid duration
        if (!isNaN(music.currentTime) && !isNaN(music.duration) && music.duration > 0) {
            // Update the seek bar value
            seekBar.max = music.duration;
            seekBar.value = music.currentTime;
            
            // Update the time display
            currentTime.textContent = formatTime(music.currentTime);
            musicDuration.textContent = formatTime(music.duration);
            
            // Update the seek bar fill
            updateSeekBarFill();
        }
    }

    // Update seek bar when user interacts with it
    seekBar.addEventListener('input', () => {
        if (!isNaN(music.duration) && music.duration > 0) {
            music.currentTime = seekBar.value;
            currentTime.textContent = formatTime(seekBar.value);
            updateSeekBarFill();
        }
    });

    function updateSeekBarFill() {
        if (isNaN(music.currentTime) || isNaN(music.duration) || music.duration === 0) return;
        
        const percent = (music.currentTime / music.duration) * 100;
        const seekBarFill = document.querySelector('.seek-bar-fill');
        
        if (seekBarFill) {
            // Update the fill width
            seekBarFill.style.width = `${percent}%`;
            console.log(`Updating seek bar: ${percent.toFixed(2)}%, Current Time: ${music.currentTime.toFixed(2)}`);
        } else {
            console.error('Seek bar fill element not found');
        }
    }

    // Function to show error messages to the user
    function showErrorMessage(message) {
        console.error(message);
        
        // Create or update error message element
        let errorElement = document.getElementById('player-error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'player-error-message';
            errorElement.style.color = 'red';
            errorElement.style.padding = '10px';
            errorElement.style.margin = '10px 0';
            errorElement.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            errorElement.style.borderRadius = '5px';
            errorElement.style.textAlign = 'center';
            
            // Insert after the player controls
            const playerControls = document.querySelector('.music-player');
            if (playerControls) {
                playerControls.parentNode.insertBefore(errorElement, playerControls.nextSibling);
            } else {
                document.body.appendChild(errorElement);
            }
        }
        
        errorElement.textContent = message;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 10000);
    }

    function updateBackgroundScheme(index) {
        if (songs.length === 0 || !songs[index]) {
            console.error('No song available for the given index:', index);
            return; // Prevent errors if the song is undefined
        }
        const musicPlayer = document.querySelector('.music-player');
        const visualizerContainer = document.querySelector('.visualizer-container');
        const newScheme = songs[index].colorScheme;

        musicPlayer.classList.remove(...window.backgroundSchemes);
        musicPlayer.classList.add(newScheme);
        
        visualizerContainer.classList.remove(...window.backgroundSchemes);
        visualizerContainer.classList.add(newScheme);
    
        console.log('Updating background scheme for index:', index);
        console.log('New color scheme:', newScheme);
        window.updateVisualizerColors(newScheme);
    };

    // Make updateBackgroundScheme globally accessible
    window.updateBackgroundScheme = updateBackgroundScheme;

    let isAdjusting = false;

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

    // Volume control events
    volumeBar.addEventListener('mousedown', handleVolumeStart);
    document.addEventListener('mousemove', handleVolumeMove);
    document.addEventListener('mouseup', handleVolumeEnd);
    volumeBar.addEventListener('touchstart', handleVolumeStart, { passive: false });
    document.addEventListener('touchmove', handleVolumeMove, { passive: false });
    document.addEventListener('touchend', handleVolumeEnd, { passive: false });

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

    function formatTime(time) {
        const min = String(Math.floor(time / 60)).padStart(2, '0');
        const sec = String(Math.floor(time % 60)).padStart(2, '0');
        return `${min}:${sec}`;
    }

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
        try {
            console.log('Attempting to play music...');
            
            // Check if the audio source is set
            if (!music.src) {
                console.error('No audio source set');
                return;
            }
            
            console.log('Playing audio from source:', music.src);
            
            // Use the play() Promise API
            const playPromise = music.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Audio playback started successfully');
                    disk.classList.add('play');
                    playBtn.classList.add('pause');
                    
                    if (!isVisualizerStarted && window.onPlaybackStart) {
                        window.onPlaybackStart();
                        window.onAudioPlay();
                        isVisualizerStarted = true;
                    }
                    
                    // Initialize audio context if needed
                    if (!audioContext) {
                        initAudio();
                    }
                    
                }).catch(error => {
                    console.error('Error playing audio:', error);
                    handleAudioError(error);
                });
            }
        } catch (error) {
            console.error('Exception in actuallyPlayMusic:', error);
            handleAudioError(error);
        }
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
        const { r, g, b } = window.visualizerColors;
        const red = Math.floor(r(value));
        const green = Math.floor(g(value));
        const blue = Math.floor(b(value));
    
        // Log the color values for debugging
        console.log(`Value: ${value}, Red: ${red}, Green: ${green}, Blue: ${blue}`);
    
        return `rgb(${red}, ${green}, ${blue})`;
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
    // setMusic(0); // Removed to prevent premature call

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

    console.log('Songs array before setting music:', songs);
});