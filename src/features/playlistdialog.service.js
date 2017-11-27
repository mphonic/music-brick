import { remote } from "electron";
import path from "path";
import fs from "fs";
import jsmediatags from "jsmediatags";
import angular from "angular";

export default function PlaylistDialog($q) {

    this.tmplist = [];
    this.tmpimages = [];
    this.q = null;
    this.audioExtensions = ['flac', 'mp3', 'm4a', 'ogg', 'wav', 'aif', 'aiff'];

    this.initiateFileDialog = function(type) {
        this.q = $q.defer();
        if (type === 'folder') {
            this.openFolder();
        } else {
            this.openFiles();
        }
        return this.q.promise;
    }

    this.processLoadedFiles = function(arr, iter, final) {
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
                    self.q.resolve(self.tmplist);
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
                    self.q.resolve(self.tmplist);
                } else {
                    self.processLoadedFiles(arr, iter + 1, final);
                }
            }
        });
    }

    this.openFiles = function() {
        var dialog = remote.dialog,
            self = this;
        dialog.showOpenDialog({
            properties: ['multiSelections'],
            filters: [{ name: 'Audio Files', extensions: this.audioExtensions }]
        }, function (result) {
            var arr = [];
            angular.forEach(result, function (e, c) {
                arr.push({ path: e });
            });
            self.loadFiles({ files: arr });
        });
    }

    this.openFolder = function() {
        var dialog = remote.dialog,
            self = this,
            filereg = RegExp("\.(?:" + this.audioExtensions.join('|') + ")$", "i");
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
                    if (e.match(filereg)) {
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

    this.loadFiles = function(data) {
        if (!data.files || !data.files.length) {
            this.q.reject('No valid audio files found.');
            return;
        }
        this.tmplist = [];
        this.tmpimages = data.images;
        this.processLoadedFiles(data.files, 0, data.files.length - 1);
    }
}