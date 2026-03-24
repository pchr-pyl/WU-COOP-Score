import Link from "next/link";
import { Atom, Globe, Lightbulb, UsersRound } from "lucide-react";

const routes = [
  {
    href: "/sci-tech",
    title: "วิทยาศาสตร์และเทคโนโลยี",
    icon: Atom,
    featured: true,
  },
  {
    href: "/social-huma",
    title: "สังคมศาสตร์ มนุษยศาสตร์",
    icon: UsersRound,
    featured: false,
  },
  {
    href: "/innovation",
    title: "นวัตกรรมดีเด่น",
    icon: Lightbulb,
    featured: false,
  },
  {
    href: "/inter",
    title: "นานาชาติดีเด่น",
    icon: Globe,
    featured: false,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#ebecef] text-[#111315] px-5 py-14 md:px-6 md:py-20">
      <div className="mx-auto max-w-[760px] space-y-8 md:space-y-10">
        <header className="space-y-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">เลือกประเภท</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {routes.map((item) => (
            <CategoryCard key={item.href} href={item.href} title={item.title} featured={item.featured} Icon={item.icon} />
          ))}
        </div>
      </div>
    </main>
  );
}

type CategoryCardProps = {
  href: string;
  title: string;
  featured: boolean;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

function CategoryCard({ href, title, featured, Icon }: CategoryCardProps) {
  return (
    <Link
      href={href}
      className={[
        "group rounded-2xl md:rounded-3xl px-6 py-7 md:px-8 md:py-8 shadow-sm transition-all border",
        "min-h-[112px] flex flex-col items-center justify-center gap-3 md:gap-4",
        featured
          ? "bg-gradient-to-b from-[#7c1dff] to-[#5d00d2] text-white border-[#6e09e1]"
          : "bg-[#f0f1f3] text-[#111315] border-[#eceef1] hover:bg-white hover:shadow-md",
      ].join(" ")}
    >
      <Icon size={38} className={featured ? "text-white" : "text-[#2a2d31]"} />
      <h2 className="text-3xl md:text-[2rem] font-semibold tracking-tight leading-tight text-center">{title}</h2>
    </Link>
  );
}
