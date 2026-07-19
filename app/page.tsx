import ChatWidget from "@/components/chat/ChatWidget";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-rimal-purple-section px-6 py-24 text-white sm:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="w-fit rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide">
            Rimal X — الطائف
          </span>
          <h1 className="text-3xl font-black sm:text-5xl">حاضنة ومسرّعة أعمال رمال</h1>
          <p className="max-w-xl text-sm text-white/80 sm:text-base">
            مساحات عمل، حاضنة، مسرّعة، ودورات تدريبية — جرّب مساعدتنا الذكية "رملة" من الفقاعة
            أسفل الشاشة.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-16 sm:grid-cols-3">
        {[
          { title: "مساحات العمل", desc: "مقعد مرن، مكتب مخصص، أو مكتب خاص." },
          { title: "الحاضنة", desc: "دعم الأفكار الناشئة من الانطلاقة." },
          { title: "المسرّعة", desc: "تسريع النمو للشركات ذات المنتج الجاهز." },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-bold text-rimal-dark-text">{card.title}</h3>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </div>
        ))}
      </section>

      <ChatWidget />
    </main>
  );
}
