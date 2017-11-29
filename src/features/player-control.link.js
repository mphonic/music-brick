
export default function PlayerControlLink(scope, element) {
    var player = scope.player, animateScroll, animateScrollTimer;

    scope.clientSeek = function (e) {
        e.stopPropagation();
        if (player.nowPlaying) {
            var target = angular.element(e.target);
            if (target.attr('class').match(/bar/)) {
                target = target.parent();
            }
            var r = (e.clientX - target[0].offsetParent.offsetLeft) / target[0].clientWidth;
            player.seek(r * player.nowPlaying.duration());
        }
    }

    animateScroll = function (now, goal, who) {
        var dist, next;
        if (Math.round(now) === goal) return;
        dist = goal - now;
        next = now + 0.25 * dist;
        who.scrollTop = next;
        animateScrollTimer = setTimeout(function () {
            animateScroll(next, goal, who);
        }, 10);
    }

    scope.$watch('player.focusedItem', function(nv, ov) {
        var el = document.querySelectorAll('#playlist li')[player.focusedItem],
            top,
            bottom,
            winHeight,
            pl,
            plTop,
            scrollTo;
        if (!el) return;
        top = el.getBoundingClientRect().top;
        bottom = el.getBoundingClientRect().bottom;
        winHeight = window.innerHeight;
        pl = document.getElementById('playlist');
        plTop = pl.getBoundingClientRect().top;
        if (bottom > winHeight) {
            scrollTo = bottom - plTop + pl.scrollTop + el.offsetHeight - pl.offsetHeight;
        } else if (top < plTop) {
            scrollTo = top + pl.scrollTop - plTop;
        }
        if (scrollTo !== undefined) {
            clearTimeout(animateScrollTimer);
            animateScroll(pl.scrollTop, scrollTo, pl);
        }
    });
}