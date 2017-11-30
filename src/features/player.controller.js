import howler from "howler";
import arrToBase64 from "../helpers/arrToBase64.js";

// "private" vars and methods
const _getProgress = new WeakMap();
const _startProgressTimer = new WeakMap();
const _stopProgressTimer = new WeakMap();
const _nextAction = new WeakMap();
const _randomOrder = new WeakMap();
const _getShuffledList = new WeakMap();
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

        _randomOrder.set(this, []);
        _getShuffledList.set(this, (list) => {
            var arr = [],
                curIndex = list.length,
                tempVal,
                randomIndex;
            for (var i = 0; i < list.length; i++) {
                arr.push(i);
            }
            // While there remain elements to shuffle...
            while (0 !== curIndex) {

                randomIndex = Math.floor(Math.random() * curIndex);
                curIndex -= 1;

                tempVal = arr[curIndex];
                arr[curIndex] = arr[randomIndex];
                arr[randomIndex] = tempVal;
            }
            return arr;
        });

        _nextAction.set(this, () => {
            var index = this.currentIndex;
            if (this.repeatMode === 2) {
                this.play(index);
                return;
            }
            if (index < this.playlist.length - 1) {
                this.play(index + 1);
            } else {
                if (this.repeatMode) {
                    this.play(0);   
                } else {
                    this.stop();
                }
                _randomOrder.set(this, _getShuffledList.get(this)(this.playlist));
            }
        });

        _scope.set(this, $scope);
    }

    play(index) {
        var item,
            ri,
            scope = _scope.get(this);
        if (!this.random) {
            item = this.playlist[index];
        } else {
            ri = _randomOrder.get(this)[index];
            item = this.playlist[ri];
        }
        if (!item.howl) {
            item.howl = new Howl({
                src: [item.path],
                html5: true,
                onend: () => {
                    _nextAction.get(this)();
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
        this.playingIndex = (this.random)?ri:index;
        scope.$broadcast('player-advance', { index: this.playingIndex });
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

    playNewItem(index) {
        if (this.random) {
            index = _randomOrder.get(this).indexOf(index);
        }
        this.play(index);
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
            _nextAction.get(this)();
        }
    }

    seek(time) {
        if (this.nowPlaying) {
            this.nowPlaying.seek(time);
            this.progressPercent = _getProgress.get(this)() * 100;
        }
    }

    setPlaylist(list) {
        this.playlist = list;
        _randomOrder.set(this, _getShuffledList.get(this)(list));
    }

    appendToPlaylist(list) {
        var ro = _randomOrder.get(this);
        this.playlist = this.playlist.concat(list);
        _randomOrder.set(this, ro.concat(_getShuffledList.get(this)(list)));
    }

    removeFromPlaylist(index) {
        var ro = _randomOrder.get(this),
            randomIndex = ro.indexOf(index);
        this.playlist.splice(index, 1);
        ro.splice(randomIndex, 1);
        if (this.currentIndex > index) {
            this.currentIndex--;
        }
        if (this.playingIndex > index) {
            this.playingIndex--;
        }
    }

    respondToOrderChange(dest, source) {
        var same = true;
        if (this.currentIndex !== this.playingIndex) {
            same = false;
            if (this.playingIndex === source) {
                this.playingIndex = dest;
            } else if (this.playingIndex >= dest && this.playingIndex < source) {
                this.playingIndex++;
            } else if (this.playingIndex <= dest && this.playingIndex > source) {
                this.playingIndex--;
            }
        }
        if (this.currentIndex === source) {
            this.currentIndex = dest;
        } else if (this.currentIndex >= dest && this.currentIndex < source) {
            this.currentIndex++;
        } else if (this.currentIndex <= dest && this.currentIndex > source) {
            this.currentIndex--;
        }
        if (same) this.playingIndex = this.currentIndex;
    }
};