# Third-party notices

The production widget redistributes code from `gpt-tokenizer`. The remaining packages are development and verification tools and are not shipped to learners.

| Package                             | Pinned version | Purpose                                                    | License    |
| ----------------------------------- | -------------: | ---------------------------------------------------------- | ---------- |
| `gpt-tokenizer`                     |          3.4.0 | Production `o200k_base` and `cl100k_base` encoding bundles | MIT        |
| `esbuild`                           |         0.25.6 | Reproducible `cl100k_base` browser build                   | MIT        |
| `prettier`                          |          3.6.2 | Deterministic source formatting                            | MIT        |
| `@playwright/test`                  |         1.61.1 | Browser, iframe, responsive, and performance tests         | Apache-2.0 |
| `@axe-core/playwright` / `axe-core` |         4.12.1 | Automated accessibility checks                             | MPL-2.0    |
| Python `tiktoken`                   |         0.13.0 | Independent tokenizer reference                            | MIT        |

Exact resolved packages, integrity values, transitive dependencies, and their declared SPDX licenses are recorded in `package-lock.json` and `requirements-crosscheck.txt`.

## gpt-tokenizer MIT license

MIT License

Copyright (c) 2023-2024 Bazyli Brzoska

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
