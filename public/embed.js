(function () {
  // يحدّد أصل هذا السكربت نفسه (مثال: https://ramlax-chat.vercel.app) لبناء رابط صفحة /widget
  var SCRIPT_ORIGIN = (function () {
    var scripts = document.getElementsByTagName("script");
    var current = scripts[scripts.length - 1];
    var src = current && current.src;
    if (!src) return "";
    var a = document.createElement("a");
    a.href = src;
    return a.origin;
  })();

  if (!SCRIPT_ORIGIN) return;
  if (document.getElementById("ramla-chat-iframe")) return; // تجنّب الحقن المزدوج عند تحميل السكربت أكثر من مرة

  var iframe = document.createElement("iframe");
  iframe.id = "ramla-chat-iframe";
  iframe.src = SCRIPT_ORIGIN + "/widget";
  iframe.title = "رملة — مساعدة رمال الذكية";
  iframe.setAttribute("allowtransparency", "true");

  // ملاحظة: الموضع الثابت هنا (bottom/right) يطابق الوضع الافتراضي للويدجت (عربي/RTL).
  // الويدجت نفسه يبدّل موضعه داخليًا (يمين↔يسار) عند تبديل اللغة من زر AR/EN، لكن هذا الإطار
  // الخارجي (iframe) لا "يرى" تلك الحالة الداخلية حاليًا، لذا يبقى ثابتًا على اليمين.
  // لموقع إنجليزي بالكامل افتراضيًا، بدّل "right" إلى "left" أدناه، أو نفّذ لاحقًا تزامنًا عبر
  // postMessage بين /app/widget/page.tsx وهذا السكربت لتبديل الموضع تلقائيًا.
  iframe.style.position = "fixed";
  iframe.style.bottom = "0";
  iframe.style.right = "0";
  iframe.style.width = "400px";
  iframe.style.height = "700px";
  iframe.style.maxWidth = "100vw";
  iframe.style.maxHeight = "100vh";
  iframe.style.border = "0";
  iframe.style.background = "transparent";
  iframe.style.zIndex = "2147483000";

  document.body.appendChild(iframe);
})();
