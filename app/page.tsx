import { AuthoritySection } from "@/components/AuthoritySection";
import { ConsultationForm } from "@/components/ConsultationForm";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { FooterSection } from "@/components/FooterSection";
import { HeroSection } from "@/components/HeroSection";
import { PracticeAreas } from "@/components/PracticeAreas";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="contenido">
        <HeroSection />
        <PracticeAreas />
        <AuthoritySection />
        <ConsultationForm />
      </main>
      <FooterSection />
      <FloatingWhatsApp />
    </>
  );
}
