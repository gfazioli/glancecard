/*
 * site.js — the page's motion and its copy buttons: the scroll reveals,
 * and the prompt's, the workflow's and the embed's Copy.
 *
 * Deferred, and nothing here is needed to read the page: without it every
 * section is where the layout put it, and the prompt can be selected by
 * hand. The editor and its card are editor.js's. The reveals are
 * octoscope's landing engine, the one findergit.app and lancetta.app run,
 * without the light a card catches, which animates a property the
 * compositor cannot run.
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
