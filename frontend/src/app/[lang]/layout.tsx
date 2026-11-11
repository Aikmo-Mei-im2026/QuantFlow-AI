import type { ReactNode } from 'react'
import type { I18nLangAsyncProps } from '@/i18n'
import { notFound } from 'next/navigation'
import { Footer, LastUpdated, Layout, Navbar } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import { CustomFooter } from '@/components/CustomFooter'
import { Toaster } from '@/components/ui/sonner'
import { useServerLocale } from '@/hooks'
import NavbarExtras from '@/widgets/navbar-extras'

import { getDictionary } from '../_dictionaries/get-dictionary'

const CustomNavbar = async ({ lang }: I18nLangAsyncProps) => {
  const { t } = await useServerLocale(lang)
  return (
    <Navbar
      logo={(
        <span className="font-semibold">{ t('systemTitle') }</span>
      )}
      logoLink={`/${lang}`}
    >
      <NavbarExtras />
    </Navbar>
  )
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (lang !== 'zh') {
    notFound()
  }

  await getDictionary(lang)
  const pageMap = await getPageMap(lang)

  const { t } = await useServerLocale(lang)

  return (
    <>
      <Layout
        darkMode={false}
        copyPageButton={false}
        navbar={(
          <CustomNavbar lang={lang} />
        )}
        lastUpdated={(
          <LastUpdated locale={lang === 'zh' ? 'zh-CN' : 'en-US'}>
            { t('lastUpdated') }
          </LastUpdated>
        )}
        editLink={null}
        footer={(
          <Footer className="bg-background py-5!">
            <CustomFooter lang={lang} />
          </Footer>
        )}
        search={null}
        toc={{
          backToTop: t('backToTop'),
          title: t('pageTitle'),
        }}
        pageMap={pageMap}
        feedback={{ content: '' }}
        nextThemes={{
          attribute: 'class',
          defaultTheme: 'light',
          storageKey: 'quantflow-theme',
          disableTransitionOnChange: true,
        }}
        themeSwitch={{
          light: t('themeSwitcher.light'),
          dark: t('themeSwitcher.dark'),
          system: t('themeSwitcher.system'),
        }}
      >
        {children}
      </Layout>
      <Toaster position="top-center" />
    </>
  )
}
