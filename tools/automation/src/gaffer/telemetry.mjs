export function createTelemetry({
  sink = null,
  clock = () => new Date().toISOString(),
} = {}) {
  const events = [];
  return {
    events,
    async emit(name, payload = {}) {
      if (typeof name !== "string" || name.length === 0)
        throw new TypeError("Telemetry event name is required");
      const event = Object.freeze({ name, at: clock(), ...payload });
      events.push(event);
      if (sink) await sink(event);
      return event;
    },
  };
}
