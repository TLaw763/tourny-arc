export function ThemeScript() {
  const script = `(function(){try{var m=localStorage.getItem("color-mode");if(m==="dark"||m==="light"){document.documentElement.setAttribute("data-color-mode",m);}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
