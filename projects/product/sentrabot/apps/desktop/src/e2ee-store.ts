import {
  createDeviceKeypair,
  createRecoveryEnvelope,
  createRecoveryKey,
  createSyncKey,
  type DeviceKeypair,
  type RecoveryEnvelope,
  recoverSyncKey,
} from "./e2ee.js";

export interface LocalKeyProtection {
  isAvailable(): boolean;
  encrypt(value: string): string;
  decrypt(value: string): string;
}

export interface LocalKeyStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

interface PersistedKeypair {
  version: 1;
  publicKey: string;
  protectedPrivateKey: string;
}

export class DeviceKeypairStore {
  constructor(
    private readonly dependencies: { protection: LocalKeyProtection; storage: LocalKeyStorage },
  ) {}

  async loadOrCreate(): Promise<DeviceKeypair> {
    if (!this.dependencies.protection.isAvailable())
      throw new Error("OS key protection is unavailable");
    const persisted = await this.dependencies.storage.read();
    if (persisted) return this.decode(persisted);
    const keypair = createDeviceKeypair();
    await this.dependencies.storage.write(
      JSON.stringify({
        version: 1,
        publicKey: keypair.publicKey,
        protectedPrivateKey: this.dependencies.protection.encrypt(keypair.privateKey),
      } satisfies PersistedKeypair),
    );
    return keypair;
  }

  private decode(value: string): DeviceKeypair {
    let parsed: PersistedKeypair;
    try {
      parsed = JSON.parse(value) as PersistedKeypair;
    } catch {
      throw new Error("Stored device key is invalid");
    }
    if (parsed.version !== 1 || !parsed.publicKey || !parsed.protectedPrivateKey)
      throw new Error("Stored device key is invalid");
    return {
      publicKey: parsed.publicKey,
      privateKey: this.dependencies.protection.decrypt(parsed.protectedPrivateKey),
    };
  }
}

interface PersistedSyncKey {
  version: 1;
  protectedSyncKey: string;
}

export class SyncKeyStore {
  constructor(
    private readonly dependencies: { protection: LocalKeyProtection; storage: LocalKeyStorage },
  ) {}

  async initialize(): Promise<{
    syncKey: string;
    recoveryKey: string;
    recoveryEnvelope: RecoveryEnvelope;
  }> {
    if (!this.dependencies.protection.isAvailable())
      throw new Error("OS key protection is unavailable");
    if (await this.dependencies.storage.read()) throw new Error("Sync key already initialized");
    const syncKey = createSyncKey();
    const recoveryKey = createRecoveryKey();
    const recoveryEnvelope = createRecoveryEnvelope(syncKey, recoveryKey);
    await this.persist(syncKey);
    return { syncKey, recoveryKey, recoveryEnvelope };
  }

  async load(): Promise<string> {
    if (!this.dependencies.protection.isAvailable())
      throw new Error("OS key protection is unavailable");
    const persisted = await this.dependencies.storage.read();
    if (!persisted) throw new Error("Sync key is not initialized");
    let parsed: PersistedSyncKey;
    try {
      parsed = JSON.parse(persisted) as PersistedSyncKey;
    } catch {
      throw new Error("Stored sync key is invalid");
    }
    if (parsed.version !== 1 || !parsed.protectedSyncKey)
      throw new Error("Stored sync key is invalid");
    return this.dependencies.protection.decrypt(parsed.protectedSyncKey);
  }

  recover(envelope: RecoveryEnvelope, recoveryKey: string): string {
    return recoverSyncKey(envelope, recoveryKey);
  }

  async restore(envelope: RecoveryEnvelope, recoveryKey: string): Promise<void> {
    if (!this.dependencies.protection.isAvailable())
      throw new Error("OS key protection is unavailable");
    if (await this.dependencies.storage.read()) throw new Error("Sync key already initialized");
    await this.persist(recoverSyncKey(envelope, recoveryKey));
  }

  private async persist(syncKey: string): Promise<void> {
    await this.dependencies.storage.write(
      JSON.stringify({
        version: 1,
        protectedSyncKey: this.dependencies.protection.encrypt(syncKey),
      } satisfies PersistedSyncKey),
    );
  }
}
