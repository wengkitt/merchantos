import { MerchantDashboard } from "@/components/merchant-dashboard";

export const revalidate = 300;

export default function Home() {
  return <MerchantDashboard />;
}
