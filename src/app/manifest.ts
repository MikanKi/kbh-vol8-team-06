import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "最寄りまで急げ！",
    short_name: "最寄り急げ！",
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
