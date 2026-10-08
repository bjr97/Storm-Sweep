import Link from 'next/link'

import { SITE } from '@/lib/site'

/** Shared layout for Terms / Privacy / FAQ (public theme colors). */
export function LegalPage({ title, updated, intro, children }: { title: string; updated?: string; intro?: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl tracking-wide text-[var(--color-text)]">{title}</h1>
      {updated ? <p className="mt-2 font-body text-sm text-[var(--color-text-muted)]">Last updated {updated}</p> : null}
      {intro ? <div className="mt-4 font-body text-base leading-relaxed text-[var(--color-text-muted)]">{intro}</div> : null}
      <div className="mt-8 space-y-8 font-body text-[15px] leading-relaxed text-[var(--color-text-muted)] [&_a]:text-[var(--color-primary-light)] [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-wide [&_h2]:text-[var(--color-text)] [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_strong]:text-[var(--color-text)] [&_ul]:mt-2 [&_ul]:space-y-1.5">
        {children}
      </div>
      <p className="mt-12 border-t border-white/10 pt-6 font-body text-sm text-[var(--color-text-muted)]">
        Questions? <ContactLine /> See also our <Link href="/faq">FAQ</Link>, <Link href="/terms">Terms</Link> and{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </main>
  )
}

/** How to reach us, using whatever contact details are configured. */
export function ContactLine(): React.ReactElement {
  return (
    <>
      {SITE.supportEmail ? (
        <>
          Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
          {SITE.supportPhone ? ' or ' : ', '}
        </>
      ) : null}
      {SITE.supportPhone ? (
        <>
          call or text <a href={`tel:${SITE.supportPhone.replace(/[^\d+]/g, '')}`}>{SITE.supportPhone}</a>,{' '}
        </>
      ) : null}
      reply to any text from us, or use <strong>Help</strong> in your customer account.
    </>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="space-y-2">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
