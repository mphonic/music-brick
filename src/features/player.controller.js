import howler from "howler";
import arrToBase64 from "../helpers/arrToBase64.js";

// "private" vars and methods
const _getProgress = new WeakMap();
const _startProgressTimer = new WeakMap();
const _stopProgressTimer = new WeakMap();
const _endAction = new WeakMap();
const _scope = new WeakMap();

export default class Player {

    constructor($scope, $interval) {
        var _timer;
        this.playlist = [];
        this.nowPlaying = null;
        this.currentIndex = 0;
        this.currentImage = null;
        this.paused = false;
        this.progressPercent = 0;
        this.repeatMode = 0;
        this.random = false;

        // No need to expose these to the view
        _timer = null;
        _getProgress.set(this, () => {
            if (!this.nowPlaying) return 0;
            var dur = this.nowPlaying.duration(),
                seek = this.nowPlaying.seek();
            if (dur === 0) return 0;
            return seek / dur;
        });
        _startProgressTimer.set(this, () => {
            if (!_timer) {
                _timer = $interval(() => {
                    var progress = _getProgress.get(this)();
                    this.progressPercent = (progress * 100);
                }, 200);
            }
        });
        _stopProgressTimer.set(this, () => {
            $interval.cancel(_timer);
            _timer = null;
        });

        _endAction.set(this, () => {
            var index = this.currentIndex;
            if (this.repeatMode === 2) {
                this.play(index);
                return;
            }
            if (index < this.playlist.length - 1) {
                this.play(index + 1);
            } else if (this.repeatMode) {
                this.play(0);
            } else {
                this.stop();
            }
        });

        _scope.set(this, $scope);
    }

    play(index) {
        var item = this.playlist[index],
            scope = _scope.get(this);
        if (!item.howl) {
            item.howl = new Howl({
                src: [item.path],
                html5: true,
                onend: () => {
                    _endAction.get(this)();
                    scope.$apply();
                }
            });
        }
        if (this.nowPlaying) {
            this.nowPlaying.stop();
        }
        this.paused = false;
        this.nowPlaying = item.howl;
        this.currentIndex = index;
        scope.$broadcast('player-advance', { index: this.currentIndex });
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
        _startProgressTimer.get(this)();
    }

    resume() {
        this.paused = false;
        this.nowPlaying.play();
        _startProgressTimer.get(this)();
    }

    pause() {
        this.paused = true;
        this.nowPlaying.pause();
        _stopProgressTimer.get(this)();
    }

    togglePlayPause(item) {
        if (this.nowPlaying) {
            if (!this.paused) {
                this.pause();
            } else {
                this.resume();
            }
        } else {
            this.play(item || 0);
        }
    }

    stop() {
        if (this.nowPlaying) {
            this.nowPlaying.stop();
            this.nowPlaying = null;
            this.currentIndex = 0;
            _stopProgressTimer.get(this)();
            this.progressPercent = 0;
            _scope.get(this).$broadcast('player-advance', { index: this.currentIndex });
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
            this.progressPercent = _getProgress.get(this)() * 100;
        }
    }
};