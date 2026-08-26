import config from "@payload-config";
import { GRAPHQL_POST } from "@payloadcms/next/routes";

/**
 * GraphQL server-side milik Payload. Ini BUKAN klien GraphQL frontend: Apollo,
 * urql, dan sejenisnya tetap dilarang (Master Implementation Plan bagian 3 dan
 * Technical Bible bagian 28). Halaman publik memakai akses data server-side
 * bertipe.
 */
export const POST = GRAPHQL_POST(config);
