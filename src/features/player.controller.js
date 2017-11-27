import howler from "howler";
import arrToBase64 from "../helpers/arrToBase64.js";

export default function Player($interval) {

    this.playlist = [];
    this.nowPlaying = null;
    this.currentIndex = 0;
    this.focusedItem = 0;
    this.currentImage = null;
    this.paused = false;
    this.timer = null;
    this.progressPercent = '0%';

    this.getProgress = function() {
        if (!this.nowPlaying) return 0;
        var dur = this.nowPlaying.duration(),
            seek = this.nowPlaying.seek();
        if (dur === 0) return 0;
        return seek / dur;
    }

    this.startProgressTimer = function() {
        var self = this;
        this.timer = $interval(function () {
            var progress = self.getProgress();
            self.progressPercent = (progress * 100) + '%';
        }, 200);
    }

    this.stopProgressTimer = function() {
        $interval.cancel(this.timer);
    }

    this.play = function(index) {
        var item = this.playlist[index],
            self = this;
        if (!item.howl) {
            item.howl = new Howl({
                src: [item.path],
                html5: true,
                onend: function () {
                    if (index < self.playlist.length - 1) {
                        self.play(index + 1);
                    }
                }
            });
        }
        if (this.nowPlaying) {
            this.nowPlaying.stop();
        }
        item.howl.play();
        this.nowPlaying = item.howl;
        this.currentIndex = index;
        this.focusedItem = index;
        if (item.tags.picture) {
            this.currentImage = "data:" + item.tags.picture.format + ";base64," + arrToBase64(item.tags.picture.data);
        } else {
            if (item.images && item.images.length) {
                this.currentImage = item.images[0];
            } else {
                this.currentImage = '';
            }
        }
        this.paused = false;
        this.startProgressTimer();
    }

    this.togglePlayPause = function() {
        if (this.nowPlaying) {
            if (!this.paused) {
                this.paused = true;
                this.nowPlaying.pause();
                this.stopProgressTimer();
            } else {
                this.paused = false;
                this.nowPlaying.play();
                this.startProgressTimer();
            }
        } else {
            this.play(this.focusedItem);
        }
    }

    this.stop = function() {
        if (this.nowPlaying) {
            this.nowPlaying.stop();
            this.nowPlaying = null;
            this.currentIndex = 0;
            this.stopProgressTimer();
            this.progressPercent = '0%';
        }
    }

    this.rw = function() {
        if (this.nowPlaying) {
            if (this.nowPlaying.seek() > 1) {
                this.nowPlaying.seek(0);
            } else if (this.currentIndex > 0) {
                this.play(this.currentIndex - 1);
            }
        }
    }

    this.ff = function() {
        if (this.nowPlaying) {
            if (this.currentIndex < this.playlist.length - 1) {
                this.play(this.currentIndex + 1);
            }
        }
    }

    this.seek = function(time) {
        if (this.nowPlaying) {
            this.nowPlaying.seek(time);
            this.progressPercent = (this.getProgress() * 100) + '%';
        }
    }
};