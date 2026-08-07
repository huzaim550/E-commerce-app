"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { saveHomeSections } from "@/app/actions/admin/settings";
import {
  sectionLabels,
  sectionTypes,
  type HomeSection,
  type SectionType,
} from "@/lib/types";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ImageUploader } from "@/components/admin/image-uploader";

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "image";
  hint?: string;
};

/**
 * Which props each section type exposes. Adding a section type means adding a
 * renderer in components/sections/registry.tsx and an entry here.
 */
const sectionFieldDefs: Record<SectionType, FieldDef[]> = {
  hero: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "subheading", label: "Subheading", type: "textarea" },
    { key: "ctaLabel", label: "Button label", type: "text" },
    { key: "ctaHref", label: "Button link", type: "text", hint: "e.g. /products" },
    { key: "imageUrl", label: "Background image", type: "image" },
  ],
  featured: [
    { key: "heading", label: "Heading", type: "text" },
    {
      key: "limit",
      label: "How many products",
      type: "number",
      hint: "Falls back to newest products if nothing is marked featured.",
    },
  ],
  categoryGrid: [{ key: "heading", label: "Heading", type: "text" }],
  banner: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "body", label: "Body", type: "textarea" },
    { key: "ctaLabel", label: "Button label", type: "text" },
    { key: "ctaHref", label: "Button link", type: "text" },
  ],
  richText: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "body", label: "Body", type: "textarea", hint: "Markdown is supported." },
  ],
};

export function HomeSectionsEditor({ initial }: { initial: HomeSection[] }) {
  const [sections, setSections] = useState<HomeSection[]>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [adding, setAdding] = useState<SectionType>("hero");

  function update(index: number, patch: Partial<HomeSection>) {
    const next = [...sections];
    next[index] = { ...next[index], ...patch };
    setSections(next);
  }

  function updateProp(index: number, key: string, value: unknown) {
    update(index, { props: { ...sections[index].props, [key]: value } });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveHomeSections(JSON.stringify(sections));
      setFeedback(
        result.ok
          ? { tone: "success", text: result.message ?? "Saved." }
          : { tone: "error", text: result.error },
      );
    });
  }

  return (
    <div className="space-y-4">
      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={adding}
          onChange={(e) => setAdding(e.target.value as SectionType)}
          className="max-w-52"
        >
          {sectionTypes.map((type) => (
            <option key={type} value={type}>
              {sectionLabels[type]}
            </option>
          ))}
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setSections([
              ...sections,
              {
                id: `${adding}-${Date.now()}`,
                type: adding,
                enabled: true,
                props: {},
              },
            ])
          }
        >
          <Plus className="size-4" />
          Add section
        </Button>

        <Button type="button" onClick={save} disabled={pending} className="ml-auto">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save homepage
        </Button>
      </div>

      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          No sections yet. Add one above — until you do, the homepage shows a
          default hero, category grid and featured products.
        </p>
      )}

      {sections.map((section, index) => (
        <Card key={section.id} className={section.enabled ? "" : "opacity-60"}>
          <div className="mb-4 flex items-center gap-2">
            <span className="font-medium">{sectionLabels[section.type]}</span>

            <div className="ml-auto flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => update(index, { enabled: !section.enabled })}
                title={section.enabled ? "Hide this section" : "Show this section"}
              >
                {section.enabled ? (
                  <Eye className="size-4" />
                ) : (
                  <EyeOff className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move section up"
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => move(index, 1)}
                disabled={index === sections.length - 1}
                aria-label="Move section down"
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSections(sections.filter((_, i) => i !== index))}
                aria-label="Remove section"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sectionFieldDefs[section.type].map((def) => {
              const value = section.props[def.key];

              if (def.type === "image") {
                return (
                  <div key={def.key} className="sm:col-span-2">
                    <ImageUploader
                      label={def.label}
                      single
                      value={typeof value === "string" && value ? [value] : []}
                      onChange={(next) => updateProp(index, def.key, next[0] ?? "")}
                    />
                  </div>
                );
              }

              if (def.type === "textarea") {
                return (
                  <Field
                    key={def.key}
                    label={def.label}
                    hint={def.hint}
                    className="sm:col-span-2"
                  >
                    <Textarea
                      value={typeof value === "string" ? value : ""}
                      onChange={(e) => updateProp(index, def.key, e.target.value)}
                      rows={3}
                    />
                  </Field>
                );
              }

              return (
                <Field key={def.key} label={def.label} hint={def.hint}>
                  <Input
                    type={def.type === "number" ? "number" : "text"}
                    value={
                      typeof value === "string" || typeof value === "number"
                        ? String(value)
                        : ""
                    }
                    onChange={(e) =>
                      updateProp(
                        index,
                        def.key,
                        def.type === "number" ? Number(e.target.value) : e.target.value,
                      )
                    }
                  />
                </Field>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
