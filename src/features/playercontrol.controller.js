import Store from "electron-store";
import angular from "angular";

const store = new Store();

function arrToBase64(arr) {
    var buf = new Uint8Array(arr);
    var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
    }).join('');
    return btoa(binstr);
}

export default function PlayerControl($scope, PlaylistDialog) {
    var player = $scope.player;

    this.loadPlaylist = function (pl) {
        if (pl.length) {
            player.playlist = pl;
            if (player.playlist[0].tags.picture) {
                player.currentImage = "data:" + player.playlist[0].tags.picture.format + ";base64," + arrToBase64(player.playlist[0].tags.picture.data);
            } else {
                if (player.playlist[0].images && player.playlist[0].images.length) {
                    player.currentImage = player.playlist[0].images[0];
                } else {
                    player.currentImage = '';
                }
            }
        }
    }

    this.loadPlaylist(store.get('defaultPlaylist'));

    this.savePlaylist = function (name) {
        if (name) {
            var doIt = true;
            if (store.get('customPlaylists.' + name)) {
                doIt = confirm('Playlist exists. Overwrite?');
            }
            if (doIt) {
                store.set('customPlaylists.' + name, player.playlist);
            }
        } else {
            alert('Please enter a playlist name.');
        }
    }

    this.getCustomPlaylists = function () {
        return store.get('customPlaylists');
    }

    this.clearPlaylist = function () {
        player.stop();
        player.playlist = [];
    }

    this.setFocusedItem = function (index, e) {
        // if (e.shiftKey)
        player.focusedItem = index;
    }

    this.removeFocusedItem = function () {
        var index = player.focusedItem;
        if (player.focusedItem === player.currentIndex && player.nowPlaying) {
            player.stop();
        }
        player.playlist.splice(player.focusedItem, 1);
        player.focusedItem = Math.min(index, player.playlist.length - 1);
        if (player.currentIndex > index) {
            player.currentIndex = player.currentIndex - 1;
        }
    }

    $scope.removeFocusedItem = this.removeFocusedItem;

    this.openDialog = function(type) {
        var promise = PlaylistDialog.initiateFileDialog(type),
            self = this;
        promise.then(function(list) {
            if (list && list.length > 0) {
                list.sort(function (a, b) {
                    return parseInt(a.tags.track) - parseInt(b.tags.track);
                });
                if (player.playlist.length < 1) {
                    if (list[0].tags.picture) {
                        player.currentImage = "data:" + list[0].tags.picture.format + ";base64," + arrToBase64(list[0].tags.picture.data);
                    } else {
                        if (list[0].images && list[0].images.length) {
                            player.currentImage = list[0].images[0];
                        } else {
                            player.currentImage = '';
                        }
                    }
                }
                player.playlist = player.playlist.concat(list);
            } else {
                alert("No valid audio files found.");
            }
        }, function(err) {
            alert(err);
        });
    }
}