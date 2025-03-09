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
    
    // Ensure the audio element doesn't have a default source
    if (music && music.src) {
        if (music.src === window.location.origin + '/' || music.src === 'https://wpfs.netlify.app/') {
            console.log('Removing default audio source to prevent fallback to Netlify URL');
            music.removeAttribute('src');
        }
    }
    
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

    async function fetchSongs() {
        try {
            console.log('Fetching songs from API...');
            const response = await fetch('/.netlify/functions/songs');
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error fetching songs: ${response.status} ${response.statusText}`);
                console.error(`Response body: ${errorText}`);
                throw new Error(`Failed to fetch songs: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Songs fetched successfully:', data);
            return data;
        } catch (error) {
            console.error('Error fetching songs:', error);
            displayError(`Failed to load songs: ${error.message}`);
            return [];
        }
    }

    function displayError(message) {
        const errorContainer = document.getElementById('error-container') || createErrorContainer();
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }

    function createErrorContainer() {
        const container = document.createElement('div');
        container.id = 'error-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        container.style.color = 'white';
        container.style.padding = '10px 20px';
        container.style.borderRadius = '5px';
        container.style.zIndex = '1000';
        container.style.display = 'none';
        document.body.appendChild(container);
        return container;
    }

    async function loadSong(song) {
        try {
            if (!song || !song.path) {
                console.error('Invalid song or song path is missing');
                displayError('Cannot play this song: missing file path');
                return false;
            }
            
            console.log(`Loading song: ${song.title}, path: ${song.path}`);
            
            // Extract the filename from the path
            const filename = song.path.split('/').pop();
            console.log(`Extracted filename: ${filename}`);
            
            // Try to get a signed URL from the stream function
            try {
                console.log(`Fetching signed URL for: ${filename}`);
                const streamResponse = await fetch(`/.netlify/functions/stream/${filename}`);
                
                if (!streamResponse.ok) {
                    const errorText = await streamResponse.text();
                    console.error(`Error fetching stream URL: ${streamResponse.status} ${streamResponse.statusText}`);
                    console.error(`Response body: ${errorText}`);
                    throw new Error(`Failed to get stream URL: ${streamResponse.status}`);
                }
                
                const streamData = await streamResponse.json();
                
                if (streamData && streamData.url) {
                    console.log(`Received signed URL: ${streamData.url.substring(0, 100)}...`);
                    music.src = streamData.url;
                    music.load();
                    return true;
                } else {
                    console.error('No URL in stream response:', streamData);
                    throw new Error('No streaming URL available');
                }
            } catch (streamError) {
                console.error('Error getting stream URL:', streamError);
                
                // Try the refresh-url function as a fallback
                try {
                    console.log(`Trying refresh-url function for: ${filename}`);
                    const refreshResponse = await fetch(`/.netlify/functions/refresh-url/${filename}`);
                    
                    if (!refreshResponse.ok) {
                        throw new Error(`Failed to refresh URL: ${refreshResponse.status}`);
                    }
                    
                    const refreshData = await refreshResponse.json();
                    
                    if (refreshData && refreshData.url) {
                        console.log(`Received refreshed URL: ${refreshData.url.substring(0, 100)}...`);
                        music.src = refreshData.url;
                        music.load();
                        return true;
                    } else {
                        throw new Error('No URL in refresh response');
                    }
                } catch (refreshError) {
                    console.error('Error refreshing URL:', refreshError);
                    displayError(`Cannot play this song: ${refreshError.message}`);
                    return false;
                }
            }
        } catch (error) {
            console.error('Error loading song:', error);
            displayError(`Cannot play this song: ${error.message}`);
            return false;
        }
    }

    async function refreshSignedUrl(key) {
        try {
            console.log('Refreshing signed URL for:', key);
            const response = await fetch(`/.netlify/functions/refresh-url/${key}`);
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

    function displayErrorMessage(message) {
        const errorContainer = document.getElementById('error-container') || createErrorContainer();
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 10000);
    }
    
    function createErrorContainer() {
        const container = document.createElement('div');
        container.id = 'error-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        container.style.color = 'white';
        container.style.padding = '15px 20px';
        container.style.borderRadius = '5px';
        container.style.zIndex = '1000';
        container.style.display = 'none';
        document.body.appendChild(container);
        return container;
    }

    fetchSongs()
    .then(data => {
        console.log('Fetched songs:', data);
        
        if (!data || data.length === 0) {
            console.error('No songs available');
            throw new Error('No songs available');
        }
        
        // Validate song paths
        data.forEach((song, index) => {
            console.log(`Song ${index}: ${song.name}, Path: ${song.path}`);
            if (!song.path) {
                console.error(`Song ${index} (${song.name}) has no path`);
            }
        });
        
        // Update the stream path to work with Netlify Functions
        console.log('Processing songs for S3 streaming...');
        const songsWithS3Urls = data.map(song => {
            const songObj = song;
            
            // Update the path to use the Netlify Functions streaming endpoint
            if (songObj.path && !songObj.path.startsWith('/.netlify/functions/stream/')) {
                // If it's using the old /api/stream/ format, update it
                if (songObj.path.startsWith('/api/stream/')) {
                    songObj.path = songObj.path.replace('/api/stream/', '/.netlify/functions/stream/');
                } else {
                    songObj.path = `/.netlify/functions/stream/${songObj.path}`;
                }
                console.log(`Converted path to: ${songObj.path}`);
            }
            
            return songObj;
        });
        
        songs = songsWithS3Urls.map((song, index) => {
            // Always assign a new random color scheme, except for the first song
            if (index === 0) {
                song.colorScheme = 'background-scheme-1';
            } else {
                song.colorScheme = getRandomColorScheme();
            }
            return song;
        });
        
        // Make songs available globally
        window.songs = songs;
        
        // Dispatch a custom event to notify that songs are loaded
        const songsLoadedEvent = new Event('songsLoaded');
        window.dispatchEvent(songsLoadedEvent);
        console.log('Dispatched songsLoaded event');
        
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

    function setMusic(i) {
        // Check if the songs array is empty
        if (songs.length === 0) {
            throw new Error('No songs available to play. The songs array is empty.');
        }
        
        // Validate the index
        if (i < 0 || i >= songs.length) {
            console.error(`Invalid song index: ${i}. Must be between 0 and ${songs.length - 1}`);
            i = 0; // Default to the first song
        }
        
        // Proceed with setting the song
        const song = songs[i];
        currentMusic = i;
        
        // Update the UI with the current song info
        songName.textContent = song.name;
        artistName.textContent = song.artist;
        
        // Log the cover image URL for debugging
        console.log('Setting disk image to:', song.cover);
        
        // Handle S3 URLs for cover images
        disk.style.backgroundImage = `url('${song.cover}')`;
        
        currentTime.textContent = '00:00';
        musicDuration.textContent = 'Loading...';

        // Create a new audio element to avoid any issues with the previous one
        const clonedAudio = document.createElement('audio');
        clonedAudio.id = 'audio';
        
        // Copy event listeners from the old audio element
        clonedAudio.onplay = music.onplay;
        clonedAudio.onpause = music.onpause;
        clonedAudio.ontimeupdate = music.ontimeupdate;
        clonedAudio.onended = music.onended;
        clonedAudio.onerror = music.onerror;
        
        // Replace the old audio element with the new one
        music.parentNode.replaceChild(clonedAudio, music);
        music = clonedAudio;
        
        // Attach event listeners to the new audio element
        attachAudioEventListeners();
        
        // Add crossorigin attribute for S3 URLs
        music.setAttribute('crossorigin', 'anonymous');
        console.log('Added crossorigin attribute for S3 URL');
        
        // Set the audio source
        if (song.path) {
            // Load the audio from the stream URL
            loadSong(song)
                .then(success => {
                    if (!success) {
                        console.error('Failed to load audio from stream URL');
                        handleAudioError(new Error('Failed to load audio from stream URL'));
                    }
                })
                .catch(error => {
                    console.error('Error loading audio:', error);
                    handleAudioError(error);
                });
        } else {
            console.error('Song path is undefined or empty');
            handleAudioError(new Error('Song path is undefined or empty'));
        }
        
        // Update the background color scheme based on the song
        updateBackgroundScheme(song.colorScheme || getRandomColorScheme());
        
        // Update the visualizer color
        if (song.visualizerColor) {
            visualizerColor = song.visualizerColor;
            console.log('Updated visualizer color:', visualizerColor);
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

    function updateBackgroundScheme(indexOrScheme) {
        // If it's a string (color scheme), we use it directly
        if (typeof indexOrScheme === 'string') {
            const musicPlayer = document.querySelector('.music-player');
            const visualizerContainer = document.querySelector('.visualizer-container');
            const newScheme = indexOrScheme;
    
            musicPlayer.classList.remove(...window.backgroundSchemes);
            musicPlayer.classList.add(newScheme);
            
            visualizerContainer.classList.remove(...window.backgroundSchemes);
            visualizerContainer.classList.add(newScheme);
        
            console.log('Updating background scheme with scheme:', newScheme);
            window.updateVisualizerColors(newScheme);
            return;
        }
        
        // Otherwise, treat it as an index
        const index = indexOrScheme;
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
    }

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

    // Add play button event listener
    playBtn.addEventListener('click', () => {
        console.log('Play button clicked');
        togglePlayPause();
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
        console.log('Toggle play/pause called, current state:', music.paused ? 'paused' : 'playing');
        if (music.paused) {
            playMusic();
        } else {
            pauseMusic();
        }
    }

    function updatePlayPauseButtonState() {
        playBtn.classList.toggle('pause', !music.paused);
        // Make sure disk animation state matches audio state
        if (music.paused) {
            disk.classList.remove('play');
        } else {
            disk.classList.add('play');
        }
        console.log('Updated play/pause button state:', music.paused ? 'paused' : 'playing');
    }

    function playMusic() {
        initAudio();
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                actuallyPlayMusic();
            }).catch(error => {
                console.error('Error resuming audio context:', error);
                handleAudioError(music, music.src, error);
            });
        } else {
            actuallyPlayMusic();
        }
    }

    function actuallyPlayMusic() {
        if (!music.src) {
            console.error('No audio source set');
            displayError('No audio source available for this song');
            return;
        }
        
        console.log(`Attempting to play audio from source: ${music.src}`);
        
        // Check if the URL is valid
        if (music.src.startsWith('blob:') || 
            music.src.includes('s3.') || 
            music.src.includes('.netlify/functions/stream')) {
            
            // Valid source, attempt to play
            const playPromise = music.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Audio playback started successfully');
                        // Update UI for playing state
                        updatePlayPauseButtonState();
                        disk.classList.add('play');
                        
                        // Explicitly trigger particle system
                        if (window.ParticleSystem && window.ParticleSystem.ensureParticlesRunning) {
                            window.ParticleSystem.ensureParticlesRunning();
                        }
                        
                        // Set global flags for particle system in main.js
                        if (window.isPlaybackStarted !== undefined) {
                            window.isPlaybackStarted = true;
                        }
                        if (window.isAudioPlaying !== undefined) {
                            window.isAudioPlaying = true;
                        }
                        
                        // Legacy callbacks for compatibility
                        if (window.onAudioStart) {
                            window.onAudioStart();
                        }
                        if (window.onPlaybackStart) {
                            window.onPlaybackStart();
                        }
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        displayError(`Playback error: ${error.message}`);
                        // Reset UI for paused state
                        updatePlayPauseButtonState();
                        disk.classList.remove('play');
                    });
            }
        } else {
            console.error('Invalid audio source:', music.src);
            displayError('Invalid audio source');
            // Reset UI for paused state
            updatePlayPauseButtonState();
            disk.classList.remove('play');
        }
    }

    function pauseMusic() {
        music.pause();
        updatePlayPauseButtonState();
        disk.classList.remove('play');
        
        // Set global flags for particle system in main.js
        if (window.isAudioPlaying !== undefined) {
            window.isAudioPlaying = false;
        }
        
        // Explicitly stop particle system
        if (window.ParticleSystem && window.ParticleSystem.clearParticles) {
            window.ParticleSystem.clearParticles();
        }
        
        // Legacy callbacks for compatibility
        if (window.onAudioStop) {
            window.onAudioStop();
        }
        if (window.onPlaybackStop) {
            window.onPlaybackStop();
        }
        console.log('Music paused, volume:', music.volume);
    }

    function handleAudioError(audioElement, sourcePath, error) {
        console.error('Audio playback error for source:', sourcePath, error);
        
        let errorMessage = `Unable to play "${songs[currentMusic]?.name || 'song'}".`;
        
        if (error) {
            if (error.name === 'NotAllowedError') {
                errorMessage += ' Browser blocked autoplay. Please interact with the page first.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += ' The audio format is not supported by your browser.';
            } else if (error.name === 'AbortError') {
                errorMessage += ' Playback was aborted.';
            } else {
                errorMessage += ` ${error.message || 'The audio file may be unavailable in S3 storage.'}`;
            }
        } else {
            errorMessage += ' The audio file may be unavailable in S3 storage.';
        }
        
        displayError(errorMessage);
        
        // Try to play the next song if available
        if (songs.length > 1) {
            console.log('Attempting to play next song...');
            setTimeout(() => {
                nextMusic();
            }, 2000);
        }
    }

    function nextMusic() {
        currentMusic = (currentMusic + 1) % songs.length;
        setMusic(currentMusic);
        playMusic();
    }

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