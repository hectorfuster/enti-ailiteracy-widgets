"use strict";

try {
  const ENCODINGS = {
    o200k_base: {
      file: "o200k_base.js",
      globalName: "GPTTokenizer_o200k_base",
    },
    cl100k_base: {
      file: "cl100k_base.js",
      globalName: "GPTTokenizer_cl100k_base",
    },
  };
  const requestedEncoding =
    new URL(self.location.href).searchParams.get("encoding") || "o200k_base";
  const encoding = ENCODINGS[requestedEncoding];

  if (!encoding) {
    throw new Error("S’ha demanat una codificació no admesa.");
  }

  importScripts(encoding.file, "tokenizer-core.js");

  const encoder = self[encoding.globalName];
  if (!encoder) {
    throw new Error(`No s’ha trobat la codificació ${requestedEncoding}.`);
  }
  if (typeof ENTITokenizerCore === "undefined") {
    throw new Error("No s’ha pogut carregar el nucli del tokenitzador.");
  }

  const engine = ENTITokenizerCore.createTokenizerEngine(encoder, {
    locale: "ca",
    mergeCacheSize: 4096,
    visualTokenLimit: 320,
  });

  self.addEventListener("message", (event) => {
    const message = event.data || {};
    if (message.type !== "tokenize" || !message.id) return;

    try {
      const result = engine.safeTokenize(message.text);
      if (!result.ok) throw new Error(result.message);
      self.postMessage({
        type: "result",
        id: message.id,
        result,
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        id: message.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  self.postMessage({
    type: "ready",
    encoding: requestedEncoding,
  });
} catch (error) {
  self.postMessage({
    type: "fatal",
    message: error instanceof Error ? error.message : String(error),
  });
}
