import Link from "next/link";
import { Atom, Globe, Lightbulb, UsersRound, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import type { ComponentType } from "react";

const routes = [
  {
    href: "/sci-tech",
    title: "วิทยาศาสตร์และเทคโนโลยี",
    subtitle: "Science & Technology",
    icon: Atom,
  },
  {
    href: "/social-huma",
    title: "สังคมศาสตร์ มนุษยศาสตร์",
    subtitle: "Social Sciences & Humanities",
    icon: UsersRound,
  },
  {
    href: "/innovation",
    title: "นวัตกรรมดีเด่น",
    subtitle: "Innovation",
    icon: Lightbulb,
  },
  {
    href: "/inter",
    title: "นานาชาติดีเด่น",
    subtitle: "International Achievement",
    icon: Globe,
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#f8f9fa] text-[#191c1d] px-4 py-10 sm:px-5 sm:py-12 md:px-8 md:py-20 leading-[1.75] overflow-hidden">
      <div className="fixed top-0 left-0 h-1 w-full bg-gradient-to-r from-[#9f4200] to-[#fe6c00]" />

      <div className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-[#5f00e3]/6 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 right-0 w-96 h-96 rounded-full bg-[#fe6c00]/8 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-10 sm:space-y-12 md:space-y-20">
        <header className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] md:rounded-[1.75rem] px-4 py-6 sm:px-6 sm:py-7 md:px-10 md:py-10 shadow-[0_20px_40px_rgba(25,28,29,0.04)]">
          <div className="grid md:grid-cols-[160px_1fr] gap-5 sm:gap-7 md:gap-10 items-center">
            <Image
              src="/branding/coop-logo.png"
              alt="COOP Walailak University"
              className="w-24 sm:w-28 md:w-36 h-auto object-contain mx-auto md:mx-0"
              width={144}
              height={144}
              priority
            />

            <div className="space-y-2 sm:space-y-3 text-center md:text-left">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.26em] text-[#5f00e3]/60 font-semibold">WU COOP SCORE 2026</p>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">เลือกรูปแบบการประเมิน</h1>
              <p className="text-sm sm:text-base md:text-lg text-[#191c1d]/75">
                ศูนย์สหกิจศึกษาและพัฒนาอาชีพ มหาวิทยาลัยวลัยลักษณ์
              </p>
              <p className="text-[11px] sm:text-xs md:text-sm tracking-[0.04em] sm:tracking-[0.08em] uppercase text-[#191c1d]/45 break-words">
                THE CENTER FOR COOPERATIVE EDUCATION AND CAREER DEVELOPMENT WALAILAK UNIVERSITY
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {routes.map((item, index) => (
              <CategoryCard
                key={item.href}
                href={item.href}
                title={item.title}
                subtitle={item.subtitle}
                index={index}
                Icon={item.icon}
              />
            ))}
          </div>

          <p className="text-xs md:text-sm text-[#191c1d]/50 pl-1 md:pl-2">
            เลือกหมวดที่ต้องการ จากนั้นระบบจะพาไปหน้าแบบประเมินโดยตรง
          </p>
        </section>

        <section>
          <Link
            href="/dashboard"
            className="flex items-center gap-4 rounded-[1.25rem] px-6 py-5 bg-white/80 backdrop-blur-xl shadow-[0_8px_24px_rgba(25,28,29,0.06)] hover:bg-gradient-to-br hover:from-[#9f4200] hover:to-[#fe6c00] hover:text-white transition-all duration-300 group"
          >
            <LayoutDashboard size={26} className="text-[#5f00e3] group-hover:text-white shrink-0" />
            <div>
              <p className="font-bold text-base">Dashboard คะแนน</p>
              <p className="text-xs text-[#191c1d]/50 group-hover:text-white/80">ดูสรุปคะแนน อันดับ และสถิติแบบ Real-time</p>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}

type CategoryCardProps = {
  href: string;
  title: string;
  subtitle: string;
  index: number;
  Icon: ComponentType<{ size?: number; className?: string }>;
};

function CategoryCard({ href, title, subtitle, index, Icon }: CategoryCardProps) {
  const staggerClass = index % 2 === 1 ? "md:translate-y-3" : "";

  return (
    <Link
      href={href}
      className={[
        "group rounded-[1.25rem] md:rounded-[1.5rem] px-5 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 transition-all duration-300",
        "min-h-[146px] sm:min-h-[160px] md:min-h-[190px] flex flex-col justify-between",
        "shadow-[0_20px_40px_rgba(25,28,29,0.04)]",
        "bg-[#f3f4f5] text-[#191c1d] hover:text-white focus-visible:text-white",
        "active:text-white",
        "hover:bg-gradient-to-br hover:from-[#9f4200] hover:to-[#fe6c00]",
        "focus-visible:bg-gradient-to-br focus-visible:from-[#9f4200] focus-visible:to-[#fe6c00]",
        "active:bg-gradient-to-br active:from-[#9f4200] active:to-[#fe6c00]",
        staggerClass,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#191c1d]/45 group-hover:text-white/80 group-focus-visible:text-white/80">
          Path {href}
        </p>
        <Icon size={30} className="text-[#5f00e3] group-hover:text-white group-focus-visible:text-white" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl md:text-[2rem] font-bold tracking-tight leading-tight">{title}</h2>
        <p className="text-sm md:text-base text-[#191c1d]/60 group-hover:text-white/80 group-focus-visible:text-white/80">{subtitle}</p>
      </div>
    </Link>
  );
}
