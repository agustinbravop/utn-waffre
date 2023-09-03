const codes = {
  horizontalTab: -2,
  virtualSpace: -1,
  nul: 0,
  eof: null,
  space: 32,
};

function markdownLineEndingOrSpace(code) {
  return code < codes.nul || code === codes.space;
}

function markdownLineEnding(code) {
  return code < codes.horizontalTab;
}

/** @typedef WikiLinkOptions
 * @type {object}
 * @property {string} aliasDivider - the '|' in [[link|alias]]
 */

/** typedef WikiLink
 * @type {function}
 * @param {WikiLinkOptions} opts
 */
function wikiLink(opts = {}) {
  const aliasDivider = opts.aliasDivider || "|";
  const aliasMarker = aliasDivider;
  const startMarker = "[[";
  const endMarker = "]]";

  function tokenize(effects, ok, nok) {
    let data;
    let alias;

    let aliasCursor = 0;
    let startMarkerCursor = 0;
    let endMarkerCursor = 0;

    return start;

    function start(code) {
      if (code !== startMarker.charCodeAt(startMarkerCursor)) return nok(code);

      effects.enter("wikiLink");
      effects.enter("wikiLinkMarker");

      return consumeStart(code);
    }

    function consumeStart(code) {
      if (startMarkerCursor === startMarker.length) {
        effects.exit("wikiLinkMarker");
        return consumeData(code);
      }

      if (code !== startMarker.charCodeAt(startMarkerCursor)) {
        return nok(code);
      }

      effects.consume(code);
      startMarkerCursor++;

      return consumeStart;
    }

    function consumeData(code) {
      if (markdownLineEnding(code) || code === codes.eof) {
        return nok(code);
      }

      effects.enter("wikiLinkData");
      effects.enter("wikiLinkTarget");
      return consumeTarget(code);
    }

    function consumeTarget(code) {
      if (code === aliasMarker.charCodeAt(aliasCursor)) {
        if (!data) return nok(code);
        effects.exit("wikiLinkTarget");
        effects.enter("wikiLinkAliasMarker");
        return consumeAliasMarker(code);
      }

      if (code === endMarker.charCodeAt(endMarkerCursor)) {
        if (!data) return nok(code);
        effects.exit("wikiLinkTarget");
        effects.exit("wikiLinkData");
        effects.enter("wikiLinkMarker");
        return consumeEnd(code);
      }

      if (markdownLineEnding(code) || code === codes.eof) {
        return nok(code);
      }

      if (!markdownLineEndingOrSpace(code)) {
        data = true;
      }

      effects.consume(code);

      return consumeTarget;
    }

    function consumeAliasMarker(code) {
      if (aliasCursor === aliasMarker.length) {
        effects.exit("wikiLinkAliasMarker");
        effects.enter("wikiLinkAlias");
        return consumeAlias(code);
      }

      if (code !== aliasMarker.charCodeAt(aliasCursor)) {
        return nok(code);
      }

      effects.consume(code);
      aliasCursor++;

      return consumeAliasMarker;
    }

    function consumeAlias(code) {
      if (code === endMarker.charCodeAt(endMarkerCursor)) {
        if (!alias) return nok(code);
        effects.exit("wikiLinkAlias");
        effects.exit("wikiLinkData");
        effects.enter("wikiLinkMarker");
        return consumeEnd(code);
      }

      if (markdownLineEnding(code) || code === codes.eof) {
        return nok(code);
      }

      if (!markdownLineEndingOrSpace(code)) {
        alias = true;
      }

      effects.consume(code);

      return consumeAlias;
    }

    function consumeEnd(code) {
      if (endMarkerCursor === endMarker.length) {
        effects.exit("wikiLinkMarker");
        effects.exit("wikiLink");
        return ok(code);
      }

      if (code !== endMarker.charCodeAt(endMarkerCursor)) {
        return nok(code);
      }

      effects.consume(code);
      endMarkerCursor++;

      return consumeEnd;
    }
  }

  return {
    text: { 91: { tokenize } }, // 91 is left square bracket in ASCII
  };
}

export { wikiLink };
