const mongoose = require('mongoose');
require('dotenv').config();
const Song = require('./songs');

// Connect to MongoDB using environment variable
mongoose.connect(process.env.MONGODB_URI)
   .then(() => console.log('MongoDB connected'))
   .catch(err => console.log('MongoDB connection error:', err));

// Define getRandomColorScheme function
function getRandomColorScheme() {
    const colorSchemes = [
        'background-scheme-1',
        'background-scheme-2',
        'background-scheme-3',
        'background-scheme-4'
    ];
    return colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
}

// Song data (from data.js)
const songs = [
    {
        name: 'No Time (mattvalentine flip)',
        path: 'musics/notime.mp3',
        artist: 'by: Playboi Carti',
        cover: 'images/carti flip2.jpg',
        colorScheme: 'background-scheme-1' // Set initial color scheme for the first song
    },
    {
        name: 'Ur The Moon (mattvalentine flip)',
        path: 'musics/urthemoon.mp3',
        artist: 'by: Playboi Carti',
        cover: 'images/carti flip3.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'Root Of All (mattvalentine flip)',
        path: 'musics/rootofallflip.mp3',
        artist: 'by: Lucki',
        cover: 'images/rootofall.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'God (mattvalentine flip)',
        path: 'musics/godflip.mp3',
        artist: 'by: Bladee',
        cover: 'images/lockedin bundle.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'Backr00ms (mattvalentine flip)',
        path: 'musics/backr00msflip.mp3',
        artist: 'by: Playboi Carti',
        cover: 'images/carti flip.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'Carnival (matt valentine flip)',
        path: 'musics/carnivalflip.mp3',
        artist: 'by: Kanye West',
        cover: 'images/kanye flip.png',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'Mubu (mattvalentine flip)',
        path: 'musics/mubuflip.mp3',
        artist: 'by: Lucki',
        cover: 'images/lucki flip.png',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'Sauce It Up (matt valentine flip)',
        path: 'musics/sauceitupflip.mp3',
        artist: 'by: Lil Uzi Vert',
        cover: 'images/uzi flip.png',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'LockedIn Promo Beat 1',
        path: 'musics/promobeat1.mp3',
        artist: 'by: mattvalentine',
        cover: 'images/lockedin bundle.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'LockedIn Promo Beat 2',
        path: 'musics/promobeat2.mp3',
        artist: 'by: mattvalentine',
        cover: 'images/lockedin bundle.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'Grand Prix',
        path: 'musics/grandprix.mp3',
        artist: 'by: mattvalentine + ferragama',
        cover: 'images/grand prix.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'Degen (prod. mattvalentine)',
        path: 'musics/degen.mp3',
        artist: 'by: Ferragama',
        cover: 'images/degen.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'offa60anda10 (prod. mattvalentine)',
        path: 'musics/offa60anda10.mp3',
        artist: 'by: Ferragama',
        cover: 'images/offa60anda10.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'So High (mattvalentine flip)',
        path: 'musics/so high.mp3',
        artist: 'by: Grind Mode',
        cover: 'images/so high.jpg',
        colorScheme: getRandomColorScheme() // Randomly assigned
    },
    {
        name: 'Downshift',
        path: 'musics/downshift.mp3',
        artist: 'by: mattvalentine',
        cover: 'images/downshift.png',
        colorScheme: getRandomColorScheme() // Randomly assigned
    }
];

// Check how the audio paths are stored in the database
console.log('Sample audio path:', songs[0].path);

// Function to seed the database
const seedSongs = async () => {
    try {
        await Song.deleteMany(); // Optional: Clear any existing data
        const result = await Song.insertMany(songs);
        console.log(`${result.length} songs added to the database`);
        mongoose.connection.close(); // Close the connection after seeding
    } catch (err) {
        console.log('Error seeding database:', err);
        mongoose.connection.close();
    }
 };
 
 // Call the seed function
 seedSongs();
