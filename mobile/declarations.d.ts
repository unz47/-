// CSS の取り込みに型を与える（Expo テンプレ/NativeWind 用）。
// side-effect import（import "@/global.css"）と CSS Modules の両方をカバー。
declare module "*.css";
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

// drizzle-kit が生成する migrations.js（.sql/.json を取り込む）。
declare module "*/drizzle/migrations" {
  const value: {
    journal: { entries: { idx: number; tag: string }[] };
    migrations: Record<string, string>;
  };
  export default value;
}
