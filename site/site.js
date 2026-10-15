/*
 * site.js — the page's motion and its controls: the scroll reveals, the
 * look switcher with its chart or grid, and the prompt's copy button.
 *
 * Deferred, and nothing here is needed to read the page: without it every
 * section is where the layout put it, the looks show Midnight's chart, and the prompt
 * can be selected by hand. The reveals are octoscope's landing engine, the
 * one findergit.app and lancetta.app run, without the light a card catches,
 * which animates a property the compositor cannot run.
 */
(function () {
    'use strict';

    var root = document.documentElement;

    function each(list, fn) {
        Array.prototype.forEach.call(list, fn);
    }

    // ------------------------------------------------------------------
    // Scroll reveals. The stylesheet's "Motion" block has the poses and
    // the three states; this only moves scopes between them.
    // ------------------------------------------------------------------
    (function reveals() {
        // Where nothing can say a scope came into view, nothing is armed,
        // so nothing waits for a signal that will never come.
        if (!('IntersectionObserver' in window)) return;

        // A scope is a [data-scope], or an item with no scope above it.
        var scopes = [];
        each(document.querySelectorAll('[data-scope]'), function (el) {
            scopes.push(el);
        });
        each(document.querySelectorAll('[data-reveal]:not([data-scope])'), function (el) {
            if (!el.parentElement || !el.parentElement.closest('[data-scope]')) scopes.push(el);
        });

        function reveal(el) {
            el.setAttribute('data-revealed', '');
            observer.unobserve(el);
        }

        // Threshold 0, with the bottom margin as the lag, in pixels: a
        // share of the window would be a band a tall section never leaves
        // in a window as tall as the page, the way a crawler renders it.
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) reveal(entry.target);
            });
        }, { threshold: 0, rootMargin: '0px 0px -64px 0px' });

        // The keyboard can get there first: focus reveals every armed
        // scope it lands in, at once.
        document.addEventListener('focusin', function (event) {
            var el = event.target;
            while (el && el.closest) {
                var scope = el.closest('[data-armed]:not([data-revealed])');
                if (!scope) break;
                reveal(scope);
                el = scope.parentElement;
            }
        });

        // Armed only if ENTIRELY off screen now: what the reader can
        // already see never moves.
        var height = window.innerHeight || root.clientHeight;
        scopes.forEach(function (el) {
            var box = el.getBoundingClientRect();
            if (box.bottom <= 0 || box.top >= height) {
                el.setAttribute('data-armed', '');
                observer.observe(el);
            }
        });
    })();

    // ------------------------------------------------------------------
    // The looks, each with its year as a chart or as a grid. Only
    // Midnight's chart loads with the page; another card is fetched the
    // first time it is asked for, and shown once decoded, so a switch
    // never flashes an empty stage.
    // ------------------------------------------------------------------
    (function looks() {
        var buttons = document.querySelectorAll('.swatch[data-look]');
        var calendars = document.querySelectorAll('.swatch[data-calendar]');
        var stage = document.querySelector('.look-stage');
        var code = document.getElementById('look-code');
        var calendarCode = document.getElementById('calendar-code');
        if (!buttons.length || !stage) return;
        var current = 'midnight';
        var calendar = 'chart';

        function card(look, cal) {
            return stage.querySelector('img[data-look="' + look + '"][data-calendar="' + cal + '"]');
        }

        function load(img) {
            if (img && img.getAttribute('data-src')) {
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
            }
        }

        function ready(img, fn) {
            load(img);
            if (img.decode) img.decode().then(fn, fn);
            else if (img.complete) fn();
            else img.addEventListener('load', fn, { once: true });
        }

        function show(look, cal) {
            if (look === current && cal === calendar) return;
            var next = card(look, cal);
            if (!next) return;
            current = look;
            calendar = cal;
            each(buttons, function (b) {
                b.setAttribute('aria-pressed', b.getAttribute('data-look') === look ? 'true' : 'false');
            });
            each(calendars, function (b) {
                b.setAttribute('aria-pressed', b.getAttribute('data-calendar') === cal ? 'true' : 'false');
            });
            if (code) code.textContent = 'theme: ' + look;
            if (calendarCode) calendarCode.textContent = 'calendar: ' + cal;
            ready(next, function () {
                if (current !== look || calendar !== cal) return;
                each(stage.querySelectorAll('img.on'), function (img) {
                    img.classList.remove('on');
                });
                next.classList.add('on');
            });
        }

        each(buttons, function (b) {
            b.addEventListener('click', function () {
                show(b.getAttribute('data-look'), calendar);
            });
            // A look the pointer rests on starts loading before the click.
            b.addEventListener('pointerenter', function () {
                load(card(b.getAttribute('data-look'), calendar));
            });
        });
        each(calendars, function (b) {
            b.addEventListener('click', function () {
                show(current, b.getAttribute('data-calendar'));
            });
            b.addEventListener('pointerenter', function () {
                load(card(current, b.getAttribute('data-calendar')));
            });
        });
    })();

    // ------------------------------------------------------------------
    // Copy the prompt.
    // ------------------------------------------------------------------
    each(document.querySelectorAll('[data-copy]'), function (button) {
        var source = document.getElementById(button.getAttribute('data-copy'));
        if (!source || !navigator.clipboard) return;
        var label = button.textContent;
        button.addEventListener('click', function () {
            navigator.clipboard.writeText(source.textContent).then(function () {
                button.textContent = 'Copied';
                button.setAttribute('data-copied', '');
                setTimeout(function () {
                    button.textContent = label;
                    button.removeAttribute('data-copied');
                }, 1800);
            });
        });
    });

    // The year in the publisher line.
    each(document.querySelectorAll('[data-year]'), function (el) {
        el.textContent = String(new Date().getFullYear());
    });
})();
