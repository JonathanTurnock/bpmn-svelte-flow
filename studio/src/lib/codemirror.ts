import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * Syntax colors for every CodeMirror instance in the studio, expressed as CSS
 * variables so the palette follows the app theme (defined in app.css for both
 * light and dark).
 */
export const bsfHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword], color: 'var(--cm-keyword)' },
    { tag: [t.string, t.special(t.string), t.docString], color: 'var(--cm-string)' },
    { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--cm-number)' },
    { tag: [t.comment], color: 'var(--cm-comment)', fontStyle: 'italic' },
    { tag: [t.propertyName, t.attributeName], color: 'var(--cm-property)' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--cm-function)' },
    { tag: [t.variableName, t.definition(t.variableName), t.special(t.variableName)], color: 'var(--cm-variable)' },
    { tag: [t.tagName], color: 'var(--cm-tag)' },
    { tag: [t.operator, t.punctuation, t.bracket], color: 'var(--cm-punctuation)' },
    { tag: [t.regexp, t.escape], color: 'var(--cm-regexp)' }
  ])
);
