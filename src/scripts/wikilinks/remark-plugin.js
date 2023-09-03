import { fromMarkdown } from "./mdast-util";
import { wikiLink } from "./micromark-extension";

export function wikiLinkPlugin(opts = {}) {
  const data = this.data();

  function add(field, value) {
    if (data[field]) data[field].push(value);
    else data[field] = [value];
  }

  add("micromarkExtensions", wikiLink(opts));
  add("fromMarkdownExtensions", fromMarkdown(opts));
}

export function debugPlugin() {
  return (tree) => {
    console.dir(tree, { depth: null });
    return tree;
  };
}
