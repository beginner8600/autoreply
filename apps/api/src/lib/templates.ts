export function renderTemplate(template: string, variables: Record<string, string | undefined>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return variables[key] ?? "";
  });
}
