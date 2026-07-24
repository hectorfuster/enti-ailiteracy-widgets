(function attachTokenizerCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ENTITokenizerCore = api;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildTokenizerCore() {
    "use strict";

    const DEFAULT_VISUAL_TOKEN_LIMIT = 320;
    const INVISIBLE_CHARACTERS = new Map([
      [" ", { visual: "·", aria: "espai", kind: "whitespace" }],
      ["\t", { visual: "⇥", aria: "tabulació", kind: "whitespace" }],
      ["\n", { visual: "↵", aria: "salt de línia", kind: "whitespace" }],
      ["\r", { visual: "␍", aria: "retorn de carro", kind: "whitespace" }],
      [
        "\u00a0",
        { visual: "⍽", aria: "espai no separable", kind: "whitespace" },
      ],
      [
        "\u200b",
        { visual: "⟨ZWSP⟩", aria: "espai d’amplada zero", kind: "control" },
      ],
      [
        "\u200c",
        { visual: "⟨ZWNJ⟩", aria: "no-unió d’amplada zero", kind: "control" },
      ],
      [
        "\u200d",
        { visual: "⟨ZWJ⟩", aria: "unió d’amplada zero", kind: "control" },
      ],
      [
        "\u200e",
        { visual: "⟨LRM⟩", aria: "marca d’esquerra a dreta", kind: "control" },
      ],
      [
        "\u200f",
        { visual: "⟨RLM⟩", aria: "marca de dreta a esquerra", kind: "control" },
      ],
      [
        "\u202a",
        {
          visual: "⟨LRE⟩",
          aria: "incrustació d’esquerra a dreta",
          kind: "control",
        },
      ],
      [
        "\u202b",
        {
          visual: "⟨RLE⟩",
          aria: "incrustació de dreta a esquerra",
          kind: "control",
        },
      ],
      [
        "\u202c",
        {
          visual: "⟨PDF⟩",
          aria: "final de format direccional",
          kind: "control",
        },
      ],
      [
        "\u202d",
        {
          visual: "⟨LRO⟩",
          aria: "substitució d’esquerra a dreta",
          kind: "control",
        },
      ],
      [
        "\u202e",
        {
          visual: "⟨RLO⟩",
          aria: "substitució de dreta a esquerra",
          kind: "control",
        },
      ],
      ["\u2060", { visual: "⟨WJ⟩", aria: "unió de paraula", kind: "control" }],
      [
        "\ufeff",
        { visual: "⟨BOM⟩", aria: "marca d’ordre de bytes", kind: "control" },
      ],
    ]);

    function ensureEncoder(encoder) {
      const required = ["encode", "decode", "decodeGenerator"];
      for (const method of required) {
        if (!encoder || typeof encoder[method] !== "function") {
          throw new TypeError(`El tokenitzador no exposa ${method}().`);
        }
      }
    }

    function graphemeCount(text, locale = "ca") {
      if (!text) return 0;
      if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
        const segmenter = new Intl.Segmenter(locale, {
          granularity: "grapheme",
        });
        let count = 0;
        for (const unused of segmenter.segment(text)) {
          void unused;
          count += 1;
        }
        return count;
      }
      return Array.from(text).length;
    }

    function wordCount(text, locale = "ca") {
      if (!text.trim()) return 0;
      if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
        const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
        let count = 0;
        for (const segment of segmenter.segment(text)) {
          if (segment.isWordLike) count += 1;
        }
        return count;
      }
      try {
        return (text.match(/[\p{L}\p{N}]+(?:[’'·-][\p{L}\p{N}]+)*/gu) || [])
          .length;
      } catch {
        return text.trim().split(/\s+/).filter(Boolean).length;
      }
    }

    function describeText(rawText) {
      if (!rawText) {
        return {
          displayText: "⟨fragment buit⟩",
          ariaText: "fragment buit",
          kind: "control",
        };
      }

      let displayText = "";
      const ariaParts = [];
      let hasVisibleText = false;
      let hasControl = false;
      let onlyWhitespace = true;

      for (const character of Array.from(rawText)) {
        const invisible = INVISIBLE_CHARACTERS.get(character);
        if (invisible) {
          displayText += invisible.visual;
          ariaParts.push(invisible.aria);
          if (invisible.kind === "control") hasControl = true;
          continue;
        }

        const codePoint = character.codePointAt(0);
        if (
          (codePoint >= 0 && codePoint <= 0x1f) ||
          (codePoint >= 0x7f && codePoint <= 0x9f)
        ) {
          const hexadecimal = codePoint
            .toString(16)
            .toUpperCase()
            .padStart(4, "0");
          displayText += `⟨U+${hexadecimal}⟩`;
          ariaParts.push(`control Unicode U més ${hexadecimal}`);
          hasControl = true;
          continue;
        }

        displayText += character;
        ariaParts.push(character);
        hasVisibleText = true;
        onlyWhitespace = false;
      }

      let kind = "text";
      if (hasControl) kind = "control";
      else if (!hasVisibleText && onlyWhitespace) kind = "whitespace";

      return {
        displayText,
        ariaText: ariaParts.join(" "),
        kind,
      };
    }

    function createGroup(ids, rawText, startIndex) {
      const description = describeText(rawText);
      const endIndex = startIndex + ids.length - 1;
      const utf8Bytes = Array.from(new TextEncoder().encode(rawText));
      return {
        ids: Array.from(ids),
        text: rawText,
        displayText: description.displayText,
        ariaText: description.ariaText,
        kind: description.kind,
        utf8Bytes,
        utf8Hex: utf8Bytes
          .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
          .join(" "),
        start: startIndex,
        end: endIndex,
      };
    }

    function groupDecodedTokens(encoder, ids) {
      if (ids.length === 0) {
        return {
          groups: [],
          reconstructed: "",
          groupedUntil: 0,
        };
      }

      let consumed = 0;
      let groupedUntil = 0;
      const groups = [];

      function* trackedIds() {
        for (let index = 0; index < ids.length; index += 1) {
          consumed = index + 1;
          yield ids[index];
        }
      }

      for (const decodedChunk of encoder.decodeGenerator(trackedIds())) {
        const groupIds = ids.slice(groupedUntil, consumed);
        if (groupIds.length === 0) continue;
        groups.push(createGroup(groupIds, decodedChunk, groupedUntil + 1));
        groupedUntil = consumed;
      }

      if (groupedUntil < ids.length) {
        const remainingIds = ids.slice(groupedUntil);
        const remainingText = encoder.decode(remainingIds);
        groups.push(createGroup(remainingIds, remainingText, groupedUntil + 1));
        groupedUntil = ids.length;
      }

      const reconstructed = groups.map((group) => group.text).join("");
      return { groups, reconstructed, groupedUntil };
    }

    function selectVisibleGroups(groups, tokenCount, visualTokenLimit) {
      if (tokenCount <= visualTokenLimit) {
        return {
          groups,
          truncated: false,
          omittedTokenCount: 0,
        };
      }

      const headBudget = Math.ceil(visualTokenLimit * 0.72);
      const tailBudget = visualTokenLimit - headBudget;
      const head = [];
      const tail = [];
      let headTokens = 0;
      let tailTokens = 0;

      for (const group of groups) {
        if (headTokens + group.ids.length > headBudget && head.length > 0)
          break;
        head.push(group);
        headTokens += group.ids.length;
      }

      for (let index = groups.length - 1; index >= head.length; index -= 1) {
        const group = groups[index];
        if (tailTokens + group.ids.length > tailBudget && tail.length > 0)
          break;
        tail.unshift(group);
        tailTokens += group.ids.length;
      }

      return {
        groups: [...head, ...tail],
        truncated: true,
        omittedTokenCount: Math.max(0, tokenCount - headTokens - tailTokens),
      };
    }

    function createTokenizerEngine(encoder, options = {}) {
      ensureEncoder(encoder);
      if (
        Number.isFinite(options.mergeCacheSize) &&
        typeof encoder.setMergeCacheSize === "function"
      ) {
        encoder.setMergeCacheSize(
          Math.max(0, Math.floor(options.mergeCacheSize)),
        );
      }
      const visualTokenLimit = Number.isFinite(options.visualTokenLimit)
        ? Math.max(20, Math.floor(options.visualTokenLimit))
        : DEFAULT_VISUAL_TOKEN_LIMIT;
      const locale = options.locale || "ca";

      function tokenize(input, callOptions = {}) {
        const text = input == null ? "" : String(input);
        const ids =
          text.length === 0
            ? []
            : encoder.encode(text, { disallowedSpecial: new Set() });
        const grouped = groupDecodedTokens(encoder, ids);

        if (grouped.reconstructed !== text) {
          throw new Error(
            "La visualització no ha pogut reconstruir el text exactament.",
          );
        }
        if (grouped.groupedUntil !== ids.length) {
          throw new Error(
            "La visualització no ha agrupat tots els identificadors.",
          );
        }

        const characters = graphemeCount(text, locale);
        const words = wordCount(text, locale);
        const visible = selectVisibleGroups(
          grouped.groups,
          ids.length,
          visualTokenLimit,
        );
        const result = {
          tokenCount: ids.length,
          graphemeCount: characters,
          wordCount: words,
          tokensPerGrapheme: characters > 0 ? ids.length / characters : 0,
          tokensPerWord: words > 0 ? ids.length / words : 0,
          groups: visible.groups,
          totalGroupCount: grouped.groups.length,
          truncated: visible.truncated,
          omittedTokenCount: visible.omittedTokenCount,
          reconstructionVerified: true,
        };

        if (callOptions.includeAllGroups) {
          result.ids = ids;
          result.allGroups = grouped.groups;
        }

        return result;
      }

      function safeTokenize(input, callOptions = {}) {
        try {
          return {
            ok: true,
            ...tokenize(input, callOptions),
          };
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          };
        }
      }

      return {
        tokenize,
        safeTokenize,
        graphemeCount: (text) => graphemeCount(String(text || ""), locale),
        wordCount: (text) => wordCount(String(text || ""), locale),
        visualTokenLimit,
      };
    }

    return {
      DEFAULT_VISUAL_TOKEN_LIMIT,
      createTokenizerEngine,
      describeText,
      graphemeCount,
      wordCount,
    };
  },
);
