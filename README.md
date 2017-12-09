# music-brick

A minimalistic but fully functional, cross-platform music player developed with [Electron runtime](http://electron.atom.io) and [AngularJS](https://angularjs.org).

# Quick start

The sole development dependency of this project is [Node.js](https://nodejs.org), so make sure you have it installed.

Then type the following commands:

```

git clone https://github.com/mphonic/music-brick.git

cd music-brick

npm install

npm start

```

To build a standalone app on your platform:

```

npm run release

```

This will create an installer in the dist directory.

# Basic Usage

Most functions are common and self-explantory. If no playlist is loaded on start, you will be prompted to open file(s), a folder, or, if playlists exist, a playlist. Folders are not read recursively, so only valid audio files directly in the selected folder will be loaded. Once a playlist is loaded, you can add to it by selecting more files or folders using the appropriate icon or by simply dragging files or folders on to the player window.

[HowlerJS](https://howlerjs.com/) is the library used to play audio files, so any of its supported formats should work: 

* mp3 
* mpeg 
* opus
* ogg
* oga
* wav
* aac
* caf
* m4a
* mp4
* weba
* webm
* dolby
* flac

Playlists can be edited by dragging track titles, using key commands, and swiping left from the right edge to expose a "Remove" button. Original files are not affected.

### Key Commands

Most functions can be accomplished using the keyboard:

* Space bar: toggle play / pause
* Arrow Up / Down: select next / previous item in playlist
* Arrow Left / Right: skip forwards / backwards
* Enter: play selected track
* Backspace / Del: remove selected track from playlist
* s: open save playlist dialog
* p: toggle playlist menu
* f: open file menu
* d: open folder menu
* c: clear playlist

# Motivations

I had two primary motivations for building this app:

1.   I wanted a straightforward music player that didn't try to connect me to "the cloud" or offer me advice or copy files into its own library. I wanted it to be light on CPU and memory. I wanted to store music anywhere I wanted in whatever format. I wanted to easily load music from network drives.
2.   I wanted to see what it was like to build something with Electron and AngularJS, using ES6 syntax. 

Regarding #2, I was able to build a fully-functional version of this app in about three light days without significant pain or struggle (with the help of [electron-boilerplate](https://github.com/szwacz/electron-boilerplate)). I'm pleased with the combination of these frameworks.

Regarding #1, this is currently my go-to music player for general listening.

# Thoughts and Improvements

Because the app was developed rather quickly by someone with mostly personal motivations, there are a few things that could be added / improved to make it less beta:

*  The app is not very "defensive". For instance, if you load a playlist that references files that are no longer where they used to be, you'll experience silent failures when you try to play those files. 
* Touch support is ok but not great. Most functions can be handled with a purely touch interface, but a) swipe gestures don't feel as responsive or reliable as they should; b) scrolling through a long playlist using touch gestures doesn't really work. Probably the best solution is to create custom directives to handle touch events, rather than using a couple different libraries (as-sortable and ng-swipe).
* The design could be better. I think it looks totally fine, but really good design takes time, and I didn't take that time.
* The design could be responsive. This wouldn't be very difficult to implement, and then there could be both full-screen and extremely minimal views, for instance.
* Bootstrap. I have an unreasonable dislike for Bootstrap, but it would likely be much simpler to do collaborative design had I used it.
* Renaming playlists. This is also simple to implement, and the only thing that held me back was the thought of adding yet another interface icon and deciding where to put it. Right now, you can load a playlist, save it under a new name, and delete the old one.
* Opening files and folders from the Finder / File Explorer. I believe that this is also just a few simple steps away (and there is some commented out code that points in the right direction), but I found it difficult to test this functionality with the way electron-boilerplate is set up. I need to look into this a little further.