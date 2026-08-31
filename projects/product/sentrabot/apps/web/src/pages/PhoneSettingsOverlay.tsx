import { Trans, useLingui } from "@lingui/react/macro";
import type {
  Bot,
  PhoneAgentConnection,
  PhoneChannelMembership,
  PhoneStatus,
} from "@sentrabot/contracts";
import { useEffect, useRef, useState } from "react";
import { BuiButton } from "../components/beautiful-ui/primitives";
import { rpc } from "../lib/rpc";

type WhatsAppStatus = {
  enabled: boolean;
  linked: boolean;
  phoneE164: string | null;
  botId: string | null;
  businessPhoneE164: string | null;
};

type WhatsAppPairing = { code: string; waLink: string; expiresAt: string };

export function PhoneSettingsOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useLingui();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [channels, setChannels] = useState<PhoneChannelMembership[]>([]);
  const [connections, setConnections] = useState<PhoneAgentConnection[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [pairBotId, setPairBotId] = useState<string>("");
  const [pairing, setPairing] = useState<WhatsAppPairing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function refresh() {
    const [nextStatus, nextChannels, nextConnections, nextWhatsapp, nextBots] = await Promise.all([
      rpc.phone.status(),
      rpc.phone.channels.list(),
      rpc.phone.connections.list(),
      rpc.phone.whatsapp.status().catch(() => null),
      rpc.bots.list().catch(() => [] as Bot[]),
    ]);
    setStatus(nextStatus);
    setChannels(nextChannels);
    setConnections(nextConnections);
    setWhatsapp(nextWhatsapp);
    const activeBots = nextBots.filter((bot) => !bot.archivedAt);
    setBots(activeBots);
    setPairBotId((current) => current || (activeBots[0]?.id ?? ""));
    if (nextWhatsapp?.linked) setPairing(null);
  }

  useEffect(() => {
    void refresh().catch(() => setError(t`Couldn't load phone settings`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While a pairing code is outstanding, poll until the WhatsApp message lands.
  useEffect(() => {
    if (!pairing || whatsapp?.linked) return;
    const timer = setInterval(() => {
      void rpc.phone.whatsapp
        .status()
        .then((next) => {
          setWhatsapp(next);
          if (next.linked) setPairing(null);
        })
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [pairing, whatsapp?.linked]);

  async function beginWhatsAppPairing() {
    if (!pairBotId) return;
    setError(null);
    try {
      setPairing(await rpc.phone.whatsapp.beginPairing({ botId: pairBotId }));
    } catch {
      setError(t`Couldn't start WhatsApp pairing`);
    }
  }

  async function act(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await refresh();
    } catch {
      setError(t`Couldn't update phone settings`);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(4,4,5,.62)] p-4 sm:p-10">
      <div
        ref={panelRef}
        data-testid="phone-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-settings-title"
        tabIndex={-1}
        className="rk-scroll max-h-full w-[640px] max-w-full overflow-y-auto rounded-[26px] border border-[#232326] bg-[#141416] p-6 shadow-[0_40px_90px_rgba(0,0,0,.55)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-6">
          <h2 id="phone-settings-title" className="text-2xl font-medium text-[#F1F1F2]">
            <Trans>Phone</Trans>
          </h2>
          <button
            type="button"
            aria-label={t`Close phone settings`}
            onClick={onClose}
            className="text-[#85858A]"
          >
            ✕
          </button>
        </div>

        {error ? <p className="mt-4 text-[13px] text-[#E88B8B]">{error}</p> : null}

        <section className="mt-8 rounded-[14px] border border-[#26262A] bg-[#101012] px-4 py-4">
          <h3 className="text-[15px] font-medium text-[#ECECEE]">
            <Trans>iMessage line</Trans>
          </h3>
          <p className="mt-3 text-[14px] text-[#C9C9CE]">
            {status?.linked ? (
              <Trans>Linked as {status.phoneE164}</Trans>
            ) : (
              <Trans>
                Not linked — text the deployment's number once to link your phone to your agent.
              </Trans>
            )}
          </p>
        </section>

        {whatsapp?.enabled ? (
          <section
            data-testid="whatsapp-pairing"
            className="mt-5 rounded-[14px] border border-[#26262A] bg-[#101012] px-4 py-4"
          >
            <h3 className="text-[15px] font-medium text-[#ECECEE]">
              <Trans>WhatsApp</Trans>
            </h3>
            {whatsapp.linked ? (
              <p className="mt-3 text-[14px] text-[#C9C9CE]">
                <Trans>Paired as {whatsapp.phoneE164}</Trans>
              </p>
            ) : pairing ? (
              <div className="mt-3 space-y-3">
                <p className="text-[14px] text-[#C9C9CE]">
                  <Trans>
                    Open the link below on your phone and send the prefilled message. Pairing
                    completes automatically.
                  </Trans>
                </p>
                <a
                  href={pairing.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full bg-[#25D366] px-4 py-2 text-[13.5px] font-semibold text-[#08150C]"
                >
                  <Trans>Open WhatsApp</Trans>
                </a>
                <p className="text-[13px] text-[#7A7A80]">
                  <Trans>Or send this code to {whatsapp.businessPhoneE164}:</Trans>{" "}
                  <span className="font-mono text-[#ECECEE]">PAIR-{pairing.code}</span>
                </p>
                <p className="text-[12px] text-[#6C6C70]">
                  <Trans>Waiting for your message…</Trans>
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-[14px] text-[#C9C9CE]">
                  <Trans>Chat with your agent straight from WhatsApp.</Trans>
                </p>
                {bots.length > 1 ? (
                  <select
                    aria-label={t`Agent to pair`}
                    value={pairBotId}
                    onChange={(event) => setPairBotId(event.target.value)}
                    className="w-full rounded-xl border border-[#2C2C30] bg-[#171719] px-3 py-2.5 text-sm text-[#ECECEE] outline-none"
                  >
                    {bots.map((bot) => (
                      <option key={bot.id} value={bot.id}>
                        {bot.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <BuiButton tone="accent" onClick={() => void beginWhatsAppPairing()}>
                  <Trans>Pair WhatsApp</Trans>
                </BuiButton>
              </div>
            )}
          </section>
        ) : null}

        <section className="mt-5 rounded-[14px] border border-[#26262A] bg-[#101012] px-4 py-4">
          <h3 className="text-[15px] font-medium text-[#ECECEE]">
            <Trans>Channels</Trans>
          </h3>
          {channels.length === 0 ? (
            <p className="mt-3 text-[13px] text-[#7A7A80]">
              <Trans>No iMessage groups yet.</Trans>
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {channels.map((channel) => (
                <li
                  key={channel.channelId}
                  className="flex items-center justify-between gap-3 text-[14px] text-[#C9C9CE]"
                >
                  <span>
                    {channel.name ?? t`Group`}{" "}
                    <span className="text-[12px] text-[#7A7A80]">
                      {channel.status} · {channel.memberCount}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    {channel.status === "invited" ? (
                      <>
                        <BuiButton
                          tone="accent"
                          onClick={() =>
                            void act(() =>
                              rpc.phone.channels.respond({
                                channelId: channel.channelId,
                                accept: true,
                              }),
                            )
                          }
                        >
                          <Trans>Approve</Trans>
                        </BuiButton>
                        <BuiButton
                          onClick={() =>
                            void act(() =>
                              rpc.phone.channels.respond({
                                channelId: channel.channelId,
                                accept: false,
                              }),
                            )
                          }
                        >
                          <Trans>Decline</Trans>
                        </BuiButton>
                      </>
                    ) : null}
                    {channel.status === "approved" ? (
                      <BuiButton
                        onClick={() =>
                          void act(() => rpc.phone.channels.leave({ channelId: channel.channelId }))
                        }
                      >
                        <Trans>Leave</Trans>
                      </BuiButton>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5 rounded-[14px] border border-[#26262A] bg-[#101012] px-4 py-4">
          <h3 className="text-[15px] font-medium text-[#ECECEE]">
            <Trans>Agent connections</Trans>
          </h3>
          {connections.length === 0 ? (
            <p className="mt-3 text-[13px] text-[#7A7A80]">
              <Trans>No agent connections yet.</Trans>
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {connections.map((connection) => (
                <li
                  key={connection.id}
                  className="flex items-center justify-between gap-3 text-[14px] text-[#C9C9CE]"
                >
                  <span>
                    {connection.peerOwnerLabel}
                    {"'s "}
                    {connection.peerBotName}{" "}
                    <span className="text-[12px] text-[#7A7A80]">{connection.status}</span>
                  </span>
                  <span className="flex gap-2">
                    {connection.status === "pending" && connection.incoming ? (
                      <>
                        <BuiButton
                          tone="accent"
                          onClick={() =>
                            void act(() =>
                              rpc.phone.connections.respond({
                                connectionId: connection.id,
                                accept: true,
                              }),
                            )
                          }
                        >
                          <Trans>Approve</Trans>
                        </BuiButton>
                        <BuiButton
                          onClick={() =>
                            void act(() =>
                              rpc.phone.connections.respond({
                                connectionId: connection.id,
                                accept: false,
                              }),
                            )
                          }
                        >
                          <Trans>Decline</Trans>
                        </BuiButton>
                      </>
                    ) : null}
                    {connection.status === "approved" ? (
                      <BuiButton
                        onClick={() =>
                          void act(() =>
                            rpc.phone.connections.revoke({ connectionId: connection.id }),
                          )
                        }
                      >
                        <Trans>Revoke</Trans>
                      </BuiButton>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
