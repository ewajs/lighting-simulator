// TypeDoc plugin: leaves Lit's own API out of our component pages. Every
// element extends LitElement, which would add ~50 inherited members
// (requestUpdate, renderRoot, …) and our lifecycle overrides (render,
// updated, styles), whose copied Lit comments link to things outside our
// docs. None of it is our API; Lit documents it at https://lit.dev.

import { Converter, ReflectionKind } from 'typedoc';

/** Lit's base classes. TypeDoc records inherited members by qualified name, e.g. `LitElement.styles`. */
const LIT_CLASSES = ['LitElement', 'ReactiveElement'];

const fromLit = (reference) =>
  reference !== undefined &&
  LIT_CLASSES.some((name) => reference.qualifiedName.startsWith(`${name}.`));

/** @param {import('typedoc').Application} app */
export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) => {
    const members = context.project.getReflectionsByKind(
      ReflectionKind.Property | ReflectionKind.Method | ReflectionKind.Accessor,
    );
    for (const member of members) {
      if (fromLit(member.inheritedFrom) || fromLit(member.overwrites)) {
        context.project.removeReflection(member);
      }
    }
  });
}
