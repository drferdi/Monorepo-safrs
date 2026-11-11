import Module from 'node:module';
import path from 'node:path';
import { app } from 'electron';

type ResolveFilename = (
  request: string,
  parent: NodeJS.Module | null | undefined,
  isMain: boolean,
  options?: unknown
) => string;

const moduleInternals = Module as typeof Module & {
  _resolveFilename: ResolveFilename;
};

const originalResolveFilename = moduleInternals._resolveFilename;
const distRoot = path.resolve(__dirname, '..');

moduleInternals._resolveFilename = function (
  request: string,
  parent: NodeJS.Module | null | undefined,
  isMain: boolean,
  options?: unknown
) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    request = path.join(distRoot, request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const userDataOverride = process.env.SENTRA_HARVESTER_USER_DATA?.trim();
if (userDataOverride) {
  app.setPath('userData', path.resolve(userDataOverride));
}

import './main';
