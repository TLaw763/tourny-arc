export function ThemeScript() {
  const script = `(function(){try{var m=localStorage.getItem("color-mode");document.documentElement.setAttribute("data-color-mode",m==="light"||m==="dark"?m:"dark");}catch(e){document.documentElement.setAttribute("data-color-mode","dark");}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
