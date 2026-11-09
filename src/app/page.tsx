import { JsonLd } from "@/components/seo/JsonLd";
import { HomeHero } from "@/components/home/HomeHero";
import {
  CloseContact,
  OneHouse,
  OrderTrail,
  ReadyToDispatch,
  SignatureHampers,
} from "@/components/home/HomeSections";
import { NewArrivals } from "@/components/NewArrivals";
import { RecentlyViewed } from "@/components/discovery/RecentlyViewed";
import { organizationJsonLd } from "@/lib/seo";

/**
 * HSP Mart home: a premium corporate gifting house.
 * Emerald hero + occasions, signature hampers, how an order is handled,
 * signature corporate gifts, new arrivals, gifting + office, closing invitation.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <HomeHero />
      <SignatureHampers />
      <OrderTrail />
      <ReadyToDispatch />
      <NewArrivals />
      <OneHouse />
      <RecentlyViewed title="Recently viewed" />
      <CloseContact />
    </>
  );
}
