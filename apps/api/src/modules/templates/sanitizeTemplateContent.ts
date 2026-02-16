const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeNode = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => sanitizeNode(item));
  }

  if (!isObject(node)) {
    return node;
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    next[key] = sanitizeNode(value);
  }

  // Keep text-layer box/style data, but strip the actual text content.
  if (next.type === 'text' && typeof next.text === 'string') {
    next.text = '';
  }

  return next;
};

export const sanitizeTemplateContent = (content: Record<string, unknown>): Record<string, unknown> =>
  sanitizeNode(content) as Record<string, unknown>;
