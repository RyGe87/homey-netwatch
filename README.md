# Network Watch for Homey

Watches your internet connection and tells you when it drops — and, more
usefully, how long it was gone when it comes back.

## How it works

Every 30 seconds the app probes two independent endpoints (Google's
connectivity check and Cloudflare) directly from Homey. An outage is only
declared after two consecutive failed rounds, so a single dropped packet does
not set off the house. Using two different providers means one company's
hiccup is not mistaken for your line being down.

Probing from Homey rather than asking the router is deliberate: if the router
is the thing that broke, asking it whether the internet works is circular.

## What you get

- An **Internet connection** device with two sensors: internet down (with
  insights, so you build an outage history) and latency in milliseconds.
- Flow triggers for the connection dropping and coming back. The "came back"
  trigger carries how long the outage lasted, both in minutes and as readable
  text such as "1 uur en 12 minuten".
- A condition card to check whether the internet is available.

## Roadmap

UniFi enrichment: when the connection drops, ask the gateway *why* — WAN port
down, ISP outage, or something local — and record it, so a pattern of outages
becomes evidence rather than a feeling.

## License

[MIT](LICENSE). No third-party code and no runtime dependencies beyond Node's
own `https` module and the Homey SDK.
