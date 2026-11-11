(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([
  "object" == typeof document ? document.currentScript : void 0,
  {
    12597: (e) => {
      var { g: t, __dirname: n, m: i, e: r } = e;
      {
        ("use strict");
        e.i(22271),
          Object.defineProperty(r, "__esModule", { value: !0 }),
          Object.defineProperty(r, "warnOnce", {
            enumerable: !0,
            get: () => t,
          });
        const t = (e) => {};
      }
    },
    60566: (e) => {
      var { g: t, __dirname: n } = e;
      {
        function i() {
          for (var e, t, n = 0, i = "", r = arguments.length; n < r; n++)
            (e = arguments[n]) &&
              (t = (function e(t) {
                var n,
                  i,
                  r = "";
                if ("string" == typeof t || "number" == typeof t) r += t;
                else if ("object" == typeof t)
                  if (Array.isArray(t)) {
                    var o = t.length;
                    for (n = 0; n < o; n++)
                      t[n] && (i = e(t[n])) && (r && (r += " "), (r += i));
                  } else for (i in t) t[i] && (r && (r += " "), (r += i));
                return r;
              })(e)) &&
              (i && (i += " "), (i += t));
          return i;
        }
        e.s({ clsx: () => i, default: () => t });
        const t = i;
      }
    },
    81517: (e) => {
      var { g: t, __dirname: n } = e;
      e.s({ default: () => i });
      var i = (e, t, n) => {
        var i = null,
          r = null,
          o = () => {
            i && (clearTimeout(i), (r = null), (i = null));
          },
          s = function () {
            if (!t) return e.apply(this, arguments);
            var u = arguments,
              l = n && !i;
            if (
              (o(),
              (r = () => {
                e.apply(this, u);
              }),
              (i = setTimeout(() => {
                if (((i = null), !l)) {
                  var e = r;
                  return (r = null), e();
                }
              }, t)),
              l)
            )
              return r();
          };
        return (
          (s.cancel = o),
          (s.flush = () => {
            var e = r;
            o(), e && e();
          }),
          s
        );
      };
    },
    7402: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ createNanoEvents: () => t });
        const t = () => ({
          emit(e, ...t) {
            for (let n = this.events[e] || [], i = 0, r = n.length; i < r; i++)
              n[i](...t);
          },
          events: {},
          on(e, t) {
            return (
              (this.events[e] ||= []).push(t),
              () => {
                this.events[e] = this.events[e]?.filter((e) => t !== e);
              }
            );
          },
        });
      }
    },
    4371: (e) => {
      var { g: t, __dirname: n } = e;
      e.s({
        useIntersectionObserver: () => v,
        useLazyState: () => f,
        useMediaQuery: () => c,
        useObjectFit: () => b,
        useRect: () => h,
        useResizeObserver: () => u,
        useTimeout: () => g,
        useWindowSize: () => a,
      });
      var i = e.i(38653),
        r = e.i(81517),
        o = e.i(7402),
        s = 500;
      function u(
        {
          lazy: e = !1,
          debounce: t = s,
          options: n = {},
          callback: o = () => {},
        } = {},
        l = [],
      ) {
        const [a, c] = (0, i.useState)(),
          [f, d] = (0, i.useState)(),
          m = (0, i.useRef)(),
          h = (0, i.useRef)(o);
        (h.current = o),
          (0, i.useEffect)(() => {
            if (!a) return;
            let i = !0;
            function o(t) {
              h.current(t), (m.current = t), e || d(t);
            }
            const s = (0, r.default)(o, t),
              u = new ResizeObserver((e) => {
                const t = e[0];
                t && (i ? o(t) : s(t), (i = !1));
              });
            return (
              u.observe(a, n),
              () => {
                u.disconnect();
              }
            );
          }, [a, t, e, JSON.stringify(n), ...l]);
        const g = (0, i.useCallback)(() => m.current, []);
        return [c, e ? g : f];
      }
      u.setDebounce = (e) => {
        s = e;
      };
      var l = 500;
      function a(e = l) {
        const [t, n] = (0, i.useState)(),
          [o, s] = (0, i.useState)(),
          [u, c] = (0, i.useState)();
        return (
          (0, i.useEffect)(() => {
            function t() {
              n(
                Math.min(
                  window.innerWidth,
                  document.documentElement.clientWidth,
                ),
              ),
                s(
                  Math.min(
                    window.innerHeight,
                    document.documentElement.clientHeight,
                  ),
                ),
                c(window.devicePixelRatio);
            }
            const i = (0, r.default)(t, e);
            return (
              window.addEventListener("resize", i, !1),
              t(),
              () => {
                window.removeEventListener("resize", i, !1), i.cancel();
              }
            );
          }, [e]),
          { width: t, height: o, dpr: u }
        );
      }
      function c(e) {
        const [t, n] = (0, i.useState)();
        return (
          (0, i.useEffect)(() => {
            const t = window.matchMedia(e);
            function i() {
              n(t.matches);
            }
            return (
              t.addEventListener("change", i, !1),
              i(),
              () => t.removeEventListener("change", i, !1)
            );
          }, [e]),
          t
        );
      }
      function f(e, t, n = []) {
        const r = (0, i.useRef)(),
          o = (0, i.useRef)(e),
          s = (0, i.useRef)(t);
        return (
          (s.current = t),
          (0, i.useEffect)(() => {
            s.current(o.current, r.current);
          }, [e, ...n]),
          [
            (e) => {
              if ("function" == typeof e) {
                const t = e(o.current);
                s.current(t, o.current), (o.current = t);
                return;
              }
              e !== o.current && (s.current(e, o.current), (o.current = e));
            },
            (0, i.useCallback)(() => o.current, []),
          ]
        );
      }
      a.setDebounce = (e) => {
        l = e;
      };
      var d = (0, o.createNanoEvents)(),
        m = 500;
      function h(
        {
          ignoreTransform: e = !1,
          ignoreSticky: t = !0,
          debounce: n = m,
          lazy: r = !1,
          callback: o,
        } = {},
        s = [],
      ) {
        const [l, a] = (0, i.useState)(null),
          [c, f] = (0, i.useState)(null),
          g = (0, i.useRef)(o);
        g.current = o;
        const b = (0, i.useCallback)(
            ({ top: e, left: t, width: n, height: i, element: o }) => {
              let s, u;
              if (
                ((e = e ?? w.current.top),
                (t = t ?? w.current.left),
                (n = n ?? w.current.width),
                (i = i ?? w.current.height),
                (o = o ?? w.current.element),
                e === w.current.top &&
                  t === w.current.left &&
                  n === w.current.width &&
                  i === w.current.height &&
                  o === w.current.element)
              )
                return;
              const l = e,
                a = t;
              void 0 !== e && void 0 !== i && (s = e + i),
                void 0 !== t && void 0 !== n && (u = t + n),
                (w.current = {
                  ...w.current,
                  top: e,
                  y: l,
                  left: t,
                  x: a,
                  width: n,
                  height: i,
                  bottom: s,
                  right: u,
                  element: o,
                }),
                g.current?.(w.current),
                r || S(w.current);
            },
            [r, ...s],
          ),
          v = (0, i.useCallback)(() => {
            let n, i;
            if (c && l) {
              if (
                (t &&
                  (function e(t) {
                    "sticky" === getComputedStyle(t).position &&
                      (t.style.setProperty("position", "relative"),
                      (t.dataset.sticky = "true")),
                      t.offsetParent && e(t.offsetParent);
                  })(c),
                e)
              )
                (n = (function e(t, n = 0) {
                  const i = n + t.offsetTop;
                  return t.offsetParent ? e(t.offsetParent, i) : i;
                })(c)),
                  (i = (function e(t, n = 0) {
                    const i = n + t.offsetLeft;
                    return t.offsetParent ? e(t.offsetParent, i) : i;
                  })(c));
              else {
                const e = c.getBoundingClientRect();
                (n =
                  e.top +
                  (function e(t, n = 0) {
                    const i = n + (t?.scrollTop ?? 0);
                    return t.parentNode ? e(t.parentNode, i) : i;
                  })(l)),
                  (i =
                    e.left +
                    (function e(t, n = 0) {
                      const i = n + (t?.scrollLeft ?? 0);
                      return t.parentNode ? e(t.parentNode, i) : i;
                    })(l));
              }
              t &&
                (function e(t) {
                  t?.dataset?.sticky === "true" &&
                    (t.style.removeProperty("position"),
                    delete t.dataset.sticky),
                    t.parentNode && e(t.parentNode);
                })(c),
                b({ top: n, left: i });
            }
          }, [c, t, e, l, b]),
          p = (0, i.useCallback)(() => {
            if (!c) return;
            const e = c.getBoundingClientRect();
            b({ width: e.width, height: e.height });
          }, [c, b]),
          y = (0, i.useCallback)(() => {
            v(), p();
          }, [v, p]),
          w = (0, i.useRef)({}),
          [z, S] = (0, i.useState)({});
        (0, i.useEffect)(
          () => ((w.current.resize = y), S(w.current), d.on("resize", y)),
          [y],
        );
        const [k] = u(
            {
              lazy: !0,
              debounce: n,
              callback: (e) => {
                if (!e) return;
                const { inlineSize: t, blockSize: n } =
                  e.borderBoxSize[0] ?? {};
                b({ width: t, height: n });
              },
            },
            [c, r, b],
          ),
          [E] = u({ lazy: !0, debounce: n, callback: v }, [v]);
        (0, i.useEffect)(() => {
          E((e) => (e && e !== document.body ? e : document.body)),
            a((e) => (e && e !== document.body ? e : document.body));
        }, [E]);
        const x = (0, i.useCallback)(() => w.current, []);
        return [
          (0, i.useCallback)(
            (e) => {
              k(e), f(e), b({ element: e });
            },
            [k, b],
          ),
          r ? x : z,
          (0, i.useCallback)(
            (e) => {
              E(e), a(e);
            },
            [E],
          ),
        ];
      }
      function g(e, t, n = []) {
        const r = (0, i.useRef)(e);
        (r.current = e),
          (0, i.useEffect)(() => {
            const e = setTimeout(r.current, t);
            return () => clearTimeout(e);
          }, [t, ...n]);
      }
      function b(e = 1, t = 1, n = 1, r = 1, o = "cover") {
        const [s, u] = (0, i.useMemo)(() => {
          let i;
          if (!e || !t || !n || !r) return [1, 1];
          const s = e / t,
            u = n / r;
          if ("contain" === o) i = s > u ? t * u : e;
          else {
            if ("cover" !== o) return [1, 1];
            i = s > u ? e : t * u;
          }
          const l = i / u;
          return [e / i, t / l];
        }, [e, t, r, n, o]);
        return [1 / s, 1 / u];
      }
      function v(
        {
          root: e = null,
          rootMargin: t = "0px",
          threshold: n = 0,
          once: r = !1,
          lazy: o = !1,
          callback: s = () => {},
        } = {},
        u = [],
      ) {
        const l = (0, i.useRef)(),
          [a, c] = (0, i.useState)(),
          [f, d] = (0, i.useState)();
        (0, i.useEffect)(() => {
          if (!f) return;
          const i = new IntersectionObserver(
            ([e]) => {
              o ? (l.current = e) : c(e),
                s(e),
                r && e?.isIntersecting && i.disconnect();
            },
            { root: e, rootMargin: t, threshold: n },
          );
          return (
            i.observe(f),
            () => {
              i.disconnect();
            }
          );
        }, [f, e, t, n, o, r, ...u]);
        const m = (0, i.useCallback)(() => l.current, []);
        return [d, o ? m : a];
      }
      (h.resize = () => d.emit("resize")),
        (h.setDebounce = (e) => {
          m = e;
        });
    },
    77666: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ create: () => s, useStore: () => o });
        var i = e.i(38653),
          r = e.i(42363);
        const t = (e) => e;
        function o(e, n = t) {
          const r = i.default.useSyncExternalStore(
            e.subscribe,
            () => n(e.getState()),
            () => n(e.getInitialState()),
          );
          return i.default.useDebugValue(r), r;
        }
        const n = (e) => {
            const t = (0, r.createStore)(e),
              n = (e) => o(t, e);
            return Object.assign(n, t), n;
          },
          s = (e) => (e ? n(e) : n);
      }
    },
    91199: (e) => {
      var { g: t, __dirname: n } = e;
      e.v({
        marker: "minimap-module__febtRW__marker",
        markers: "minimap-module__febtRW__markers",
        minimap: "minimap-module__febtRW__minimap",
      });
    },
    35569: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ Minimap: () => f, useMinimap: () => c });
        var i = e.i(31636),
          r = e.i(85444),
          o = e.i(4371),
          s = e.i(38653),
          u = e.i(92854),
          l = e.i(77666),
          a = e.i(91199);
        const t = (0, l.create)(() => ({ list: {} }));
        function c(e) {
          let n,
            i,
            o,
            u = (0, r.c)(7);
          u[0] !== e
            ? ((n = void 0 === e ? {} : e), (u[0] = e), (u[1] = n))
            : (n = u[1]);
          const { color: l } = n,
            a = void 0 === l ? "blue" : l,
            [c, f] = (0, s.useState)(),
            d = (0, s.useId)();
          return (
            u[2] !== a || u[3] !== c || u[4] !== d
              ? ((i = () => {
                  if (c)
                    return (
                      t.setState((e) => ({
                        list: { ...e.list, [d]: { element: c, color: a } },
                      })),
                      () => {
                        t.setState((e) => {
                          const t = { ...e.list };
                          return delete t[d], { list: t };
                        });
                      }
                    );
                }),
                (o = [d, c, a]),
                (u[2] = a),
                (u[3] = c),
                (u[4] = d),
                (u[5] = i),
                (u[6] = o))
              : ((i = u[5]), (o = u[6])),
            (0, s.useEffect)(i, o),
            f
          );
        }
        function f() {
          let e,
            n,
            u,
            l,
            c,
            f,
            h,
            g,
            b,
            v,
            p = (0, r.c)(16),
            [y, w] = (0, s.useState)("1");
          p[0] === Symbol.for("react.memo_cache_sentinel")
            ? ((e = () => {
                const e = new ResizeObserver((e) => {
                  const [t] = e;
                  w((t.contentRect.width / t.contentRect.height).toFixed(2));
                });
                return (
                  e.observe(document.body),
                  () => {
                    e.disconnect();
                  }
                );
              }),
              (n = []),
              (p[0] = e),
              (p[1] = n))
            : ((e = p[0]), (n = p[1])),
            (0, s.useEffect)(e, n);
          const z = (0, s.useRef)(null);
          p[2] === Symbol.for("react.memo_cache_sentinel")
            ? ((u = () => {
                const e =
                  window.scrollY /
                  (document.documentElement.scrollHeight - window.innerHeight);
                z.current.style.setProperty("--progress", e.toString());
              }),
              (p[2] = u))
            : (u = p[2]);
          const S = u;
          p[3] === Symbol.for("react.memo_cache_sentinel")
            ? ((l = () => (
                window.addEventListener("scroll", S),
                () => {
                  window.removeEventListener("scroll", S);
                }
              )),
              (c = [S]),
              (p[3] = l),
              (p[4] = c))
            : ((l = p[3]), (c = p[4])),
            (0, s.useEffect)(l, c);
          const { width: k, height: E } = (0, o.useWindowSize)(),
            x = t(m),
            R = (void 0 === k ? 0 : k) / (void 0 === E ? 0 : E);
          return (
            p[5] !== y || p[6] !== R
              ? ((f = { "--viewport-ratio": R, "--body-ratio": y }),
                (p[5] = y),
                (p[6] = R),
                (p[7] = f))
              : (f = p[7]),
            p[8] === Symbol.for("react.memo_cache_sentinel")
              ? ((h = (0, i.jsx)("div", { className: a.default.body })),
                (p[8] = h))
              : (h = p[8]),
            p[9] !== x
              ? ((g = Object.entries(x).map(d)), (p[9] = x), (p[10] = g))
              : (g = p[10]),
            p[11] !== g
              ? ((b = (0, i.jsx)("div", {
                  className: a.default.markers,
                  children: g,
                })),
                (p[11] = g),
                (p[12] = b))
              : (b = p[12]),
            p[13] !== b || p[14] !== f
              ? ((v = (0, i.jsxs)("div", {
                  ref: z,
                  style: f,
                  className: a.default.minimap,
                  children: [h, b],
                })),
                (p[13] = b),
                (p[14] = f),
                (p[15] = v))
              : (v = p[15]),
            v
          );
        }
        function d(e) {
          const [t, n] = e,
            { element: r, color: o } = n;
          return (0, i.jsx)(h, { element: r, color: o }, t);
        }
        function m(e) {
          return e.list;
        }
        function h(e) {
          let t,
            n,
            o = (0, r.c)(4),
            { element: l, color: c } = e,
            f = (0, s.useRef)(null);
          return (
            o[0] !== l
              ? ((t = () => {
                  if (!l || !f.current) return;
                  const e = l.getBoundingClientRect(),
                    t = e.top / window.innerHeight,
                    n = e.left / window.innerWidth,
                    i = e.width / window.innerWidth;
                  f.current.style.setProperty("--top", t.toString()),
                    (f.current.style.left = `${100 * n}%`),
                    (f.current.style.width = `${100 * i}%`);
                }),
                (o[0] = l),
                (o[1] = t))
              : (t = o[1]),
            (0, u.useTempus)(t),
            o[2] !== c
              ? ((n = (0, i.jsx)("div", {
                  ref: f,
                  className: a.default.marker,
                  style: { backgroundColor: c },
                })),
                (o[2] = c),
                (o[3] = n))
              : (n = o[3]),
            n
          );
        }
      }
    },
    713: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ colors: () => t, themeNames: () => n, themes: () => i });
        const t = {
            black: "#000000",
            white: "#ffffff",
            blue: "#117BC8",
            grey: "#EBEBEB",
            "light-grey": "#7D7D7D",
            "grey-900": "#1C1917",
          },
          n = ["blue"],
          i = {
            blue: {
              primary: t.blue,
              secondary: t.white,
              tertiary: t.black,
              contrast: t.blue,
            },
          };
      }
    },
    69926: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ easings: () => t });
        const t = {
          "in-quad": "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
          "in-cubic": "cubic-bezier(0.55, 0.055, 0.675, 0.19)",
          "in-quart": "cubic-bezier(0.895, 0.03, 0.685, 0.22)",
          "in-quint": "cubic-bezier(0.755, 0.05, 0.855, 0.06)",
          "in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
          "in-circ": "cubic-bezier(0.6, 0.04, 0.98, 0.335)",
          "out-quad": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          "out-cubic": "cubic-bezier(0.215, 0.61, 0.355, 1)",
          "out-quart": "cubic-bezier(0.165, 0.84, 0.44, 1)",
          "out-quint": "cubic-bezier(0.23, 1, 0.32, 1)",
          "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
          "out-circ": "cubic-bezier(0.075, 0.82, 0.165, 1)",
          "in-out-quad": "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
          "in-out-cubic": "cubic-bezier(0.645, 0.045, 0.355, 1)",
          "in-out-quart": "cubic-bezier(0.77, 0, 0.175, 1)",
          "in-out-quint": "cubic-bezier(0.86, 0, 0.07, 1)",
          "in-out-expo": "cubic-bezier(1, 0, 0, 1)",
          "in-out-circ": "cubic-bezier(0.785, 0.135, 0.15, 0.86)",
          gleasing: "cubic-bezier(0.4, 0, 0, 1)",
        };
      }
    },
    51602: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({
          breakpoints: () => t,
          customSizes: () => r,
          layout: () => i,
          screens: () => n,
        });
        const t = { dt: 800 },
          n = {
            mobile: { width: 393, height: 858 },
            desktop: { width: 1440, height: 856 },
          },
          i = {
            columns: { mobile: 4, desktop: 12 },
            gap: { mobile: 16, desktop: 16 },
            safe: { mobile: 16, desktop: 42 },
          },
          r = { "header-height": { mobile: 98, desktop: 116 } };
      }
    },
    64267: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ fonts: () => t, typography: () => n });
        const t = {
            signifier: "--next-font-signifier",
            switzer: "--next-font-switzer",
          },
          n = {
            h1: {
              "font-family": `var(${t.signifier})`,
              "font-style": "normal",
              "font-weight": 300,
              "line-height": "118%",
              "letter-spacing": "0em",
              "font-size": { mobile: 38, desktop: 55 },
            },
            h2: {
              "font-family": `var(${t.signifier})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "102%",
              "letter-spacing": "0em",
              "font-size": { mobile: 45, desktop: 45 },
            },
            h3: {
              "font-family": `var(${t.signifier})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "120%",
              "letter-spacing": "0em",
              "font-size": { mobile: 36, desktop: 36 },
            },
            "h4-l": {
              "font-family": `var(${t.signifier})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "102%",
              "letter-spacing": "0em",
              "font-size": { mobile: 26, desktop: 34 },
            },
            h4: {
              "font-family": `var(${t.signifier})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "102%",
              "letter-spacing": "0em",
              "font-size": { mobile: 26, desktop: 24 },
            },
            h5: {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 600,
              "line-height": "102%",
              "letter-spacing": "0em",
              "font-size": { mobile: 22, desktop: 20 },
            },
            h6: {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 600,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 16, desktop: 14 },
            },
            "p-xl": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 18, desktop: 18 },
            },
            "p-l": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 16, desktop: 15 },
            },
            "p-xxl": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 500,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 14, desktop: 22 },
            },
            p: {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 500,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 14, desktop: 14 },
            },
            "p-s": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 14, desktop: 12 },
            },
            "p-xs": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 500,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 12, desktop: 12 },
            },
            username: {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 700,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 14, desktop: 12 },
            },
            "cta-rg-l": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 16, desktop: 14 },
            },
            "cta-rg": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 14, desktop: 14 },
            },
            "cta-rg-s": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 12, desktop: 18 },
            },
            "cta-md-l": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 500,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 18, desktop: 14 },
            },
            "cta-md": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 500,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 16, desktop: 14 },
            },
            "cta-md-s": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 500,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 14, desktop: 12 },
            },
            "cta-sb-l": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 600,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 16, desktop: 22 },
            },
            "cta-sb": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 600,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 14, desktop: 12 },
            },
            "cta-sb-s": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 600,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 12, desktop: 18 },
            },
            quote: {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "124%",
              "letter-spacing": "0em",
              "font-size": { mobile: 22, desktop: 22 },
            },
            "nav-cta": {
              "font-family": `var(${t.switzer})`,
              "font-style": "normal",
              "font-weight": 400,
              "line-height": "100%",
              "letter-spacing": "0em",
              "font-size": { mobile: 14, desktop: 20 },
            },
          };
      }
    },
    16925: (e) => {
      var { g: t, __dirname: n } = e;
      e.s({});
      var i = e.i(713),
        r = e.i(69926),
        o = e.i(51602),
        s = e.i(64267);
      i.colors,
        s.fonts,
        i.themeNames,
        i.themes,
        r.easings,
        o.breakpoints,
        o.customSizes,
        o.layout,
        o.screens,
        s.typography;
    },
    7442: (e) => {
      var { g: t, __dirname: n } = e;
      e.s({}), e.i(713), e.i(69926), e.i(51602), e.i(64267), e.i(16925);
    },
    21555: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ createStore: () => r, default: () => i });
        const t = {
            get url() {
              return `file://${e.P("node_modules/tunnel-rat/node_modules/zustand/esm/vanilla.mjs")}`;
            },
          },
          n = (e) => {
            let n,
              i = new Set(),
              r = (e, t) => {
                const r = "function" == typeof e ? e(n) : e;
                if (!Object.is(r, n)) {
                  const e = n;
                  (n = (null != t ? t : "object" != typeof r || null === r)
                    ? r
                    : Object.assign({}, n, r)),
                    i.forEach((t) => t(n, e));
                }
              },
              o = () => n,
              s = {
                setState: r,
                getState: o,
                getInitialState: () => u,
                subscribe: (e) => (i.add(e), () => i.delete(e)),
                destroy: () => {
                  (t.env ? t.env.MODE : void 0) !== "production" &&
                    console.warn(
                      "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected.",
                    ),
                    i.clear();
                },
              },
              u = (n = e(r, o, s));
            return s;
          },
          r = (e) => (e ? n(e) : n);
        var i = (e) => (
          (t.env ? t.env.MODE : void 0) !== "production" &&
            console.warn(
              "[DEPRECATED] Default export is deprecated. Instead use import { createStore } from 'zustand/vanilla'.",
            ),
          r(e)
        );
      }
    },
    58373: (e) => {
      var { g: t, __dirname: n, m: i, e: r } = e,
        o = e.r(38653),
        s =
          "function" == typeof Object.is
            ? Object.is
            : (e, t) =>
                (e === t && (0 !== e || 1 / e == 1 / t)) || (e != e && t != t),
        u = o.useState,
        l = o.useEffect,
        a = o.useLayoutEffect,
        c = o.useDebugValue;
      function f(e) {
        var t = e.getSnapshot;
        e = e.value;
        try {
          var n = t();
          return !s(e, n);
        } catch (e) {
          return !0;
        }
      }
      var d =
        "undefined" == typeof window ||
        void 0 === window.document ||
        void 0 === window.document.createElement
          ? (e, t) => t()
          : (e, t) => {
              var n = t(),
                i = u({ inst: { value: n, getSnapshot: t } }),
                r = i[0].inst,
                o = i[1];
              return (
                a(() => {
                  (r.value = n), (r.getSnapshot = t), f(r) && o({ inst: r });
                }, [e, n, t]),
                l(
                  () => (
                    f(r) && o({ inst: r }),
                    e(() => {
                      f(r) && o({ inst: r });
                    })
                  ),
                  [e],
                ),
                c(n),
                n
              );
            };
      r.useSyncExternalStore =
        void 0 !== o.useSyncExternalStore ? o.useSyncExternalStore : d;
    },
    32320: (e) => {
      var { g: t, __dirname: n, m: i, e: r } = e;
      e.i(22271);
      ("use strict");
      i.exports = e.r(58373);
    },
    78552: (e) => {
      var { g: t, __dirname: n, m: i, e: r } = e,
        o = e.r(38653),
        s = e.r(32320),
        u =
          "function" == typeof Object.is
            ? Object.is
            : (e, t) =>
                (e === t && (0 !== e || 1 / e == 1 / t)) || (e != e && t != t),
        l = s.useSyncExternalStore,
        a = o.useRef,
        c = o.useEffect,
        f = o.useMemo,
        d = o.useDebugValue;
      r.useSyncExternalStoreWithSelector = (e, t, n, i, r) => {
        var o = a(null);
        if (null === o.current) {
          var s = { hasValue: !1, value: null };
          o.current = s;
        } else s = o.current;
        var m = l(
          e,
          (o = f(() => {
            function e(e) {
              if (!a) {
                if (
                  ((a = !0), (o = e), (e = i(e)), void 0 !== r && s.hasValue)
                ) {
                  var t = s.value;
                  if (r(t, e)) return (l = t);
                }
                return (l = e);
              }
              if (((t = l), u(o, e))) return t;
              var n = i(e);
              return void 0 !== r && r(t, n)
                ? ((o = e), t)
                : ((o = e), (l = n));
            }
            var o,
              l,
              a = !1,
              c = void 0 === n ? null : n;
            return [() => e(t()), null === c ? void 0 : () => e(c())];
          }, [t, n, i, r]))[0],
          o[1],
        );
        return (
          c(() => {
            (s.hasValue = !0), (s.value = m);
          }, [m]),
          d(m),
          m
        );
      };
    },
    69492: (e) => {
      var { g: t, __dirname: n, m: i, e: r } = e;
      e.i(22271);
      ("use strict");
      i.exports = e.r(78552);
    },
    85850: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ create: () => d, default: () => u, useStore: () => s });
        var i = e.i(21555),
          r = e.i(38653),
          o = e.i(69492);
        let t = {
            get url() {
              return `file://${e.P("node_modules/tunnel-rat/node_modules/zustand/esm/index.mjs")}`;
            },
          },
          { useDebugValue: n } = r.default,
          { useSyncExternalStoreWithSelector: l } = o.default,
          a = !1,
          c = (e) => e;
        function s(e, i = c, r) {
          (t.env ? t.env.MODE : void 0) !== "production" &&
            r &&
            !a &&
            (console.warn(
              "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937",
            ),
            (a = !0));
          const o = l(
            e.subscribe,
            e.getState,
            e.getServerState || e.getInitialState,
            i,
            r,
          );
          return n(o), o;
        }
        const f = (e) => {
            (t.env ? t.env.MODE : void 0) !== "production" &&
              "function" != typeof e &&
              console.warn(
                "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.",
              );
            const n = "function" == typeof e ? (0, i.createStore)(e) : e,
              r = (e, t) => s(n, e, t);
            return Object.assign(r, n), r;
          },
          d = (e) => (e ? f(e) : f);
        var u = (e) => (
          (t.env ? t.env.MODE : void 0) !== "production" &&
            console.warn(
              "[DEPRECATED] Default export is deprecated. Instead use `import { create } from 'zustand'`.",
            ),
          d(e)
        );
      }
    },
    11005: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ default: () => u });
        var i,
          r,
          o = e.i(38653),
          s = e.i(85850);
        const t =
          "undefined" != typeof window &&
          ((null != (i = window.document) && i.createElement) ||
            (null == (r = window.navigator) ? void 0 : r.product) ===
              "ReactNative")
            ? o.default.useLayoutEffect
            : o.default.useEffect;
        function u() {
          const e = (0, s.create)((e) => ({ current: [], version: 0, set: e }));
          return {
            In: ({ children: n }) => {
              const i = e((e) => e.set),
                r = e((e) => e.version);
              return (
                t(() => {
                  i((e) => ({ version: e.version + 1 }));
                }, []),
                t(
                  () => (
                    i(({ current: e }) => ({ current: [...e, n] })),
                    () =>
                      i(({ current: e }) => ({
                        current: e.filter((e) => e !== n),
                      }))
                  ),
                  [n, r],
                ),
                null
              );
            },
            Out: () => {
              const t = e((e) => e.current);
              return o.default.createElement(o.default.Fragment, null, t);
            },
          };
        }
      }
    },
    40886: (e) => {
      var { g: t, __dirname: n } = e;
      e.s({ useDeviceDetection: () => o });
      var i = e.i(4371);
      e.i(7442);
      var r = e.i(51602);
      function o() {
        const e = r.breakpoints.dt,
          t = (0, i.useMediaQuery)(`(max-width: ${e - 1}px)`),
          n = (0, i.useMediaQuery)(`(min-width: ${e}px)`),
          o = (0, i.useMediaQuery)("(prefers-reduced-motion: reduce)");
        return {
          isMobile: t,
          isDesktop: n,
          isReducedMotion: o,
          isWebGL: n && !o,
          isLowPowerMode: (0, i.useMediaQuery)(
            "(any-pointer: coarse) and (hover: none)",
          ),
        };
      }
    },
    97686: (e) => {
      var { g: t, __dirname: n } = e;
      {
        e.s({ Canvas: () => c, CanvasContext: () => g, useCanvas: () => h });
        var i = e.i(31636),
          r = e.i(85444),
          o = e.i(47791),
          s = e.i(38653),
          u = e.i(11005),
          l = e.i(77666),
          a = e.i(40886);
        const t = (0, o.default)(
            () =>
              e
                .r(34891)(e.i)
                .then(({ WebGLCanvas: e }) => e),
            { loadableGenerated: { modules: [44981] }, ssr: !1 },
          ),
          n = (0, l.create)(() => ({})),
          g = (0, s.createContext)({});
        function c(e) {
          let o,
            u,
            l,
            c,
            h,
            b,
            v,
            p,
            y,
            w = (0, r.c)(25);
          w[0] !== e
            ? (({ children: o, root: l, force: c, ...u } = e),
              (w[0] = e),
              (w[1] = o),
              (w[2] = u),
              (w[3] = l),
              (w[4] = c))
            : ((o = w[1]), (u = w[2]), (l = w[3]), (c = w[4]));
          const z = void 0 !== l && l,
            S = void 0 !== c && c,
            [k] = (0, s.useState)(m),
            [E] = (0, s.useState)(d),
            { isWebGL: x } = (0, a.useDeviceDetection)();
          return (
            w[5] !== E || w[6] !== k || w[7] !== S || w[8] !== x || w[9] !== z
              ? ((h = () => (
                  z &&
                    n.setState(x || S ? { WebGLTunnel: k, DOMTunnel: E } : {}),
                  f
                )),
                (b = [z, x, S, k, E]),
                (w[5] = E),
                (w[6] = k),
                (w[7] = S),
                (w[8] = x),
                (w[9] = z),
                (w[10] = h),
                (w[11] = b))
              : ((h = w[10]), (b = w[11])),
            (0, s.useEffect)(h, b),
            w[12] !== E || w[13] !== k || w[14] !== S || w[15] !== x
              ? ((v = x || S ? { WebGLTunnel: k, DOMTunnel: E } : {}),
                (w[12] = E),
                (w[13] = k),
                (w[14] = S),
                (w[15] = x),
                (w[16] = v))
              : (v = w[16]),
            w[17] !== S || w[18] !== x || w[19] !== u
              ? ((p = (x || S) && (0, i.jsx)(t, { ...u })),
                (w[17] = S),
                (w[18] = x),
                (w[19] = u),
                (w[20] = p))
              : (p = w[20]),
            w[21] !== o || w[22] !== v || w[23] !== p
              ? ((y = (0, i.jsxs)(g.Provider, { value: v, children: [p, o] })),
                (w[21] = o),
                (w[22] = v),
                (w[23] = p),
                (w[24] = y))
              : (y = w[24]),
            y
          );
        }
        function f() {
          n.setState({});
        }
        function d() {
          return (0, u.default)();
        }
        function m() {
          return (0, u.default)();
        }
        function h() {
          const e = (0, s.useContext)(g),
            t = n();
          return Object.keys(e).length > 0 ? e : t;
        }
      }
    },
    34891: (e) => {
      var { g: t, __dirname: n } = e;
      e.v((t) =>
        Promise.all(
          [
            "static/chunks/cf2eb429b6150cc8.js",
            "static/chunks/1bcba3e6206631b5.js",
            "static/chunks/43fa342df0fdf5f7.js",
            { path: "static/chunks/b1b90356c7cbf117.css", included: [86736] },
          ].map((t) => e.l(t)),
        ).then(() => t(44981)),
      );
    },
  },
]);

//# sourceMappingURL=6dddb2291e546e42.js.map
