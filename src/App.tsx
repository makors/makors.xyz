import './App.css'
import '@fontsource-variable/geist'
import confetti from 'canvas-confetti'
import { ArrowUpRight } from 'lucide-react'
import type { IconType } from 'react-icons'
import type { ReactNode } from 'react'
import {
  SiRust,
  SiPython,
  SiTypescript,
  SiGo,
  SiReact,
  SiCss,
  SiNextdotjs,
} from 'react-icons/si'
import { LuEye } from 'react-icons/lu'

const about: ReactNode[] = [
  <>sysadmin at <a href="https://sysadmins.tjhsst.edu" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-[4px] hover:decoration-white transition">tjCSL</a>.</>,
  'building dev tools, ticketing, and small experiments.',
  'writing the occasional tangent at readme.sh.',
  <>shipping things that matter at <a href="https://discern.computer" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-[4px] hover:decoration-white transition">discern.computer</a>.</>,
]

type StackEntry = { name: string; icon: IconType; color: string }

const stack: { proficient: StackEntry[]; familiar: StackEntry[] } = {
  proficient: [
    { name: 'Python', icon: SiPython, color: '#3776AB' },
    { name: 'TypeScript', icon: SiTypescript, color: '#3178C6' },
  ],
  familiar: [
    { name: 'React', icon: SiReact, color: '#61DAFB' },
    { name: 'Next.js', icon: SiNextdotjs, color: '#ffffff' },
    { name: 'CSS', icon: SiCss, color: '#1572B6' },
    { name: 'UX/DX', icon: LuEye, color: '#C77DFF' },
    { name: 'Go', icon: SiGo, color: '#00ADD8' },
    { name: 'Rust', icon: SiRust, color: '#DEA584' },
  ],
}

const projects = [
  {
    name: 'dexrs',
    href: 'https://github.com/makors/dexrs',
    desc: 'Rust library for the Dexcom API.',
    status: 'active',
  },
  {
    name: 'openboxoffice',
    href: 'https://openboxoffice.org',
    desc: 'Open-source event ticketing for schools.',
    status: 'in progress',
  },
] as const

const links = [
  { label: 'email', value: 'makors@discern.computer', href: 'mailto:makors@discern.computer' },
  {
    label: 'github',
    value: 'github.com/makors',
    href: 'https://github.com/makors',
  },
  { label: 'writing', value: 'readme.sh', href: 'https://readme.sh' },
] as const

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <section className="grid grid-cols-12 gap-x-8 gap-y-3 py-10 md:py-14">
      <div className="col-span-12 md:col-span-3">
        <h2 className="text-[13px] text-white/40">{label}</h2>
      </div>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </section>
  )
}

function Rule() {
  return <hr className="border-0 border-t border-white/10" />
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-white/80 md:text-base">
      {items.map((line, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="select-none text-white/30">—</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  )
}

function App() {
  const burst = () =>
    confetti({
      particleCount: 80,
      spread: 60,
      startVelocity: 35,
      ticks: 120,
      origin: { y: 0.35 },
      colors: ['#ffffff', '#dddddd', '#888888'],
    })

  return (
    <main className="min-h-screen w-full bg-[#020202] text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6 md:py-24">
        <div className="animated-border bg-[#020202] px-6 py-2 md:px-12 md:py-4">
        {/* hero */}
        <section className="py-10 md:py-14">
          <h1
            onClick={burst}
            className="cursor-pointer select-none text-[clamp(1.75rem,5vw,2.75rem)] font-medium leading-[1] tracking-[-0.035em]"
          >
            hello, world.
          </h1>
          <p className="mt-4 text-[15px] text-white/70 md:text-base">
            hey! i'm makors — i ship things that matter.
          </p>
        </section>

        <Rule />

        {/* about */}
        <Section label="about">
          <Bullets items={about} />
        </Section>

        <Rule />

        {/* stack */}
        <Section label="stack">
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-[12px] text-white/30">proficient</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
                {stack.proficient.map(({ name, icon: Icon, color }) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-2 text-[15px] text-white/85 md:text-base"
                  >
                    <Icon size={16} style={{ color }} />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[12px] text-white/30">familiar</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
                {stack.familiar.map(({ name, icon: Icon, color }) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-2 text-[15px] text-white/65 md:text-base"
                  >
                    <Icon size={16} style={{ color }} />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Rule />

        {/* work */}
        <Section label="work">
          <ul className="flex flex-col">
            {projects.map((p, i) => (
              <li key={p.name}>
                {i > 0 && <div className="my-4 h-px bg-white/[0.06]" />}
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5 text-[15px] text-white md:text-base">
                      {p.name}
                      <ArrowUpRight
                        size={14}
                        strokeWidth={1.5}
                        className="text-white/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                      />
                    </span>
                    <span className="text-[12px] text-white/35">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-white/55 md:text-[15px]">
                    {p.desc}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Rule />

        {/* contact */}
        <Section label="elsewhere">
          <ul className="flex flex-col gap-3">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith('http') ? '_blank' : undefined}
                  rel={
                    l.href.startsWith('http') ? 'noopener noreferrer' : undefined
                  }
                  className="group inline-flex items-baseline gap-4"
                >
                  <span className="w-20 text-[12px] text-white/35">
                    {l.label}
                  </span>
                  <span className="text-[15px] text-white/85 underline decoration-white/15 underline-offset-[6px] transition group-hover:decoration-white md:text-base">
                    {l.value}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        </div>
      </div>
    </main>
  )
}

export default App
