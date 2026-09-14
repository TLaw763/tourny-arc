import Script from "next/script";

const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("color-mode");document.documentElement.setAttribute("data-color-mode",m==="light"||m==="dark"?m:"dark");}catch(e){document.documentElement.setAttribute("data-color-mode","dark");}})();`;

export function ThemeScript() {
  return (
    <Script id="theme-init" strategy="beforeInteractive">
      {THEME_INIT_SCRIPT}
    </Script>
  );
}
