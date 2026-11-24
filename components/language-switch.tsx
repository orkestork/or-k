"use client";

import { useEffect } from "react";
import { lookup, setLang, useLang, type Lang } from "@/lib/i18n";

const ATTRS = ["aria-label", "alt", "title", "placeholder"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE"]);

// Original copy per node, so switching back always restores the source text.
const textOriginal = new WeakMap<Text, string>();
const textApplied = new WeakMap<Text, string>();
const attrOriginal = new WeakMap<Element, Map<string, string>>();
const attrApplied = new WeakMap<Element, Map<string, string>>();

function skipped(node: Node) {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return !el || SKIP.has(el.tagName) || !!el.closest("[data-no-i18n]");
}

function translateText(node: Text, lang: Lang) {
  const value = node.nodeValue ?? "";
  // React (or a script) changed the text since we last touched it: that is the new original.
  if (textApplied.get(node) !== value) textOriginal.set(node, value);
  const original = textOriginal.get(node) ?? value;
  const hit = lookup(original, lang);
  const next = hit === undefined ? original : original.replace(original.trim(), hit);
  if (next !== value) node.nodeValue = next;
  textApplied.set(node, next);
}

function translateAttrs(el: Element, lang: Lang) {
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (value === null) continue;
    let originals = attrOriginal.get(el);
    let applied = attrApplied.get(el);
    if (!originals) attrOriginal.set(el, (originals = new Map()));
    if (!applied) attrApplied.set(el, (applied = new Map()));
    if (applied.get(name) !== value) originals.set(name, value);
    const original = originals.get(name) ?? value;
    const next = lookup(original, lang) ?? original;
    if (next !== value) el.setAttribute(name, next);
    applied.set(name, next);
  }
}

function translateTree(root: Node, lang: Lang) {
  if (skipped(root)) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateText(root as Text, lang);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateAttrs(root as Element, lang);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (skipped(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) translateText(node as Text, lang);
    else translateAttrs(node as Element, lang);
  }
}

/** Keeps the whole document in the chosen language, including dialogs that mount later. */
function useDocumentTranslation(lang: Lang) {
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "es";
    translateTree(document.body, lang);
    if (lang === "mix") return;
    const pending = new Set<Node>();
    let frame = 0;
    const flush = () => {
      frame = 0;
      observer.disconnect();
      pending.forEach((node) => node.isConnected && translateTree(node, lang));
      pending.clear();
      observer.observe(document.body, options);
    };
    const options: MutationObserverInit = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") mutation.addedNodes.forEach((node) => pending.add(node));
        else pending.add(mutation.target);
      }
      if (!frame) frame = requestAnimationFrame(flush);
    });
    observer.observe(document.body, options);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [lang]);
}

export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  useDocumentTranslation(lang);
  // Clicking the active language again returns to the original mixed copy.
  const choose = (next: Lang) => setLang(lang === next ? "mix" : next);
  return (
    <div className={`langSwitch ${className}`} role="group" aria-label="Idioma" data-no-i18n>
      <button type="button" aria-pressed={lang === "es"} onClick={() => choose("es")} title="Todo en español">ES</button>
      <span aria-hidden="true">/</span>
      <button type="button" aria-pressed={lang === "en"} onClick={() => choose("en")} title="All in English">EN</button>
    </div>
  );
}
