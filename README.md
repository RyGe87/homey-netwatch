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

## UniFi gateway

A second device reads your UniFi console directly over the LAN, using a
**locally created** API key. That local part matters: a key from the cloud
portal talks to Ubiquiti's servers, which are unreachable during exactly the
outage you want explained.

It reports WAN status, latency, the last speed test (download, upload, ping)
and how many devices are connected, and it fires flows when the WAN drops or
returns, when your public IP changes, and when a new speed test lands. Your
provider and public address appear on the device page.

Configure it under the app's settings: IP address and API key, with a button
that tests the connection and shows what it found.

## Outage forensics

The moment the connection drops, the app asks the gateway what *it* sees and
keeps the answer — because once the outage is over, the evidence is gone. It
separates the cases that matter:

- the gateway itself is unreachable → something inside the house, or the
  router restarted;
- the WAN link is down → cable, modem, or the line from your provider;
- the line is up but nothing gets through → almost certainly a provider
  outage;
- the gateway sees nothing wrong → DNS, or a partial failure further away.

Every finished outage is logged with its start, duration and that verdict.
The list is shown under the app's settings, and the internet device carries a
sensor with the number of outages in the last seven days, so a bad week is
visible as a number rather than a feeling. Both flow triggers pass the verdict
along as a token, so a notification can say what happened, not just that
something happened.

## License

[MIT](LICENSE). No third-party code and no runtime dependencies beyond Node's
own `https` module and the Homey SDK.
