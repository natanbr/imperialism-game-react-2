// Test helper, not a test file: the visible text of an element as one line. Adjacent text nodes
// (React splits `{n} {name}` into several) are joined as they are; text in different elements is
// joined by one space, so assertions read like the screen ("Untrained 4 1 sick") whatever the markup.
export function text(element: Element): string {
  const parts: string[] = [];
  const walker = element.ownerDocument.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.textContent ?? '';
    const joinsPrevious = node.previousSibling?.nodeType === 3 && parts.length > 0;
    if (joinsPrevious) parts[parts.length - 1] += value;
    else parts.push(value);
  }
  return parts.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');
}
