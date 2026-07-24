# Security and hosting

The learner-facing widget is a dependency-free static application. It does not
need network, font, media, worker, object, or form permissions. `index.html`
ships a restrictive CSP meta policy so the same contract is enforced even when
the hosting layer cannot add response headers.

For production, configure these HTTP response headers at the Moodle/static-host
boundary:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'none'; object-src 'none'; media-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://moodle.example.edu
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

Replace `https://moodle.example.edu` with the exact approved Moodle origin.
`frame-ancestors` must be delivered as an HTTP header; browsers ignore it in a
CSP meta element. Do not use `*` for either `frame-ancestors` or widget
`postMessage` traffic.

Serve the files over HTTPS in production. If the widget and Moodle use
different origins, pass the exact Moodle origin through the documented
`parentOrigin` integration parameter and keep the parent wrapper's exact
source/origin validation enabled.
