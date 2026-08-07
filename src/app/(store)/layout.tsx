import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { BackButton } from "@/components/back-button";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hidden on the homepage, where there's nothing above to go back to. */}
        <div className="container-store pt-4 empty:hidden">
          <BackButton hideOn={["/"]} />
        </div>
        {children}
      </main>
      <Footer />
    </>
  );
}
