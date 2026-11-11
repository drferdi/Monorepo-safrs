import config from "@payload-config";
import "@payloadcms/next/css";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import type { ServerFunctionClient } from "payload";
import type React from "react";

import { importMap } from "./admin/importMap";

/**
 * Admin Payload hidup di app yang sama dengan situs publik (modular monolith,
 * Master Implementation Plan bagian 2). Group rute ini punya layout root
 * sendiri; grup (public) punya miliknya.
 */
const serverFunction: ServerFunctionClient = async function serverFunction(
  args,
) {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

export default function PayloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootLayout
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  );
}
