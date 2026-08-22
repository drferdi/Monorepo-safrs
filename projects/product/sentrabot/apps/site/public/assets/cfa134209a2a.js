(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([
  "object" == typeof document ? document.currentScript : void 0,
  {
    74076: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({
        accordion: "accordion-module__tWMLDa__accordion",
        body: "accordion-module__tWMLDa__body",
      });
    },
    51301: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ Body: () => m, Button: () => f, Group: () => c, Root: () => u });
        var n = e.i(31636),
          a = e.i(85444),
          i = e.i(60566),
          s = e.i(4371),
          l = e.i(38653),
          o = e.i(74076);
        const t = (0, l.createContext)({}),
          r = (0, l.createContext)({});
        function d() {
          return (0, l.useContext)(r);
        }
        function c(e) {
          let r,
            i,
            s = (0, a.c)(5),
            { children: o } = e,
            [d, c] = (0, l.useState)();
          return (
            s[0] !== d
              ? ((r = { currentId: d, setCurrentId: c }),
                (s[0] = d),
                (s[1] = r))
              : (r = s[1]),
            s[2] !== o || s[3] !== r
              ? ((i = (0, n.jsx)(t.Provider, { value: r, children: o })),
                (s[2] = o),
                (s[3] = r),
                (s[4] = i))
              : (i = s[4]),
            i
          );
        }
        function u(e) {
          let s,
            d,
            c,
            u,
            f,
            m,
            p,
            h = (0, a.c)(19),
            { children: g, className: x, ref: v } = e,
            b = (0, l.useId)(),
            { currentId: y, setCurrentId: w } = (0, l.useContext)(t),
            j = y === b;
          h[0] !== b || h[1] !== w
            ? ((s = () => {
                w((e) => (e === b ? void 0 : b));
              }),
              (h[0] = b),
              (h[1] = w),
              (h[2] = s))
            : (s = h[2]);
          const _ = s;
          return (
            h[3] !== _
              ? ((d = () => ({ toggle: _ })), (h[3] = _), (h[4] = d))
              : (d = h[4]),
            (0, l.useImperativeHandle)(v, d),
            h[5] !== j || h[6] !== _
              ? ((c = { isOpen: j, toggle: _ }),
                (h[5] = j),
                (h[6] = _),
                (h[7] = c))
              : (c = h[7]),
            h[8] !== x
              ? ((u = (0, i.default)(o.default.accordion, x)),
                (h[8] = x),
                (h[9] = u))
              : (u = h[9]),
            h[10] !== g || h[11] !== j
              ? ((f = "function" == typeof g ? g({ isOpen: j }) : g),
                (h[10] = g),
                (h[11] = j),
                (h[12] = f))
              : (f = h[12]),
            h[13] !== u || h[14] !== f
              ? ((m = (0, n.jsx)("div", { className: u, children: f })),
                (h[13] = u),
                (h[14] = f),
                (h[15] = m))
              : (m = h[15]),
            h[16] !== c || h[17] !== m
              ? ((p = (0, n.jsx)(r.Provider, { value: c, children: m })),
                (h[16] = c),
                (h[17] = m),
                (h[18] = p))
              : (p = h[18]),
            p
          );
        }
        function f(e) {
          let t,
            r,
            s,
            l,
            c,
            u,
            f,
            m = (0, a.c)(15);
          m[0] !== e
            ? (({ children: t, className: r, onClick: s, ...l } = e),
              (m[0] = e),
              (m[1] = t),
              (m[2] = r),
              (m[3] = s),
              (m[4] = l))
            : ((t = m[1]), (r = m[2]), (s = m[3]), (l = m[4]));
          const { toggle: p } = d();
          return (
            m[5] !== r
              ? ((c = (0, i.default)(o.default.button, r)),
                (m[5] = r),
                (m[6] = c))
              : (c = m[6]),
            m[7] !== s || m[8] !== p
              ? ((u = (e) => {
                  s?.(e), p();
                }),
                (m[7] = s),
                (m[8] = p),
                (m[9] = u))
              : (u = m[9]),
            m[10] !== t || m[11] !== l || m[12] !== c || m[13] !== u
              ? ((f = (0, n.jsx)("button", {
                  className: c,
                  onClick: u,
                  ...l,
                  children: t,
                })),
                (m[10] = t),
                (m[11] = l),
                (m[12] = c),
                (m[13] = u),
                (m[14] = f))
              : (f = m[14]),
            f
          );
        }
        function m(e) {
          let t,
            r,
            l,
            c,
            u,
            f = (0, a.c)(15),
            { children: m, className: p } = e,
            { isOpen: h } = d(),
            [g, x] = (0, s.useResizeObserver)(),
            v = h && o.default.isOpen;
          f[0] !== v
            ? ((t = (0, i.default)(o.default.body, v)), (f[0] = v), (f[1] = t))
            : (t = f[1]);
          const b = !h,
            y = `${h ? x?.contentRect.height : 0}px`;
          return (
            f[2] !== y
              ? ((r = { height: y }), (f[2] = y), (f[3] = r))
              : (r = f[3]),
            f[4] !== m || f[5] !== p
              ? ((l = (0, n.jsx)("div", { className: p, children: m })),
                (f[4] = m),
                (f[5] = p),
                (f[6] = l))
              : (l = f[6]),
            f[7] !== g || f[8] !== l
              ? ((c = (0, n.jsx)("div", { ref: g, children: l })),
                (f[7] = g),
                (f[8] = l),
                (f[9] = c))
              : (c = f[9]),
            f[10] !== t || f[11] !== b || f[12] !== r || f[13] !== c
              ? ((u = (0, n.jsx)("div", {
                  className: t,
                  "aria-hidden": b,
                  style: r,
                  children: c,
                })),
                (f[10] = t),
                (f[11] = b),
                (f[12] = r),
                (f[13] = c),
                (f[14] = u))
              : (u = f[14]),
            u
          );
        }
      }
    },
    18886: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({ faq__item: "faq-module__O8tnPq__faq__item" });
    },
    84245: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ default: () => t });
        var n,
          a = e.i(38653);
        function i() {
          return (i = Object.assign.bind()).apply(null, arguments);
        }
        const t = (0, a.memo)((e) =>
          (0, a.createElement)(
            "svg",
            i(
              {
                viewBox: "0 0 10 6",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
              },
              e,
            ),
            n ||
              (n = (0, a.createElement)("path", {
                d: "m1 .5.6.2 3.6 3.6L8.9.6c.8-.4 1.4.5.8 1.1-1.4 1.2-2.6 2.9-4 4Q5.3 6 5 6L.6 1.6C.3 1.3.4.6.9.6",
                fill: "white",
              })),
          ),
        );
      }
    },
    52439: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ FaqItem: () => o });
      var n = e.i(31636),
        a = e.i(60566),
        i = e.i(51301),
        s = e.i(18886),
        l = e.i(84245);
      function o({ data: e, className: t }) {
        return (0, n.jsx)(i.Root, {
          children: ({ isOpen: r }) =>
            (0, n.jsxs)("div", {
              className: (0, a.default)(
                t,
                s.default.faq__item,
                "relative dr-mt-10 dr-rounded-10 dt:dr-rounded-8 overflow-hidden",
              ),
              children: [
                (0, n.jsxs)(i.Button, {
                  className:
                    "dr-py-14 dr-px-16 relative flex items-center justify-between w-full",
                  children: [
                    (0, n.jsx)("h4", {
                      className: "dr-w-271 dt:w-full h6",
                      children: e?.title,
                    }),
                    (0, n.jsx)(l.default, {
                      className: (0, a.default)(
                        "dr-w-10 transition-transform duration-300",
                        { "rotate-180": r },
                      ),
                    }),
                  ],
                }),
                (0, n.jsx)(i.Body, {
                  className: "relative",
                  children: (0, n.jsx)("p", {
                    className: "dr-px-16 dr-pb-14 p-s dr-pt-0 opacity-[0.56]",
                    dangerouslySetInnerHTML: { __html: e?.desc },
                  }),
                }),
              ],
            }),
        });
      }
    },
    66351: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      ("use strict");
      function i(e) {
        const {
            widthInt: t,
            heightInt: r,
            blurWidth: n,
            blurHeight: a,
            blurDataURL: i,
            objectFit: s,
          } = e,
          l = n ? 40 * n : t,
          o = a ? 40 * a : r,
          d = l && o ? "viewBox='0 0 " + l + " " + o + "'" : "";
        return (
          "%3Csvg xmlns='http://www.w3.org/2000/svg' " +
          d +
          "%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3CfeColorMatrix values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1' result='s'/%3E%3CfeFlood x='0' y='0' width='100%25' height='100%25'/%3E%3CfeComposite operator='out' in='s'/%3E%3CfeComposite in2='SourceGraphic'/%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Cimage width='100%25' height='100%25' x='0' y='0' preserveAspectRatio='" +
          (d
            ? "none"
            : "contain" === s
              ? "xMidYMid"
              : "cover" === s
                ? "xMidYMid slice"
                : "none") +
          "' style='filter: url(%23b);' href='" +
          i +
          "'/%3E%3C/svg%3E"
        );
      }
      Object.defineProperty(a, "__esModule", { value: !0 }),
        Object.defineProperty(a, "getImageBlurSvg", {
          enumerable: !0,
          get: () => i,
        });
    },
    61642: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        Object.defineProperty(a, "__esModule", { value: !0 });
        var i = { VALID_LOADERS: () => e, imageConfigDefault: () => t };
        for (var s in i)
          Object.defineProperty(a, s, { enumerable: !0, get: i[s] });
        const e = ["default", "imgix", "cloudinary", "akamai", "custom"],
          t = {
            deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
            imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
            path: "/_next/image",
            loader: "default",
            loaderFile: "",
            domains: [],
            disableStaticImages: !1,
            minimumCacheTTL: 60,
            formats: ["image/webp"],
            dangerouslyAllowSVG: !1,
            contentSecurityPolicy:
              "script-src 'none'; frame-src 'none'; sandbox;",
            contentDispositionType: "attachment",
            localPatterns: void 0,
            remotePatterns: [],
            qualities: void 0,
            unoptimized: !1,
          };
      }
    },
    61311: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        e.i(22271),
          Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "getImgProps", {
            enumerable: !0,
            get: () => l,
          }),
          e.r(12597);
        const t = e.r(66351),
          r = e.r(61642),
          n = ["-moz-initial", "fill", "none", "scale-down", void 0];
        function i(e) {
          return void 0 !== e.default;
        }
        function s(e) {
          return void 0 === e
            ? e
            : "number" == typeof e
              ? Number.isFinite(e)
                ? e
                : NaN
              : "string" == typeof e && /^[0-9]+$/.test(e)
                ? parseInt(e, 10)
                : NaN;
        }
        function l(e, a) {
          var l, o;
          let d,
            c,
            u,
            {
              src: f,
              sizes: m,
              unoptimized: p = !1,
              priority: h = !1,
              loading: g,
              className: x,
              quality: v,
              width: b,
              height: y,
              fill: w = !1,
              style: j,
              overrideSrc: _,
              onLoad: N,
              onLoadingComplete: S,
              placeholder: k = "empty",
              blurDataURL: C,
              fetchPriority: E,
              decoding: R = "async",
              layout: P,
              objectFit: M,
              objectPosition: O,
              lazyBoundary: A,
              lazyRoot: z,
              ...I
            } = e,
            {
              imgConf: T,
              showAltText: L,
              blurComplete: F,
              defaultLoader: q,
            } = a,
            D = T || r.imageConfigDefault;
          if ("allSizes" in D) d = D;
          else {
            const e = [...D.deviceSizes, ...D.imageSizes].sort((e, t) => e - t),
              t = D.deviceSizes.sort((e, t) => e - t),
              r = null == (l = D.qualities) ? void 0 : l.sort((e, t) => e - t);
            d = { ...D, allSizes: e, deviceSizes: t, qualities: r };
          }
          if (void 0 === q)
            throw Object.defineProperty(
              Error(
                "images.loaderFile detected but the file is missing default export.\nRead more: https://nextjs.org/docs/messages/invalid-images-config",
              ),
              "__NEXT_ERROR_CODE",
              { value: "E163", enumerable: !1, configurable: !0 },
            );
          let B = I.loader || q;
          delete I.loader, delete I.srcSet;
          const $ = "__next_img_default" in B;
          if ($) {
            if ("custom" === d.loader)
              throw Object.defineProperty(
                Error(
                  'Image with src "' +
                    f +
                    '" is missing "loader" prop.\nRead more: https://nextjs.org/docs/messages/next-image-missing-loader',
                ),
                "__NEXT_ERROR_CODE",
                { value: "E252", enumerable: !1, configurable: !0 },
              );
          } else {
            const e = B;
            B = (t) => {
              const { config: r, ...n } = t;
              return e(n);
            };
          }
          if (P) {
            "fill" === P && (w = !0);
            const e = {
              intrinsic: { maxWidth: "100%", height: "auto" },
              responsive: { width: "100%", height: "auto" },
            }[P];
            e && (j = { ...j, ...e });
            const t = { responsive: "100vw", fill: "100vw" }[P];
            t && !m && (m = t);
          }
          let W = "",
            H = s(b),
            V = s(y);
          if ((o = f) && "object" == typeof o && (i(o) || void 0 !== o.src)) {
            const e = i(f) ? f.default : f;
            if (!e.src)
              throw Object.defineProperty(
                Error(
                  "An object should only be passed to the image component src parameter if it comes from a static image import. It must include src. Received " +
                    JSON.stringify(e),
                ),
                "__NEXT_ERROR_CODE",
                { value: "E460", enumerable: !1, configurable: !0 },
              );
            if (!e.height || !e.width)
              throw Object.defineProperty(
                Error(
                  "An object should only be passed to the image component src parameter if it comes from a static image import. It must include height and width. Received " +
                    JSON.stringify(e),
                ),
                "__NEXT_ERROR_CODE",
                { value: "E48", enumerable: !1, configurable: !0 },
              );
            if (
              ((c = e.blurWidth),
              (u = e.blurHeight),
              (C = C || e.blurDataURL),
              (W = e.src),
              !w)
            )
              if (H || V) {
                if (H && !V) {
                  const t = H / e.width;
                  V = Math.round(e.height * t);
                } else if (!H && V) {
                  const t = V / e.height;
                  H = Math.round(e.width * t);
                }
              } else (H = e.width), (V = e.height);
          }
          let U = !h && ("lazy" === g || void 0 === g);
          (!(f = "string" == typeof f ? f : W) ||
            f.startsWith("data:") ||
            f.startsWith("blob:")) &&
            ((p = !0), (U = !1)),
            d.unoptimized && (p = !0),
            $ &&
              !d.dangerouslyAllowSVG &&
              f.split("?", 1)[0].endsWith(".svg") &&
              (p = !0);
          const G = s(v),
            Q = Object.assign(
              w
                ? {
                    position: "absolute",
                    height: "100%",
                    width: "100%",
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    objectFit: M,
                    objectPosition: O,
                  }
                : {},
              L ? {} : { color: "transparent" },
              j,
            ),
            K =
              F || "empty" === k
                ? null
                : "blur" === k
                  ? 'url("data:image/svg+xml;charset=utf-8,' +
                    (0, t.getImageBlurSvg)({
                      widthInt: H,
                      heightInt: V,
                      blurWidth: c,
                      blurHeight: u,
                      blurDataURL: C || "",
                      objectFit: Q.objectFit,
                    }) +
                    '")'
                  : 'url("' + k + '")',
            X = n.includes(Q.objectFit)
              ? "fill" === Q.objectFit
                ? "100% 100%"
                : "cover"
              : Q.objectFit,
            Y = K
              ? {
                  backgroundSize: X,
                  backgroundPosition: Q.objectPosition || "50% 50%",
                  backgroundRepeat: "no-repeat",
                  backgroundImage: K,
                }
              : {},
            Z = ((e) => {
              const {
                config: t,
                src: r,
                unoptimized: n,
                width: a,
                quality: i,
                sizes: s,
                loader: l,
              } = e;
              if (n) return { src: r, srcSet: void 0, sizes: void 0 };
              const { widths: o, kind: d } = ((e, t, r) => {
                  const { deviceSizes: n, allSizes: a } = e;
                  if (r) {
                    const e = /(^|\s)(1?\d?\d)vw/g,
                      t = [];
                    for (let n; (n = e.exec(r)); ) t.push(parseInt(n[2]));
                    if (t.length) {
                      const e = 0.01 * Math.min(...t);
                      return {
                        widths: a.filter((t) => t >= n[0] * e),
                        kind: "w",
                      };
                    }
                    return { widths: a, kind: "w" };
                  }
                  return "number" != typeof t
                    ? { widths: n, kind: "w" }
                    : {
                        widths: [
                          ...new Set(
                            [t, 2 * t].map(
                              (e) => a.find((t) => t >= e) || a[a.length - 1],
                            ),
                          ),
                        ],
                        kind: "x",
                      };
                })(t, a, s),
                c = o.length - 1;
              return {
                sizes: s || "w" !== d ? s : "100vw",
                srcSet: o
                  .map(
                    (e, n) =>
                      l({ config: t, src: r, quality: i, width: e }) +
                      " " +
                      ("w" === d ? e : n + 1) +
                      d,
                  )
                  .join(", "),
                src: l({ config: t, src: r, quality: i, width: o[c] }),
              };
            })({
              config: d,
              src: f,
              unoptimized: p,
              width: H,
              quality: G,
              sizes: m,
              loader: B,
            });
          return {
            props: {
              ...I,
              loading: U ? "lazy" : g,
              fetchPriority: E,
              width: H,
              height: V,
              decoding: R,
              className: x,
              style: { ...Q, ...Y },
              sizes: Z.sizes,
              srcSet: Z.srcSet,
              src: _ || Z.src,
            },
            meta: { unoptimized: p, priority: h, placeholder: k, fill: w },
          };
        }
      }
    },
    70719: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "default", { enumerable: !0, get: () => i });
        const t = e.r(38653),
          r = "undefined" == typeof window,
          n = r ? () => {} : t.useLayoutEffect,
          s = r ? () => {} : t.useEffect;
        function i(e) {
          const { headManager: a, reduceComponentsToState: i } = e;
          function l() {
            if (a && a.mountedInstances) {
              const r = t.Children.toArray(
                Array.from(a.mountedInstances).filter(Boolean),
              );
              a.updateHead(i(r, e));
            }
          }
          if (r) {
            var o;
            null == a || null == (o = a.mountedInstances) || o.add(e.children),
              l();
          }
          return (
            n(() => {
              var t;
              return (
                null == a ||
                  null == (t = a.mountedInstances) ||
                  t.add(e.children),
                () => {
                  var t;
                  null == a ||
                    null == (t = a.mountedInstances) ||
                    t.delete(e.children);
                }
              );
            }),
            n(
              () => (
                a && (a._pendingUpdate = l),
                () => {
                  a && (a._pendingUpdate = l);
                }
              ),
            ),
            s(
              () => (
                a &&
                  a._pendingUpdate &&
                  (a._pendingUpdate(), (a._pendingUpdate = null)),
                () => {
                  a &&
                    a._pendingUpdate &&
                    (a._pendingUpdate(), (a._pendingUpdate = null));
                }
              ),
            ),
            null
          );
        }
      }
    },
    21884: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        e.i(22271),
          Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "AmpStateContext", {
            enumerable: !0,
            get: () => t,
          });
        const t = e.r(13314)._(e.r(38653)).default.createContext({});
      }
    },
    68978: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      ("use strict");
      function i(e) {
        const {
          ampFirst: t = !1,
          hybrid: r = !1,
          hasQuery: n = !1,
        } = void 0 === e ? {} : e;
        return t || (r && n);
      }
      Object.defineProperty(a, "__esModule", { value: !0 }),
        Object.defineProperty(a, "isInAmpMode", {
          enumerable: !0,
          get: () => i,
        });
    },
    17153: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        var i = e.i(22271);
        Object.defineProperty(a, "__esModule", { value: !0 });
        var s = { default: () => v, defaultHead: () => o };
        for (var l in s)
          Object.defineProperty(a, l, { enumerable: !0, get: s[l] });
        const t = e.r(13314),
          r = e.r(81369),
          u = e.r(31636),
          f = r._(e.r(38653)),
          m = t._(e.r(70719)),
          p = e.r(21884),
          h = e.r(26796),
          g = e.r(68978);
        function o(e) {
          void 0 === e && (e = !1);
          const t = [(0, u.jsx)("meta", { charSet: "utf-8" }, "charset")];
          return (
            e ||
              t.push(
                (0, u.jsx)(
                  "meta",
                  { name: "viewport", content: "width=device-width" },
                  "viewport",
                ),
              ),
            t
          );
        }
        function d(e, t) {
          return "string" == typeof t || "number" == typeof t
            ? e
            : t.type === f.default.Fragment
              ? e.concat(
                  f.default.Children.toArray(t.props.children).reduce(
                    (e, t) =>
                      "string" == typeof t || "number" == typeof t
                        ? e
                        : e.concat(t),
                    [],
                  ),
                )
              : e.concat(t);
        }
        e.r(12597);
        const x = ["name", "httpEquiv", "charSet", "itemProp"];
        function c(e, t) {
          const { inAmpMode: r } = t;
          return e
            .reduce(d, [])
            .reverse()
            .concat(o(r).reverse())
            .filter(
              (() => {
                const e = new Set(),
                  t = new Set(),
                  r = new Set(),
                  n = {};
                return (a) => {
                  let i = !0,
                    s = !1;
                  if (
                    a.key &&
                    "number" != typeof a.key &&
                    a.key.indexOf("$") > 0
                  ) {
                    s = !0;
                    const t = a.key.slice(a.key.indexOf("$") + 1);
                    e.has(t) ? (i = !1) : e.add(t);
                  }
                  switch (a.type) {
                    case "title":
                    case "base":
                      t.has(a.type) ? (i = !1) : t.add(a.type);
                      break;
                    case "meta":
                      for (let e = 0, t = x.length; e < t; e++) {
                        const t = x[e];
                        if (Object.hasOwn(a.props, t))
                          if ("charSet" === t) r.has(t) ? (i = !1) : r.add(t);
                          else {
                            const e = a.props[t],
                              r = n[t] || new Set();
                            ("name" !== t || !s) && r.has(e)
                              ? (i = !1)
                              : (r.add(e), (n[t] = r));
                          }
                      }
                  }
                  return i;
                };
              })(),
            )
            .reverse()
            .map((e, t) => {
              const n = e.key || t;
              if (
                i.default.env.__NEXT_OPTIMIZE_FONTS &&
                !r &&
                "link" === e.type &&
                e.props.href &&
                [
                  "https://fonts.googleapis.com/css",
                  "https://use.typekit.net/",
                ].some((t) => e.props.href.startsWith(t))
              ) {
                const t = { ...(e.props || {}) };
                return (
                  (t["data-href"] = t.href),
                  (t.href = void 0),
                  (t["data-optimized-fonts"] = !0),
                  f.default.cloneElement(e, t)
                );
              }
              return f.default.cloneElement(e, { key: n });
            });
        }
        const v = (e) => {
          const { children: t } = e,
            r = (0, f.useContext)(p.AmpStateContext),
            n = (0, f.useContext)(h.HeadManagerContext);
          return (0, u.jsx)(m.default, {
            reduceComponentsToState: c,
            headManager: n,
            inAmpMode: (0, g.isInAmpMode)(r),
            children: t,
          });
        };
        ("function" == typeof a.default ||
          ("object" == typeof a.default && null !== a.default)) &&
          void 0 === a.default.__esModule &&
          (Object.defineProperty(a.default, "__esModule", { value: !0 }),
          Object.assign(a.default, a),
          (n.exports = a.default));
      }
    },
    27772: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        e.i(22271),
          Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "ImageConfigContext", {
            enumerable: !0,
            get: () => n,
          });
        const t = e.r(13314)._(e.r(38653)),
          r = e.r(61642),
          n = t.default.createContext(r.imageConfigDefault);
      }
    },
    73600: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        e.i(22271),
          Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "RouterContext", {
            enumerable: !0,
            get: () => t,
          });
        const t = e.r(13314)._(e.r(38653)).default.createContext(null);
      }
    },
    55836: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        function i(e) {
          var t;
          const { config: r, src: n, width: a, quality: i } = e,
            s =
              i ||
              (null == (t = r.qualities)
                ? void 0
                : t.reduce((e, t) =>
                    Math.abs(t - 75) < Math.abs(e - 75) ? t : e,
                  )) ||
              75;
          return (
            r.path +
            "?url=" +
            encodeURIComponent(n) +
            "&w=" +
            a +
            "&q=" +
            s +
            (n.startsWith("/_next/static/media/"), "")
          );
        }
        e.i(22271),
          Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "default", { enumerable: !0, get: () => t }),
          (i.__next_img_default = !0);
        const t = i;
      }
    },
    48757: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "useMergedRef", {
            enumerable: !0,
            get: () => i,
          });
        const t = e.r(38653);
        function i(e, r) {
          const n = (0, t.useRef)(null),
            a = (0, t.useRef)(null);
          return (0, t.useCallback)(
            (t) => {
              if (null === t) {
                const e = n.current;
                e && ((n.current = null), e());
                const t = a.current;
                t && ((a.current = null), t());
              } else e && (n.current = s(e, t)), r && (a.current = s(r, t));
            },
            [e, r],
          );
        }
        function s(e, t) {
          if ("function" != typeof e)
            return (
              (e.current = t),
              () => {
                e.current = null;
              }
            );
          {
            const r = e(t);
            return "function" == typeof r ? r : () => e(null);
          }
        }
        ("function" == typeof a.default ||
          ("object" == typeof a.default && null !== a.default)) &&
          void 0 === a.default.__esModule &&
          (Object.defineProperty(a.default, "__esModule", { value: !0 }),
          Object.assign(a.default, a),
          (n.exports = a.default));
      }
    },
    11772: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        e.i(22271),
          Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "Image", { enumerable: !0, get: () => y });
        const t = e.r(13314),
          r = e.r(81369),
          o = e.r(31636),
          d = r._(e.r(38653)),
          c = t._(e.r(95168)),
          u = t._(e.r(17153)),
          f = e.r(61311),
          m = e.r(61642),
          p = e.r(27772);
        e.r(12597);
        const h = e.r(73600),
          g = t._(e.r(55836)),
          x = e.r(48757),
          v = JSON.parse(
            '{"deviceSizes":[640,750,828,1080,1200,1920,2048,3840],"imageSizes":[16,32,48,64,96,128,256,384],"path":"/_next/image","loader":"default","dangerouslyAllowSVG":true,"unoptimized":true}',
          );
        function i(e, t, r, n, a, i, s) {
          const l = null == e ? void 0 : e.src;
          e &&
            e["data-loaded-src"] !== l &&
            ((e["data-loaded-src"] = l),
            ("decode" in e ? e.decode() : Promise.resolve())
              .catch(() => {})
              .then(() => {
                if (e.parentElement && e.isConnected) {
                  if (
                    ("empty" !== t && a(!0), null == r ? void 0 : r.current)
                  ) {
                    const t = new Event("load");
                    Object.defineProperty(t, "target", {
                      writable: !1,
                      value: e,
                    });
                    let n = !1,
                      a = !1;
                    r.current({
                      ...t,
                      nativeEvent: t,
                      currentTarget: e,
                      target: e,
                      isDefaultPrevented: () => n,
                      isPropagationStopped: () => a,
                      persist: () => {},
                      preventDefault: () => {
                        (n = !0), t.preventDefault();
                      },
                      stopPropagation: () => {
                        (a = !0), t.stopPropagation();
                      },
                    });
                  }
                  (null == n ? void 0 : n.current) && n.current(e);
                }
              }));
        }
        function s(e) {
          return d.use ? { fetchPriority: e } : { fetchpriority: e };
        }
        "undefined" == typeof window && (globalThis.__NEXT_IMAGE_IMPORTED = !0);
        const b = (0, d.forwardRef)((e, t) => {
          const {
              src: r,
              srcSet: n,
              sizes: a,
              height: l,
              width: c,
              decoding: u,
              className: f,
              style: m,
              fetchPriority: p,
              placeholder: h,
              loading: g,
              unoptimized: v,
              fill: b,
              onLoadRef: y,
              onLoadingCompleteRef: w,
              setBlurComplete: j,
              setShowAltText: _,
              sizesInput: N,
              onLoad: S,
              onError: k,
              ...C
            } = e,
            E = (0, d.useCallback)(
              (e) => {
                e &&
                  (k && (e.src = e.src), e.complete && i(e, h, y, w, j, v, N));
              },
              [r, h, y, w, j, k, v, N],
            ),
            R = (0, x.useMergedRef)(t, E);
          return (0, o.jsx)("img", {
            ...C,
            ...s(p),
            loading: g,
            width: c,
            height: l,
            decoding: u,
            "data-nimg": b ? "fill" : "1",
            className: f,
            style: m,
            sizes: a,
            srcSet: n,
            src: r,
            ref: R,
            onLoad: (e) => {
              i(e.currentTarget, h, y, w, j, v, N);
            },
            onError: (e) => {
              _(!0), "empty" !== h && j(!0), k && k(e);
            },
          });
        });
        function l(e) {
          const { isAppRouter: t, imgAttributes: r } = e,
            n = {
              as: "image",
              imageSrcSet: r.srcSet,
              imageSizes: r.sizes,
              crossOrigin: r.crossOrigin,
              referrerPolicy: r.referrerPolicy,
              ...s(r.fetchPriority),
            };
          return t && c.default.preload
            ? (c.default.preload(r.src, n), null)
            : (0, o.jsx)(u.default, {
                children: (0, o.jsx)(
                  "link",
                  { rel: "preload", href: r.srcSet ? void 0 : r.src, ...n },
                  "__nimg-" + r.src + r.srcSet + r.sizes,
                ),
              });
        }
        const y = (0, d.forwardRef)((e, t) => {
          const r = (0, d.useContext)(h.RouterContext),
            n = (0, d.useContext)(p.ImageConfigContext),
            a = (0, d.useMemo)(() => {
              var e;
              const t = v || n || m.imageConfigDefault,
                r = [...t.deviceSizes, ...t.imageSizes].sort((e, t) => e - t),
                a = t.deviceSizes.sort((e, t) => e - t),
                i =
                  null == (e = t.qualities) ? void 0 : e.sort((e, t) => e - t);
              return { ...t, allSizes: r, deviceSizes: a, qualities: i };
            }, [n]),
            { onLoad: i, onLoadingComplete: s } = e,
            c = (0, d.useRef)(i);
          (0, d.useEffect)(() => {
            c.current = i;
          }, [i]);
          const u = (0, d.useRef)(s);
          (0, d.useEffect)(() => {
            u.current = s;
          }, [s]);
          const [x, y] = (0, d.useState)(!1),
            [w, j] = (0, d.useState)(!1),
            { props: _, meta: N } = (0, f.getImgProps)(e, {
              defaultLoader: g.default,
              imgConf: a,
              blurComplete: x,
              showAltText: w,
            });
          return (0, o.jsxs)(o.Fragment, {
            children: [
              (0, o.jsx)(b, {
                ..._,
                unoptimized: N.unoptimized,
                placeholder: N.placeholder,
                fill: N.fill,
                onLoadRef: c,
                onLoadingCompleteRef: u,
                setBlurComplete: y,
                setShowAltText: j,
                sizesInput: e.sizes,
                ref: t,
              }),
              N.priority
                ? (0, o.jsx)(l, { isAppRouter: !r, imgAttributes: _ })
                : null,
            ],
          });
        });
        ("function" == typeof a.default ||
          ("object" == typeof a.default && null !== a.default)) &&
          void 0 === a.default.__esModule &&
          (Object.defineProperty(a.default, "__esModule", { value: !0 }),
          Object.assign(a.default, a),
          (n.exports = a.default));
      }
    },
    82653: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        e.i(22271);
        ("use strict");
        Object.defineProperty(a, "__esModule", { value: !0 });
        var i = { default: () => d, getImageProps: () => l };
        for (var s in i)
          Object.defineProperty(a, s, { enumerable: !0, get: i[s] });
        const t = e.r(13314),
          r = e.r(61311),
          n = e.r(11772),
          o = t._(e.r(55836));
        function l(e) {
          const { props: t } = (0, r.getImgProps)(e, {
            defaultLoader: o.default,
            imgConf: JSON.parse(
              '{"deviceSizes":[640,750,828,1080,1200,1920,2048,3840],"imageSizes":[16,32,48,64,96,128,256,384],"path":"/_next/image","loader":"default","dangerouslyAllowSVG":true,"unoptimized":true}',
            ),
          });
          for (const [e, r] of Object.entries(t)) void 0 === r && delete t[e];
          return { props: t };
        }
        const d = n.Image;
      }
    },
    12568: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      n.exports = e.r(82653);
    },
    20051: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({ block: "image-module___v4zoa__block" });
    },
    67376: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Image: () => d });
      var n = e.i(31636),
        a = e.i(85444),
        i = e.i(60566),
        s = e.i(12568);
      e.i(7442);
      var l = e.i(51602),
        o = e.i(20051);
      function d(e) {
        let t,
          r,
          d,
          u,
          f,
          m,
          p,
          h,
          g,
          x,
          v,
          b,
          y,
          w,
          j,
          _,
          N,
          S,
          k,
          C,
          E,
          R = (0, a.c)(41);
        R[0] !== e
          ? (({
              style: p,
              className: t,
              loading: h,
              objectFit: g,
              quality: x,
              alt: v,
              fill: r,
              block: b,
              width: y,
              height: w,
              mobileSize: j,
              desktopSize: _,
              sizes: f,
              src: m,
              unoptimized: N,
              ref: u,
              ...d
            } = e),
            (R[0] = e),
            (R[1] = t),
            (R[2] = r),
            (R[3] = d),
            (R[4] = u),
            (R[5] = f),
            (R[6] = m),
            (R[7] = p),
            (R[8] = h),
            (R[9] = g),
            (R[10] = x),
            (R[11] = v),
            (R[12] = b),
            (R[13] = y),
            (R[14] = w),
            (R[15] = j),
            (R[16] = _),
            (R[17] = N))
          : ((t = R[1]),
            (r = R[2]),
            (d = R[3]),
            (u = R[4]),
            (f = R[5]),
            (m = R[6]),
            (p = R[7]),
            (h = R[8]),
            (g = R[9]),
            (x = R[10]),
            (v = R[11]),
            (b = R[12]),
            (y = R[13]),
            (w = R[14]),
            (j = R[15]),
            (_ = R[16]),
            (N = R[17]));
        const P = void 0 === h ? "eager" : h,
          M = void 0 === g ? "cover" : g,
          O = void 0 === x ? 90 : x,
          A = void 0 === v ? "" : v,
          z = void 0 === b ? !r : b,
          I = void 0 === y ? (z ? 1 : void 0) : y,
          T = void 0 === w ? (z ? 1 : void 0) : w,
          L = void 0 === j ? "100vw" : j,
          F = void 0 === _ ? "100vw" : _;
        if (!m) return;
        f = f || `(max-width: ${l.breakpoints.dt}px) ${L}, ${F}`;
        const q = u,
          D = !z;
        R[18] !== M || R[19] !== p
          ? ((S = { objectFit: M, ...p }),
            (R[18] = M),
            (R[19] = p),
            (R[20] = S))
          : (S = R[20]);
        const B = z && o.default.block;
        return (
          R[21] !== t || R[22] !== B
            ? ((k = (0, i.default)(t, B)),
              (R[21] = t),
              (R[22] = B),
              (R[23] = k))
            : (k = R[23]),
          R[24] !== m || R[25] !== N
            ? ((C = N || ("string" == typeof m && m?.includes(".svg"))),
              (R[24] = m),
              (R[25] = N),
              (R[26] = C))
            : (C = R[26]),
          R[27] !== A ||
          R[28] !== T ||
          R[29] !== P ||
          R[30] !== d ||
          R[31] !== O ||
          R[32] !== u ||
          R[33] !== f ||
          R[34] !== m ||
          R[35] !== D ||
          R[36] !== S ||
          R[37] !== k ||
          R[38] !== C ||
          R[39] !== I
            ? ((E = (0, n.jsx)(s.default, {
                ref: q,
                fill: D,
                width: I,
                height: T,
                loading: P,
                quality: O,
                alt: A,
                style: S,
                className: k,
                sizes: f,
                src: m,
                unoptimized: C,
                draggable: "false",
                onDragStart: c,
                ...d,
              })),
              (R[27] = A),
              (R[28] = T),
              (R[29] = P),
              (R[30] = d),
              (R[31] = O),
              (R[32] = u),
              (R[33] = f),
              (R[34] = m),
              (R[35] = D),
              (R[36] = S),
              (R[37] = k),
              (R[38] = C),
              (R[39] = I),
              (R[40] = E))
            : (E = R[40]),
          E
        );
      }
      function c(e) {
        return e.preventDefault();
      }
    },
    17457: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({
          TransformContext: () => r,
          TransformProvider: () => s,
          useTransform: () => l,
        });
        var n = e.i(31636),
          a = e.i(85444),
          i = e.i(38653);
        const t = {
            translate: { x: 0, y: 0, z: 0 },
            rotate: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            clip: { top: 0, right: 0, bottom: 0, left: 0 },
            userData: {},
          },
          r = (0, i.createContext)({
            getTransform: () => structuredClone(t),
            addCallback: () => {},
            removeCallback: () => {},
            setTranslate: () => {},
            setRotate: () => {},
            setScale: () => {},
            setClip: () => {},
            setUserData: () => {},
          });
        function s(e) {
          let s,
            o,
            d,
            c,
            u,
            f,
            m,
            p,
            h,
            g,
            x,
            v,
            b,
            y,
            w,
            j,
            _,
            N = (0, a.c)(18),
            { children: S, ref: k } = e;
          N[0] === Symbol.for("react.memo_cache_sentinel")
            ? ((s = structuredClone(t)), (N[0] = s))
            : (s = N[0]);
          const C = (0, i.useRef)(s);
          N[1] === Symbol.for("react.memo_cache_sentinel")
            ? ((o = structuredClone(t)), (N[1] = o))
            : (o = N[1]);
          const E = (0, i.useRef)(o);
          N[2] === Symbol.for("react.memo_cache_sentinel")
            ? ((d = () => {
                const e = structuredClone(C.current);
                return (
                  (e.translate.x = e.translate.x + E.current.translate.x),
                  (e.translate.y = e.translate.y + E.current.translate.y),
                  (e.translate.z = e.translate.z + E.current.translate.z),
                  (e.rotate.x = e.rotate.x + E.current.rotate.x),
                  (e.rotate.y = e.rotate.y + E.current.rotate.y),
                  (e.rotate.z = e.rotate.z + E.current.rotate.z),
                  (e.scale.x = e.scale.x * E.current.scale.x),
                  (e.scale.y = e.scale.y * E.current.scale.y),
                  (e.scale.z = e.scale.z * E.current.scale.z),
                  (e.userData = { ...E.current.userData, ...e.userData }),
                  e
                );
              }),
              (N[2] = d))
            : (d = N[2]);
          const R = d;
          N[3] === Symbol.for("react.memo_cache_sentinel")
            ? ((c = []), (N[3] = c))
            : (c = N[3]);
          const P = (0, i.useRef)(c);
          N[4] === Symbol.for("react.memo_cache_sentinel")
            ? ((u = (e) => {
                P.current.push(e);
              }),
              (N[4] = u))
            : (u = N[4]);
          const M = u;
          N[5] === Symbol.for("react.memo_cache_sentinel")
            ? ((f = (e) => {
                P.current = P.current.filter((t) => t !== e);
              }),
              (N[5] = f))
            : (f = N[5]);
          const O = f;
          N[6] === Symbol.for("react.memo_cache_sentinel")
            ? ((m = () => {
                for (const e of P.current) e(R());
              }),
              (N[6] = m))
            : (m = N[6]);
          const A = m;
          N[7] === Symbol.for("react.memo_cache_sentinel")
            ? ((p = (e, t, r) => {
                const n = void 0 === e ? 0 : e,
                  a = void 0 === t ? 0 : t,
                  i = void 0 === r ? 0 : r;
                Number.isNaN(n) || (E.current.translate.x = Number(n)),
                  Number.isNaN(a) || (E.current.translate.y = Number(a)),
                  Number.isNaN(i) || (E.current.translate.z = Number(i)),
                  A();
              }),
              (N[7] = p))
            : (p = N[7]);
          const z = p;
          N[8] === Symbol.for("react.memo_cache_sentinel")
            ? ((h = (e, t, r) => {
                const n = void 0 === e ? 0 : e,
                  a = void 0 === t ? 0 : t,
                  i = void 0 === r ? 0 : r;
                Number.isNaN(n) || (E.current.rotate.x = Number(n)),
                  Number.isNaN(a) || (E.current.rotate.y = Number(a)),
                  Number.isNaN(i) || (E.current.rotate.z = Number(i)),
                  A();
              }),
              (N[8] = h))
            : (h = N[8]);
          const I = h;
          N[9] === Symbol.for("react.memo_cache_sentinel")
            ? ((g = (e, t, r) => {
                const n = void 0 === e ? 1 : e,
                  a = void 0 === t ? 1 : t,
                  i = void 0 === r ? 1 : r;
                Number.isNaN(n) || (E.current.scale.x = Number(n)),
                  Number.isNaN(a) || (E.current.scale.y = Number(a)),
                  Number.isNaN(i) || (E.current.scale.z = Number(i)),
                  A();
              }),
              (N[9] = g))
            : (g = N[9]);
          const T = g;
          N[10] === Symbol.for("react.memo_cache_sentinel")
            ? ((x = (e) => {
                const {
                    top: t,
                    right: r,
                    bottom: n,
                    left: a,
                  } = void 0 === e ? {} : e,
                  i = void 0 === t ? 0 : t,
                  s = void 0 === r ? 0 : r,
                  l = void 0 === n ? 0 : n,
                  o = void 0 === a ? 0 : a;
                Number.isNaN(i) || (E.current.clip.top = Number(i)),
                  Number.isNaN(s) || (E.current.clip.right = Number(s)),
                  Number.isNaN(l) || (E.current.clip.bottom = Number(l)),
                  Number.isNaN(o) || (E.current.clip.left = Number(o)),
                  A();
              }),
              (N[10] = x))
            : (x = N[10]);
          const L = x;
          N[11] === Symbol.for("react.memo_cache_sentinel")
            ? ((v = (e, t) => {
                (E.current.userData[e] = t), A();
              }),
              (N[11] = v))
            : (v = N[11]);
          const F = v;
          return (
            N[12] === Symbol.for("react.memo_cache_sentinel")
              ? ((b = (e) => {
                  (C.current = structuredClone(e)), A();
                }),
                (y = [A]),
                (N[12] = b),
                (N[13] = y))
              : ((b = N[12]), (y = N[13])),
            l(b, y),
            N[14] === Symbol.for("react.memo_cache_sentinel")
              ? ((w = () => ({
                  setTranslate: z,
                  setRotate: I,
                  setScale: T,
                  setClip: L,
                  setUserData: F,
                })),
                (N[14] = w))
              : (w = N[14]),
            (0, i.useImperativeHandle)(k, w),
            N[15] === Symbol.for("react.memo_cache_sentinel")
              ? ((j = {
                  getTransform: R,
                  addCallback: M,
                  removeCallback: O,
                  setTranslate: z,
                  setRotate: I,
                  setScale: T,
                  setClip: L,
                  setUserData: F,
                }),
                (N[15] = j))
              : (j = N[15]),
            N[16] !== S
              ? ((_ = (0, n.jsx)(r, { value: j, children: S })),
                (N[16] = S),
                (N[17] = _))
              : (_ = N[17]),
            _
          );
        }
        function l(e, t = []) {
          const {
            getTransform: n,
            addCallback: a,
            removeCallback: s,
          } = (0, i.useContext)(r);
          return (
            (0, i.useEffect)(() => {
              if (e)
                return (
                  a(e),
                  () => {
                    s(e);
                  }
                );
            }, [e, a, s, ...t]),
            n
          );
        }
      }
    },
    47103: (e) => {
      var { g: t, __dirname: r } = e;
      {
        function n(e, t, r) {
          return Math.max(e, Math.min(t, r));
        }
        function a(e, t, r, n, a) {
          return ((r - e) * (a - n)) / (t - e) + n;
        }
        function i(e, t, r) {
          return (1 - r) * e + r * t;
        }
        function s(e, t) {
          return Number.parseFloat(e.toFixed(t));
        }
        function l(e, t) {
          return 0 === t ? e : t < 0 ? Number.NaN : ((e % t) + t) % t;
        }
        e.s({
          clamp: () => n,
          default: () => t,
          lerp: () => i,
          mapRange: () => a,
          modulo: () => l,
          truncate: () => s,
        });
        const t = { lerp: i, clamp: n, mapRange: a, truncate: s, modulo: l };
      }
    },
    22477: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ useScrollTrigger: () => m });
      var n = e.i(85444),
        a = e.i(4371),
        i = e.i(54995),
        s = e.i(38653),
        l = e.i(17457),
        o = e.i(47103),
        d = e.i(87771),
        c = e.i(35569);
      function u(e) {
        let t,
          r,
          a,
          i,
          l,
          o,
          u = (0, n.c)(19);
        u[0] !== e
          ? ((t = void 0 === e ? {} : e), (u[0] = e), (u[1] = t))
          : (t = u[1]);
        const { type: f, fixed: m, visible: p, id: h } = t,
          g = void 0 === f ? "start" : f,
          x = void 0 !== m && m,
          v = void 0 !== p && p,
          b = void 0 === h ? "" : h,
          y = (0, s.useRef)(null),
          w = "start" === g ? "green" : "red",
          j = "start" === g ? "start" : "end";
        u[2] !== w ? ((r = { color: w }), (u[2] = w), (u[3] = r)) : (r = u[3]);
        const _ = (0, c.useMinimap)(r),
          { minimap: N } = (0, d.useOrchestra)();
        u[4] !== w ||
        u[5] !== x ||
        u[6] !== b ||
        u[7] !== N ||
        u[8] !== _ ||
        u[9] !== j ||
        u[10] !== g ||
        u[11] !== v
          ? ((a = () => {
              if (!N || !v) return;
              const e = document.createElement("div");
              _?.(e),
                (e.style.cssText = `
        position: ${x ? "fixed" : "absolute"};
        top: 0px;
        left: ${x ? "50%" : "10%"};
        right: ${x ? "10%" : "50%"};
        text-align: ${x ? "left" : "right"};
        z-index: 9999;
        color: ${w};
        
        ${"start" === g ? "border-top" : "border-bottom"}: 1px solid ${w};
        transform: translateY(${"start" === g ? "0%" : "-100%"});
        font-size: 24px;
        font-family: Arial, sans-serif;
        text-transform: uppercase;
      `);
              const t = document.createElement("div");
              return (
                (t.style.cssText = `
      position: absolute;
      padding: 8px;
      ${"start" === g ? "left" : "right"}: 0;
    `),
                e.appendChild(t),
                (t.innerText = (x ? "viewport " : `${b} `) + j),
                (y.current = e),
                (e.style.pointerEvents = "none"),
                document.documentElement.appendChild(y.current),
                () => {
                  y.current?.remove();
                }
              );
            }),
            (i = [w, j, x, b, v, g, _, N]),
            (u[4] = w),
            (u[5] = x),
            (u[6] = b),
            (u[7] = N),
            (u[8] = _),
            (u[9] = j),
            (u[10] = g),
            (u[11] = v),
            (u[12] = a),
            (u[13] = i))
          : ((a = u[12]), (i = u[13])),
          (0, s.useEffect)(a, i),
          u[14] !== w || u[15] !== x
            ? ((l = (e) => {
                if (!y.current) return;
                const t = y.current;
                if (((t.style.top = `${e}px`), !x)) return;
                const r = t.children[0];
                e <= 0
                  ? ((t.style.transform = "translateY(0%)"),
                    (t.style.borderBottom = "none"),
                    (t.style.borderTop = `1px solid ${w}`),
                    (r.style.top = "0"))
                  : e >= window.innerHeight &&
                    ((t.style.transform = "translateY(-100%)"),
                    (t.style.borderBottom = `1px solid ${w}`),
                    (t.style.borderTop = "none"),
                    (r.style.bottom = "0"));
              }),
              (u[14] = w),
              (u[15] = x),
              (u[16] = l))
            : (l = u[16]);
        const S = l;
        return (
          u[17] !== S
            ? ((o = { top: S }), (u[17] = S), (u[18] = o))
            : (o = u[18]),
          o
        );
      }
      function f(e) {
        return "number" == typeof e || !Number.isNaN(e);
      }
      function m(
        {
          rect: e,
          start: t = "bottom bottom",
          end: r = "top top",
          id: n = "",
          offset: d = 0,
          disabled: c = !1,
          markers: p,
          onEnter: h,
          onLeave: g,
          onProgress: x,
          steps: v = 1,
        },
        b = [],
      ) {
        let y = (0, l.useTransform)(),
          w = (0, i.useLenis)(),
          j = u({ id: n, type: "start", visible: p }),
          _ = u({ id: n, type: "end", visible: p }),
          N = u({ id: n, type: "start", fixed: !0, visible: p }),
          S = u({ id: n, type: "end", fixed: !0, visible: p }),
          { height: k = 0 } = (0, a.useWindowSize)(),
          [C, E] = "string" == typeof t ? t.split(" ") : [t],
          [R, P] = "string" == typeof r ? r.split(" ") : [r],
          M = f(E) ? Number.parseFloat(E) : 0;
        "top" === E && (M = 0),
          "center" === E && (M = 0.5 * k),
          "bottom" === E && (M = k);
        let O = f(P) ? Number.parseFloat(P) : 0;
        "top" === P && (O = 0),
          "center" === P && (O = 0.5 * k),
          "bottom" === P && (O = k);
        let A = f(C) ? Number.parseFloat(C) : e?.bottom || 0;
        "top" === C && (A = e?.top || 0),
          "center" === C && (A = (e?.top || 0) + 0.5 * (e?.height || 0)),
          "bottom" === C && (A = e?.bottom || 0),
          (A += d);
        let z = f(R) ? Number.parseFloat(R) : e?.top || 0;
        "top" === R && (z = e?.top || 0),
          "center" === R && (z = (e?.top || 0) + 0.5 * (e?.height || 0)),
          "bottom" === R && (z = e?.bottom || 0),
          (z += d);
        const I = A - M,
          T = z - O,
          L = (0, s.useRef)(x);
        L.current = x;
        const F = (0, s.useCallback)(
            (e, t) => {
              L.current?.({
                height: T - I,
                isActive: e >= 0 && e <= 1,
                progress: (0, o.clamp)(0, e, 1),
                lastProgress: t,
                steps: Array.from({ length: v }).map((t, r) =>
                  (0, o.clamp)(
                    0,
                    (0, o.mapRange)(r / v, (r + 1) / v, e, 0, 1),
                    1,
                  ),
                ),
              });
            },
            [T, I, v, ...b],
          ),
          [q, D] = (0, a.useLazyState)(
            void 0,
            (e, t) => {
              !Number.isNaN(e) &&
                void 0 !== e &&
                (((e >= 0 && t < 0) || (e <= 1 && t > 1)) &&
                  h?.({ progress: (0, o.clamp)(0, e, 1) }),
                (0, o.clamp)(0, e, 1) !== (0, o.clamp)(0, t, 1) && F(e, t),
                ((e < 0 && t >= 0) || (e > 1 && t <= 1)) &&
                  g?.({ progress: (0, o.clamp)(0, e, 1) }));
            },
            [T, I, v, F, ...b],
          ),
          B = (0, s.useCallback)(() => {
            let e;
            if (c) return;
            e = w ? Math.floor(w?.scroll) : window.scrollY;
            const { translate: t } = y();
            N && N.top(M),
              S && S.top(O),
              j && j.top(A - t.y),
              _ && _.top(z - t.y),
              q((0, o.mapRange)(I, T, e - t.y, 0, 1));
          }, [w, N, S, M, O, j, _, A, z, I, T, y, q, c, ...b]);
        (0, i.useLenis)(B, [B]),
          (0, s.useEffect)(() => {
            if (!w)
              return (
                B(),
                window.addEventListener("scroll", B, !1),
                () => {
                  window.removeEventListener("scroll", B, !1);
                }
              );
          }, [w, B]),
          (0, l.useTransform)(B, [B]);
      }
    },
    23530: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ default: () => t });
        var n,
          a = e.i(38653);
        function i() {
          return (i = Object.assign.bind()).apply(null, arguments);
        }
        const t = (0, a.memo)((e) =>
          (0, a.createElement)(
            "svg",
            i(
              {
                viewBox: "0 0 19 12",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
              },
              e,
            ),
            n ||
              (n = (0, a.createElement)("path", {
                d: "M1.4 5.6a.8.8 0 0 0 0 1.5zM18 6.9q.5-.6 0-1.1L13.2 1a.7.7 0 1 0-1 1l4.2 4.3-4.3 4.3a.7.7 0 1 0 1 1zM1.4 6.3v.8h16V5.6h-16z",
                fill: "white",
              })),
          ),
        );
      }
    },
    16806: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Hero: () => d });
      var n = e.i(31636),
        a = e.i(60566),
        i = e.i(4371),
        s = e.i(67376),
        l = e.i(22477),
        o = e.i(23530);
      function d({ className: e }) {
        const [t, r] = (0, i.useRect)({ ignoreTransform: !0 });
        return (
          (0, l.useScrollTrigger)({
            rect: r,
            start: "top top",
            end: "bottom top",
            onProgress: ({ progress: e }) => {
              r.element &&
                (r.element.style.transform = `translateY(${20 * e}%)`);
            },
          }),
          (0, n.jsxs)("section", {
            className: (0, a.default)(
              "dr-mt-140 dt:dr-mt-88 max-dt:!transform-[unset]",
              e,
            ),
            ref: t,
            children: [
              (0, n.jsxs)("div", {
                className: "w-full flex flex-col dr-gap-10 mx-auto dr-mb-72",
                children: [
                  (0, n.jsxs)("h1", {
                    className: "h1 text-balance text-center",
                    children: [
                      "Give Cora your inbox.",
                      (0, n.jsx)("br", {}),
                      " Take back your life.",
                    ],
                  }),
                  (0, n.jsx)("p", {
                    className: "p-xl text-balance text-center",
                    children:
                      "Cora is the $150,000 chief of staff that only costs $20 per month",
                  }),
                  (0, n.jsxs)("a", {
                    href: "https://cora.computer/users/sign_up",
                    className:
                      "mx-auto flex dr-gap-10 dr-rounded-9999 dr-mt-14 dr-px-20 dr-py-10 bg-white hover:bg-[#d6d6d6] w-fit text-black border-2 border-solid border-[#ffffff] hover:shadow-[-3px_4px_4px_0px_#00000010] hover:backdrop-blur-[20px] transition-all duration-300",
                    children: [
                      (0, n.jsx)("span", {
                        className: "cta-rg-l flex-shrink-0",
                        children: "Get Started",
                      }),
                      (0, n.jsx)(o.default, { className: "dr-w-16 invert" }),
                    ],
                  }),
                ],
              }),
              (0, n.jsx)("div", {
                className: (0, a.default)(
                  "dr-w-357 dt:dr-w-915 mx-auto dr-rounded-20 dt:dr-rounded-25 dt:dr-border-5 border-[#DADADA] border-solid bg-secondary dr-p-8 dt:dr-p-15 floating-container",
                ),
                children: (0, n.jsxs)("div", {
                  className:
                    "relative h-full w-full dr-rounded-10 overflow-clip aspect-[0.668] dt:aspect-[1.74]",
                  children: [
                    (0, n.jsx)(s.Image, {
                      className: "mobile-only",
                      fill: !0,
                      src: "/images/preview-mobile.webp",
                      alt: "",
                      mobileSize: "89vw",
                      desktopSize: "65vw",
                      priority: !0,
                    }),
                    (0, n.jsx)(s.Image, {
                      className: "desktop-only",
                      fill: !0,
                      src: "/images/preview.webp",
                      alt: "",
                      mobileSize: "89vw",
                      desktopSize: "65vw",
                      priority: !0,
                    }),
                  ],
                }),
              }),
            ],
          })
        );
      }
    },
    68423: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      ("use strict");
      Object.defineProperty(a, "__esModule", { value: !0 });
      var i = {
        assign: () => c,
        searchParamsToUrlQuery: () => l,
        urlQueryToSearchParams: () => d,
      };
      for (var s in i)
        Object.defineProperty(a, s, { enumerable: !0, get: i[s] });
      function l(e) {
        const t = {};
        for (const [r, n] of e.entries()) {
          const e = t[r];
          void 0 === e
            ? (t[r] = n)
            : Array.isArray(e)
              ? e.push(n)
              : (t[r] = [e, n]);
        }
        return t;
      }
      function o(e) {
        return "string" == typeof e
          ? e
          : ("number" != typeof e || isNaN(e)) && "boolean" != typeof e
            ? ""
            : String(e);
      }
      function d(e) {
        const t = new URLSearchParams();
        for (const [r, n] of Object.entries(e))
          if (Array.isArray(n)) for (const e of n) t.append(r, o(e));
          else t.set(r, o(n));
        return t;
      }
      function c(e) {
        for (
          var t = arguments.length, r = Array(t > 1 ? t - 1 : 0), n = 1;
          n < t;
          n++
        )
          r[n - 1] = arguments[n];
        for (const t of r) {
          for (const r of t.keys()) e.delete(r);
          for (const [r, n] of t.entries()) e.append(r, n);
        }
        return e;
      }
    },
    30609: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        e.i(22271);
        ("use strict");
        Object.defineProperty(a, "__esModule", { value: !0 });
        var i = {
          formatUrl: () => l,
          formatWithValidation: () => o,
          urlObjectKeys: () => n,
        };
        for (var s in i)
          Object.defineProperty(a, s, { enumerable: !0, get: i[s] });
        const t = e.r(81369)._(e.r(68423)),
          r = /https?|ftp|gopher|file/;
        function l(e) {
          let { auth: n, hostname: a } = e,
            i = e.protocol || "",
            s = e.pathname || "",
            l = e.hash || "",
            o = e.query || "",
            d = !1;
          (n = n ? encodeURIComponent(n).replace(/%3A/i, ":") + "@" : ""),
            e.host
              ? (d = n + e.host)
              : a &&
                ((d = n + (~a.indexOf(":") ? "[" + a + "]" : a)),
                e.port && (d += ":" + e.port)),
            o &&
              "object" == typeof o &&
              (o = String(t.urlQueryToSearchParams(o)));
          let c = e.search || (o && "?" + o) || "";
          return (
            i && !i.endsWith(":") && (i += ":"),
            e.slashes || ((!i || r.test(i)) && !1 !== d)
              ? ((d = "//" + (d || "")), s && "/" !== s[0] && (s = "/" + s))
              : d || (d = ""),
            l && "#" !== l[0] && (l = "#" + l),
            c && "?" !== c[0] && (c = "?" + c),
            "" +
              i +
              d +
              (s = s.replace(/[?#]/g, encodeURIComponent)) +
              (c = c.replace("#", "%23")) +
              l
          );
        }
        const n = [
          "auth",
          "hash",
          "host",
          "hostname",
          "href",
          "path",
          "pathname",
          "port",
          "protocol",
          "query",
          "search",
          "slashes",
        ];
        function o(e) {
          return l(e);
        }
      }
    },
    95863: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        e.i(22271);
        ("use strict");
        Object.defineProperty(a, "__esModule", { value: !0 });
        var i = {
          DecodeError: () => x,
          MiddlewareNotFoundError: () => w,
          MissingStaticPage: () => y,
          NormalizeError: () => v,
          PageNotFoundError: () => b,
          SP: () => h,
          ST: () => g,
          WEB_VITALS: () => t,
          execOnce: () => l,
          getDisplayName: () => c,
          getLocationOrigin: () => o,
          getURL: () => d,
          isAbsoluteUrl: () => n,
          isResSent: () => u,
          loadGetInitialProps: () => m,
          normalizeRepeatedSlashes: () => f,
          stringifyError: () => p,
        };
        for (var s in i)
          Object.defineProperty(a, s, { enumerable: !0, get: i[s] });
        const t = ["CLS", "FCP", "FID", "INP", "LCP", "TTFB"];
        function l(e) {
          let t,
            r = !1;
          return function () {
            for (var n = arguments.length, a = Array(n), i = 0; i < n; i++)
              a[i] = arguments[i];
            return r || ((r = !0), (t = e(...a))), t;
          };
        }
        const r = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/,
          n = (e) => r.test(e);
        function o() {
          const { protocol: e, hostname: t, port: r } = window.location;
          return e + "//" + t + (r ? ":" + r : "");
        }
        function d() {
          const { href: e } = window.location,
            t = o();
          return e.substring(t.length);
        }
        function c(e) {
          return "string" == typeof e
            ? e
            : e.displayName || e.name || "Unknown";
        }
        function u(e) {
          return e.finished || e.headersSent;
        }
        function f(e) {
          const t = e.split("?");
          return (
            t[0].replace(/\\/g, "/").replace(/\/\/+/g, "/") +
            (t[1] ? "?" + t.slice(1).join("?") : "")
          );
        }
        async function m(e, t) {
          const r = t.res || (t.ctx && t.ctx.res);
          if (!e.getInitialProps)
            return t.ctx && t.Component
              ? { pageProps: await m(t.Component, t.ctx) }
              : {};
          const n = await e.getInitialProps(t);
          if (r && u(r)) return n;
          if (!n)
            throw Object.defineProperty(
              Error(
                '"' +
                  c(e) +
                  '.getInitialProps()" should resolve to an object. But found "' +
                  n +
                  '" instead.',
              ),
              "__NEXT_ERROR_CODE",
              { value: "E394", enumerable: !1, configurable: !0 },
            );
          return n;
        }
        const h = "undefined" != typeof performance,
          g =
            h &&
            ["mark", "measure", "getEntriesByName"].every(
              (e) => "function" == typeof performance[e],
            );
        class x extends Error {}
        class v extends Error {}
        class b extends Error {
          constructor(e) {
            super(),
              (this.code = "ENOENT"),
              (this.name = "PageNotFoundError"),
              (this.message = "Cannot find module for page: " + e);
          }
        }
        class y extends Error {
          constructor(e, t) {
            super(),
              (this.message =
                "Failed to load static file for page: " + e + " " + t);
          }
        }
        class w extends Error {
          constructor() {
            super(),
              (this.code = "ENOENT"),
              (this.message = "Cannot find the middleware module");
          }
        }
        function p(e) {
          return JSON.stringify({ message: e.message, stack: e.stack });
        }
      }
    },
    52100: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "isLocalURL", {
            enumerable: !0,
            get: () => i,
          });
        const t = e.r(95863),
          r = e.r(90225);
        function i(e) {
          if (!(0, t.isAbsoluteUrl)(e)) return !0;
          try {
            const n = (0, t.getLocationOrigin)(),
              a = new URL(e, n);
            return a.origin === n && (0, r.hasBasePath)(a.pathname);
          } catch (e) {
            return !1;
          }
        }
      }
    },
    90972: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        e.i(22271),
          Object.defineProperty(a, "__esModule", { value: !0 }),
          Object.defineProperty(a, "errorOnce", {
            enumerable: !0,
            get: () => t,
          });
        const t = (e) => {};
      }
    },
    86240: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      {
        ("use strict");
        e.i(22271), Object.defineProperty(a, "__esModule", { value: !0 });
        var i = { default: () => o, useLinkStatus: () => y };
        for (var s in i)
          Object.defineProperty(a, s, { enumerable: !0, get: i[s] });
        const t = e.r(81369),
          r = e.r(31636),
          d = t._(e.r(38653)),
          c = e.r(30609),
          u = e.r(84948),
          f = e.r(59708),
          m = e.r(48757),
          p = e.r(95863),
          h = e.r(44910);
        e.r(12597);
        const g = e.r(91981),
          x = e.r(52100),
          v = e.r(1541);
        function l(e) {
          return "string" == typeof e ? e : (0, c.formatUrl)(e);
        }
        function o(e) {
          let t,
            n,
            a,
            [i, s] = (0, d.useOptimistic)(g.IDLE_LINK_STATUS),
            o = (0, d.useRef)(null),
            {
              href: c,
              as: y,
              children: w,
              prefetch: j = null,
              passHref: _,
              replace: N,
              shallow: S,
              scroll: k,
              onClick: C,
              onMouseEnter: E,
              onTouchStart: R,
              legacyBehavior: P = !1,
              onNavigate: M,
              ref: O,
              unstable_dynamicOnHover: A,
              ...z
            } = e;
          (t = w),
            P &&
              ("string" == typeof t || "number" == typeof t) &&
              (t = (0, r.jsx)("a", { children: t }));
          const I = d.default.useContext(u.AppRouterContext),
            T = !1 !== j,
            L = null === j ? f.PrefetchKind.AUTO : f.PrefetchKind.FULL,
            { href: F, as: q } = d.default.useMemo(() => {
              const e = l(c);
              return { href: e, as: y ? l(y) : e };
            }, [c, y]);
          P && (n = d.default.Children.only(t));
          const D = P ? n && "object" == typeof n && n.ref : O,
            B = d.default.useCallback(
              (e) => (
                null !== I &&
                  (o.current = (0, g.mountLinkInstance)(e, F, I, L, T, s)),
                () => {
                  o.current &&
                    ((0, g.unmountLinkForCurrentNavigation)(o.current),
                    (o.current = null)),
                    (0, g.unmountPrefetchableInstance)(e);
                }
              ),
              [T, F, I, L, s],
            ),
            $ = {
              ref: (0, m.useMergedRef)(B, D),
              onClick(e) {
                P || "function" != typeof C || C(e),
                  P &&
                    n.props &&
                    "function" == typeof n.props.onClick &&
                    n.props.onClick(e),
                  I &&
                    (e.defaultPrevented ||
                      ((e, t, r, n, a, i, s) => {
                        const { nodeName: l } = e.currentTarget;
                        if (
                          !(
                            ("A" === l.toUpperCase() &&
                              ((e) => {
                                const t =
                                  e.currentTarget.getAttribute("target");
                                return (
                                  (t && "_self" !== t) ||
                                  e.metaKey ||
                                  e.ctrlKey ||
                                  e.shiftKey ||
                                  e.altKey ||
                                  (e.nativeEvent && 2 === e.nativeEvent.which)
                                );
                              })(e)) ||
                            e.currentTarget.hasAttribute("download")
                          )
                        ) {
                          if (!(0, x.isLocalURL)(t)) {
                            a && (e.preventDefault(), location.replace(t));
                            return;
                          }
                          e.preventDefault(),
                            d.default.startTransition(() => {
                              if (s) {
                                let e = !1;
                                if (
                                  (s({
                                    preventDefault: () => {
                                      e = !0;
                                    },
                                  }),
                                  e)
                                )
                                  return;
                              }
                              (0, v.dispatchNavigateAction)(
                                r || t,
                                a ? "replace" : "push",
                                null == i || i,
                                n.current,
                              );
                            });
                        }
                      })(e, F, q, o, N, k, M));
              },
              onMouseEnter(e) {
                P || "function" != typeof E || E(e),
                  P &&
                    n.props &&
                    "function" == typeof n.props.onMouseEnter &&
                    n.props.onMouseEnter(e),
                  I &&
                    T &&
                    (0, g.onNavigationIntent)(e.currentTarget, !0 === A);
              },
              onTouchStart: (e) => {
                P || "function" != typeof R || R(e),
                  P &&
                    n.props &&
                    "function" == typeof n.props.onTouchStart &&
                    n.props.onTouchStart(e),
                  I &&
                    T &&
                    (0, g.onNavigationIntent)(e.currentTarget, !0 === A);
              },
            };
          return (
            (0, p.isAbsoluteUrl)(q)
              ? ($.href = q)
              : (P && !_ && ("a" !== n.type || "href" in n.props)) ||
                ($.href = (0, h.addBasePath)(q)),
            (a = P
              ? d.default.cloneElement(n, $)
              : (0, r.jsx)("a", { ...z, ...$, children: t })),
            (0, r.jsx)(b.Provider, { value: i, children: a })
          );
        }
        e.r(90972);
        const b = (0, d.createContext)(g.IDLE_LINK_STATUS),
          y = () => (0, d.useContext)(b);
        ("function" == typeof a.default ||
          ("object" == typeof a.default && null !== a.default)) &&
          void 0 === a.default.__esModule &&
          (Object.defineProperty(a.default, "__esModule", { value: !0 }),
          Object.assign(a.default, a),
          (n.exports = a.default));
      }
    },
    96983: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Link: () => s });
      var n = e.i(31636),
        a = e.i(85444),
        i = e.i(86240);
      function s(e) {
        let t,
          r,
          s,
          l,
          o,
          d,
          c,
          u,
          f,
          m,
          p = (0, a.c)(30);
        p[0] !== e
          ? (({ href: r, onClick: s, prefetch: o, children: t, ...l } = e),
            (p[0] = e),
            (p[1] = t),
            (p[2] = r),
            (p[3] = s),
            (p[4] = l),
            (p[5] = o))
          : ((t = p[1]), (r = p[2]), (s = p[3]), (l = p[4]), (o = p[5]));
        const h = void 0 === o || o;
        p[6] !== r
          ? ((d = r?.startsWith("http")), (p[6] = r), (p[7] = d))
          : (d = p[7]);
        const g = d;
        if (!r && s) {
          let e, r;
          p[8] !== s ? ((e = (e) => s(e)), (p[8] = s), (p[9] = e)) : (e = p[9]);
          const a = l;
          return (
            p[10] !== t || p[11] !== e || p[12] !== a
              ? ((r = (0, n.jsx)("button", {
                  onClick: e,
                  type: "button",
                  ...a,
                  children: t,
                })),
                (p[10] = t),
                (p[11] = e),
                (p[12] = a),
                (p[13] = r))
              : (r = p[13]),
            r
          );
        }
        if (!r) {
          let e,
            r = l;
          return (
            p[14] !== t || p[15] !== r
              ? ((e = (0, n.jsx)("div", { ...r, children: t })),
                (p[14] = t),
                (p[15] = r),
                (p[16] = e))
              : (e = p[16]),
            e
          );
        }
        p[17] !== g
          ? ((c = g && { target: "_blank", rel: "noopener noreferrer" }),
            (p[17] = g),
            (p[18] = c))
          : (c = p[18]),
          p[19] !== l || p[20] !== c
            ? ((u = { ...l, ...c }), (p[19] = l), (p[20] = c), (p[21] = u))
            : (u = p[21]);
        const x = u;
        p[22] !== s
          ? ((f = (e) => {
              s?.(e);
            }),
            (p[22] = s),
            (p[23] = f))
          : (f = p[23]);
        const v = f;
        return (
          p[24] !== t ||
          p[25] !== v ||
          p[26] !== r ||
          p[27] !== x ||
          p[28] !== h
            ? ((m = (0, n.jsx)(i.default, {
                prefetch: h,
                onClick: v,
                ...x,
                href: r,
                children: t,
              })),
              (p[24] = t),
              (p[25] = v),
              (p[26] = r),
              (p[27] = x),
              (p[28] = h),
              (p[29] = m))
            : (m = p[29]),
          m
        );
      }
    },
    47378: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({
        card__wrapper: "pricing-module__NXQy5G__card__wrapper",
        onboarding__btn: "pricing-module__NXQy5G__onboarding__btn",
        subtext: "pricing-module__NXQy5G__subtext",
        tabs: "pricing-module__NXQy5G__tabs",
      });
    },
    93596: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ BottomPromo: () => o });
      var n = e.i(31636),
        a = e.i(60566),
        i = e.i(67376),
        s = e.i(96983),
        l = e.i(47378);
      function o({ className: e }) {
        return (0, n.jsxs)("div", {
          className: (0, a.default)(
            l.default.subtext,
            "w-full h-fit flex flex-col dt:flex-row items-center dr-p-20 dr-pt-90 -dr-mt-91 dr-rounded-10 overflow-hidden dr-gap-20 dt:dr-gap-34 justify-between relative",
            e,
          ),
          children: [
            (0, n.jsxs)("p", {
              className: "relative p",
              children: [
                "Or get the Every bundle for full access to all of our apps (Cora,",
                " ",
                (0, n.jsx)("a", {
                  href: "https://writewithspiral.com/",
                  className: "underline",
                  children: "Spiral",
                }),
                " ",
                "and",
                " ",
                (0, n.jsx)("a", {
                  href: "https://makeitsparkle.co",
                  className: "underline",
                  children: "Sparkle",
                }),
                ") and ideas at the frontier of AI for only $20 per month",
              ],
            }),
            (0, n.jsxs)(s.Link, {
              href: "https://every.to/subscribe",
              className:
                "relative flex items-center dr-gap-5 text-nowrap dr-px-26 dr-py-12 transition-all duration-300 bg-[#00000075] hover:bg-[#ffffff15] dr-rounded-9999 border border-solid border-white backdrop-blur-[4px] max-dt:w-full max-dt:justify-center",
              children: [
                (0, n.jsx)("span", {
                  className: "cta-md flex-shrink-0",
                  children: "Subscribe to",
                }),
                (0, n.jsx)("picture", {
                  className: "relative dr-w-54",
                  children: (0, n.jsx)(i.Image, {
                    src: "/images/every.png",
                    alt: "logo",
                    className: "!dr-w-54",
                  }),
                }),
              ],
            }),
          ],
        });
      }
    },
    76636: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ default: () => t });
        var n,
          a,
          i = e.i(38653);
        function s() {
          return (s = Object.assign.bind()).apply(null, arguments);
        }
        const t = (0, i.memo)((e) =>
          (0, i.createElement)(
            "svg",
            s(
              {
                viewBox: "0 0 12 11",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
                xmlnsXlink: "http://www.w3.org/1999/xlink",
              },
              e,
            ),
            n ||
              (n = (0, i.createElement)(
                "g",
                { clipPath: "url(#a)" },
                (0, i.createElement)("path", {
                  d: "M6 1v8",
                  stroke: "black",
                  strokeWidth: 2,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                }),
                (0, i.createElement)("path", {
                  d: "M2 5h8",
                  stroke: "black",
                  strokeWidth: 2,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                }),
              )),
            a ||
              (a = (0, i.createElement)(
                "defs",
                null,
                (0, i.createElement)(
                  "clipPath",
                  { id: "a" },
                  (0, i.createElement)("rect", {
                    width: 10.5,
                    height: 9.9,
                    fill: "white",
                    transform: "translate(.7 .3)",
                  }),
                ),
              )),
          ),
        );
      }
    },
    8933: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ default: () => t });
        var n,
          a = e.i(38653);
        function i() {
          return (i = Object.assign.bind()).apply(null, arguments);
        }
        const t = (0, a.memo)((e) =>
          (0, a.createElement)(
            "svg",
            i(
              {
                viewBox: "0 0 11 11",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
              },
              e,
            ),
            n ||
              (n = (0, a.createElement)("path", {
                d: "M10.4.3q.7.4.6 1.2c-.1.4-1.3 1.5-1.6 1.8L6.2 7.6l-1.4 2q-.2.5-.6.6H4l-.3-.1a13 13 0 0 1-3.2-4q-.2-.6.2-.9.6-.5 1.2 0c.6.5 1.1 1.6 1.7 2.2q.3.3.5 0 2-3 4.5-5.8.7-.7 1.6-1.3",
                fill: "black",
              })),
          ),
        );
      }
    },
    59631: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ PricingCard: () => d });
      var n = e.i(31636),
        a = e.i(60566),
        i = e.i(96983),
        s = e.i(23530),
        l = e.i(76636),
        o = e.i(8933);
      function d({ plan: e, isYearly: t, className: r }) {
        const d = t ? e.yearly : e.monthly;
        return (0, n.jsxs)(
          "div",
          {
            className: (0, a.default)(
              "relative w-full flex flex-col dr-gap-16 text-black dr-p-21 dr-pb-80 dt:dr-pb-104 bg-white dr-rounded-10",
              r,
            ),
            children: [
              (0, n.jsx)("h3", { className: "h5", children: e.name }),
              (0, n.jsxs)("div", {
                className: "dr-h-68",
                children: [
                  (0, n.jsx)("p", { className: "h3", children: d.price }),
                  d.note &&
                    (0, n.jsx)("p", {
                      className: "cta-md-l dr-mt-6 text-light-grey",
                      children: d.note,
                    }),
                ],
              }),
              (0, n.jsx)("ul", {
                className: (0, a.default)(
                  "flex flex-col dr-gap-8 transition-transform duration-300",
                  d.note ? "" : "-translate-y-[desktop-vw(20px)]",
                ),
                children: e.features.map((e) =>
                  (0, n.jsxs)(
                    "li",
                    {
                      className: "flex dr-gap-8",
                      children: [
                        "tick" === e.icon
                          ? (0, n.jsx)(o.default, {
                              className:
                                "dr-w-10 flex items-center justify-center",
                            })
                          : (0, n.jsx)(l.default, {
                              className:
                                "dr-w-10 flex items-center justify-center",
                            }),
                        (0, n.jsx)("span", {
                          className: "cta-rg-l text-light-grey",
                          children: e.text,
                        }),
                      ],
                    },
                    e._uid,
                  ),
                ),
              }),
              (0, n.jsxs)(i.Link, {
                href: "https://cora.computer/users/sign_up",
                className:
                  "bg-black absolute dr-bottom-18 dt:dr-bottom-30 left-1/2 -translate-x-1/2 text-white dr-w-290 dt:dr-w-246 dr-px-65 dr-py-12 dr-rounded-9999 flex dr-gap-10 justify-center group",
                children: [
                  (0, n.jsx)("span", {
                    className:
                      "cta-sb-l inline-block text-nowrap flex-shrink-0 translate-x-[desktop-vw(12)] group-hover:translate-x-[0] transition-transform duration-300",
                    children: "Start free trial",
                  }),
                  (0, n.jsx)(s.default, {
                    className:
                      "flex dr-w-16 transition-all duration-300 opacity-0 group-hover:opacity-100 shrink-0",
                  }),
                ],
              }),
            ],
          },
          e._uid,
        );
      }
    },
    94260: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Tabs: () => o });
      var n = e.i(31636),
        a = e.i(85444),
        i = e.i(60566),
        s = e.i(38653),
        l = e.i(47378);
      function o(e) {
        let t,
          r,
          o,
          d,
          c,
          u,
          f,
          m,
          p,
          h,
          g,
          x,
          v = (0, a.c)(28),
          { activeTab: b, setActiveTab: y, className: w } = e,
          j = (0, s.useRef)(null),
          _ = (0, s.useRef)(null);
        v[0] === Symbol.for("react.memo_cache_sentinel")
          ? ((t = { left: 0, width: 0 }), (v[0] = t))
          : (t = v[0]);
        const [N, S] = (0, s.useState)(t);
        v[1] !== b
          ? ((r = () => {
              let e = null,
                t = () => {
                  const e = 0 === b ? j.current : _.current;
                  if (e) {
                    const { offsetLeft: t, offsetWidth: r } = e;
                    S({ left: t, width: r });
                  }
                },
                r = () => {
                  e ||
                    (e = requestAnimationFrame(() => {
                      t(), (e = null);
                    }));
                };
              return (
                t(),
                window.addEventListener("resize", r),
                () => {
                  window.removeEventListener("resize", r),
                    e && cancelAnimationFrame(e);
                }
              );
            }),
            (o = [b]),
            (v[1] = b),
            (v[2] = r),
            (v[3] = o))
          : ((r = v[2]), (o = v[3])),
          (0, s.useEffect)(r, o),
          v[4] !== w
            ? ((d = (0, i.default)(
                l.default.tabs,
                "relative flex dr-gap-6 dr-p-4 dr-rounded-9999",
                w,
              )),
              (v[4] = w),
              (v[5] = d))
            : (d = v[5]),
          v[6] !== N.left || v[7] !== N.width
            ? ((c = (0, n.jsx)("span", {
                className:
                  "absolute dr-top-4 dr-bottom-4 dr-rounded-9999 bg-white transition-all duration-300 z-0",
                style: { left: N.left, width: N.width },
              })),
              (v[6] = N.left),
              (v[7] = N.width),
              (v[8] = c))
            : (c = v[8]),
          v[9] !== y
            ? ((u = () => y(0)), (v[9] = y), (v[10] = u))
            : (u = v[10]);
        const k = 0 === b ? "text-black" : "text-white hover:text-black";
        v[11] !== k
          ? ((f = (0, i.default)(
              "h6 relative transition-colors duration-300 dr-py-10 dt:dr-py-4 dr-px-12 dt:dr-px-10 cursor-pointer",
              k,
            )),
            (v[11] = k),
            (v[12] = f))
          : (f = v[12]),
          v[13] !== u || v[14] !== f
            ? ((m = (0, n.jsx)("button", {
                ref: j,
                type: "button",
                onClick: u,
                className: f,
                children: "Yearly (save 20%)",
              })),
              (v[13] = u),
              (v[14] = f),
              (v[15] = m))
            : (m = v[15]),
          v[16] !== y
            ? ((p = () => y(1)), (v[16] = y), (v[17] = p))
            : (p = v[17]);
        const C = 1 === b ? "text-black" : "text-white hover:text-black";
        return (
          v[18] !== C
            ? ((h = (0, i.default)(
                "h6 relative transition-colors duration-300 dr-py-10 dt:dr-py-4 dr-px-12 dt:dr-px-10 cursor-pointer",
                C,
              )),
              (v[18] = C),
              (v[19] = h))
            : (h = v[19]),
          v[20] !== p || v[21] !== h
            ? ((g = (0, n.jsx)("button", {
                ref: _,
                type: "button",
                onClick: p,
                className: h,
                children: "Monthly",
              })),
              (v[20] = p),
              (v[21] = h),
              (v[22] = g))
            : (g = v[22]),
          v[23] !== g || v[24] !== d || v[25] !== c || v[26] !== m
            ? ((x = (0, n.jsxs)("div", { className: d, children: [c, m, g] })),
              (v[23] = g),
              (v[24] = d),
              (v[25] = c),
              (v[26] = m),
              (v[27] = x))
            : (x = v[27]),
          x
        );
      }
    },
    22213: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ Pricing: () => u });
        var n = e.i(31636),
          a = e.i(85444),
          i = e.i(60566),
          s = e.i(38653),
          l = e.i(93596),
          o = e.i(59631),
          d = e.i(47378),
          c = e.i(94260);
        const t = [
          {
            _uid: "e9b1e6f2-b960-4b7b-8e20-2a83a4d8ec25",
            name: "Professional",
            monthly: { price: "$25/month", note: "" },
            yearly: { price: "$20/month", note: "Billed anually as $240" },
            features: [
              {
                _uid: "9d3e5a6c-6d5c-4e01-8e0e-2a0b6c1f1b3e",
                icon: "tick",
                text: "Includes 2 email accounts",
              },
              {
                _uid: "e92d4d01-bf4a-4a72-a1aa-6c3e6c8c4f4f",
                icon: "tick",
                text: "AI Inbox organization",
              },
              {
                _uid: "0cb4f4f7-3913-4e95-9d2d-854f78d8306a",
                icon: "tick",
                text: "Pre-drafted responses",
              },
              {
                _uid: "41df3207-0b9b-4b9e-8a3c-760f0bb63d30",
                icon: "tick",
                text: "Daily brief summaries",
              },
              {
                _uid: "f3e5e246-f63d-4379-91b1-13d735be72f1",
                icon: "tick",
                text: "Technical support",
              },
            ],
          },
          {
            _uid: "cba3fa56-81f1-4f30-8e3d-8e3bb7410e64",
            name: "Unlimited",
            monthly: { price: "$49/month", note: "" },
            yearly: { price: "$39/month", note: "Billed anually as $470" },
            features: [
              {
                _uid: "51e2fa34-f3c3-4a36-996e-1ddf84cdba4c",
                icon: "tick",
                text: "Everything in Basic",
              },
              {
                _uid: "a3f09ef0-4d1a-43a1-a969-5ef5bff14ad1",
                icon: "plus",
                text: "Includes unlimited email accounts",
              },
            ],
          },
        ];
        function u(e) {
          let r,
            u,
            f,
            m,
            p,
            h,
            g,
            x,
            v = (0, a.c)(15),
            { className: b } = e,
            [y, w] = (0, s.useState)(0);
          return (
            v[0] !== b
              ? ((r = (0, i.default)(
                  "relative mx-auto dr-mt-25 dt:dr-mt-108 dr-w-357 dt:dr-w-604 flex flex-col dr-gap-21 items-center",
                  b,
                )),
                (v[0] = b),
                (v[1] = r))
              : (r = v[1]),
            v[2] === Symbol.for("react.memo_cache_sentinel")
              ? ((u = (0, n.jsx)("h2", {
                  className: "h2 text-center",
                  children: "Pick a plan",
                })),
                (v[2] = u))
              : (u = v[2]),
            v[3] !== y
              ? ((f = (0, n.jsx)(c.Tabs, { activeTab: y, setActiveTab: w })),
                (v[3] = y),
                (v[4] = f))
              : (f = v[4]),
            v[5] === Symbol.for("react.memo_cache_sentinel")
              ? ((m = (0, i.default)(
                  d.default.card__wrapper,
                  "bg-grey dr-rounded-20 dr-p-10 w-full flex flex-col dt:flex-row dr-gap-8 z-[1]",
                )),
                (v[5] = m))
              : (m = v[5]),
            v[6] !== y
              ? ((p = t.map((e) =>
                  (0, n.jsx)(
                    o.PricingCard,
                    { plan: e, isYearly: 0 === y },
                    e._uid,
                  ),
                )),
                (v[6] = y),
                (v[7] = p))
              : (p = v[7]),
            v[8] !== p
              ? ((h = (0, n.jsx)("div", { className: m, children: p })),
                (v[8] = p),
                (v[9] = h))
              : (h = v[9]),
            v[10] === Symbol.for("react.memo_cache_sentinel")
              ? ((g = (0, n.jsx)(l.BottomPromo, {})), (v[10] = g))
              : (g = v[10]),
            v[11] !== r || v[12] !== f || v[13] !== h
              ? ((x = (0, n.jsxs)("section", {
                  className: r,
                  children: [u, f, h, g],
                })),
                (v[11] = r),
                (v[12] = f),
                (v[13] = h),
                (v[14] = x))
              : (x = v[14]),
            x
          );
        }
      }
    },
    55366: (e) => {
      var { g: t, __dirname: r, m: n, e: a } = e;
      n.exports = e.r(41842);
    },
    42928: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ useStore: () => t });
        const t = (0, e.i(77666).create)((e) => ({
          isNavOpened: !1,
          setIsNavOpened: (t) => e({ isNavOpened: t }),
          isCloudsOverNav: !1,
          setIsCloudsOverNav: (t) => e({ isCloudsOverNav: t }),
        }));
      }
    },
    61752: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Lenis: () => d });
      var n = e.i(31636),
        a = e.i(85444),
        i = e.i(54995),
        s = e.i(38653),
        l = e.i(92854),
        o = e.i(42928);
      function d(e) {
        let t,
          r,
          d,
          f,
          m,
          p = (0, a.c)(11),
          { root: h, options: g } = e,
          x = (0, s.useRef)(null),
          v = (0, o.useStore)(u),
          b = (0, i.useLenis)();
        p[0] === Symbol.for("react.memo_cache_sentinel")
          ? ((t = (e) => {
              x.current?.lenis && x.current.lenis.raf(e);
            }),
            (p[0] = t))
          : (t = p[0]),
          (0, l.useTempus)(t),
          p[1] !== v || p[2] !== b
            ? ((r = () => {
                v ? b?.stop() : b?.start();
              }),
              (d = [v, b]),
              (p[1] = v),
              (p[2] = b),
              (p[3] = r),
              (p[4] = d))
            : ((r = p[3]), (d = p[4])),
          (0, s.useEffect)(r, d);
        const y = g?.lerp ?? 0.125;
        return (
          p[5] !== g || p[6] !== y
            ? ((f = { ...g, lerp: y, autoRaf: !1, anchors: !0, prevent: c }),
              (p[5] = g),
              (p[6] = y),
              (p[7] = f))
            : (f = p[7]),
          p[8] !== h || p[9] !== f
            ? ((m = (0, n.jsx)(i.ReactLenis, { ref: x, root: h, options: f })),
              (p[8] = h),
              (p[9] = f),
              (p[10] = m))
            : (m = p[10]),
          m
        );
      }
      function c(e) {
        return (
          e?.nodeName === "VERCEL-LIVE-FEEDBACK" ||
          e?.id === "theatrejs-studio-root"
        );
      }
      function u(e) {
        return e.isNavOpened;
      }
    },
    23408: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Navigation: () => o });
      var n = e.i(31636),
        a = e.i(60566),
        i = e.i(54995),
        s = e.i(67376),
        l = e.i(96983);
      function o() {
        const e = (0, i.useLenis)();
        return (0, n.jsx)("header", {
          className:
            "max-w-[1440px] mx-auto fixed left-0 z-[2] right-0  pointer-events-none",
          children: (0, n.jsxs)("div", {
            className:
              "dr-w-393 dt:w-full dr-py-29 dr-px-20 dt:dr-px-30 dr-top-20 dt:dr-top-30 flex justify-between items-center",
            children: [
              (0, n.jsx)("button", {
                type: "button",
                onClick: () => {
                  e && e?.scrollTo(0);
                },
                className:
                  "flex dr-w-80 dt:dr-w-90 cursor-pointer pointer-events-auto shrink-0",
                "aria-label": "Scroll to top",
                children: (0, n.jsx)(s.Image, {
                  src: "/images/logo.png",
                  alt: "Cora logo",
                  className: "!w-full",
                }),
              }),
              (0, n.jsxs)("nav", {
                className:
                  "flex items-center justify-end pointer-events-auto  bg-[#ffffffE5] backdrop-blur-[29px] dr-gap-10 dr-pl-16 dr-p-1 dt:dr-gap-9.5 dr-rounded-9999 dt:dr-pl-23 nav-cta overflow-clip",
                children: [
                  (0, n.jsx)("a", {
                    href: "https://cora.computer/users/sign_in",
                    className: (0, a.default)(
                      " uline transition-all duration-300 text-tertiary",
                    ),
                    children: "Log in",
                  }),
                  (0, n.jsx)(l.Link, {
                    href: "https://cora.computer/users/sign_up",
                    className: (0, a.default)(
                      "bg-primary dr-py-10 dr-px-16 dt:dr-py-8 dt:dr-px-23 dr-rounded-9999 whitespace-nowrap border-solid border-secondary dr-border-2  transition-all duration-300 hover:bg-[#d6d6d6] hover:text-[#000] hover:shadow-[-3px_4px_4px_0px_#00000010] hover:backdrop-blur-[20px]",
                    ),
                    children: "Start free trial",
                  }),
                ],
              }),
            ],
          }),
        });
      }
    },
    15507: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Wrapper: () => u });
      var n = e.i(31636),
        a = e.i(85444),
        i = e.i(60566),
        s = e.i(55366),
        l = e.i(38653),
        o = e.i(97686),
        d = e.i(61752),
        c = e.i(23408);
      function u(e) {
        let t,
          r,
          u,
          f,
          m,
          p,
          h,
          g,
          x,
          v,
          b,
          y,
          w,
          j,
          _,
          N = (0, a.c)(30);
        N[0] !== e
          ? (({
              children: t,
              theme: f,
              className: r,
              lenis: m,
              webgl: p,
              ...u
            } = e),
            (N[0] = e),
            (N[1] = t),
            (N[2] = r),
            (N[3] = u),
            (N[4] = f),
            (N[5] = m),
            (N[6] = p))
          : ((t = N[1]),
            (r = N[2]),
            (u = N[3]),
            (f = N[4]),
            (m = N[5]),
            (p = N[6]));
        const S = void 0 === f ? "blue" : f,
          k = void 0 === m || m,
          C = (0, s.usePathname)();
        N[7] !== S
          ? ((h = () => {
              document.documentElement.setAttribute("data-theme", S);
            }),
            (N[7] = S),
            (N[8] = h))
          : (h = N[8]),
          N[9] !== C || N[10] !== S
            ? ((g = [C, S]), (N[9] = C), (N[10] = S), (N[11] = g))
            : (g = N[11]),
          (0, l.useEffect)(h, g),
          N[12] !== p
            ? ((x =
                p &&
                (0, n.jsx)(o.Canvas, {
                  root: !0,
                  ...("object" == typeof p && p),
                })),
              (N[12] = p),
              (N[13] = x))
            : (x = N[13]),
          N[14] === Symbol.for("react.memo_cache_sentinel")
            ? ((v = (0, n.jsx)(c.Navigation, {})), (N[14] = v))
            : (v = N[14]),
          N[15] !== r
            ? ((b = (0, i.default)("relative flex flex-col grow", r)),
              (N[15] = r),
              (N[16] = b))
            : (b = N[16]);
        const E = `document.documentElement.setAttribute('data-theme', '${S}');`;
        return (
          N[17] !== E
            ? ((y = (0, n.jsx)("script", { children: E })),
              (N[17] = E),
              (N[18] = y))
            : (y = N[18]),
          N[19] !== t || N[20] !== u || N[21] !== b || N[22] !== y
            ? ((w = (0, n.jsxs)("main", {
                className: b,
                ...u,
                children: [t, y],
              })),
              (N[19] = t),
              (N[20] = u),
              (N[21] = b),
              (N[22] = y),
              (N[23] = w))
            : (w = N[23]),
          N[24] !== k
            ? ((j =
                k &&
                (0, n.jsx)(d.Lenis, {
                  root: !0,
                  options: "object" == typeof k ? k : {},
                })),
              (N[24] = k),
              (N[25] = j))
            : (j = N[25]),
          N[26] !== w || N[27] !== j || N[28] !== x
            ? ((_ = (0, n.jsx)("div", {
                className: "bg-primary",
                children: (0, n.jsx)("div", {
                  className:
                    "max-w-[1440px] mx-auto dt:dr-border-l-5 dt:dr-border-t-0 dt:dr-border-b-0 dt:dr-border-r-5 dt:border-solid border-[#DADADA] floating-container",
                  children: (0, n.jsxs)("div", {
                    className:
                      "w-full  dt:dr-border-l-10 dt:dr-border-t-0 dt:dr-border-b-0 dt:dr-border-r-10 dt:border-solid border-secondary",
                    children: [x, v, w, j],
                  }),
                }),
              })),
              (N[26] = w),
              (N[27] = j),
              (N[28] = x),
              (N[29] = _))
            : (_ = N[29]),
          _
        );
      }
    },
    71829: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Background: () => o });
      var n = e.i(31636),
        a = e.i(85444),
        i = e.i(54995),
        s = e.i(38653),
        l = e.i(67376);
      function o() {
        let e,
          t,
          r = (0, a.c)(2),
          o = (0, s.useRef)(null);
        return (
          r[0] === Symbol.for("react.memo_cache_sentinel")
            ? ((e = (e) => {
                const { progress: t } = e;
                o.current &&
                  (o.current.style.transform = `translateY(${10 * t}%)`);
              }),
              (r[0] = e))
            : (e = r[0]),
          (0, i.useLenis)(e),
          r[1] === Symbol.for("react.memo_cache_sentinel")
            ? ((t = (0, n.jsxs)("div", {
                className:
                  "absolute top-0 left-0 right-0 bottom-0 overflow-clip",
                children: [
                  (0, n.jsx)("div", {
                    className:
                      "absolute top-0 left-0 max-dt:translate-x-[-10%] dt:right-0 aspect-[1440/12467] max-dt:w-[1440px]",
                    ref: o,
                    children: (0, n.jsx)(l.Image, {
                      src: "/images/background.webp",
                      alt: "",
                      fill: !0,
                      unoptimized: !0,
                      priority: !0,
                    }),
                  }),
                  (0, n.jsx)("div", {
                    className:
                      "absolute top-[75%] left-0 right-0 bottom-0 bg-[linear-gradient(180deg,#ffffff_0%,#000000_100%)] mix-blend-multiply opacity-50",
                  }),
                ],
              })),
              (r[1] = t))
            : (t = r[1]),
          t
        );
      }
    },
    86567: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({
        inner: "marquee-module__irIMSq__inner",
        marquee: "marquee-module__irIMSq__marquee",
      });
    },
    61089: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Marquee: () => f });
      var n = e.i(31636),
        a = e.i(85444),
        i = e.i(60566),
        s = e.i(4371),
        l = e.i(54995),
        o = e.i(38653),
        d = e.i(92854),
        c = e.i(47103),
        u = e.i(86567);
      function f(e) {
        let t,
          r,
          f,
          m,
          p,
          h,
          g,
          x,
          v,
          b,
          y,
          w,
          j,
          _,
          N,
          S,
          k,
          C,
          E = (0, a.c)(41);
        E[0] !== e
          ? (({
              children: t,
              className: r,
              repeat: h,
              speed: g,
              scrollVelocity: x,
              reversed: v,
              pauseOnHover: b,
              onMouseEnter: f,
              onMouseLeave: m,
              ...p
            } = e),
            (E[0] = e),
            (E[1] = t),
            (E[2] = r),
            (E[3] = f),
            (E[4] = m),
            (E[5] = p),
            (E[6] = h),
            (E[7] = g),
            (E[8] = x),
            (E[9] = v),
            (E[10] = b))
          : ((t = E[1]),
            (r = E[2]),
            (f = E[3]),
            (m = E[4]),
            (p = E[5]),
            (h = E[6]),
            (g = E[7]),
            (x = E[8]),
            (v = E[9]),
            (b = E[10]));
        const R = void 0 === h ? 2 : h,
          P = void 0 === g ? 1 : g,
          M = void 0 === x || x,
          O = void 0 !== v && v,
          A = void 0 !== b && b;
        E[11] === Symbol.for("react.memo_cache_sentinel")
          ? ((y = { lazy: !0 }), (E[11] = y))
          : (y = E[11]);
        const [z, I] = (0, s.useResizeObserver)(y);
        E[12] === Symbol.for("react.memo_cache_sentinel")
          ? ((w = []), (E[12] = w))
          : (w = E[12]);
        const T = (0, o.useRef)(w),
          L = (0, o.useRef)(1e3 * Math.random()),
          F = (0, o.useRef)(!1),
          [q, D] = (0, s.useIntersectionObserver)(),
          B = (0, l.useLenis)();
        if (
          (E[13] !== I ||
          E[14] !== D?.isIntersecting ||
          E[15] !== B?.velocity ||
          E[16] !== A ||
          E[17] !== O ||
          E[18] !== M ||
          E[19] !== P
            ? ((j = (e, t) => {
                const r = I();
                if (
                  !D?.isIntersecting ||
                  (A && F.current) ||
                  !r?.borderBoxSize[0]?.inlineSize
                )
                  return;
                let n = B?.velocity ?? 0;
                M || (n = 0);
                const a = 0.1 * P * (n = 1 + Math.abs(n / 5)) * t;
                O ? (L.current = L.current - a) : (L.current = L.current + a);
                const i = r.borderBoxSize[0].inlineSize;
                for (const e of ((L.current = (0, c.modulo)(L.current, i)),
                T.current))
                  e.style.transform = `translate3d(${-L.current}px,0,0)`;
              }),
              (E[13] = I),
              (E[14] = D?.isIntersecting),
              (E[15] = B?.velocity),
              (E[16] = A),
              (E[17] = O),
              (E[18] = M),
              (E[19] = P),
              (E[20] = j))
            : (j = E[20]),
          (0, d.useTempus)(j),
          E[21] !== r
            ? ((_ = (0, i.default)(r, u.default.marquee)),
              (E[21] = r),
              (E[22] = _))
            : (_ = E[22]),
          E[23] !== f
            ? ((N = (e) => {
                (F.current = !0), f?.(e);
              }),
              (E[23] = f),
              (E[24] = N))
            : (N = E[24]),
          E[25] !== m
            ? ((S = (e) => {
                (F.current = !1), m?.(e);
              }),
              (E[25] = m),
              (E[26] = S))
            : (S = E[26]),
          E[27] !== t || E[28] !== R || E[29] !== z)
        ) {
          let e;
          E[31] !== t || E[32] !== z
            ? ((e = (e, r) =>
                (0, n.jsx)(
                  "div",
                  {
                    className: u.default.inner,
                    "aria-hidden": 0 !== r,
                    "data-nosnippet": 0 !== r ? "" : void 0,
                    ref: (e) => {
                      e && ((T.current[r] = e), 0 === r && z(e));
                    },
                    children: t,
                  },
                  `marquee-item-${r}`,
                )),
              (E[31] = t),
              (E[32] = z),
              (E[33] = e))
            : (e = E[33]),
            (k = Array(R).fill(t).map(e)),
            (E[27] = t),
            (E[28] = R),
            (E[29] = z),
            (E[30] = k);
        } else k = E[30];
        return (
          E[34] !== p ||
          E[35] !== q ||
          E[36] !== N ||
          E[37] !== S ||
          E[38] !== k ||
          E[39] !== _
            ? ((C = (0, n.jsx)("div", {
                ref: q,
                className: _,
                onMouseEnter: N,
                onMouseLeave: S,
                ...p,
                children: k,
              })),
              (E[34] = p),
              (E[35] = q),
              (E[36] = N),
              (E[37] = S),
              (E[38] = k),
              (E[39] = _),
              (E[40] = C))
            : (C = E[40]),
          C
        );
      }
    },
    53127: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({
        cloud__card: "clouds-module__LT0lHa__cloud__card",
        wrapper: "clouds-module__LT0lHa__wrapper",
      });
    },
    76043: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ CloudCard: () => l });
      var n = e.i(31636),
        a = e.i(60566),
        i = e.i(67376),
        s = e.i(53127);
      function l({ data: e, className: t }) {
        return (0, n.jsxs)("div", {
          className: (0, a.default)(
            "flex flex-col justify-between flex-shrink-0 dr-gap-8 dr-w-242 h-fit dr-mr-10 dr-px-15 dr-py-12 bg-white text-black dr-rounded-12",
            s.default.cloud__card,
            t,
          ),
          children: [
            (0, n.jsxs)("p", {
              className: "cta-md-s break-words whitespace-normal",
              children: ["“", e?.text, "“"],
            }),
            (0, n.jsxs)("figure", {
              className: "flex items-center dr-gap-6",
              children: [
                (0, n.jsx)("picture", {
                  className:
                    "relative flex-shrink-0 dr-w-30 dr-h-30 dr-rounded-9999 overflow-hidden",
                  children: (0, n.jsx)(i.Image, {
                    src: e?.media?.filename,
                    alt: e?.name || "Profile picture",
                    className: "!w-full !h-full !object-cover",
                  }),
                }),
                (0, n.jsxs)("figcaption", {
                  className: "flex flex-col ",
                  children: [
                    (0, n.jsx)("span", {
                      className: "username",
                      children: e?.name,
                    }),
                    (0, n.jsxs)("div", {
                      className: "cta-md-s flex items-center dr-gap-4",
                      children: [
                        (0, n.jsx)("span", { children: e?.position }),
                        (0, n.jsx)(i.Image, {
                          src: e?.logo?.filename,
                          alt: e?.name.alt || "Company logo",
                          className: "!dr-h-14",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      }
    },
    64006: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ Clouds: () => m });
        var n = e.i(31636),
          a = e.i(85444),
          i = e.i(60566),
          s = e.i(4371),
          l = e.i(67376),
          o = e.i(61089),
          d = e.i(22477),
          c = e.i(42928),
          u = e.i(76043),
          f = e.i(53127);
        const t = [
          {
            _uid: "fcbf8973-0c32-4ac7-bd06-5a1a325a4e5b",
            media: { filename: "/images/people/brettdashevsky.jpg" },
            logo: {
              filename: "/images/logos/creatoreconomy.png",
              alt: "Creator Economy",
            },
            name: "Brett Dashevsky",
            text: "I deleted  Cora just to feel the difference it makes. And the difference was felt. Scrambling to connect my emails to it again.",
            position: "Founder at",
          },
          {
            _uid: "ae0df41a-8b4d-4c47-9856-cc3f60dd9eb8",
            media: { filename: "/images/people/andrewwilkinson.jpg" },
            logo: { filename: "/images/logos/tiny.png", alt: "tiny" },
            name: "Andrew Wilkinson",
            text: "I've tried all these newfangled AI email apps, and the winner, by far, is Cora by Every",
            position: "Founder at",
          },
          {
            _uid: "0d7b8e48-0c14-47f9-bae0-8a0d2c7c79ec",
            media: { filename: "/images/people/mikekrieger.jpg" },
            logo: { filename: "/images/logos/anthropic.png", alt: "Anthropic" },
            name: "Mike Krieger",
            text: `I’ve been really enjoying Cora by Every...this morning was a record; it handled / categorized every single email I received, left me with inbox zero and a nice Brief to read instead.`,
            position: "CPO at",
          },
          {
            _uid: "13c512e0-d36f-4702-a296-e12b33a41c95",
            media: { filename: "/images/people/dannyaziz.png" },
            logo: { filename: "/images/logos/spiral.png", alt: "Spiral" },
            name: "Danny Aziz",
            text: "I've been using Cora for a few months now. I'm at inbox zero pretty much all the time and I'm replying to the important emails at record speed",
            position: "Founder of",
          },
          {
            _uid: "d7e6ce1f-10ff-4303-85e7-4c7a9f2f1161",
            media: { filename: "/images/people/jimraptis.jpg" },
            logo: {
              filename: "/images/logos/magicpattern.png",
              alt: "Magic Pattern",
            },
            name: "Jim Raptis",
            text: `Storytelling and design on steroids 
→ cora.computer`,
            position: "GM of",
          },
          {
            _uid: "e4bfa6ea-e97e-4f52-b1e6-5c58c9dfe96d",
            media: { filename: "/images/people/mitchellbaldridge.jpg" },
            logo: {
              filename: "/images/logos/recostseg.png",
              alt: "Re cost seg",
            },
            name: "Mitchell Baldridge",
            text: "Using Cora for the last month has changed the way I deal with email",
            position: "Founder of",
          },
          {
            _uid: "1",
            media: { filename: "/images/people/aodhanmoran.jpg" },
            logo: {
              filename: "/images/logos/castcraft.png",
              alt: "Castcraft co.",
            },
            name: "Aodhán Moran",
            text: "Been in since release, I have opened every single summary. Still feels like magic",
            position: "Cofounder of",
          },
          {
            _uid: "2",
            media: { filename: "/images/people/kevinroose.jpg" },
            logo: {
              filename: "/images/logos/nytimes.svg",
              alt: "The New York Times",
            },
            name: "Kevin Roose",
            text: "AI now reads/summarizes all my newsletters, and its dry, businesslike summaries of Substack beefs are becoming my favorite form of media.",
            position: "Columnist at",
          },
        ];
        function m(e) {
          let r,
            u,
            m,
            g,
            x,
            v,
            b,
            y,
            w,
            j,
            _ = (0, a.c)(18),
            { className: N } = e,
            [S, k] = (0, s.useRect)(),
            C = (0, c.useStore)(h),
            { height: E } = (0, s.useWindowSize)();
          return (
            _[0] !== C
              ? ((r = () => {
                  C(!0);
                }),
                (u = () => {
                  C(!1);
                }),
                (_[0] = C),
                (_[1] = r),
                (_[2] = u))
              : ((r = _[1]), (u = _[2])),
            _[3] !== k || _[4] !== r || _[5] !== u
              ? ((m = {
                  rect: k,
                  start: "top 95",
                  end: "bottom top",
                  onEnter: r,
                  onLeave: u,
                }),
                (_[3] = k),
                (_[4] = r),
                (_[5] = u),
                (_[6] = m))
              : (m = _[6]),
            _[7] !== E ? ((g = [E]), (_[7] = E), (_[8] = g)) : (g = _[8]),
            (0, d.useScrollTrigger)(m, g),
            _[9] !== N
              ? ((x = (0, i.default)(
                  "relative h-fit w-full flex items-center justify-center -dr-mt-80 -dt:dr-mt-66 dr-mb-80 overflow-x-clip",
                  N,
                )),
                (_[9] = N),
                (_[10] = x))
              : (x = _[10]),
            _[11] === Symbol.for("react.memo_cache_sentinel")
              ? ((v = (0, n.jsx)(l.Image, {
                  src: "/images/cloud.webp",
                  alt: "clouds",
                  className:
                    "!w-full absolute dt:top-[-25%] transform-[scale(1.5)] top-[-10%]",
                })),
                (b = (0, n.jsx)(l.Image, {
                  src: "/images/cloud.webp",
                  alt: "clouds",
                  className:
                    "!w-full absolute dt:bottom-[-10%] bottom-0  transform-[scale(1.5)]",
                })),
                (y = (0, i.default)(
                  f.default.wrapper,
                  "relative h-fit w-full flex items-center dr-py-40 dt:dr-py-100 overflow-x-clip",
                )),
                (_[11] = v),
                (_[12] = b),
                (_[13] = y))
              : ((v = _[11]), (b = _[12]), (y = _[13])),
            _[14] === Symbol.for("react.memo_cache_sentinel")
              ? ((w = (0, n.jsx)("div", {
                  className: y,
                  children: (0, n.jsx)(o.Marquee, {
                    repeat: 10,
                    speed: 0.5,
                    children: t?.map(p),
                  }),
                })),
                (_[14] = w))
              : (w = _[14]),
            _[15] !== S || _[16] !== x
              ? ((j = (0, n.jsxs)("section", {
                  className: x,
                  ref: S,
                  children: [v, b, w],
                })),
                (_[15] = S),
                (_[16] = x),
                (_[17] = j))
              : (j = _[17]),
            j
          );
        }
        function p(e) {
          return (0, n.jsx)(u.CloudCard, { data: e }, e?._uid);
        }
        function h(e) {
          return e.setIsCloudsOverNav;
        }
      }
    },
    36628: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({
        btn: "button-module__h0EWEW__btn",
        input: "button-module__h0EWEW__input",
        input__blur: "button-module__h0EWEW__input__blur",
        input__btn: "button-module__h0EWEW__input__btn",
      });
    },
    48578: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ Button: () => o });
      var n = e.i(31636),
        a = e.i(60566),
        i = e.i(23530),
        s = e.i(96983),
        l = e.i(36628);
      function o({ label: e, className: t, ...r }) {
        return (0, n.jsxs)(s.Link, {
          className: (0, a.default)(
            l.default.btn,
            "dr-gap-10 dr-rounded-9999 dr-px-38 dr-py-12 transition-all duration-300 inline-flex",
            t,
          ),
          ...r,
          children: [
            (0, n.jsx)("span", {
              className: "cta-sb-l flex-shrink-0",
              children: e || "Get Started",
            }),
            (0, n.jsx)(i.default, { className: "dr-w-16" }),
          ],
        });
      }
    },
    50748: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ SplitText: () => y, default: () => y });
        let t,
          r,
          n,
          a = () => n || y.register(window.gsap),
          i = "undefined" != typeof Intl ? new Intl.Segmenter() : 0,
          s = (e) =>
            "string" == typeof e
              ? s(document.querySelectorAll(e))
              : "length" in e
                ? Array.from(e)
                : [e],
          l = (e) => s(e).filter((e) => e instanceof HTMLElement),
          o = [],
          d = () => {},
          c = /\s+/g,
          u =
            /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*|./gu,
          f = { left: 0, top: 0, width: 0, height: 0 },
          m = (e, t) => {
            if (t) {
              let r = new Set(e.join("").match(t) || o),
                n = e.length,
                a,
                i,
                s,
                l;
              if (r.size) {
                for (; --n > -1; )
                  for (s of ((i = e[n]), r))
                    if (s.startsWith(i) && s.length > i.length) {
                      for (
                        a = 0, l = i;
                        s.startsWith((l += e[n + ++a])) && l.length < s.length;
                      );
                      if (a && l.length === s.length) {
                        (e[n] = s), e.splice(n + 1, a);
                        break;
                      }
                    }
              }
            }
            return e;
          },
          p = (e) =>
            "inline" === window.getComputedStyle(e).display &&
            (e.style.display = "inline-block"),
          h = (e, t, r) =>
            t.insertBefore(
              "string" == typeof e ? document.createTextNode(e) : e,
              r,
            ),
          g = (e, t, r) => {
            let n = t[e + "sClass"] || "",
              { tag: a = "div", aria: i = "auto", propIndex: s = !1 } = t,
              l = "line" === e ? "block" : "inline-block",
              o = n.indexOf("++") > -1,
              d = (t) => {
                const d = document.createElement(a),
                  c = r.length + 1;
                return (
                  n && (d.className = n + (o ? " " + n + c : "")),
                  s && d.style.setProperty("--" + e, c + ""),
                  "none" !== i && d.setAttribute("aria-hidden", "true"),
                  "span" !== a &&
                    ((d.style.position = "relative"), (d.style.display = l)),
                  (d.textContent = t),
                  r.push(d),
                  d
                );
              };
            return o && (n = n.replace("++", "")), (d.collection = r), d;
          },
          x = (e, t, r, n) => {
            const a = g("line", r, n),
              i = window.getComputedStyle(e).textAlign || "left";
            return (r, n) => {
              const s = a("");
              for (s.style.textAlign = i, e.insertBefore(s, t[r]); r < n; r++)
                s.appendChild(t[r]);
              s.normalize();
            };
          },
          v = (e, t, r, n, a, s, l, d, u, f) => {
            var g;
            let x = Array.from(e.childNodes),
              b = 0,
              {
                wordDelimiter: y,
                reduceWhiteSpace: w = !0,
                prepareText: j,
              } = t,
              _ = e.getBoundingClientRect(),
              N = _,
              S =
                !w &&
                "pre" === window.getComputedStyle(e).whiteSpace.substring(0, 3),
              k = 0,
              C = r.collection,
              E,
              R,
              P,
              M,
              O,
              A,
              z,
              I,
              T,
              L,
              F,
              q,
              D,
              B,
              $,
              W,
              H,
              V;
            for (
              "object" == typeof y
                ? ((P = y.delimiter || y), (R = y.replaceWith || ""))
                : (R = "" === y ? "" : y || " "),
                E = " " !== R;
              b < x.length;
              b++
            )
              if (3 === (M = x[b]).nodeType) {
                for (
                  $ = M.textContent || "",
                    w
                      ? ($ = $.replace(c, " "))
                      : S && ($ = $.replace(/\n/g, R + "\n")),
                    j && ($ = j($, e)),
                    M.textContent = $,
                    H = (O = R || P ? $.split(P || R) : $.match(d) || o)[
                      O.length - 1
                    ],
                    I = E ? " " === H.slice(-1) : !H,
                    H || O.pop(),
                    N = _,
                    (z = E ? " " === O[0].charAt(0) : !O[0]) && h(" ", e, M),
                    O[0] || O.shift(),
                    m(O, u),
                    (s && f) || (M.textContent = ""),
                    T = 1;
                  T <= O.length;
                  T++
                )
                  if (
                    ((W = O[T - 1]),
                    !w &&
                      S &&
                      "\n" === W.charAt(0) &&
                      (null == (g = M.previousSibling) || g.remove(),
                      h(document.createElement("br"), e, M),
                      (W = W.slice(1))),
                    w || "" !== W)
                  )
                    if (" " === W)
                      e.insertBefore(document.createTextNode(" "), M);
                    else {
                      if (
                        (E && " " === W.charAt(0) && h(" ", e, M),
                        k && 1 === T && !z && C.indexOf(k.parentNode) > -1
                          ? (A = C[C.length - 1]).appendChild(
                              document.createTextNode(n ? "" : W),
                            )
                          : (h((A = r(n ? "" : W)), e, M),
                            k &&
                              1 === T &&
                              !z &&
                              A.insertBefore(k, A.firstChild)),
                        n)
                      )
                        for (
                          V = 0,
                            F = i
                              ? m(
                                  [...i.segment(W)].map((e) => e.segment),
                                  u,
                                )
                              : W.match(d) || o;
                          V < F.length;
                          V++
                        )
                          A.appendChild(
                            " " === F[V]
                              ? document.createTextNode(" ")
                              : n(F[V]),
                          );
                      if (s && f) {
                        if (
                          (($ = M.textContent =
                            $.substring(W.length + 1, $.length)),
                          (L = A.getBoundingClientRect()).top > N.top &&
                            L.left <= N.left)
                        ) {
                          for (
                            q = e.cloneNode(), D = e.childNodes[0];
                            D && D !== A;
                          )
                            (B = D), (D = D.nextSibling), q.appendChild(B);
                          e.parentNode.insertBefore(q, e), a && p(q);
                        }
                        N = L;
                      }
                      (T < O.length || I) &&
                        h(
                          T >= O.length
                            ? " "
                            : E && " " === W.slice(-1)
                              ? " " + R
                              : R,
                          e,
                          M,
                        );
                    }
                  else h(R, e, M);
                e.removeChild(M), (k = 0);
              } else
                1 === M.nodeType &&
                  (l && l.indexOf(M) > -1
                    ? (C.indexOf(M.previousSibling) > -1 &&
                        C[C.length - 1].appendChild(M),
                      (k = M))
                    : (v(M, t, r, n, a, s, l, d, u, !0), (k = 0)),
                  a && p(M));
          },
          b = class e {
            constructor(e, t) {
              (this.isSplit = !1),
                a(),
                (this.elements = l(e)),
                (this.chars = []),
                (this.words = []),
                (this.lines = []),
                (this.masks = []),
                (this.vars = t),
                (this._split = () => this.isSplit && this.split(this.vars));
              let r = [],
                n,
                i = () => {
                  let e = r.length,
                    t;
                  for (; e--; ) {
                    const n = (t = r[e]).element.offsetWidth;
                    if (n !== t.width) {
                      (t.width = n), this._split();
                      return;
                    }
                  }
                };
              (this._data = {
                orig: r,
                obs:
                  "undefined" != typeof ResizeObserver &&
                  new ResizeObserver(() => {
                    clearTimeout(n), (n = setTimeout(i, 200));
                  }),
              }),
                d(this),
                this.split(t);
            }
            split(e) {
              this.isSplit && this.revert(),
                (this.vars = e = e || this.vars || {});
              let {
                  type: t = "chars,words,lines",
                  aria: n = "auto",
                  deepSlice: a = !0,
                  smartWrap: i,
                  onSplit: o,
                  autoSplit: d = !1,
                  specialChars: c,
                  mask: m,
                } = this.vars,
                p = t.indexOf("lines") > -1,
                h = t.indexOf("chars") > -1,
                b = t.indexOf("words") > -1,
                y = h && !b && !p,
                w =
                  c &&
                  ("push" in c ? RegExp("(?:" + c.join("|") + ")", "gu") : c),
                j = w ? RegExp(w.source + "|" + u.source, "gu") : u,
                _ = !!e.ignore && l(e.ignore),
                { orig: N, animTime: S, obs: k } = this._data,
                C;
              return (
                (h || b || p) &&
                  (this.elements.forEach((t, r) => {
                    (N[r] = {
                      element: t,
                      html: t.innerHTML,
                      ariaL: t.getAttribute("aria-label"),
                      ariaH: t.getAttribute("aria-hidden"),
                    }),
                      "auto" === n
                        ? t.setAttribute(
                            "aria-label",
                            (t.textContent || "").trim(),
                          )
                        : "hidden" === n &&
                          t.setAttribute("aria-hidden", "true");
                    let l = [],
                      o = [],
                      d = [],
                      c = h ? g("char", e, l) : null,
                      u = g("word", e, o),
                      m,
                      S,
                      k,
                      C;
                    if ((v(t, e, u, c, y, a && (p || y), _, j, w, !1), p)) {
                      let r = s(t.childNodes),
                        n = x(t, r, e, d),
                        a,
                        i = [],
                        l = 0,
                        o = r.map((e) =>
                          1 === e.nodeType ? e.getBoundingClientRect() : f,
                        ),
                        c = f;
                      for (m = 0; m < r.length; m++)
                        1 === (a = r[m]).nodeType &&
                          ("BR" === a.nodeName
                            ? (i.push(a), n(l, m + 1), (c = o[(l = m + 1)]))
                            : (m &&
                                o[m].top > c.top &&
                                o[m].left <= c.left &&
                                (n(l, m), (l = m)),
                              (c = o[m])));
                      l < m && n(l, m),
                        i.forEach((e) => {
                          var t;
                          return null == (t = e.parentNode)
                            ? void 0
                            : t.removeChild(e);
                        });
                    }
                    if (!b) {
                      for (m = 0; m < o.length; m++)
                        if (
                          ((S = o[m]),
                          h || !S.nextSibling || 3 !== S.nextSibling.nodeType)
                        )
                          if (i && !p) {
                            for (
                              (k =
                                document.createElement(
                                  "span",
                                )).style.whiteSpace = "nowrap";
                              S.firstChild;
                            )
                              k.appendChild(S.firstChild);
                            S.replaceWith(k);
                          } else S.replaceWith(...S.childNodes);
                        else
                          (C = S.nextSibling) &&
                            3 === C.nodeType &&
                            ((C.textContent =
                              (S.textContent || "") + (C.textContent || "")),
                            S.remove());
                      (o.length = 0), t.normalize();
                    }
                    this.lines.push(...d),
                      this.words.push(...o),
                      this.chars.push(...l);
                  }),
                  m &&
                    this[m] &&
                    this.masks.push(
                      ...this[m].map((e) => {
                        const t = e.cloneNode();
                        return (
                          e.replaceWith(t),
                          t.appendChild(e),
                          e.className &&
                            (t.className = e.className.replace(
                              /(\b\w+\b)/g,
                              "$1-mask",
                            )),
                          (t.style.overflow = "clip"),
                          t
                        );
                      }),
                    )),
                (this.isSplit = !0),
                r &&
                  (d
                    ? r.addEventListener("loadingdone", this._split)
                    : "loading" === r.status &&
                      console.warn("SplitText called before fonts loaded")),
                (C = o && o(this)) &&
                  C.totalTime &&
                  (this._data.anim = S ? C.totalTime(S) : C),
                p &&
                  d &&
                  this.elements.forEach((e, t) => {
                    (N[t].width = e.offsetWidth), k && k.observe(e);
                  }),
                this
              );
            }
            revert() {
              var e, t;
              const { orig: n, anim: a, obs: i } = this._data;
              return (
                i && i.disconnect(),
                n.forEach(({ element: e, html: t, ariaL: r, ariaH: n }) => {
                  (e.innerHTML = t),
                    r
                      ? e.setAttribute("aria-label", r)
                      : e.removeAttribute("aria-label"),
                    n
                      ? e.setAttribute("aria-hidden", n)
                      : e.removeAttribute("aria-hidden");
                }),
                (this.chars.length =
                  this.words.length =
                  this.lines.length =
                  n.length =
                  this.masks.length =
                    0),
                (this.isSplit = !1),
                null == r || r.removeEventListener("loadingdone", this._split),
                a && ((this._data.animTime = a.totalTime()), a.revert()),
                null == (t = (e = this.vars).onRevert) || t.call(e, this),
                this
              );
            }
            static create(t, r) {
              return new e(t, r);
            }
            static register(e) {
              (t = t || e || window.gsap) &&
                ((s = t.utils.toArray), (d = t.core.context || d)),
                !n && window.innerWidth > 0 && ((r = document.fonts), (n = !0));
            }
          };
        b.version = "3.13.0";
        const y = b;
      }
    },
    81453: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({
        fallback: "split-text-module__McvV0q__fallback",
        splitText: "split-text-module__McvV0q__splitText",
        wrapper: "split-text-module__McvV0q__wrapper",
      });
    },
    36940: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ SplitText: () => u });
      var n = e.i(31636),
        a = e.i(85444),
        i = e.i(60566),
        s = e.i(17170),
        l = e.i(50748),
        o = e.i(4371),
        d = e.i(38653),
        c = e.i(81453);
      function u(e) {
        let t,
          r,
          s,
          u,
          m,
          p,
          h,
          g,
          x,
          v = (0, a.c)(21),
          { children: b, className: y, type: w, ref: j } = e,
          _ = void 0 === w ? "words" : w,
          N = (0, d.useRef)(null),
          S = (0, d.useRef)(null),
          [k, C] = (0, o.useResizeObserver)(),
          E = C?.contentRect,
          [R, P] = (0, d.useState)();
        return (
          v[0] !== R
            ? ((t = () => R), (r = [R]), (v[0] = R), (v[1] = t), (v[2] = r))
            : ((t = v[1]), (r = v[2])),
          (0, d.useImperativeHandle)(j, t, r),
          v[3] !== _
            ? ((s = () => {
                if (!N.current) return;
                !((e, t, r = t) => {
                  e.innerHTML = e.innerHTML.replace(
                    /(?!<[^>]+)-(?![^<]+>)/g,
                    r,
                  );
                })(S.current, "-", "‑"),
                  [
                    ...N.current.querySelectorAll("[data-ignore-split-text]"),
                  ].map(f);
                const e = new l.SplitText(N.current, {
                  tag: "span",
                  type: _,
                  linesClass: "line",
                  wordsClass: "word",
                  charsClass: "char",
                });
                return (
                  P(e),
                  () => {
                    e.revert(), P(void 0);
                  }
                );
              }),
              (v[3] = _),
              (v[4] = s))
            : (s = v[4]),
          v[5] !== E || v[6] !== _
            ? ((u = [E, _]), (v[5] = E), (v[6] = _), (v[7] = u))
            : (u = v[7]),
          (0, d.useEffect)(s, u),
          v[8] !== y
            ? ((m = (0, i.default)(c.default.wrapper, y)),
              (v[8] = y),
              (v[9] = m))
            : (m = v[9]),
          v[10] !== b
            ? ((p = (0, n.jsx)("span", {
                ref: N,
                className: c.default.splitText,
                "aria-hidden": !0,
                children: b,
              })),
              (v[10] = b),
              (v[11] = p))
            : (p = v[11]),
          v[12] !== k
            ? ((h = (e) => {
                e && (k(e), (S.current = e));
              }),
              (v[12] = k),
              (v[13] = h))
            : (h = v[13]),
          v[14] !== b || v[15] !== h
            ? ((g = (0, n.jsx)("span", {
                className: c.default.fallback,
                ref: h,
                children: b,
              })),
              (v[14] = b),
              (v[15] = h),
              (v[16] = g))
            : (g = v[16]),
          v[17] !== g || v[18] !== m || v[19] !== p
            ? ((x = (0, n.jsxs)("span", { className: m, children: [p, g] })),
              (v[17] = g),
              (v[18] = m),
              (v[19] = p),
              (v[20] = x))
            : (x = v[20]),
          x
        );
      }
      function f(e) {
        e.innerText = e.innerText.replaceAll(" ", "&nbsp;");
      }
      s.gsap.registerPlugin(l.SplitText);
    },
    6312: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({
        demo: "demo-module__HQHt2q__demo",
        row: "demo-module__HQHt2q__row",
        rowInner: "demo-module__HQHt2q__rowInner",
      });
    },
    92425: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ DemoDesktop: () => m });
        var n = e.i(31636),
          a = e.i(60566),
          i = e.i(4371),
          s = e.i(38653),
          l = e.i(48578),
          o = e.i(67376),
          d = e.i(36940),
          c = e.i(22477),
          u = e.i(47103),
          f = e.i(6312);
        const t = Array.from({ length: 7 }, (e, t) => ({
            id: t,
            src: `/images/rows/${t + 1}.png`,
            random: (0, u.mapRange)(0, 1, Math.random(), 0.75, 1),
          })),
          r = (0, s.forwardRef)(({ src: e }, t) => {
            const r = (0, s.useRef)(null),
              l = (0, s.useRef)(null),
              [d, c] = (0, i.useRect)();
            return (
              (0, s.useImperativeHandle)(
                t,
                () => ({ skeletonRef: l, rowRef: r, rect: c }),
                [c],
              ),
              (0, n.jsxs)("div", {
                className: f.default.row,
                ref: r,
                children: [
                  (0, n.jsx)("div", { className: "dr-h-47", ref: l }),
                  (0, n.jsx)("div", {
                    ref: (e) => {
                      d(e);
                    },
                    className: (0, a.default)(
                      "flex dr-gap-10 dr-p-11 items-center bg-secondary absolute top-0 left-0 right-0 dr-h-47",
                      f.default.rowInner,
                    ),
                    children: (0, n.jsx)(o.Image, {
                      src: e,
                      alt: "",
                      fill: !0,
                      desktopSize: "28vw",
                    }),
                  }),
                ],
              })
            );
          });
        function m() {
          const e = (0, s.useRef)([]),
            m = (0, s.useRef)(),
            p = (0, s.useRef)(),
            h = (0, s.useRef)(),
            [g, x] = (0, i.useRect)({}),
            v = (0, s.useRef)(),
            [b, y] = (0, i.useRect)();
          return (
            (0, c.useScrollTrigger)({
              rect: y,
              start: "top top",
              end: "bottom bottom",
              onProgress: ({ progress: r }) => {
                const n = (0, u.clamp)(0, (0, u.mapRange)(0, 0.25, r, 0, 1), 1),
                  a = (0, u.clamp)(0, (0, u.mapRange)(0.25, 0.5, r, 0, 1), 1),
                  i = (0, u.clamp)(0, (0, u.mapRange)(0.5, 0.6, r, 0, 1), 1),
                  s = (0, u.clamp)(0, (0, u.mapRange)(0.6, 1, r, 0, 1), 1),
                  l = e.current.slice(1, 5);
                l.forEach((e, r) => {
                  if (n > 0) {
                    const a = e.rect.height;
                    (e.skeletonRef.current.style.height = `${a * (1 - n)}px`),
                      (e.rowRef.current.style.transform = `translateX(${60 * n * t[r].random}vw) translateY(${5 * n * (r - 2)}vw) translateZ(0)`),
                      (e.rowRef.current.style.position = "relative"),
                      (e.rowRef.current.style.zIndex = 1);
                  } else
                    (e.rowRef.current.style.transform = "translateZ(0)"),
                      e.rowRef.current.style.removeProperty("position"),
                      e.rowRef.current.style.removeProperty("z-index");
                }),
                  0 === i
                    ? ((p.current.style.opacity = 0),
                      (h.current.style.opacity = 1))
                    : ((p.current.style.opacity = 1),
                      (h.current.style.opacity = 0)),
                  a > 0
                    ? (m.current.style.overflow = "clip")
                    : m.current.style.removeProperty("overflow"),
                  a > 0 && a < 1
                    ? (m.current.style.height = `${(0, u.mapRange)(0, 1, a, 3 * l[0].rect.height, l[0].rect.height)}px`)
                    : i > 0
                      ? (m.current.style.height = `${(0, u.mapRange)(0, 1, i, l[0].rect.height, x.height)}px`)
                      : m.current.style.removeProperty("height");
                const o = Math.floor(s * v.current?.chars?.length);
                v.current?.chars?.forEach((e, t) => {
                  (e.style.opacity = +(t < o)),
                    e.classList.toggle("active", t === o - 1);
                });
              },
            }),
            (0, n.jsx)("section", {
              className: (0, a.default)(
                f.default.demo,
                "overflow-clip desktop-only",
              ),
              ref: b,
              children: (0, n.jsxs)("div", {
                className: "dr-gap-110 flex justify-center",
                children: [
                  (0, n.jsxs)("div", {
                    className: "dr-w-386 shrink-0 flex flex-col",
                    children: [
                      (0, n.jsx)("div", {
                        className:
                          "w-full dr-h-2160 flex flex-col justify-between mb-[-50vh]",
                        children: (0, n.jsx)("div", {
                          className:
                            "h-[100vh] flex items-center justify-center sticky top-0 pointer-events-none",
                          children: (0, n.jsxs)("div", {
                            className: "pointer-events-auto",
                            children: [
                              (0, n.jsx)("h3", {
                                className: "h4-l dr-mb-8",
                                children: "Cora screens your email",
                              }),
                              (0, n.jsx)("p", {
                                className: "p-xxl dr-mb-25",
                                children:
                                  "Cora knows what’s important to you and the types of emails you need to respond to. It keeps those messages in your inbox for you to see ASAP.",
                              }),
                              (0, n.jsx)(l.Button, {
                                href: "https://cora.computer/users/sign_up",
                                label: "Start your free trial",
                              }),
                            ],
                          }),
                        }),
                      }),
                      (0, n.jsx)("div", {
                        className:
                          "w-full dr-h-2160 flex flex-col justify-between",
                        children: (0, n.jsx)("div", {
                          className:
                            "h-[100vh] flex items-center justify-center sticky top-0 pointer-events-none",
                          children: (0, n.jsxs)("div", {
                            className: "pointer-events-auto",
                            children: [
                              (0, n.jsx)("h3", {
                                className: "h4-l dr-mb-8",
                                children: "Cora drafts responses in your voice",
                              }),
                              (0, n.jsx)("p", {
                                className: "p-xxl dr-mb-25",
                                children:
                                  "Whenever Cora has enough context from your email history to draft a great response for you, it does.",
                              }),
                              (0, n.jsx)(l.Button, {
                                label: "Get Started",
                                href: "https://cora.computer/users/sign_up",
                              }),
                            ],
                          }),
                        }),
                      }),
                    ],
                  }),
                  (0, n.jsx)("div", {
                    className: "dr-w-644",
                    children: (0, n.jsx)("div", {
                      className:
                        "sticky top-0 h-[100vh] flex justify-center items-center",
                      children: (0, n.jsxs)("div", {
                        ref: m,
                        className:
                          " relative w-full bg-secondary dr-rounded-10 text-[#2B2B2B] font-switzer font-[600] dr-text-6 floating-container",
                        children: [
                          (0, n.jsx)("div", {
                            className: "flex flex-col",
                            ref: h,
                            children: t.map((t, a) =>
                              (0, n.jsx)(
                                r,
                                {
                                  ...t,
                                  ref: (t) => {
                                    e.current[a] = t;
                                  },
                                },
                                t.id,
                              ),
                            ),
                          }),
                          (0, n.jsxs)("div", {
                            className:
                              "absolute left-0 right-0 top-0 dr-px-20 dr-py-20 flex flex-col dr-gap-11",
                            ref: (e) => {
                              (p.current = e), g(e);
                            },
                            children: [
                              (0, n.jsxs)("div", {
                                className: "flex dr-gap-6 flex-col",
                                children: [
                                  (0, n.jsx)("h4", {
                                    className: "font-[500] dr-text-17",
                                    children:
                                      "Data-sharing agreement signature",
                                  }),
                                  (0, n.jsxs)("div", {
                                    className: "flex items-center dr-gap-7",
                                    children: [
                                      (0, n.jsx)("div", {
                                        className:
                                          "aspect-square dr-w-38 dr-h-38  dr-rounded-full rounded-full relative overflow-clip",
                                        children: (0, n.jsx)(o.Image, {
                                          src: "/images/doctor.png",
                                          alt: "",
                                          fill: !0,
                                        }),
                                      }),
                                      (0, n.jsxs)("div", {
                                        children: [
                                          (0, n.jsx)("h5", {
                                            className: "font-[600] dr-text-16",
                                            children: "Dr. Lila Mensah",
                                          }),
                                          (0, n.jsx)("span", {
                                            className: "font-[400] dr-text-16",
                                            children:
                                              "lila.mensah@medinsight.ai",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              (0, n.jsx)("p", {
                                className: "dr-text-16 font-[400]",
                                children:
                                  "Legal finalized the DSA in DocuSign. Could you review the privacy clauses and sign so we stay on track for the 5/20 data pull? Let me know if anything looks off.",
                              }),
                              (0, n.jsx)("div", {
                                className:
                                  "subtle-shadow dr-rounded-bl-6 dr-rounded-br-6 overflow-clip",
                                children: (0, n.jsxs)("div", {
                                  className:
                                    "dr-h-458 flex flex-col dr-text-17",
                                  children: [
                                    (0, n.jsx)("div", {
                                      className:
                                        "dr-py-11 dr-px-16 bg-[#F2F6FC] text-[#CF372D]",
                                      children: "Cora Draft",
                                    }),
                                    (0, n.jsxs)("div", {
                                      className:
                                        "dr-px-16 dr-pb-13 grow flex flex-col justify-between",
                                      children: [
                                        (0, n.jsxs)("div", {
                                          children: [
                                            (0, n.jsx)("div", {
                                              className:
                                                "dr-h-40 flex items-center border-b border-b-solid border-[#DADADA] font-[600]",
                                              children:
                                                "From: Samira <samira@insightpeak.co>",
                                            }),
                                            (0, n.jsx)("div", {
                                              className:
                                                "dr-h-40 flex items-center border-b border-b-solid border-[#DADADA]  font-[600]",
                                              children:
                                                "To: Naveen <naveen@monologue.to>",
                                            }),
                                            (0, n.jsx)("div", {
                                              className:
                                                "dr-h-40 flex items-center font-[600] dr-mb-24",
                                              children:
                                                "Re: Monologue Proposal–let’s sign",
                                            }),
                                            (0, n.jsxs)("div", {
                                              children: [
                                                (0, n.jsxs)(d.SplitText, {
                                                  type: "chars, words",
                                                  className: "font-[500]",
                                                  ref: v,
                                                  children: [
                                                    "Loved the deck and the way Monologue personalizes your responses. Spells! What a great name. We’re excited to move forward and would like to hash out next steps on a quick call tomorrow at 11am ET—does that work for you? Let me know and I’ll send a calendar invite.",
                                                    (0, n.jsx)("br", {}),
                                                    (0, n.jsx)("br", {}),
                                                    (0, n.jsx)("span", {
                                                      className: "font-[600]",
                                                      children: "Best,",
                                                    }),
                                                    (0, n.jsx)("br", {}),
                                                    (0, n.jsx)("span", {
                                                      className: "font-[600]",
                                                      children: "Samira",
                                                    }),
                                                  ],
                                                }),
                                                (0, n.jsx)("br", {}),
                                              ],
                                            }),
                                          ],
                                        }),
                                        (0, n.jsxs)("div", {
                                          className:
                                            "dr-h-36 dr-rounded-18 bg-[#0B57D0] self-start text-[#fff] flex",
                                          children: [
                                            (0, n.jsx)("div", {
                                              className:
                                                "flex items-center h-full dr-px-20 border-r border-r-solid border-r-[#062E6F] dr-text-17 font-[500]",
                                              children: "Send",
                                            }),
                                            (0, n.jsx)("div", {
                                              className:
                                                "flex items-center h-full dr-pl-10 dr-pr-14 dr-text-17 font-[500]",
                                              children: "▼",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              }),
                            ],
                          }),
                        ],
                      }),
                    }),
                  }),
                ],
              }),
            })
          );
        }
      }
    },
    60106: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ DemoMobile: () => p });
        var n = e.i(31636),
          a = e.i(60566),
          i = e.i(4371),
          s = e.i(38653),
          l = e.i(48578),
          o = e.i(67376),
          d = e.i(36940),
          c = e.i(22477),
          u = e.i(47103),
          f = e.i(6312);
        const t = Array.from({ length: 7 }, (e, t) => ({
          id: t,
          src: `/images/rows-mobile/${t + 1}.png`,
          random: (0, u.mapRange)(0, 1, Math.random(), 0.75, 1),
        }));
        function m({ src: e, ref: t }) {
          const r = (0, s.useRef)(null),
            l = (0, s.useRef)(null),
            [d, c] = (0, i.useRect)();
          return (
            (0, s.useImperativeHandle)(
              t,
              () => ({ skeletonRef: l, rowRef: r, rect: c }),
              [c],
            ),
            (0, n.jsxs)("div", {
              className: f.default.row,
              ref: r,
              children: [
                (0, n.jsx)("div", { className: "dr-h-66", ref: l }),
                (0, n.jsx)("div", {
                  ref: (e) => {
                    d(e);
                  },
                  className: (0, a.default)(
                    "flex dr-gap-10 dr-p-11 items-center bg-secondary absolute top-0 left-0 right-0 dr-h-66",
                    f.default.rowInner,
                  ),
                  children: (0, n.jsx)(o.Image, {
                    src: e,
                    alt: "",
                    fill: !0,
                    mobileSize: "100vw",
                  }),
                }),
              ],
            })
          );
        }
        function p() {
          const e = (0, s.useRef)([]),
            r = (0, s.useRef)();
          (0, s.useRef)();
          const u = (0, s.useRef)(),
            [p, h] = (0, i.useRect)({}),
            g = (0, s.useRef)(),
            [x, v] = (0, i.useRect)(),
            [b, y] = (0, i.useRect)();
          return (
            (0, c.useScrollTrigger)({
              rect: v,
              start: "top top",
              end: "bottom bottom",
              onProgress: ({ progress: r }) => {
                e.current.slice(1, 5).forEach((e, n) => {
                  if (r > 0) {
                    const a = e.rect.height;
                    (e.skeletonRef.current.style.height = `${a * (1 - r)}px`),
                      (e.rowRef.current.style.transform = `translateX(${125 * r * t[n].random}vw) translateY(${5 * r * (n - 2)}vw) translateZ(0)`),
                      (e.rowRef.current.style.position = "relative"),
                      (e.rowRef.current.style.zIndex = 1);
                  } else
                    (e.rowRef.current.style.transform = "translateZ(0)"),
                      e.rowRef.current.style.removeProperty("position"),
                      e.rowRef.current.style.removeProperty("z-index");
                });
              },
            }),
            (0, c.useScrollTrigger)({
              rect: y,
              start: "top top",
              end: "bottom bottom",
              onProgress: ({ progress: e }) => {
                const t = Math.floor(e * g.current?.chars?.length);
                g.current?.elements?.map((t) => {
                  t.style.opacity = +(e > 0);
                }),
                  g.current?.chars?.forEach((e, r) => {
                    (e.style.opacity = +(r < t)),
                      e.classList.toggle("active", r === t - 1);
                  });
              },
            }),
            (0, n.jsx)("section", {
              className: (0, a.default)(
                f.default.demo,
                "mobile-only  overflow-clip",
              ),
              children: (0, n.jsxs)("div", {
                className: "flex flex-col justify-between dr-w-357 mx-auto",
                children: [
                  (0, n.jsx)("div", {
                    className: "flex items-center justify-center dr-px-20",
                    children: (0, n.jsxs)("div", {
                      children: [
                        (0, n.jsx)("h3", {
                          className: "h4 dr-mb-8",
                          children: "Cora screens your email",
                        }),
                        (0, n.jsx)("p", {
                          className: "p dr-mb-25",
                          children:
                            "Cora knows what’s important to you and the types of emails you need to respond to. It keeps those messages in your inbox for you to see ASAP.",
                        }),
                        (0, n.jsx)(l.Button, {
                          href: "https://cora.computer/users/sign_up",
                          label: "Start your free trial",
                        }),
                      ],
                    }),
                  }),
                  (0, n.jsx)("div", {
                    className: "h-[1200px]",
                    ref: x,
                    children: (0, n.jsx)("div", {
                      className:
                        "sticky top-0 h-[100svh] flex justify-center items-center",
                      children: (0, n.jsx)("div", {
                        ref: r,
                        className:
                          "relative w-full bg-secondary dr-rounded-10 text-[#2B2B2B] font-switzer font-[600] dr-text-6 floating-container",
                        children: (0, n.jsx)("div", {
                          className: "flex flex-col",
                          ref: u,
                          children: t.map((t, r) =>
                            (0, n.jsx)(
                              m,
                              {
                                ...t,
                                ref: (t) => {
                                  e.current[r] = t;
                                },
                              },
                              t.id,
                            ),
                          ),
                        }),
                      }),
                    }),
                  }),
                  (0, n.jsx)("div", {
                    className: "flex items-center justify-center dr-px-20",
                    children: (0, n.jsxs)("div", {
                      children: [
                        (0, n.jsx)("h3", {
                          className: "h4 dr-mb-8",
                          children: "Cora drafts responses in your voice",
                        }),
                        (0, n.jsx)("p", {
                          className: "p dr-mb-25",
                          children:
                            "Whenever Cora has enough context from your email history to draft a great response for you, it does.",
                        }),
                        (0, n.jsx)(l.Button, {
                          href: "https://cora.computer/users/sign_up",
                          label: "Get Started",
                        }),
                      ],
                    }),
                  }),
                  (0, n.jsx)("div", {
                    className: "h-[1200px]",
                    ref: b,
                    children: (0, n.jsx)("div", {
                      className:
                        "sticky top-0 h-[100svh] flex justify-center items-center",
                      children: (0, n.jsxs)("div", {
                        className:
                          "relative w-full bg-secondary dr-rounded-10 text-[#2B2B2B] font-switzer font-[600] dr-text-6 floating-container dr-px-10 dr-py-10 flex flex-col dr-gap-10",
                        children: [
                          (0, n.jsxs)("div", {
                            className: "flex dr-gap-3 flex-col",
                            children: [
                              (0, n.jsx)("h4", {
                                className: "font-[500] dr-text-10",
                                children: "Data-sharing agreement signature",
                              }),
                              (0, n.jsxs)("div", {
                                className: "flex items-center dr-gap-4",
                                children: [
                                  (0, n.jsx)("div", {
                                    className:
                                      "aspect-square dr-w-23 bg-primary dr-rounded-full rounded-full relative overflow-clip",
                                    children: (0, n.jsx)(o.Image, {
                                      src: "/images/doctor.png",
                                      alt: "",
                                      fill: !0,
                                    }),
                                  }),
                                  (0, n.jsxs)("div", {
                                    children: [
                                      (0, n.jsx)("h5", {
                                        className: "font-[600] dr-text-9",
                                        children: "Dr. Lila Mensah",
                                      }),
                                      (0, n.jsx)("span", {
                                        className: "font-[400] dr-text-9",
                                        children: "lila.mensah@medinsight.ai",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                          (0, n.jsx)("p", {
                            className: "dr-text-9 font-[500]",
                            children:
                              "Legal finalized the DSA in DocuSign. Could you review the privacy clauses and sign so we stay on track for the 5/20 data pull? Let me know if anything looks off.",
                          }),
                          (0, n.jsx)("div", {
                            className:
                              "subtle-shadow dr-rounded-bl-6 dr-rounded-br-6 overflow-clip",
                            children: (0, n.jsxs)("div", {
                              className: "dr-h-259 flex flex-col dr-text-10",
                              children: [
                                (0, n.jsx)("div", {
                                  className:
                                    "dr-py-6 dr-px-8 bg-[#F2F6FC] text-[#CF372D]",
                                  children: "Cora Draft",
                                }),
                                (0, n.jsxs)("div", {
                                  className:
                                    "dr-px-8 dr-pb-8 grow flex flex-col justify-between",
                                  children: [
                                    (0, n.jsxs)("div", {
                                      children: [
                                        (0, n.jsx)("div", {
                                          className:
                                            "dr-h-22 flex items-center border-b border-b-solid border-[#DADADA] font-[600]",
                                          children:
                                            "From: Samira <samira@insightpeak.co>",
                                        }),
                                        (0, n.jsx)("div", {
                                          className:
                                            "dr-h-22 flex items-center border-b border-b-solid border-[#DADADA]  font-[600]",
                                          children:
                                            "To: Naveen <naveen@monologue.to>",
                                        }),
                                        (0, n.jsx)("div", {
                                          className:
                                            "dr-h-22 flex items-center font-[600] dr-mb-12",
                                          children:
                                            "Re: Monologue Proposal–let’s sign",
                                        }),
                                        (0, n.jsxs)("div", {
                                          children: [
                                            (0, n.jsxs)(d.SplitText, {
                                              type: "chars, words",
                                              className: "font-[500]",
                                              ref: g,
                                              children: [
                                                "Loved the deck and the way Monologue personalizes your responses. Spells! What a great name. We’re excited to move forward and would like to hash out next steps on a quick call tomorrow at 11am ET—does that work for you? Let me know and I’ll send a calendar invite.",
                                                (0, n.jsx)("br", {}),
                                                (0, n.jsx)("br", {}),
                                                (0, n.jsx)("span", {
                                                  className: "font-[600]",
                                                  children: "Best,",
                                                }),
                                                (0, n.jsx)("br", {}),
                                                (0, n.jsx)("span", {
                                                  className: "font-[600]",
                                                  children: "Samira",
                                                }),
                                              ],
                                            }),
                                            (0, n.jsx)("br", {}),
                                          ],
                                        }),
                                      ],
                                    }),
                                    (0, n.jsxs)("div", {
                                      className:
                                        "dr-h-20 dr-rounded-10 bg-[#0B57D0] self-start text-[#fff] flex",
                                      children: [
                                        (0, n.jsx)("div", {
                                          className:
                                            "flex items-center h-full dr-px-10 border-r border-r-solid border-r-[#062E6F] dr-text-10",
                                          children: "Send",
                                        }),
                                        (0, n.jsx)("div", {
                                          className:
                                            "flex items-center h-full dr-pl-5 dr-pr-7 dr-text-5",
                                          children: "▼",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          }),
                        ],
                      }),
                    }),
                  }),
                ],
              }),
            })
          );
        }
      }
    },
    65567: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ default: () => t });
        var n,
          a = e.i(38653);
        function i() {
          return (i = Object.assign.bind()).apply(null, arguments);
        }
        const t = (0, a.memo)((e) =>
          (0, a.createElement)(
            "svg",
            i(
              {
                viewBox: "0 0 36 27",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
              },
              e,
            ),
            n ||
              (n = (0, a.createElement)("path", {
                d: "M30.2.5h1.2l.2.1.1.4.2.1q.5.7 1 .6h.2q.6-.1 1-1V.5h1.7v1.6h-.2q-.4 0-.3.1H35q.2 0 0 0l-.4.4q-.6.5-.2 1.3 0 .4.6.6.1 0 0 0l.4.2h.3v1.7h-.6l-.2.1-.6.7V8l.6.6h.2q0 .2.4.2h.2v1.4h-.6l-.2.2-.6.6-.1.5v.4l.2.3.5.4h.1l.5.1h.2v1.7h-.2l-.5.1-.1.1-.6.6-.1.5v.5l.7.6h.1l.5.2h.2v1.3h-.6l-.2.1q-.4.3-.6.7l-.1.4v.5l.7.6.2.1h.6v1.8H35l-.1.2q-.4.2-.6.6t0 .8q0 .5.6.8h.1l.5.1h.2v1.4H34v-.2q-.2-.7-.7-1h-.5q-.6-.1-1 .5l-.2.3-.1.3H30v-.1l-.5-.8-.2-.2h-.9l-.6.6-.2.2-.1.3h-1.7l-.3-.6-.5-.4h-.2.1-.7l-.7.6h-.1v.3l-.1.2h-1.8v-.2l-.4-.7-.3-.2-.1-.1q-.2 0 0 0H20q-.4.1-.7.6l-.2.1v.3l-.1.2h-1.7v-.2l-.1-.6-.5-.6h-.3.2-.2q-.6-.1-1 .3l-.3.4-.2.2v.5h-1.4v-.2l-.4-.7q-.2-.3-.4-.3-.1 0 0 0h-.8l-.6.6-.2.2v.2l-.1.2H9.4v-.2q-.2-.6-.6-1h-.5q-.6-.1-1 .5L7 26v.3H5.2l-.4-.7-.3-.2H4q-.4 0-.8.3l-.3.3v.2l-.2.3h-2V25H1q.6-.3.9-.8v-.9q-.4-.6-1-.8v-1.7l.1-.1q.6-.2.9-.7v-1q-.4-.5-1-.7v-1.4q.7-.2 1-.7v-1q-.3-.5-.9-.7H.8v-1.8H1q.6-.3.9-.8V11q-.3-.5-.9-.7l-.2-.1V8.7H1l.8-.4c.7-.7.3-1.7-.7-2H.8V4.4H1q.7-.1 1-.7.1-.8-.3-1.4L1 2.1H.8V.4h1.9v.3l.1.1.2.2.5.4h1q.4-.3.6-.9H7V1l.3.2q.4.5.8.5h.5l.5-.5.2-.4V.5H11v.2l.1.2h.1l.7.7.5.1h.4l.3-.3q.3-.3.4-.7V.5H15l.2.1V1l.3.1q.4.7 1 .6h.5l.5-.6.1-.5h1.5l.1.3.2.2q.5.7 1.1.6h.3l.4-.3.4-.7V.5h1.5l.2.1q0 .4.2.4h.1l.6.6.5.1h.3l.2-.1q.4-.3.6-.9V.5h1.5v.2l.2.2.2.2q.5.7 1 .6h.4l.4-.3.3-.7V.5zm-5.6 13.1a1 1 0 0 0-1.5.7 5.4 5.4 0 0 1-9.4 1.2 1.1 1.1 0 1 0-1.8 1.4A7.7 7.7 0 0 0 25.2 15a1 1 0 0 0-.6-1.5M12.6 8a1.7 1.7 0 1 0-.2 3.5 1.7 1.7 0 0 0 .2-3.5m10-1.3a1.7 1.7 0 1 0 .4 3.4 1.7 1.7 0 0 0-.5-3.4m-14-5.2q-.2 0 0 0",
                fill: "#FAFAF9",
              })),
          ),
        );
      }
    },
    8816: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ Features: () => u });
        var n = e.i(31636),
          a = e.i(85444),
          i = e.i(60566),
          s = e.i(38653),
          l = e.i(48578),
          o = e.i(67376),
          d = e.i(65567);
        const t = [
          {
            _uid: "6f5e2c02-bdf3-4c0a-915b-41dcb7fd7bb8",
            media: [
              { filename: "/images/card-1.webp", alt: "Only for CEOs" },
              { filename: "/images/card-2.webp", alt: "Only for designers" },
              { filename: "/images/card-3.webp", alt: "Only for designers" },
            ],
            title: "Cora gets to know you, automatically",
            body: "Cora reads your email patterns to discover who you are—your work, your style, and your priorities.",
          },
          {
            _uid: "f2d0c6e0-2e58-4f69-9c0b-d9b0e91a49b3",
            media: { filename: "/videos/demo.mp4", alt: "Only for designers" },
            title: "Shape Cora through conversation",
            body: "Talk to Cora like your chief of staff over chat or email. Explain how you want emails filed and situations handled. It remembers everything that matters.",
          },
        ];
        function c(e) {
          let t,
            r,
            i,
            l,
            d,
            c = (0, a.c)(11),
            { media: u } = e;
          c[0] !== u
            ? ((t = void 0 === u ? [] : u), (c[0] = u), (c[1] = t))
            : (t = c[1]);
          const f = t,
            [m, p] = (0, s.useState)(0);
          c[2] !== f?.length
            ? ((r = () => {
                const e = setInterval(() => {
                  p((e) => (e + 1) % f?.length);
                }, 1e3);
                return () => clearInterval(e);
              }),
              (c[2] = f?.length),
              (c[3] = r))
            : (r = c[3]);
          const h = f?.length;
          return (
            c[4] !== h ? ((i = [h]), (c[4] = h), (c[5] = i)) : (i = c[5]),
            (0, s.useEffect)(r, i),
            c[6] !== m || c[7] !== f
              ? ((l = f?.map((e, t) =>
                  (0, n.jsx)(
                    o.Image,
                    {
                      src: e?.filename,
                      alt: e?.alt,
                      fill: !0,
                      style: { opacity: +(m === t) },
                    },
                    e?.filename,
                  ),
                )),
                (c[6] = m),
                (c[7] = f),
                (c[8] = l))
              : (l = c[8]),
            c[9] !== l
              ? ((d = (0, n.jsx)("div", {
                  className: "relative w-full h-full",
                  children: l,
                })),
                (c[9] = l),
                (c[10] = d))
              : (d = c[10]),
            d
          );
        }
        function u(e) {
          let r,
            s,
            o,
            c,
            u,
            m = (0, a.c)(7),
            { className: p } = e;
          return (
            m[0] !== p
              ? ((r = (0, i.default)(
                  "relative flex dr-gap-24 flex-col items-center justify-center dr-mt-108",
                  p,
                )),
                (m[0] = p),
                (m[1] = r))
              : (r = m[1]),
            m[2] === Symbol.for("react.memo_cache_sentinel")
              ? ((s = (0, n.jsxs)("div", {
                  className: "dr-px-40 dt:dr-px-0",
                  children: [
                    (0, n.jsx)(d.default, {
                      className: "dr-w-42 dt:dr-w-35 flex mx-auto",
                    }),
                    (0, n.jsx)("h2", {
                      className: "h3 text-center",
                      children: "Cora learns you inside and out",
                    }),
                  ],
                })),
                (m[2] = s))
              : (s = m[2]),
            m[3] === Symbol.for("react.memo_cache_sentinel")
              ? ((o = (0, n.jsx)("ul", {
                  className:
                    "dr-w-357 dt:dr-w-678 flex flex-col dt:flex-row dr-gap-16",
                  children: t?.map(f),
                })),
                (c = (0, n.jsx)(l.Button, {
                  label: "Get Started",
                  className: "desktop-only",
                  href: "https://cora.computer/users/sign_up",
                })),
                (m[3] = o),
                (m[4] = c))
              : ((o = m[3]), (c = m[4])),
            m[5] !== r
              ? ((u = (0, n.jsxs)("section", {
                  className: r,
                  children: [s, o, c],
                })),
                (m[5] = r),
                (m[6] = u))
              : (u = m[6]),
            u
          );
        }
        function f(e) {
          return (0, n.jsxs)(
            "li",
            {
              className:
                "bg-white dt:dr-w-331 dr-p-8 dr-pb-20 flex flex-col dr-gap-20 dr-rounded-24",
              children: [
                (0, n.jsxs)("picture", {
                  className:
                    "relative dr-w-337 dt:dr-w-315 dr-h-360 dt:dr-h-337 overflow-hidden dr-rounded-16",
                  children: [
                    e?.media?.filename?.includes(".mp4") &&
                      (0, n.jsx)("video", {
                        src: e?.media?.filename,
                        autoPlay: !0,
                        muted: !0,
                        loop: !0,
                        className: "w-full h-full object-cover",
                      }),
                    e?.media?.length > 0 && (0, n.jsx)(c, { media: e?.media }),
                  ],
                }),
                (0, n.jsxs)("div", {
                  className:
                    "dr-px-20 dt:dr-px-0 dt:dr-w-271 mx-auto flex flex-col dr-gap-8",
                  children: [
                    (0, n.jsx)("p", {
                      className: "p-xl text-[#1D1B20]",
                      children: e?.title,
                    }),
                    (0, n.jsx)("p", {
                      className: "p text-[#A1A1A1]",
                      children: e?.body,
                    }),
                  ],
                }),
              ],
            },
            e?._uid,
          );
        }
      }
    },
    77576: (e) => {
      var { g: t, __dirname: r } = e;
      e.v({ sequence: "frame-sequence-module__X5Gf_W__sequence" });
    },
    84278: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({ FrameSequence: () => d });
      var n = e.i(31636),
        a = e.i(60566),
        i = e.i(38653),
        s = e.i(67376),
        l = e.i(47103),
        o = e.i(77576);
      function d({ frames: e = [], className: t, priority: r, ref: d }) {
        const c = (0, i.useRef)([]),
          u = (0, i.useRef)(0),
          f = (0, i.useCallback)((e) => {
            const t = c.current;
            (u.current = e),
              t.forEach((t, r) => {
                r === e
                  ? (t.style.visibility = "visible")
                  : (t.style.visibility = "hidden");
              });
          }, []),
          m = (0, i.useCallback)(
            (t, r = 0, n = e.length - 1) => {
              f(Math.floor((0, l.mapRange)(0, 1, t, r, n)));
            },
            [f, e],
          ),
          p = (0, i.useCallback)(
            ({ loop: t = !0 } = {}) => {
              let r = u.current + 1;
              r > e.length - 1 && (r = t?.start || 0), f(r);
            },
            [f, e],
          ),
          h = (0, i.useRef)();
        return (
          (0, i.useImperativeHandle)(
            d,
            () => ({
              frame: f,
              setProgress: m,
              getCurrentFrameIndex: () => u.current,
              getNode: () => h.current,
              next: p,
            }),
            [f, m, p],
          ),
          (0, n.jsx)("div", {
            className: (0, a.default)(o.default.sequence, t),
            ref: h,
            children: e.map((e, t) =>
              (0, n.jsx)(
                s.Image,
                {
                  ref: (e) => {
                    c.current[t] = e;
                  },
                  unoptimized: !0,
                  src: e,
                  alt: "",
                  loading: r ? "eager" : "lazy",
                  style: { visibility: 0 === t ? "visible" : "hidden" },
                  priority: r,
                },
                e,
              ),
            ),
          })
        );
      }
    },
    48823: (e) => {
      var { g: t, __dirname: r } = e;
      function n(e) {
        return 1 === e ? 1 : 1 - 2 ** (-10 * e);
      }
      function a(e) {
        return 0 === e ? 0 : 2 ** (10 * e - 10);
      }
      function i(e) {
        return 1 - (1 - e) ** 4;
      }
      function s(e) {
        return 1 - (1 - e) * (1 - e);
      }
      function l(e) {
        return e < 0.5 ? 8 * e * e * e * e : 1 - (-2 * e + 2) ** 4 / 2;
      }
      e.s({
        easeInExpo: () => a,
        easeInOutQuart: () => l,
        easeOutExpo: () => n,
        easeOutQuad: () => s,
        easeOutQuart: () => i,
      });
    },
    7330: (e) => {
      var { g: t, __dirname: r } = e;
      e.s({
        arraytoObject: () => m,
        capitalizeFirstLetter: () => d,
        checkIsArray: () => l,
        convertToCamelCase: () => o,
        desktopVW: () => a,
        filterObjectKeys: () => h,
        isEmptyArray: () => f,
        isEmptyObject: () => u,
        iterableObject: () => g,
        mergeRefs: () => v,
        mobileVW: () => i,
        numberWithCommas: () => c,
        shortenObjectKeys: () => p,
        slugify: () => x,
        twoDigits: () => s,
      }),
        e.i(7442);
      var n = e.i(51602);
      function a(e, t) {
        return (e * t) / n.screens.desktop.width;
      }
      function i(e, t) {
        return (e * t) / n.screens.mobile.width;
      }
      function s(e) {
        return e > 9 ? `${e}` : `0${e}`;
      }
      function l(e) {
        return Array.isArray(e) ? e[0] : e;
      }
      function o(e) {
        return e.charAt(0).toLowerCase() + e.slice(1);
      }
      function d(e) {
        return e.charAt(0).toUpperCase() + e.slice(1);
      }
      function c(e) {
        return e.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
      function u(e) {
        return !e || 0 === Object.keys(e).length;
      }
      function f(e) {
        return !e || (Array.isArray(e) && 0 === e.length);
      }
      function m(e) {
        return e.reduce((e, t) => {
          const r = Object.keys(t)[0];
          return (e[r] = t[r]), e;
        }, {});
      }
      function p(e, t) {
        const r = RegExp(`[^]+${t}(.*)`);
        for (const t in e) {
          const n = t.match(r);
          n && ((e[o(n[1])] = e[t]), delete e[t]);
        }
        return e;
      }
      function h(e, t) {
        const r = {};
        for (const n in e) n.includes(t) && (r[n] = e[n]);
        return r;
      }
      function g(e) {
        return Object.entries(e).map(([, e]) => e);
      }
      function x(e) {
        return e
          .toString()
          .normalize("NFKD")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "")
          .replace(/--+/g, "-");
      }
      function v(...e) {
        return (t) => {
          const r = e.reduce((e, r) => {
            if ("function" == typeof r) {
              const n = r(t);
              "function" == typeof n && e.push(n);
            } else r && (r.current = t);
            return e;
          }, []);
          return () => {
            for (const e of r) e();
          };
        };
      }
    },
    27358: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ default: () => t });
        var n,
          a = e.i(38653);
        function i() {
          return (i = Object.assign.bind()).apply(null, arguments);
        }
        const t = (0, a.memo)((e) =>
          (0, a.createElement)(
            "svg",
            i(
              {
                viewBox: "0 0 8 5",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
              },
              e,
            ),
            n ||
              (n = (0, a.createElement)("path", {
                fillRule: "evenodd",
                clipRule: "evenodd",
                d: "M4.5 4.8h-.7L.6 1.7V1L1 .7l.4.2 2.8 2.7L6.9 1a.5.5 0 0 1 1 .4l-.2.4z",
                fill: "#F5F5F4",
              })),
          ),
        );
      }
    },
    78018: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ default: () => t });
        var n,
          a = e.i(38653);
        function i() {
          return (i = Object.assign.bind()).apply(null, arguments);
        }
        const t = (0, a.memo)((e) =>
          (0, a.createElement)(
            "svg",
            i(
              {
                viewBox: "0 0 7 8",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
              },
              e,
            ),
            n ||
              (n = (0, a.createElement)("path", {
                d: "M4 .6q-1 0-1.7.4t-1 1.3a4 4 0 0 0 .1 3.4q.4.7 1.2 1a3 3 0 0 0 3.1-.2q.7-.6 1-1.4.1-.5-.4-.4-.7.3-1.3 0a2 2 0 0 1-1-.9 2 2 0 0 1 .3-2.6Q4.5.6 4 .5z",
                fill: "#FAFAF9",
              })),
          ),
        );
      }
    },
    28996: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ default: () => t });
        var n,
          a,
          i = e.i(38653);
        function s() {
          return (s = Object.assign.bind()).apply(null, arguments);
        }
        const t = (0, i.memo)((e) =>
          (0, i.createElement)(
            "svg",
            s(
              {
                viewBox: "0 0 11 12",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
              },
              e,
            ),
            n ||
              (n = (0, i.createElement)("path", {
                d: "M8 5.8a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0",
                fill: "#FAFAF9",
              })),
            a ||
              (a = (0, i.createElement)("path", {
                fillRule: "evenodd",
                clipRule: "evenodd",
                d: "M5.4 1.2a.3.3 0 0 1 .4.3V2A.3.3 0 1 1 5 2v-.4zM2.1 2.5a.3.3 0 0 1 .5 0l.2.2a.3.3 0 0 1-.5.5L2.1 3a.3.3 0 0 1 0-.5m6.6 0a.3.3 0 0 1 0 .5l-.1.2a.3.3 0 0 1-.5-.5l.2-.2zm-8 3.3a.3.3 0 0 1 .4-.3h.4a.3.3 0 1 1 0 .7h-.4a.3.3 0 0 1-.3-.4m8.3 0 .3-.3h.5a.3.3 0 1 1 0 .7h-.5a.3.3 0 0 1-.3-.4m-.9 2.7a.3.3 0 0 1 .5 0l.1.2a.3.3 0 1 1-.4.4L8 9a.3.3 0 0 1 0-.5m-5.3 0a.3.3 0 0 1 0 .5l-.2.1a.3.3 0 1 1-.5-.4l.2-.2a.3.3 0 0 1 .5 0m2.6 1a.3.3 0 0 1 .4.3v.4a.3.3 0 1 1-.7 0v-.4a.3.3 0 0 1 .3-.4",
                fill: "#FAFAF9",
              })),
          ),
        );
      }
    },
    66711: (e) => {
      var { g: t, __dirname: r } = e;
      {
        e.s({ Recap: () => y });
        var n = e.i(31636),
          a = e.i(85444),
          i = e.i(4371),
          s = e.i(38653),
          l = e.i(48578),
          o = e.i(84278),
          d = e.i(67376),
          c = e.i(40886),
          u = e.i(22477),
          f = e.i(48823),
          m = e.i(47103),
          p = e.i(7330),
          h = e.i(51602),
          g = e.i(27358),
          x = e.i(78018),
          v = e.i(28996);
        const t = [
          {
            id: 1,
            title: "Potluck: your legendary jerk-chicken?",
            from: "Noah Chen",
            to: "noahc.chef@gmail.com",
            body: "We’ve got three new meeting recordings that need trimming and tagging before the pipeline run. Can you upload them to the “Pilot V2” folder and kick off processing by end of day? Marketing wants teaser clips by Friday.",
            src: "/images/emails/1.png",
            random: (Math.random() - 0.5) * 2,
            random2: (Math.random() - 0.5) * 2,
            random3: (Math.random() - 0.5) * 2,
            random4: (Math.random() - 0.5) * 2,
          },
          {
            id: 2,
            title: "Potluck: your legendary jerk-chicken?",
            from: "Noah Chen",
            to: "noahc.chef@gmail.com",
            body: "We’ve got three new meeting recordings that need trimming and tagging before the pipeline run. Can you upload them to the “Pilot V2” folder and kick off processing by end of day? Marketing wants teaser clips by Friday.",
            src: "/images/emails/2.png",
            random: (Math.random() - 0.5) * 2,
            random2: (Math.random() - 0.5) * 2,
            random3: (Math.random() - 0.5) * 2,
            random4: (Math.random() - 0.5) * 2,
          },
          {
            id: 3,
            title: "Potluck: your legendary jerk-chicken?",
            from: "Noah Chen",
            to: "noahc.chef@gmail.com",
            body: "We’ve got three new meeting recordings that need trimming and tagging before the pipeline run. Can you upload them to the “Pilot V2” folder and kick off processing by end of day? Marketing wants teaser clips by Friday.",
            src: "/images/emails/3.png",
            random: (Math.random() - 0.5) * 2,
            random2: (Math.random() - 0.5) * 2,
            random3: (Math.random() - 0.5) * 2,
            random4: (Math.random() - 0.5) * 2,
          },
          {
            id: 4,
            title: "Potluck: your legendary jerk-chicken?",
            from: "Noah Chen",
            to: "noahc.chef@gmail.com",
            body: "We’ve got three new meeting recordings that need trimming and tagging before the pipeline run. Can you upload them to the “Pilot V2” folder and kick off processing by end of day? Marketing wants teaser clips by Friday.",
            src: "/images/emails/4.png",
            random: (Math.random() - 0.5) * 2,
            random2: (Math.random() - 0.5) * 2,
            random3: (Math.random() - 0.5) * 2,
            random4: (Math.random() - 0.5) * 2,
          },
          {
            id: 5,
            title: "Potluck: your legendary jerk-chicken?",
            from: "Noah Chen",
            to: "noahc.chef@gmail.com",
            body: "We’ve got three new meeting recordings that need trimming and tagging before the pipeline run. Can you upload them to the “Pilot V2” folder and kick off processing by end of day? Marketing wants teaser clips by Friday.",
            src: "/images/emails/5.png",
            random: (Math.random() - 0.5) * 2,
            random2: (Math.random() - 0.5) * 2,
            random3: (Math.random() - 0.5) * 2,
            random4: (Math.random() - 0.5) * 2,
          },
          {
            id: 6,
            title: "Potluck: your legendary jerk-chicken?",
            from: "Noah Chen",
            to: "noahc.chef@gmail.com",
            body: "We’ve got three new meeting recordings that need trimming and tagging before the pipeline run. Can you upload them to the “Pilot V2” folder and kick off processing by end of day? Marketing wants teaser clips by Friday.",
            src: "/images/emails/6.png",
            random: (Math.random() - 0.5) * 2,
            random2: (Math.random() - 0.5) * 2,
            random3: (Math.random() - 0.5) * 2,
            random4: (Math.random() - 0.5) * 2,
          },
        ];
        function b(e) {
          let t,
            r = (0, a.c)(2),
            { src: i } = e;
          return (
            r[0] !== i
              ? ((t = (0, n.jsx)("div", {
                  className: "email-shadow dr-rounded-12 overflow-clip",
                  children: (0, n.jsx)(d.Image, {
                    src: i,
                    alt: i,
                    block: !0,
                    className: "dt:!dr-w-305 !dr-w-200",
                  }),
                })),
                (r[0] = i),
                (r[1] = t))
              : (t = r[1]),
            t
          );
        }
        function y() {
          let e,
            r,
            y,
            _,
            N,
            S,
            k,
            C,
            E,
            R,
            P,
            M,
            O,
            A,
            z,
            I,
            T,
            L,
            F,
            q,
            D,
            B,
            $,
            W,
            H,
            V,
            U,
            G = (0, a.c)(55),
            Q = (0, s.useRef)(null),
            K = (0, s.useRef)(null),
            [X, Y] = (0, i.useRect)(),
            [Z, J] = (0, i.useRect)(),
            [ee, et] = (0, i.useRect)(),
            [er, en] = (0, i.useRect)(),
            [ea, ei] = (0, i.useRect)(),
            es = (0, s.useRef)(null),
            el = (0, s.useRef)(null),
            eo = (0, s.useRef)(null);
          G[0] === Symbol.for("react.memo_cache_sentinel")
            ? ((e = []), (G[0] = e))
            : (e = G[0]);
          const ed = (0, s.useRef)(e),
            { width: ec, height: eu } = (0, i.useWindowSize)(),
            { isMobile: ef } = (0, c.useDeviceDetection)(),
            em = Math.min(
              ec,
              ef ? h.screens.mobile.width : h.screens.desktop.width,
            );
          return (
            G[1] !== ef || G[2] !== em
              ? ((r = (e) => {
                  const { progress: r } = e,
                    n = (0, f.easeInOutQuart)(r);
                  ed.current.forEach((e, a) => {
                    let i = t[a],
                      s = a - 3;
                    s >= 0 && (s += 1);
                    const l = s > 0 ? 1 : -1,
                      o = s - 2 * l,
                      d = (1 - (0, f.easeOutQuart)(r)) * (60 * l + 40 * o),
                      c = Math.sqrt(d * d) / 55,
                      u = -((1 - n) * (ef ? 48 : 12)) - (1 - n) * s * 6 * l,
                      m = -(
                        35 *
                        Math.sin((0, f.easeOutQuart)(c) * Math.PI) *
                        l
                      ),
                      h = (0, f.easeOutExpo)(r);
                    e.style.transform = `translateX(${l * em * 0.5 * (1 - h)}px) translateY(${-(0.21 * em) * (1 - h)}px) translate3d(${12 * ((0, p.desktopVW))(d + i.random, em)}px, ${12 * ((0, p.desktopVW))(u + i.random2, em)}px, 0) rotate(${m + 2 * i.random3}deg) `;
                  });
                }),
                (G[1] = ef),
                (G[2] = em),
                (G[3] = r))
              : (r = G[3]),
            G[4] !== Y || G[5] !== r
              ? ((y = {
                  rect: Y,
                  start: "top bottom",
                  end: "bottom center",
                  onProgress: r,
                }),
                (G[4] = Y),
                (G[5] = r),
                (G[6] = y))
              : (y = G[6]),
            G[7] !== ef || G[8] !== em || G[9] !== ec
              ? ((_ = [em, ec, ef]),
                (G[7] = ef),
                (G[8] = em),
                (G[9] = ec),
                (G[10] = _))
              : (_ = G[10]),
            (0, u.useScrollTrigger)(y, _),
            G[11] === Symbol.for("react.memo_cache_sentinel")
              ? ((N = (e) => {
                  const { progress: t } = e;
                  es.current?.setProgress(t),
                    el.current?.setProgress(t),
                    ed.current.forEach((e, r) => {
                      e.style.opacity = t > 0.5 ? 0 : 1;
                    }),
                    (Q.current.style.opacity = t < 0.5 ? 0 : 1);
                }),
                (G[11] = N))
              : (N = G[11]),
            G[12] !== et
              ? ((S = {
                  rect: et,
                  start: "top bottom",
                  end: "bottom center",
                  onProgress: N,
                }),
                (G[12] = et),
                (G[13] = S))
              : (S = G[13]),
            (0, u.useScrollTrigger)(S),
            G[14] !== J || G[15] !== em || G[16] !== ei || G[17] !== eu
              ? ((k = (e) => {
                  const { progress: t } = e,
                    r = 0.01 * em,
                    n = -((eu - J.height) / 2 + r),
                    a = (0, p.desktopVW)(116, em),
                    i = ei.height - eu + a;
                  t < 0.5
                    ? (K.current.style.transform = `translate3d(0, ${(0, m.mapRange)(0, 1, (0, m.mapRange)(0, 0.5, t, 0, 1), n, i)}px, 0)`)
                    : (K.current.style.transform = `translate3d(0, ${(0, m.mapRange)(0, 1, (0, m.mapRange)(0.5, 1, t, 0, 1), i, -r)}px, 0)`),
                    (es.current.getNode().style.transform = `translate3d(0, ${-(100 * (0, m.mapRange)(0, 0.5, t, 0, 1))}vh, 0)`),
                    (el.current.getNode().style.transform = `translate3d(0, ${-(100 * (0, m.mapRange)(0, 0.5, t, 0, 1))}vh, 0)`),
                    (eo.current.style.transform = `translate3d(0, ${-(100 * (0, m.mapRange)(0, 0.5, t, 0, 1))}vh, 0)`),
                    (Q.current.style.clipPath = `inset(calc(${(eu - J.height) / 2 + r}px + ${-(100 * (0, m.mapRange)(0, 0.5, t, 0, 1))}vh) 0 ${((window.innerHeight - J.height) / 2 + r) * (0 === t)}px 0)`);
                }),
                (G[14] = J),
                (G[15] = em),
                (G[16] = ei),
                (G[17] = eu),
                (G[18] = k))
              : (k = G[18]),
            G[19] !== en || G[20] !== k
              ? ((C = {
                  rect: en,
                  start: "top center",
                  end: "bottom bottom",
                  onProgress: k,
                }),
                (G[19] = en),
                (G[20] = k),
                (G[21] = C))
              : (C = G[21]),
            G[22] !== em || G[23] !== eu
              ? ((E = [eu, em]), (G[22] = em), (G[23] = eu), (G[24] = E))
              : (E = G[24]),
            (0, u.useScrollTrigger)(C, E),
            G[25] === Symbol.for("react.memo_cache_sentinel")
              ? ((R = (0, n.jsx)("div", {
                  className: "dt:dr-w-451 dr-w-357 mx-auto",
                  children: (0, n.jsxs)("div", {
                    className: "flex flex-col justify-center items-center",
                    children: [
                      (0, n.jsxs)("h3", {
                        className: "h4-l dr-mb-8",
                        children: [
                          "The rest gets ",
                          (0, n.jsx)("i", {
                            className: "italic",
                            children: "Briefed",
                          }),
                        ],
                      }),
                      (0, n.jsx)("p", {
                        className: "p-xxl dr-mb-25  text-center",
                        children:
                          "Twice a day, Cora sends you a beautiful Brief that summarizes everything you need to read but don’t need to respond to. It lets you read your inbox in 30 seconds instead of 3 hours.",
                      }),
                      (0, n.jsx)(l.Button, {
                        href: "https://cora.computer/users/sign_up",
                        label: "Get Started",
                      }),
                    ],
                  }),
                })),
                (G[25] = R))
              : (R = G[25]),
            G[26] !== X
              ? ((P = (0, n.jsx)("div", {
                  ref: X,
                  className: "dr-h-1080 opacity-50",
                })),
                (G[26] = X),
                (G[27] = P))
              : (P = G[27]),
            G[28] !== ee
              ? ((M = (0, n.jsx)("div", {
                  ref: ee,
                  className: "dr-h-1080 opacity-50",
                })),
                (G[28] = ee),
                (G[29] = M))
              : (M = G[29]),
            G[30] !== er
              ? ((O = (0, n.jsx)("div", {
                  ref: er,
                  className: "dr-h-1440 opacity-50",
                })),
                (G[30] = er),
                (G[31] = O))
              : (O = G[31]),
            G[32] === Symbol.for("react.memo_cache_sentinel")
              ? ((A = (0, n.jsx)("div", {
                  className:
                    "absolute inset-0 flex items-center justify-center",
                  children: (0, n.jsx)(o.FrameSequence, {
                    ref: es,
                    frames: Array.from({ length: 38 }).map(j),
                    className: "aspect-[2918/4346] dt:dr-w-549 dr-w-357",
                  }),
                })),
                (G[32] = A))
              : (A = G[32]),
            G[33] === Symbol.for("react.memo_cache_sentinel")
              ? ((z = (0, n.jsx)("div", {
                  className:
                    "absolute inset-0 flex items-center justify-center",
                  children: t.map((e, t) =>
                    (0, n.jsx)(
                      "div",
                      {
                        className: "absolute",
                        ref: (e) => {
                          ed.current[t] = e;
                        },
                        children: (0, n.jsx)(b, { ...e }),
                      },
                      e.id,
                    ),
                  ),
                })),
                (G[33] = z))
              : (z = G[33]),
            G[34] !== ea
              ? ((I = (e) => {
                  (K.current = e), ea(e);
                }),
                (G[34] = ea),
                (G[35] = I))
              : (I = G[35]),
            G[36] === Symbol.for("react.memo_cache_sentinel")
              ? ((T = (0, n.jsx)("h3", {
                  className: "dt:dr-mb-22 dr-mb-44 text-center h4-l",
                  children: "Today’s Brief",
                })),
                (G[36] = T))
              : (T = G[36]),
            G[37] === Symbol.for("react.memo_cache_sentinel")
              ? ((L = (0, n.jsxs)("div", {
                  className: "flex dr-gap-4 items-center dr-px-12",
                  children: [
                    (0, n.jsx)(v.default, {
                      className: "dr-w-14 aspect-square",
                    }),
                    (0, n.jsx)("span", { children: "Morning" }),
                  ],
                })),
                (G[37] = L))
              : (L = G[37]),
            G[38] === Symbol.for("react.memo_cache_sentinel")
              ? ((F = (0, n.jsxs)("div", {
                  className: "dr-p-3 flex dr-gap-7 bg-[#065BA3] dr-rounded-24",
                  children: [
                    L,
                    (0, n.jsxs)("div", {
                      className:
                        "flex dr-gap-5 items-center bg-[#488FCB] dr-rounded-24 dr-px-20 dr-py-2 ",
                      children: [
                        (0, n.jsx)(x.default, {
                          className: "dr-w-14 aspect-square",
                        }),
                        (0, n.jsx)("span", { children: "Afternoon" }),
                      ],
                    }),
                  ],
                })),
                (G[38] = F))
              : (F = G[38]),
            G[39] === Symbol.for("react.memo_cache_sentinel")
              ? ((q = (0, n.jsxs)("div", {
                  className:
                    "flex justify-between font-switzer dr-text-12 dr-h-28 desktop-only",
                  children: [
                    F,
                    (0, n.jsxs)("div", {
                      className:
                        "dr-px-17 dr-py-8 bg-[#FFFFFF05] backdrop-blur-[9px] dr-rounded-17 dr-border-1 dr-border-[#FFFFFF] border-solid flex dr-gap-7 items-center",
                      children: [
                        (0, n.jsx)("span", {
                          className: "whitespace-nowrap",
                          children: "All accounts",
                        }),
                        (0, n.jsx)(g.default, { className: "dr-w-9 dr-h-6" }),
                      ],
                    }),
                  ],
                })),
                (G[39] = q))
              : (q = G[39]),
            G[40] === Symbol.for("react.memo_cache_sentinel")
              ? ((D = (0, n.jsx)("div", {
                  className: "aspect-[791/1174] relative",
                  children: (0, n.jsx)(d.Image, {
                    src: "/images/brief.png",
                    alt: "",
                    desktopSize: "32vw",
                    mobileSize: "100vw",
                    fill: !0,
                  }),
                })),
                (G[40] = D))
              : (D = G[40]),
            G[41] !== I
              ? ((B = (0, n.jsx)("div", {
                  ref: Q,
                  className: "absolute  inset-0 flex items-end justify-center",
                  children: (0, n.jsxs)("div", {
                    className:
                      "dt:dr-w-504 dr-w-329 flex flex-col dt:dr-gap-13",
                    ref: I,
                    children: [T, q, D],
                  }),
                })),
                (G[41] = I),
                (G[42] = B))
              : (B = G[42]),
            G[43] === Symbol.for("react.memo_cache_sentinel")
              ? (($ = (0, n.jsx)(d.Image, {
                  src: "/images/sides.webp",
                  alt: "",
                  unoptimized: !0,
                  fill: !0,
                  ref: eo,
                })),
                (G[43] = $))
              : ($ = G[43]),
            G[44] === Symbol.for("react.memo_cache_sentinel")
              ? ((W = (0, n.jsx)(o.FrameSequence, {
                  ref: el,
                  frames: Array.from({ length: 38 }).map(w),
                  className: "absolute inset-0 w-full h-full",
                })),
                (G[44] = W))
              : (W = G[44]),
            G[45] !== Z
              ? ((H = (0, n.jsx)("div", {
                  className:
                    "absolute inset-0 flex items-center justify-center",
                  children: (0, n.jsxs)("div", {
                    className:
                      "aspect-[2918/4346] dt:dr-w-549 dr-w-357 relative",
                    children: [
                      $,
                      W,
                      (0, n.jsx)("div", {
                        ref: Z,
                        className:
                          "absolute top-[50%] translate-y-[-50%] w-full aspect-[423/282]",
                      }),
                    ],
                  }),
                })),
                (G[45] = Z),
                (G[46] = H))
              : (H = G[46]),
            G[47] !== B || G[48] !== H
              ? ((V = (0, n.jsx)("div", {
                  className: "absolute top-0 left-0 right-0 h-full",
                  children: (0, n.jsxs)("div", {
                    className: "sticky top-0 h-[100svh]",
                    children: [A, z, B, H],
                  }),
                })),
                (G[47] = B),
                (G[48] = H),
                (G[49] = V))
              : (V = G[49]),
            G[50] !== P || G[51] !== M || G[52] !== O || G[53] !== V
              ? ((U = (0, n.jsxs)("section", {
                  className: "",
                  children: [
                    R,
                    (0, n.jsxs)("div", {
                      className: "relative overflow-x-clip",
                      children: [P, M, O, V],
                    }),
                  ],
                })),
                (G[50] = P),
                (G[51] = M),
                (G[52] = O),
                (G[53] = V),
                (G[54] = U))
              : (U = G[54]),
            U
          );
        }
        function w(e, t) {
          return `/images/foreground/${t + 1}.webp`;
        }
        function j(e, t) {
          return `/images/background/${t + 1}.webp`;
        }
      }
    },
  },
]);

//# sourceMappingURL=97e06c9b0d8877b9.js.map
