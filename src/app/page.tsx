import Link from "next/link";

const routes = [
  {
    href: "/sci-tech",
    title: "วิทยาศาสตร์และเทคโนโลยี",
    desc: "แบบประเมินด้าน Science & Technology",
  },
  {
    href: "/social-huma",
    title: "สังคมศาสตร์ มนุษยศาสตร์",
    desc: "แบบประเมินด้าน Social Sciences & Humanities",
  },
  {
    href: "/innovation",
    title: "นวัตกรรมดีเด่น",
    desc: "แบบประเมินด้าน Innovation",
  },
  {
    href: "/inter",
    title: "นานาชาติดีเด่น",
    desc: "แบบประเมินด้าน International Achievement",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#191c1d] px-4 py-16 md:px-6">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">WU COOP Score System</h1>
          <p className="text-sm md:text-base text-[#191c1d]/60">เลือกรูปแบบการประเมินตามประเภทผลงานสหกิจ</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {routes.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl bg-white p-6 md:p-7 shadow-sm hover:shadow-lg transition-all border border-[#f1f2f3]"
            >
              <div className="text-xs font-black tracking-[0.2em] uppercase text-[#5f00e3]/70">Path {item.href}</div>
              <h2 className="mt-3 text-2xl font-bold">{item.title}</h2>
              <p className="mt-2 text-sm text-[#191c1d]/60">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
