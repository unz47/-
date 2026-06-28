// CSS の取り込みに型を与える（Expo テンプレ/NativeWind 用）。
// side-effect import（import "@/global.css"）と CSS Modules の両方をカバー。
declare module "*.css";
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
