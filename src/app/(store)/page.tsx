import { getSettings } from "@/lib/settings";
import { parseHomeSections } from "@/lib/types";
import { renderSection, defaultSections } from "@/components/sections/registry";

export default async function HomePage() {
  const settings = await getSettings();

  const configured = parseHomeSections(settings.homeSections).filter((s) => s.enabled);
  const sections = configured.length > 0 ? configured : defaultSections;

  return <div className="pb-8">{sections.map(renderSection)}</div>;
}
