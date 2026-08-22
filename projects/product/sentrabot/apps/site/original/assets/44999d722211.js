(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([
  "object" == typeof document ? document.currentScript : void 0,
  {
    42363: (t) => {
      var { g: e, __dirname: s } = t;
      {
        t.s({ createStore: () => s });
        const e = (t) => {
            let e,
              s = new Set(),
              a = (t, a) => {
                const i = "function" == typeof t ? t(e) : t;
                if (!Object.is(i, e)) {
                  const t = e;
                  (e = (null != a ? a : "object" != typeof i || null === i)
                    ? i
                    : Object.assign({}, e, i)),
                    s.forEach((s) => s(e, t));
                }
              },
              i = () => e,
              c = {
                setState: a,
                getState: i,
                getInitialState: () => n,
                subscribe: (t) => (s.add(t), () => s.delete(t)),
              },
              n = (e = t(a, i, c));
            return c;
          },
          s = (t) => (t ? e(t) : e);
      }
    },
    34546: (t) => {
      var { g: e, __dirname: s, m: a, e: i } = t;
      ("use strict");
      var c =
        t.r(
          38653,
        ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
      i.c = (t) => c.H.useMemoCache(t);
    },
    85444: (t) => {
      var { g: e, __dirname: s, m: a, e: i } = t;
      t.i(22271);
      ("use strict");
      a.exports = t.r(34546);
    },
    6673: (t) => {
      var { g: e, __dirname: s } = t;
      t.s({ default: () => u });
      var a = 0,
        i = "undefined" != typeof window,
        c = i && window.requestAnimationFrame,
        n = i && window.cancelAnimationFrame,
        r = class {
          callbacks = [];
          fps;
          time = 0;
          lastTickDate = performance.now();
          framesCount = 0;
          constructor(t = Number.POSITIVE_INFINITY) {
            this.fps = t;
          }
          get isRelativeFps() {
            return "string" == typeof this.fps && this.fps.endsWith("%");
          }
          get maxFramesCount() {
            return this.isRelativeFps
              ? Math.max(1, Math.round(100 / Number(this.fps.replace("%", ""))))
              : 1;
          }
          get executionTime() {
            return this.isRelativeFps ? 0 : 1e3 / this.fps;
          }
          dispatch(t, e) {
            for (let s = 0; s < this.callbacks.length; s++) {
              const a = performance.now();
              this.callbacks[s]?.callback(t, e);
              const i = performance.now() - a;
              this.callbacks[s].samples?.push(i),
                (this.callbacks[s].samples =
                  this.callbacks[s].samples?.slice(-9));
            }
          }
          raf(t, e) {
            if (((this.time += e), this.isRelativeFps))
              0 === this.framesCount && this.dispatch(t, e),
                this.framesCount++,
                (this.framesCount %= this.maxFramesCount);
            else if (this.fps === Number.POSITIVE_INFINITY) this.dispatch(t, e);
            else if (this.time >= this.executionTime) {
              this.time = this.time % this.executionTime;
              const e = t - this.lastTickDate;
              (this.lastTickDate = t), this.dispatch(t, e);
            }
          }
          add({ callback: t, priority: e, label: s }) {
            if ("function" != typeof t)
              return void console.warn(
                "Tempus.add: callback is not a function",
              );
            const i = a++;
            return (
              this.callbacks.push({
                callback: t,
                priority: e,
                uid: i,
                label: s,
                samples: [],
              }),
              this.callbacks.sort((t, e) => t.priority - e.priority),
              () => this.remove(i)
            );
          }
          remove(t) {
            this.callbacks = this.callbacks.filter(({ uid: e }) => t !== e);
          }
        },
        u = new (class {
          framerates;
          time;
          fps;
          usage;
          constructor() {
            if (
              ((this.framerates = {}),
              (this.time = i ? performance.now() : 0),
              (this.usage = 0),
              !i)
            )
              return;
            requestAnimationFrame(this.raf);
          }
          add(
            t,
            {
              priority: e = 0,
              fps: s = Number.POSITIVE_INFINITY,
              label: a = "",
            } = {},
          ) {
            if (i) {
              if (
                "number" == typeof s ||
                ("string" == typeof s && s.endsWith("%"))
              )
                return (
                  this.framerates[s] || (this.framerates[s] = new r(s)),
                  this.framerates[s].add({ callback: t, priority: e, label: a })
                );
              console.warn(
                'Tempus.add: fps is not a number or a string ending with "%"',
              );
            }
          }
          raf = (t) => {
            if (!i) return;
            const e = t - this.time;
            (this.time = t), (this.fps = 1e3 / e);
            const s = performance.now();
            for (const s of Object.values(this.framerates)) s.raf(t, e);
            const a = performance.now() - s;
            (this.usage = a / e), requestAnimationFrame(this.raf);
          };
          patch() {
            i &&
              ((window.requestAnimationFrame = (
                t,
                { priority: e = 0, fps: s = Number.POSITIVE_INFINITY } = {},
              ) =>
                t !== this.raf &&
                t.toString().includes("requestAnimationFrame(")
                  ? (t.__tempusPatched ||
                      (console.log("patching", t.name, t),
                      (t.__tempusPatched = !0),
                      (t.__tempusUnsubscribe = this.add(t, {
                        priority: e,
                        fps: s,
                        label: t.name,
                      }))),
                    t.__tempusUnsubscribe)
                  : c(t)),
              (window.cancelAnimationFrame = (t) =>
                "function" == typeof t ? void t?.() : n(t)));
          }
          unpatch() {
            i &&
              ((window.requestAnimationFrame = c),
              (window.cancelAnimationFrame = n));
          }
        })();
    },
    92854: (t) => {
      var { g: e, __dirname: s } = t;
      t.s({ ReactTempus: () => n, useTempus: () => c });
      var a = t.i(38653),
        i = t.i(6673);
      function c(t, e) {
        const s = (0, a.useRef)(t);
        (s.current = t),
          (0, a.useEffect)(
            () =>
              i.default.add((...t) => {
                s.current(...t);
              }, e),
            [JSON.stringify(e)],
          );
      }
      function n({ patch: t = !0 }) {
        return (
          (0, a.useLayoutEffect)(() => {
            if (i.default && t)
              return i.default.patch(), () => i.default.unpatch();
          }, [t]),
          null
        );
      }
    },
    74362: (t) => {
      var { g: e, __dirname: s } = t;
      t.v((e) =>
        Promise.all(
          [
            "static/chunks/21dffe9021bdad6c.js",
            "static/chunks/af1d06ba837d9da8.js",
            "static/chunks/43fa342df0fdf5f7.js",
            { path: "static/chunks/8b4a302b62187b5e.css", included: [95811] },
          ].map((e) => t.l(e)),
        ).then(() => e(91787)),
      );
    },
    97158: (t) => {
      var { g: e, __dirname: s } = t;
      t.v((e) =>
        Promise.all(
          [
            "static/chunks/c11e2c758ce80c72.js",
            { path: "static/chunks/6435c442a2570044.css", included: [21814] },
          ].map((e) => t.l(e)),
        ).then(() => e(56372)),
      );
    },
    23815: (t) => {
      var { g: e, __dirname: s } = t;
      t.v((e) =>
        Promise.all(
          [
            "static/chunks/783362caab9ef2db.js",
            { path: "static/chunks/955b2ad03a1f3ad3.css", included: [33242] },
          ].map((e) => t.l(e)),
        ).then(() => e(15911)),
      );
    },
    74558: (t) => {
      var { g: e, __dirname: s } = t;
      t.v((e) =>
        Promise.all(
          [
            "static/chunks/3cd09ae2b146460d.js",
            {
              path: "static/chunks/bb76aff38a67eb81.css",
              included: [40522, 57798, 58039, 91323, 21038, 23053],
              moduleChunks: [
                "static/chunks/2aa0b7027c1cfbb8.single.css",
                "static/chunks/98d0b2ac2aebdefb.single.css",
                "static/chunks/0fa75a604eb0353e.single.css",
                "static/chunks/eba40e5b14afbdca.single.css",
                "static/chunks/a141b039d4a65c11.single.css",
                "static/chunks/0b6f38843467147c.single.css",
              ],
            },
          ].map((e) => t.l(e)),
        ).then(() => e(34118)),
      );
    },
  },
]);

//# sourceMappingURL=7e57816a533c15de.js.map
