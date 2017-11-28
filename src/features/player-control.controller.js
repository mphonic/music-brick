import Store from "electron-store";
import angular from "angular";
import arrToBase64 from "../helpers/arrToBase64.js";

const store = new Store();

const _pd = new WeakMap();

export default class PlayerControl {

    constructor($scope, PlaylistDialog) {
        this.plr = $scope.player;
        this.percentFilesLoaded = 0;

        // get the default playlist on load
        this.loadPlaylist(store.get('defaultPlaylist'));

        // drag sorting listeners
        this.sortListeners = {
            accept: function () { return true },
            orderChanged: (e) => {
                var ci = this.plr.currentIndex,
                    fi = this.plr.focusedItem,
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
                    this.plr.focusedItem = dest;
                } else if (fi >= dest && fi < source) {
                    this.plr.focusedItem++;
                } else if (fi <= dest && fi > source) {
                    this.plr.focusedItem--;
                }
                console.log(this.plr.playlist);
            },
            containment: '#playlist',
            clone: false, 
            allowDuplicates: false,
        };

        // so the link function remove an item responding to keypresses
        $scope.removeFocusedItem = this.removeFocusedItem;

        // broadcast from the PlaylistDialog service when files
        // are being loaded
        $scope.$on('file-progress', (e, a) => {
            this.screenMsg = 'Getting file information...';
            this.percentFilesLoaded = 100 * a.loaded / a.total;
            $scope.$apply();
        });

        _pd.set(this, PlaylistDialog);
    }

    loadPlaylist(pl) {
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
        }
    }

    savePlaylist(name) {
        if (name) {
            var doIt = true;
            if (store.get('customPlaylists.' + name)) {
                doIt = confirm('Playlist exists. Overwrite?');
            }
            if (doIt) {
                store.set('customPlaylists.' + name, this.plr.playlist);
            }
        } else {
            alert('Please enter a playlist name.');
        }
    }

    getCustomPlaylists() {
        return store.get('customPlaylists');
    }

    clearPlaylist() {
        this.plr.stop();
        this.plr.playlist = [];
    }

    setFocusedItem(index, e) {
        // if (e.shiftKey)
        this.plr.focusedItem = index;
    }

    removeFocusedItem(plr) {
        var index;
        plr = (plr)?plr:this.plr;
        index = plr.focusedItem;
        if (index === plr.currentIndex && plr.nowPlaying) {
            plr.stop();
        }
        plr.playlist.splice(plr.focusedItem, 1);
        plr.focusedItem = Math.min(index, plr.playlist.length - 1);
        if (plr.currentIndex > index) {
            plr.currentIndex = plr.currentIndex - 1;
        }
    }

    openDialog(type) {
        var promise = _pd.get(this).initiateFileDialog(type);
        promise.then((list) => {
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