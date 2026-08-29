import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "終バス通知",
    short_name: "終バス通知",
    description: "京都府の終バスを確認するアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#0f766e",
    icons:[
      {
        src: "/1.png"
      }
    ]
  };
}
