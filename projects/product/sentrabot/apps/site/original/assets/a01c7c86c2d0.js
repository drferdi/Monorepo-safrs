(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([
  "object" == typeof document ? document.currentScript : void 0,
  {},
  {
    otherChunks: [
      "static/chunks/5c9320c55d5c9d15.js",
      "static/chunks/8a8f3a41aaf267ef.js",
      "static/chunks/acb110e745da23b4.js",
      "static/chunks/cef67fe2dfc09a77.js",
    ],
    runtimeModuleIds: [32889],
  },
]),
  (() => {
    let e;
    if (!Array.isArray(globalThis.TURBOPACK)) return;
    const t = "/_next/",
      r = Symbol("reexported objects"),
      n = Object.prototype.hasOwnProperty,
      o = "undefined" != typeof Symbol && Symbol.toStringTag;
    function l(e, t, r) {
      n.call(e, t) || Object.defineProperty(e, t, r);
    }
    function u(e, t) {
      for (const r in (l(e, "__esModule", { value: !0 }),
      o && l(e, o, { value: "Module" }),
      t)) {
        const n = t[r];
        Array.isArray(n)
          ? l(e, r, { get: n[0], set: n[1], enumerable: !0 })
          : l(e, r, { get: n, enumerable: !0 });
      }
      Object.seal(e);
    }
    function i(e, t, r) {
      (e.namespaceObject = e.exports), u(t, r);
    }
    function s(e, t, o) {
      let l;
      (l = e[r]) ||
        ((l = e[r] = []),
        (e.exports = e.namespaceObject =
          new Proxy(t, {
            get(e, t) {
              if (n.call(e, t) || "default" === t || "__esModule" === t)
                return Reflect.get(e, t);
              for (const e of l) {
                const r = Reflect.get(e, t);
                if (void 0 !== r) return r;
              }
            },
            ownKeys(e) {
              const t = Reflect.ownKeys(e);
              for (const e of l)
                for (const r of Reflect.ownKeys(e))
                  "default" === r || t.includes(r) || t.push(r);
              return t;
            },
          }))),
        "object" == typeof o && null !== o && e[r].push(o);
    }
    function a(e, t) {
      e.exports = t;
    }
    function c(e, t) {
      e.exports = e.namespaceObject = t;
    }
    const f = Object.getPrototypeOf
        ? (e) => Object.getPrototypeOf(e)
        : (e) => e.__proto__,
      p = [null, f({}), f([]), f(f)];
    function d(e, t, r) {
      const n = Object.create(null);
      for (
        let t = e;
        ("object" == typeof t || "function" == typeof t) && !p.includes(t);
        t = f(t)
      )
        for (const r of Object.getOwnPropertyNames(t))
          n[r] = (
            (e, t) => () =>
              e[t]
          )(e, r);
      return (r && "default" in n) || (n.default = () => e), u(t, n), t;
    }
    function h(e, t) {
      const r = X(t, e);
      if (r.error) throw r.error;
      if (r.namespaceObject) return r.namespaceObject;
      const n = r.exports;
      return (r.namespaceObject = d(
        n,
        "function" == typeof n
          ? function (...e) {
              return n.apply(this, e);
            }
          : Object.create(null),
        n && n.__esModule,
      ));
    }
    const m =
      "function" == typeof require
        ? require
        : () => {
            throw Error("Unexpected use of runtime require");
          };
    function b(e, t) {
      const r = X(t, e);
      if (r.error) throw r.error;
      return r.exports;
    }
    function y(e) {
      function t(t) {
        if (n.call(e, t)) return e[t].module();
        const r = Error(`Cannot find module '${t}'`);
        throw ((r.code = "MODULE_NOT_FOUND"), r);
      }
      return (
        (t.keys = () => Object.keys(e)),
        (t.resolve = (t) => {
          if (n.call(e, t)) return e[t].id();
          const r = Error(`Cannot find module '${t}'`);
          throw ((r.code = "MODULE_NOT_FOUND"), r);
        }),
        (t.import = async (e) => await t(e)),
        t
      );
    }
    function O() {
      let e, t;
      return {
        promise: new Promise((r, n) => {
          (t = n), (e = r);
        }),
        resolve: e,
        reject: t,
      };
    }
    const g = Symbol("turbopack queues"),
      j = Symbol("turbopack exports"),
      w = Symbol("turbopack error");
    function R(e) {
      e &&
        1 !== e.status &&
        ((e.status = 1),
        e.forEach((e) => e.queueCount--),
        e.forEach((e) => (e.queueCount-- ? e.queueCount++ : e())));
    }
    function U(e, t, r) {
      const n = r ? Object.assign([], { status: -1 }) : void 0,
        o = new Set(),
        { resolve: l, reject: u, promise: i } = O(),
        s = Object.assign(i, {
          [j]: e.exports,
          [g]: (e) => {
            n && e(n), o.forEach(e), s.catch(() => {});
          },
        }),
        a = {
          get: () => s,
          set(e) {
            e !== s && (s[j] = e);
          },
        };
      Object.defineProperty(e, "exports", a),
        Object.defineProperty(e, "namespaceObject", a),
        t(
          (e) => {
            const t = e.map((e) => {
                if (null !== e && "object" == typeof e) {
                  if (g in e) return e;
                  if (
                    null != e &&
                    "object" == typeof e &&
                    "then" in e &&
                    "function" == typeof e.then
                  ) {
                    const t = Object.assign([], { status: 0 }),
                      r = { [j]: {}, [g]: (e) => e(t) };
                    return (
                      e.then(
                        (e) => {
                          (r[j] = e), R(t);
                        },
                        (e) => {
                          (r[w] = e), R(t);
                        },
                      ),
                      r
                    );
                  }
                }
                return { [j]: e, [g]: () => {} };
              }),
              r = () =>
                t.map((e) => {
                  if (e[w]) throw e[w];
                  return e[j];
                }),
              { promise: l, resolve: u } = O(),
              i = Object.assign(() => u(r), { queueCount: 0 });
            function s(e) {
              e !== n &&
                !o.has(e) &&
                (o.add(e), e && 0 === e.status && (i.queueCount++, e.push(i)));
            }
            return t.map((e) => e[g](s)), i.queueCount ? l : r();
          },
          (e) => {
            e ? u((s[w] = e)) : l(s[j]), R(n);
          },
        ),
        n && -1 === n.status && (n.status = 0);
    }
    const k = function (e) {
      const t = new URL(e, "x:/"),
        r = {};
      for (const e in t) r[e] = t[e];
      for (const t in ((r.href = e),
      (r.pathname = e.replace(/[?#].*/, "")),
      (r.origin = r.protocol = ""),
      (r.toString = r.toJSON = (...t) => e),
      r))
        Object.defineProperty(this, t, {
          enumerable: !0,
          configurable: !0,
          value: r[t],
        });
    };
    function C(e, t) {
      throw Error(`Invariant: ${t(e)}`);
    }
    k.prototype = URL.prototype;
    var P = ((e) => (
      (e[(e.Runtime = 0)] = "Runtime"),
      (e[(e.Parent = 1)] = "Parent"),
      (e[(e.Update = 2)] = "Update"),
      e
    ))(P || {});
    const _ = Object.create(null),
      $ = new Set(),
      T = new Map(),
      v = new Map(),
      S = new Map(),
      A = new Map();
    async function E(e, t) {
      let r;
      if ("string" == typeof t) return K(e, t);
      const n = t.included || [],
        o = n.map((e) => !!_[e] || S.get(e));
      if (o.length > 0 && o.every((e) => e)) return Promise.all(o);
      const l = t.moduleChunks || [],
        u = l.map((e) => A.get(e)).filter((e) => e);
      if (u.length > 0) {
        if (u.length === l.length) return Promise.all(u);
        const t = new Set();
        for (const e of l) A.has(e) || t.add(e);
        for (const r of t) {
          const t = K(e, r);
          A.set(r, t), u.push(t);
        }
        r = Promise.all(u);
      } else for (const n of ((r = K(e, t.path)), l)) A.has(n) || A.set(n, r);
      for (const e of n) S.has(e) || S.set(e, r);
      return r;
    }
    async function x(t, r) {
      try {
        await e.loadChunk(r, t);
      } catch (n) {
        let e;
        switch (t.type) {
          case 0:
            e = `as a runtime dependency of chunk ${t.chunkPath}`;
            break;
          case 1:
            e = `from module ${t.parentId}`;
            break;
          case 2:
            e = "from an HMR update";
            break;
          default:
            C(t, (e) => `Unknown source type: ${e?.type}`);
        }
        throw Error(
          `Failed to load chunk ${r} ${e}${n ? `: ${n}` : ""}`,
          n ? { cause: n } : void 0,
        );
      }
    }
    async function K(e, t) {
      return x(e, L(t));
    }
    function N(e) {
      return `/ROOT/${e ?? ""}`;
    }
    function M(e) {
      const t = new Blob(
        [
          `self.TURBOPACK_WORKER_LOCATION = ${JSON.stringify(location.origin)};
self.TURBOPACK_NEXT_CHUNK_URLS = ${JSON.stringify(e.reverse().map(L), null, 2)};
importScripts(...self.TURBOPACK_NEXT_CHUNK_URLS.map(c => self.TURBOPACK_WORKER_LOCATION + c).reverse());`,
        ],
        { type: "text/javascript" },
      );
      return URL.createObjectURL(t);
    }
    function L(e) {
      return `${t}${e
        .split("/")
        .map((e) => encodeURIComponent(e))
        .join("/")}`;
    }
    function I([r, n, o]) {
      const l = ((e) => {
        if ("string" == typeof e) return e;
        const r = decodeURIComponent(
          ("undefined" != typeof TURBOPACK_NEXT_CHUNK_URLS
            ? TURBOPACK_NEXT_CHUNK_URLS.pop()
            : e.getAttribute("src")
          ).replace(/[?#].*$/, ""),
        );
        return r.startsWith(t) ? r.slice(t.length) : r;
      })(r);
      for (const [e, t] of Object.entries(n))
        _[e] || (_[e] = t),
          ((e, t) => {
            let r = T.get(e);
            r ? r.add(t) : ((r = new Set([t])), T.set(e, r));
            let n = v.get(t);
            n ? n.add(e) : ((n = new Set([e])), v.set(t, n));
          })(e, l);
      return e.registerChunk(l, o);
    }
    const B = /\.js(?:\?[^#]*)?(?:#.*)?$/,
      q = /\.css(?:\?[^#]*)?(?:#.*)?$/;
    function H(e) {
      return q.test(e);
    }
    const W = {},
      X = (e, t) => {
        const r = W[e];
        return r || D(e, { type: P.Parent, parentId: t.id });
      };
    function D(e, t) {
      const r = _[e];
      if ("function" != typeof r) {
        let r;
        switch (t.type) {
          case P.Runtime:
            r = `as a runtime entry of chunk ${t.chunkPath}`;
            break;
          case P.Parent:
            r = `because it was required from module ${t.parentId}`;
            break;
          case P.Update:
            r = "because of an HMR update";
            break;
          default:
            C(t, (e) => `Unknown source type: ${e?.type}`);
        }
        throw Error(
          `Module ${e} was instantiated ${r}, but the module factory is not available. It might have been deleted in an HMR update.`,
        );
      }
      switch (t.type) {
        case P.Runtime:
          $.add(e);
          break;
        case P.Parent:
          break;
        case P.Update:
          throw Error("Unexpected");
        default:
          C(t, (e) => `Unknown source type: ${e?.type}`);
      }
      const n = {
        exports: {},
        error: void 0,
        loaded: !1,
        id: e,
        namespaceObject: void 0,
      };
      W[e] = n;
      try {
        const t = { type: P.Parent, parentId: e },
          o = b.bind(null, n);
        r.call(n.exports, {
          a: U.bind(null, n),
          e: n.exports,
          r: b.bind(null, n),
          t: m,
          f: y,
          i: h.bind(null, n),
          s: i.bind(null, n, n.exports),
          j: s.bind(null, n, n.exports),
          v: a.bind(null, n),
          n: c.bind(null, n),
          m: n,
          c: W,
          M: _,
          l: E.bind(null, t),
          L: x.bind(null, t),
          w: F.bind(null, t),
          u: J.bind(null, t),
          g: globalThis,
          P: N,
          U: k,
          R: (e) => {
            const t = o(e);
            return t?.default ?? t;
          },
          b: M,
          d: "string" == typeof n.id ? n.id.replace(/(^|\/)\/+$/, "") : n.id,
        });
      } catch (e) {
        throw ((n.error = e), e);
      }
      return (
        (n.loaded = !0),
        n.namespaceObject &&
          n.exports !== n.namespaceObject &&
          d(n.exports, n.namespaceObject),
        n
      );
    }
    async function F(e, t, r) {
      const n = fetch(L(t)),
        { instance: o } = await WebAssembly.instantiateStreaming(n, r);
      return o.exports;
    }
    async function J(e, t) {
      const r = fetch(L(t));
      return await WebAssembly.compileStreaming(r);
    }
    const z = new Map();
    (() => {
      function t(e) {
        let t = z.get(e);
        if (!t) {
          let r, n;
          (t = {
            resolved: !1,
            promise: new Promise((e, t) => {
              (r = e), (n = t);
            }),
            resolve: () => {
              (t.resolved = !0), r();
            },
            reject: n,
          }),
            z.set(e, t);
        }
        return t;
      }
      e = {
        async registerChunk(e, r) {
          if ((t(L(e)).resolve(), null != r)) {
            for (const e of r.otherChunks)
              t(L("string" == typeof e ? e : e.path));
            if (
              (await Promise.all(
                r.otherChunks.map((t) =>
                  E({ type: P.Runtime, chunkPath: e }, t),
                ),
              ),
              r.runtimeModuleIds.length > 0)
            )
              for (const t of r.runtimeModuleIds)
                !((e, t) => {
                  const r = W[e];
                  if (r) {
                    if (r.error) throw r.error;
                    return;
                  }
                  D(e, { type: P.Runtime, chunkPath: t });
                })(t, e);
          }
        },
        loadChunk: (e, r) =>
          ((e, r) => {
            const n = t(e);
            if (n.resolved) return n.promise;
            if (r.type === P.Runtime) return H(e) && n.resolve(), n.promise;
            if ("function" == typeof importScripts)
              if (H(e));
              else if (B.test(e))
                self.TURBOPACK_NEXT_CHUNK_URLS.push(e),
                  importScripts(TURBOPACK_WORKER_LOCATION + e);
              else
                throw Error(
                  `can't infer type of chunk from URL ${e} in worker`,
                );
            else {
              const t = decodeURI(e);
              if (H(e))
                if (
                  document.querySelectorAll(
                    `link[rel=stylesheet][href="${e}"],link[rel=stylesheet][href^="${e}?"],link[rel=stylesheet][href="${t}"],link[rel=stylesheet][href^="${t}?"]`,
                  ).length > 0
                )
                  n.resolve();
                else {
                  const t = document.createElement("link");
                  (t.rel = "stylesheet"),
                    (t.href = e),
                    (t.onerror = () => {
                      n.reject();
                    }),
                    (t.onload = () => {
                      n.resolve();
                    }),
                    document.body.appendChild(t);
                }
              else if (B.test(e)) {
                const r = document.querySelectorAll(
                  `script[src="${e}"],script[src^="${e}?"],script[src="${t}"],script[src^="${t}?"]`,
                );
                if (r.length > 0)
                  for (const e of Array.from(r))
                    e.addEventListener("error", () => {
                      n.reject();
                    });
                else {
                  const t = document.createElement("script");
                  (t.src = e),
                    (t.onerror = () => {
                      n.reject();
                    }),
                    document.body.appendChild(t);
                }
              } else throw Error(`can't infer type of chunk from URL ${e}`);
            }
            return n.promise;
          })(e, r),
      };
    })();
    const G = globalThis.TURBOPACK;
    (globalThis.TURBOPACK = { push: I }), G.forEach(I);
  })();

//# sourceMappingURL=84f5ecdc99cc0be6.js.map
