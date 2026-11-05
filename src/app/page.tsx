import { JsonLd } from "@/components/seo/JsonLd";
import { CampaignBanner } from "@/components/CampaignBanner";
import { BestSellers } from "@/components/BestSellers";
import { Hero } from "@/components/Hero";
import { HomeCategories } from "@/components/HomeCategories";
import { NewArrivals } from "@/components/NewArrivals";
import { TrustStrip } from "@/components/TrustStrip";
import { BrandIntroduction } from "@/components/BrandIntroduction";
import { RecentlyViewed } from "@/components/discovery/RecentlyViewed";
import { organizationJsonLd } from "@/lib/seo";

/**
 * HSP Mart homepage — premium editorial ecommerce layout.
 *
 * Rhythm follows a clean commercial structure:
 * Announcement bar → Navbar → Hero → Trust strip → Categories →
 * Recently Viewed → Brand Introduction → Featured Products → Campaign Banners →
 * New Arrivals.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Hero />
      <TrustStrip />
      <HomeCategories />
      <RecentlyViewed title="Recently viewed" />
      <BrandIntroduction />
      <BestSellers />
      <CampaignBanner variant="bulk" />
      <CampaignBanner variant="gifting" />
      <NewArrivals />
    </>
  );
}
