import Store from "electron-store";
import angular from "angular";
import arrToBase64 from "../helpers/arrToBase64.js";

const _store = new WeakMap();

const _pd = new WeakMap();
const _sp = new WeakMap();

export default class PlayerControl {

    constructor($scope, $window, PlaylistDialog) {
        this.plr = $scope.player;
        this.percentFilesLoaded = 0;
        this.showPlaylistDialog = false;

        // broadcast from the PlaylistDialog service when files
        // are being loaded
        $scope.$on('file-progress', (e, a) => {
            this.screenMsg = 'Getting file information...';
            this.percentFilesLoaded = 100 * a.loaded / a.total;
            $scope.$apply();
        });

        // when playlist auto-advances, update focusedItem
        $scope.$on('player-advance', (e, a) => {
            this.focusedItem = a.index;
        });

        _pd.set(this, PlaylistDialog);

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

        // get the default playlist on load
        this.loadPlaylist('default');
        // get the saved playlist names and keys
        this.savedPlaylists = this.getPlaylistKeyMap();
        // and save the default playlist when the app is closed
        $window.onbeforeunload = () => { _sp.get(this)('default', 'Default'); }
    }

    loadPlaylist(key) {
        var pl = _store.get(this).get('playlists.' + key);
        if (pl && pl.length) {
            var plr = this.plr;
            plr.playlist = pl;
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
            this.focusedItem = 0;
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
        this.plr.playlist = [];
    }

    setFocusedItem(index, e) {
        // if (e.shiftKey)
        alert(e.which);
        this.focusedItem = index;
    }

    removeFocusedItem(plr) {
        var index = this.focusedItem,
            plr = this.plr;
        index = this.focusedItem;
        this.removePlaylistItem(index);
        this.focusedItem = Math.min(index, plr.playlist.length - 1);
    }

    removePlaylistItem(index) {
        var  plr = this.plr;
        if (index === plr.currentIndex && plr.nowPlaying) {
            plr.stop();
        }
        plr.playlist.splice(index, 1);
        if (plr.currentIndex > index) {
            plr.currentIndex--;
        }
        if (this.focusedItem > index) {
            this.focusedItem--;
        }
    }

    getSortListeners() {
        // for ng-sortable
        return {
            accept: function () { return true },
            orderChanged: (e) => {
                var ci = this.plr.currentIndex,
                    fi = this.focusedItem,
                    dest = e.dest.index,
                    source = e.source.index;
                if (ci === source) {
                    this.plr.currentIndex = dest;
                } else if (ci >= dest && ci < source) {
                    this.plr.currentIndex++;
                } else if (ci <= dest && ci > source) {
                    this.plr.currentIndex--;
                }

                if (fi === source) {
                    this.focusedItem = dest;
                } else if (fi >= dest && fi < source) {
                    this.focusedItem++;
                } else if (fi <= dest && fi > source) {
                    this.focusedItem--;
                }
            },
            containment: '#playlist',
            clone: false,
            allowDuplicates: false,
        }
    }

    openDialog(type) {
        var promise = _pd.get(this).initiateFileDialog(type);
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
                plr.playlist = plr.playlist.concat(list);
                this.screenMsg = false;
                this.percentFilesLoaded = 0;
            } else {
                alert("No valid audio files found.");
            }
        }, function(err) {
            alert(err);
        });
    }
}