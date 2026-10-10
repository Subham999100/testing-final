import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export type Expression =
  | { term: string }
  | { op: "AND" | "OR"; left: Expression; right: Expression }
  | { op: "NOT"; child: Expression };
/** AND has precedence over OR; adjacent terms imply AND. Quoted phrases stay intact. */
export function parseKeywords(input: string): Expression | null {
  if (!input.trim()) return null;
  if (input.length > 500)
    throw new BadRequestException("Keywords must be at most 500 characters");
  const tokens = input.match(/"[^"\r\n]*"|\(|\)|[^\s()"]+/g) ?? [];
  if ((input.match(/"/g)?.length ?? 0) % 2 || tokens.length > 80)
    throw new BadRequestException("Invalid keyword expression");
  let at = 0;
  const fail = (): never => {
    throw new BadRequestException(
      "Use keywords, quoted phrases, AND, OR, NOT and balanced parentheses",
    );
  };
  function atom(depth: number): Expression {
    if (depth > 12) return fail();
    const token = tokens[at++];
    if (!token) return fail();
    if (token === "NOT") return { op: "NOT", child: atom(depth + 1) };
    if (token === "(") {
      const node = or(depth + 1);
      if (tokens[at++] !== ")") return fail();
      return node;
    }
    if ([")", "AND", "OR"].includes(token)) return fail();
    const term = token.replace(/^"|"$/g, "").trim();
    if (!term) return fail();
    return { term };
  }
  function and(depth: number): Expression {
    let left = atom(depth);
    while (at < tokens.length && ![")", "OR"].includes(tokens[at])) {
      if (tokens[at] === "AND") at++;
      left = { op: "AND", left, right: atom(depth) };
    }
    return left;
  }
  function or(depth: number): Expression {
    let left = and(depth);
    while (tokens[at] === "OR") {
      at++;
      left = { op: "OR", left, right: and(depth) };
    }
    return left;
  }
  const result = or(0);
  if (at !== tokens.length) return fail();
  return result;
}
export const escapedLike = (s: string) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;
export function keywordSql(
  node: Expression | null,
  document: Prisma.Sql,
): Prisma.Sql {
  if (!node) return Prisma.sql`TRUE`;
  if ("term" in node)
    return Prisma.sql`(${document} ILIKE ${escapedLike(node.term)})`;
  if (node.op === "NOT")
    return Prisma.sql`NOT (${keywordSql(node.child, document)})`;
  return node.op === "AND"
    ? Prisma.sql`(${keywordSql(node.left, document)} AND ${keywordSql(node.right, document)})`
    : Prisma.sql`(${keywordSql(node.left, document)} OR ${keywordSql(node.right, document)})`;
}
export function positiveTerms(node: Expression | null): string[] {
  if (!node) return [];
  if ("term" in node) return [node.term];
  if (node.op === "NOT") return [];
  return [
    ...new Set([...positiveTerms(node.left), ...positiveTerms(node.right)]),
  ];
}

/** Conservative, explicit skill aliases. Off by default for saved legacy searches. */
export function expandSynonyms(
  expr: Expression | null,
  disabled: boolean,
): Expression | null {
  if (!expr || disabled) return expr;
  const aliases = [
    ["js", "javascript"],
    ["ts", "typescript"],
    ["postgres", "postgresql"],
    ["aws", "amazon web services"],
    ["k8s", "kubernetes"],
    ["nodejs", "node.js"],
    ["reactjs", "react.js", "react"],
    ["ml", "machine learning"],
  ];
  if ("term" in expr) {
    const group = aliases.find((g) => g.includes(expr.term.toLowerCase()));
    return group
      ? group
          .map((value) => ({ term: value }) as Expression)
          .reduce((left, right) => ({ op: "OR", left, right }))
      : expr;
  }
  if (expr.op === "NOT")
    return { op: "NOT", child: expandSynonyms(expr.child, disabled)! };
  return {
    ...expr,
    left: expandSynonyms(expr.left, disabled)!,
    right: expandSynonyms(expr.right, disabled)!,
  };
}
export function plainKeywords(value: string): Expression | null {
  if (value.length > 500) throw new BadRequestException("Search is too long");
  const terms = value.match(/"[^"]+"|[^\s]+/g) ?? [];
  if (terms.length > 80) throw new BadRequestException("Too many search terms");
  return terms
    .map((v) => ({ term: v.replace(/^"|"$/g, "") }) as Expression)
    .reduce<Expression | null>(
      (left, right) => (left ? { op: "AND", left, right } : right),
      null,
    );
}
