# Capsule `src/` boundary

Product **deployment** runtimes belong under `apps/`. Shared domain types
belong in `@safrs/*`. This `src/` tree is for capsule-owned libraries that
are not a fifth application: personas and email helpers today.

The migration must not create `projects/product/sentrabot/packages`, a nested
workspace, or a second dependency-management stack.

```mermaid
flowchart TB
  subgraph Src["projects/product/sentrabot/src"]
    Per["personas/ catalog"]
    Em["email/ templates + delivery"]
  end
  subgraph Apps["apps/*"]
    Web["web"]
    Worker["worker"]
  end
  subgraph Shared["packages — not here"]
    Sch["schemas/sentrabot"]
    API["api/sentrabot.ts"]
  end
  Per -.->|"workspace seeds first two"| Web
  Em -.->|"unused by Better Auth hooks"| Web
```

## CURRENT contents

- `personas/` — twelve Indonesian assistant definitions; see
  [../docs/product.md](../docs/product.md). Web webpack aliases
  `@sentrabot/personas` here; `/workspace` imports the catalog and uses the
  first two entries as local sample bots.
- `email/` — verification and password-reset **text** templates;
  `deliverEmail` local sink vs provider flag. See [../emails/README.md](../emails/README.md).
- Colocated `*.test.ts` files exist; they are not a workspace package, so
  they are outside the documented `pnpm --filter` commands.

No second HTTP server lives here.
