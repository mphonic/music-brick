import { remote } from "electron";
import fs from "fs";
import path from "path";
import jsmediatags from "jsmediatags";
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

export default function PlayerControl($scope) {
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

    this.processLoadedFiles = function (arr, iter, final) {
        var item = arr[iter],
            self = this;
        jsmediatags.read(item.path, {
            onSuccess: function (tags) {
                for (var key in tags) {
                    item[key] = tags[key];
                }
                if (!item.tags.title) {
                    item.tags.title = path.basename(item.path);
                }
                item.images = self.tmpimages;
                self.tmplist.push(item);
                if (iter === final) {
                    self.tmplist.sort(function (a, b) {
                        return parseInt(a.tags.track) - parseInt(b.tags.track);
                    });

                    if (player.playlist.length < 1) {
                        if (self.tmplist[0].tags.picture) {
                            self.currentImage = "data:" + self.tmplist[0].tags.picture.format + ";base64," + arrToBase64(self.tmplist[0].tags.picture.data);
                        } else {
                            if (self.tmplist[0].images && self.tmplist[0].images.length) {
                                self.currentImage = self.tmplist[0].images[0];
                            } else {
                                self.currentImage = '';
                            }
                        }
                    }
                    player.playlist = player.playlist.concat(self.tmplist);
                    $scope.$apply();
                } else {
                    self.processLoadedFiles(arr, iter + 1, final);
                }
            },
            onError: function (error) {
                item.tags = {
                    title: path.basename(item.path),
                    track: path.basename(item.path)
                }
                if (iter === final) {
                    $scope.$apply();
                } else {
                    self.processLoadedFiles(arr, iter + 1, final);
                }
            }
        });
    }

    this.openFiles = function () {
        var dialog = remote.dialog,
            self = this;
        dialog.showOpenDialog({
            properties: ['multiSelections'],
            filters: [{ name: 'Audio', extensions: ['flac', 'mp3', 'm4a', 'ogg', 'wav', 'aif', 'aiff'] }]
        }, function (result) {
            var arr = [];
            angular.forEach(result, function (e, c) {
                arr.push({ path: e });
            });
            self.loadFiles({ files: arr });
        });
    }

    this.openFolder = function () {
        var dialog = remote.dialog,
            self = this;
        dialog.showOpenDialog({
            properties: ['openDirectory']
        }, function (result) {
            var filelist, imglist, rootpath;
            rootpath = result[0];
            fs.readdir(rootpath, function (err, files) {
                var fullpath;
                filelist = [];
                imglist = [];
                angular.forEach(files, function (e, c) {
                    var item = {};
                    fullpath = path.join(rootpath, e);
                    if (e.match(/\.(?:flac|wav|mp3|m4a|ogg|aif|aiff)$/i)) {
                        item.path = fullpath;
                        filelist.push(item);
                    } else if (e.match(/\.(?:png|jpg|jpeg|gif)$/i)) {
                        imglist.push(fullpath);
                    }
                });
                self.loadFiles({ files: filelist, images: imglist });
            });
        });
    }

    this.loadFiles = function (data) {
        this.tmplist = [];
        this.tmpimages = data.images;
        this.processLoadedFiles(data.files, 0, data.files.length - 1);
    }
}