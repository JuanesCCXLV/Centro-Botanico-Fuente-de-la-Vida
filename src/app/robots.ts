import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { absoluta } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/"] },
    sitemap: absoluta(env.SITE_URL, "/sitemap.xml"),
  };
}
