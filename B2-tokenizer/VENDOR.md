# Vendored tokenizers

Both browser bundles come from:

- package: `gpt-tokenizer`
- version: `3.4.0`
- package source: <https://github.com/niieani/gpt-tokenizer>
- package license: MIT
- npm integrity: `sha512-wxFLnhIXTDjYebd9A9pGl3e31ZpSypbpIJSOswbgop5jLte/AsZVDvjlbEuVFlsqZixVKqbcoNmRlFDf6pz/UQ==`

## Production artifacts

| Artifact         | Exact source                                             | Production transform                                                                | Source-entry SHA-256                                               | Production SHA-256                                                 |     Bytes |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | --------: |
| `o200k_base.js`  | `node_modules/gpt-tokenizer/dist/o200k_base.js`          | Remove the unavailable source-map comment                                           | `fbc7419f14fb3a1460b56b156b94adb3480ec375a1dd404b0d0bd807fbff97e1` | `44d934bdf322218d751923a07a186206426bb674be6c4d61a5dd5b5054b58fd0` | 2,047,425 |
| `cl100k_base.js` | `node_modules/gpt-tokenizer/esm/encoding/cl100k_base.js` | Bundle and minify as an IIFE named `GPTTokenizer_cl100k_base` with `esbuild@0.25.6` | `248d9e5e79fa4a9a8da0b66a5dd9c7ebeec395ba4b51be18597b666c653d4551` | `b2b2283dc7ab9b1ae9057f30fdeda7d9c2ee33fa76bf59763265996f6ea5050f` |   994,384 |

The package file named `dist/cl100k_base.js` resolves to the package’s current default encoder in version 3.4.0, which is `o200k_base`. The vendor script deliberately builds the explicit `encoding/cl100k_base` entry instead. The independent reference test verifies that this artifact has the expected 100,264-entry vocabulary and token IDs.

## Reproduce

To reproduce or update both committed browser bundles:

```powershell
npm.cmd install --ignore-scripts
npm.cmd run vendor:tokenizer
npm.cmd run check
```

`npm.cmd run vendor:check` rebuilds both artifacts and fails if either committed byte sequence differs. `npm.cmd run size:check` enforces a 2,100,000-byte per-bundle budget and rejects dead source-map references.

`npm.cmd run crosscheck:tiktoken` compares 24 complete token-ID sequences—12 fixtures under each encoding—against the independently pinned Python `tiktoken@0.13.0` reference. Its install is recorded in `requirements-crosscheck.txt`.

See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for runtime and development-tool licenses.
