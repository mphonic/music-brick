import Store from "electron-store";
import angular from "angular";
import { ipcRenderer } from "electron";
import arrToBase64 from "../helpers/arrToBase64.js";

const _store = new WeakMap();

const _pd = new WeakMap();
const _handleLoadPromise = new WeakMap();
const _sp = new WeakMap();
const _scope = new WeakMap();

export default class PlayerControl {

    constructor($scope, $window, PlaylistDialog) {
        var loadedData;
        this.plr = $scope.player;
        this.percentFilesLoaded = 0;
        this.showPlaylistDialog = false;
        this.focusedItem = 0;

        // broadcast from the PlaylistDialog service when files
        // are being loaded
        $scope.$on('file-progress', (e, a) => {
            this.screenMsg = 'Getting file information...';
            this.percentFilesLoaded = 100 * a.loaded / a.total;
            $scope.$apply();
        });

        // when playlist auto-advances, update focusedItem
        $scope.$on('player-advance', (e, a) => {
            this.setFocusedItem(a.index);
        });

        // when files are dragged into the window
        $scope.$on('drag-received', (e, data) => {
            this.handleFileRequest(data);
        });

        _scope.set(this, $scope);

        _pd.set(this, PlaylistDialog);

        _handleLoadPromise.set(this, (promise) => {
            promise.then((list) => {
                if (list === 404) return;
                var plr = this.plr;
                if (list && list.length > 0) {
                    list.sort(function (a, b) {
                        if (a.tags.track < b.tags.track) return -1;
                        if (a.tags.track > b.tags.track) return 1;
                        return 0;
                    });
                    if (plr.playlist.length < 1) {
                        if (list[0].tags.picture) {
                            plr.currentImage = "data:" + list[0].tags.picture.format + ";base64," + arrToBase64(list[0].tags.picture.data);
                        } else {
                            if (list[0].images && list[0].images.length) {
                                plr.currentImage = list[0].images[0];
                            } else {
                                plr.currentImage = '';
                            }
                        }
                    }
                    plr.appendToPlaylist(list);
                    this.screenMsg = false;
                    this.percentFilesLoaded = 0;
                } else {
                    alert("Some items lacked audio file content.");
                }
            }, function (err) {
                alert(err);
            });
        });

        _store.set(this, new Store());
        // function to save a playlist based on a "sanitized" key
        _sp.set(this, (key, name) => {
            if(key) {
                var pl = angular.copy(this.plr.playlist);
                // clear out any howls so that the object can be serialized
                angular.forEach(pl, function (e, c) {
                    e.howl = null;
                });
                _store.get(this).set('playlists.' + key, pl);
                _store.get(this).set('playlistKeyMap.' + key, name);
            }
        });

        // see if file data appeared from OS
        // loadedData = ipcRenderer.sendSync('opened-with-file');
        // console.log(loadedData);

        if (!loadedData || loadedData === '.') {
            // get the default playlist on load
            this.loadPlaylist('default');
        } else {
            this.handleFileRequest({ files: loadedData });
        }

        // get the saved playlist names and keys
        this.savedPlaylists = this.getPlaylistKeyMap();
        
        // and save the default playlist when the app is closed
        $window.onbeforeunload = () => { _sp.get(this)('default', 'Default'); }
    }

    loadPlaylist(key) {
        var pl = _store.get(this).get('playlists.' + key);
        if (pl && pl.length) {
            var plr = this.plr;
            plr.setPlaylist(pl);
            if (pl[0].tags.picture) {
                plr.currentImage = "data:" + pl[0].tags.picture.format + ";base64," + arrToBase64(pl[0].tags.picture.data);
            } else {
                if (pl[0].images && pl[0].images.length) {
                    plr.currentImage = pl[0].images[0];
                } else {
                    plr.currentImage = '';
                }
            }
            this.playlistName = _store.get(this).get('playlistKeyMap.' + key);
            this.savePlaylistAs = (this.playlistName.toLowerCase() === 'default')?'':this.playlistName;
            plr.stop();
            this.setFocusedItem(0);
        }
        this.showPlaylistMenu = false;
    }

    appendPlaylist(key) {
        var pl = _store.get(this).get('playlists.' + key);
        if (pl && pl.length) {
            this.plr.playlist = this.plr.playlist.concat(pl);
        }
        this.showPlaylistMenu = false; 
    }

    savePlaylist(name) {
        var key, existing, doIt = true;
        if (!name) {
            alert('Please enter a playlist name.');
            return false;
        }
        if (name.toLowerCase() === 'default') {
            alert('Playlist cannot be named "default".');
            return false;
        }
        key = name.replace(/(^[^a-z])|([^a-z0-9])/ig, '');
        if (!key) {
            alert('Please use a letter or two.');
            return false;
        }
        existing = _store.get(this).get('playlistKeyMap.' + key);
        if (existing && existing.toLowerCase() === name.toLowerCase()) {
            doIt = confirm('Playlist exists. Overwrite?');
        } else if (existing) {
            key = key + Date.now() + Math.round(Math.random() * 1000);
        }
        if (doIt) {
            _sp.get(this)(key, name);
            this.showPlaylistDialog = false;
            this.playlistName = name;
            this.savedPlaylists = this.getPlaylistKeyMap();
            return true;
        }
        return false;
    }

    deletePlaylist(key) {
        if (confirm('Are you sure you want to delete this playlist?')) {
            _store.get(this).delete('playlists.' + key);
            _store.get(this).delete('playlistKeyMap.' + key);
        }
        this.savedPlaylists = this.getPlaylistKeyMap();
    }

    getPlaylistKeyMap() {
        var playlists = _store.get(this).get('playlistKeyMap'),
            playlistInfo = [];
        for (var k in playlists) {
            if (k !== 'default') {
                playlistInfo.push({ 
                    name: playlists[k],
                    key: k
                });
            }
        }
        return playlistInfo;
    }

    clearPlaylist() {
        this.plr.stop();
        this.plr.setPlaylist([]);
    }

    setFocusedItem(index) {
        this.focusedItem = index;
        _scope.get(this).$broadcast('focused-item', this.focusedItem);
    }

    removeFocusedItem(plr) {
        var index = this.focusedItem,
            plr = this.plr;
        index = this.focusedItem;
        this.removePlaylistItem(index);
        this.setFocusedItem(Math.min(index, plr.playlist.length - 1));
    }

    removePlaylistItem(index) {
        var  plr = this.plr;
        if (index === plr.currentIndex && plr.nowPlaying) {
            plr.stop();
        }
        plr.removeFromPlaylist(index);
        if (this.focusedItem > index) {
            this.focusedItem--;
        }
    }

    getSortListeners() {
        // for ng-sortable
        return {
            accept: function () { return true },
            orderChanged: (e) => {
                var fi = this.focusedItem,
                    dest = e.dest.index,
                    source = e.source.index;
                    
                this.plr.respondToOrderChange(dest, source);

                if (fi === source) {
                    this.setFocusedItem(dest);
                } else if (fi >= dest && fi < source) {
                    this.setFocusedItem(this.focusedItem + 1);
                } else if (fi <= dest && fi > source) {
                    this.setFocusedItem(this.focusedItem - 1);
                }
            },
            containment: '.playlist',
            clone: false,
            allowDuplicates: false,
        }
    }

    handleFileRequest(data) {
        var promise, 
            folders = [], 
            files = [];
        angular.forEach(data.files, (e, c) => {
            if (!e.type) {
                promise = _pd.get(this).loadFolderContent(e.path, true);
                _handleLoadPromise.get(this)(promise);
            } else {
                files.push(e);
            }
        });
        if (files.length) {
            promise = _pd.get(this).openFileList(files);
            _handleLoadPromise.get(this)(promise);
        }
    }

    openDialog(type) {
        var promise = _pd.get(this).initiateFileDialog(type);
        _handleLoadPromise.get(this)(promise);
    }
}