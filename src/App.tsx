import { Link } from 'react-router-dom'
import { ArrowRight, Bullet } from './sign'
import { LINES } from './lines'

export default function App() {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center px-5 py-10 sm:px-10">
      <div className="flex w-full max-w-[800px] flex-col gap-1.5">
        {/* Station name: name flush left, bullets for the lines that stop here */}
        <section className="sign sign-in flex flex-col gap-1.5 px-7 pt-6 pb-7 sm:px-10 sm:pt-7 sm:pb-8" style={{ ['--i' as string]: 0 }}>
          <h1 className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="text-[36px] leading-10 font-medium tracking-[-0.01em] sm:text-[44px] sm:leading-12">Bryce Conrad</span>
            <span aria-hidden className="flex items-center gap-2">
              {LINES.map((line) => (
                <Bullet key={line.letter} letter={line.letter} color={line.color} ink={line.ink} size={36} />
              ))}
            </span>
          </h1>
          <p className="text-[20px] leading-7 sm:text-[22px]">
            wayfinding.
          </p>
        </section>

        {/* Directional sign: one destination per line, arrows in the right-edge lane */}
        <nav aria-label="Links" className="sign sign-in flex flex-col gap-4 px-7 py-6 sm:gap-[18px] sm:px-10" style={{ ['--i' as string]: 1 }}>
          {LINES.map((line) => {
            const body = (
              <>
                <Bullet letter={line.letter} color={line.color} ink={line.ink} size={40} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[20px] leading-6 font-medium">{line.label}</span>
                  <span className="truncate text-[15px] leading-[18px]">to {line.to}</span>
                </span>
                <ArrowRight />
              </>
            )
            const className = 'route flex items-center gap-4'
            return line.internal ? (
              <Link key={line.label} to={line.href} className={className}>
                {body}
              </Link>
            ) : (
              <a
                key={line.label}
                href={line.href}
                target={line.href.startsWith('http') ? '_blank' : undefined}
                rel={line.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={className}
              >
                {body}
              </a>
            )
          })}
        </nav>
      </div>
    </main>
  )
}
