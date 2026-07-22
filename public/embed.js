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
  iframe.style.border = "0";
  iframe.style.background = "transparent";
  iframe.style.zIndex = "2147483000";
  iframe.style.maxWidth = "100vw";
  iframe.style.maxHeight = "100vh";
  iframe.style.transition = "width 0.2s ease, height 0.2s ease";

  // حجم الإطار عند الإغلاق يقتصر على الفقاعة فقط، حتى لا يحجب النقر على الموقع المضيف
  // خلف الويدجت. عند الفتح يكبر الإطار: شاشة كاملة على الجوال، وصندوق عائم على الشاشات الكبيرة.
  var MOBILE_BREAKPOINT = 640; // يطابق نقطة توقف sm في Tailwind
  var CLOSED_SIZE = { width: "88px", height: "88px" };
  var DESKTOP_OPEN_SIZE = { width: "440px", height: "760px" };
  var isCurrentlyOpen = false;

  function isMobileViewport() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function applySize(isOpen) {
    if (!isOpen) {
      iframe.style.width = CLOSED_SIZE.width;
      iframe.style.height = CLOSED_SIZE.height;
      return;
    }
    if (isMobileViewport()) {
      iframe.style.width = "100vw";
      iframe.style.height = "100dvh";
    } else {
      iframe.style.width = DESKTOP_OPEN_SIZE.width;
      iframe.style.height = DESKTOP_OPEN_SIZE.height;
    }
  }

  applySize(false);

  window.addEventListener("message", function (event) {
    if (event.origin !== SCRIPT_ORIGIN) return;
    var data = event.data;
    if (!data || data.source !== "ramla-chat-widget") return;
    isCurrentlyOpen = !!data.isOpen;
    applySize(isCurrentlyOpen);
  });

  window.addEventListener("resize", function () {
    applySize(isCurrentlyOpen);
  });

  document.body.appendChild(iframe);
})();
