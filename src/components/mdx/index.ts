import H1 from "./H1.astro";
import H2 from "./H2.astro";
import H3 from "./H3.astro";
import H4 from "./H4.astro";
import P from "./P.astro";
import Ul from "./Ul.astro";
import Ol from "./Ol.astro";
import Strong from "./Strong.astro";
import Em from "./Em.astro";
import Blockquote from "./Blockquote.astro";
import A from "./A.astro";

// Maps markdown elements to the same class names leerob.com uses.
export const mdxComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  ul: Ul,
  ol: Ol,
  strong: Strong,
  em: Em,
  blockquote: Blockquote,
  a: A,
};
