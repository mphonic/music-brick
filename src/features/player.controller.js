import howler from "howler";
import arrToBase64 from "../helpers/arrToBase64.js";

export default class Player {

    constructor($scope, $interval) {
        this.playlist = [];
        this.nowPlaying = null;
        this.currentIndex = 0;
        this.focusedItem = 0;
        this.currentImage = null;
        this.paused = false;
        this.timer = null;
        this.progressPercent = '0%';
        this.$interval = $interval;
        this.$scope = $scope;
    }

    getProgress() {
        if (!this.nowPlaying) return 0;
        var dur = this.nowPlaying.duration(),
            seek = this.nowPlaying.seek();
        if (dur === 0) return 0;
        return seek / dur;
    }

    startProgressTimer() {
        var self = this;
        if (!this.timer) {
            this.timer = this.$interval(function () {
                var progress = self.getProgress();
                self.progressPercent = (progress * 100) + '%';
            }, 200);
        }
    }

    stopProgressTimer() {
        this.$interval.cancel(this.timer);
        this.timer = null;
    }

    play(index) {
        var item = this.playlist[index],
            self = this;
        if (!item.howl) {
            item.howl = new Howl({
                src: [item.path],
                html5: true,
                onend: function () {
                    if (index < self.playlist.length - 1) {
                        self.play(index + 1);
                    } else {
                        self.stop();
                        self.focusedItem = 0;
                        self.$scope.$apply();
                    }
                }
            });
        }
        if (this.nowPlaying) {
            this.nowPlaying.stop();
        }
        this.paused = false;
        this.nowPlaying = item.howl;
        this.currentIndex = index;
        this.focusedItem = index;
        item.howl.play();
        if (item.tags.picture) {
            this.currentImage = "data:" + item.tags.picture.format + ";base64," + arrToBase64(item.tags.picture.data);
        } else {
            if (item.images && item.images.length) {
                this.currentImage = item.images[0];
            } else {
                this.currentImage = '';
            }
        }
        this.startProgressTimer();
    }

    resume() {
        this.paused = false;
        this.nowPlaying.play();
        this.startProgressTimer();
    }

    pause() {
        this.paused = true;
        this.nowPlaying.pause();
        this.stopProgressTimer();
    }

    togglePlayPause() {
        if (this.nowPlaying) {
            if (!this.paused) {
                this.pause();
            } else {
                this.resume();
            }
        } else {
            this.play(this.focusedItem || 0);
        }
    }

    stop() {
        if (this.nowPlaying) {
            this.nowPlaying.stop();
            this.nowPlaying = null;
            this.currentIndex = 0;
            this.stopProgressTimer();
            this.progressPercent = '0%';
        }
    }

    rw() {
        if (this.nowPlaying) {
            if (this.nowPlaying.seek() > 1) {
                this.nowPlaying.seek(0);
            } else if (this.currentIndex > 0) {
                this.play(this.currentIndex - 1);
            }
        }
    }

    ff() {
        if (this.nowPlaying) {
            if (this.currentIndex < this.playlist.length - 1) {
                this.play(this.currentIndex + 1);
            }
        }
    }

    seek(time) {
        if (this.nowPlaying) {
            this.nowPlaying.seek(time);
            this.progressPercent = (this.getProgress() * 100) + '%';
        }
    }
};