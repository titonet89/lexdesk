import type { MetadataRoute } from "next";
import { isProductionDeployment, siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/acceso", "/auth"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
