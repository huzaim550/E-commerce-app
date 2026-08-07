import { PageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/simple-forms";

export default function NewContentPage() {
  return (
    <>
      <PageHeader title="New page" description="Written in markdown, served at /p/slug." />
      <PageForm />
    </>
  );
}
