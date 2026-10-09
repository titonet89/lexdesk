import { ImageResponse } from "next/og";
import { serviceAreasLabel, siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.lawyer.name} — ${siteConfig.lawyer.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const { lawyer, practiceAreas } = siteConfig;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0f172a 0%, #0a1020 100%)",
          color: "#f8fafc",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              border: "2px solid #b8892f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dcb877",
              fontSize: 30,
            }}
          >
            {lawyer.monogram}
          </div>
          <div style={{ fontSize: 30, color: "#cbd5e1" }}>{serviceAreasLabel}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -1 }}>{lawyer.name}</div>
          <div style={{ marginTop: 18, fontSize: 36, color: "#dcb877" }}>{lawyer.title}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {practiceAreas.map((area) => (
            <div
              key={area.id}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid rgba(248,250,252,0.2)",
                fontSize: 24,
                color: "#e2e8f0",
                fontFamily: "sans-serif",
              }}
            >
              {area.title}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
