import { PasswordForm, PhotoConsentToggle, ProfileForm } from '@/components/customer/AccountForms'
import { currentCustomerId, getCustomerProfile } from '@/lib/customer/portal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account · Storm Sweep' }

export default async function CustomerAccountPage(): Promise<React.ReactElement> {
  const profile = await getCustomerProfile((await currentCustomerId())!)
  const card = 'rounded-2xl border border-black/10 bg-white p-5 shadow-sm'
  const h2 = 'mb-3 font-[family-name:var(--font-bebas)] text-2xl tracking-wide'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide">Account</h1>
        <p className="text-sm text-[#6B6B70]">Signed in as {profile?.email}</p>
      </div>
      <section className={card} aria-labelledby="details">
        <h2 id="details" className={h2}>Your details</h2>
        <ProfileForm initial={{ full_name: profile?.full_name ?? '', phone: profile?.phone ?? '', address: profile?.address ?? '' }} />
      </section>
      <section id="photo-consent" className={card} aria-labelledby="consent">
        <h2 id="consent" className={h2}>Photo sharing</h2>
        <PhotoConsentToggle initial={profile?.marketing_photo_consent ?? false} />
      </section>
      <section className={card} aria-labelledby="password">
        <h2 id="password" className={h2}>Password</h2>
        <PasswordForm />
      </section>
    </div>
  )
}
