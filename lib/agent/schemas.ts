import { z } from "zod";

export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  try {
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape as Record<string, z.ZodType>;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = inferFieldSchema(value);
        if (!isOptional(value)) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }
  } catch {
    // fallback
  }

  return { type: "object", properties: {} };
}

function isOptional(field: z.ZodType): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeName = (field as any)._zod?.def?.type ?? (field as any)._def?.typeName;
  return typeName === "ZodOptional" || typeName === "optional";
}

function inferFieldSchema(field: z.ZodType): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (field as any)._zod?.def ?? (field as any)._def ?? {};
  const typeName = def.type ?? def.typeName ?? "";

  if (typeName === "ZodString" || typeName === "string") {
    return { type: "string" };
  }
  if (typeName === "ZodNumber" || typeName === "number") {
    return { type: "number" };
  }
  if (typeName === "ZodBoolean" || typeName === "boolean") {
    return { type: "boolean" };
  }
  if (typeName === "ZodEnum" || typeName === "enum") {
    const values = def.values ?? def.entries;
    if (Array.isArray(values)) {
      return { type: "string", enum: values };
    }
    return { type: "string" };
  }
  if (typeName === "ZodOptional" || typeName === "optional") {
    const inner = def.innerType ?? def.wrapped;
    if (inner) return inferFieldSchema(inner);
    return { type: "string" };
  }
  if (typeName === "ZodDefault" || typeName === "default") {
    const inner = def.innerType ?? def.wrapped;
    if (inner) return inferFieldSchema(inner);
    return { type: "string" };
  }
  if (typeName === "ZodArray" || typeName === "array") {
    const inner = def.type ?? def.element;
    if (inner) return { type: "array", items: inferFieldSchema(inner) };
    return { type: "array", items: { type: "string" } };
  }
  return { type: "string" };
}
