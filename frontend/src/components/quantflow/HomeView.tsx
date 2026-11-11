'use client'

import { ArrowDown, ArrowRight, ArrowUp, BookOpen, ChartCandlestick, Check, ChevronRight, Files, Layers3, Search } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/hooks'
import { homeCopy as copy } from '@/i18n/home'
import ThemeSettings from '@/widgets/theme-settings'
import styles from './HomeView.module.css'
import { useHomePager } from './useHomePager'

const chapters = [{ id: 'welcome', label: copy.overview }, ...copy.sections]
const chapterIds = chapters.map(chapter => chapter.id)

function ChapterDots({ active, onSelect }: { active: number, onSelect: (index: number) => void }) {
  return (
    <nav className={styles.dots} aria-label={copy.navLabel}>
      {chapters.map((chapter, index) => (
        <button type="button" key={chapter.id} onClick={() => onSelect(index)} aria-label={chapter.label} aria-current={index === active ? 'step' : undefined} className={`${styles.dot} ${index === active ? styles.activeDot : ''}`} />
      ))}
    </nav>
  )
}

function CandleArt() {
  const bars = [72, 66, 80, 56, 48, 58, 36, 42, 27, 20]
  return (
    <svg viewBox="0 0 330 155" className={styles.chartSvg} aria-hidden="true">
      <path d="M8 30H322 M8 65H322 M8 100H322 M8 140H322" stroke="#dbe6f2" strokeDasharray="4 5" />
      {bars.map((y, i) => (
        <g key={i}>
          <path d={`M${20 + i * 30} ${y - 10}v42`} stroke={i % 3 === 2 ? '#36a58f' : '#e87582'} strokeWidth="2" />
          <rect x={13 + i * 30} y={y} width="14" height={i % 3 === 2 ? 16 : 22} rx="2" fill={i % 3 === 2 ? '#36a58f' : '#e87582'} />
          <rect x={13 + i * 30} y={140 - (i % 4 + 1) * 5} width="14" height={(i % 4 + 1) * 5} rx="2" fill="#bdd1ed" />
        </g>
      ))}
      <path d="M20 94C70 83 92 91 126 74S180 63 210 58S268 40 298 35" stroke="#527ed2" strokeWidth="2" fill="none" />
    </svg>
  )
}

function HeroScene() {
  return (
    <div className={`${styles.scene} ${styles.heroScene}`} aria-hidden="true">
      <div className={styles.orb} />
      <div className={styles.heroCenter}>
        <Layers3 size={48} strokeWidth={1.2} />
        <strong>{copy.hero.center}</strong>
        <span>{copy.hero.decision}</span>
      </div>
      <div className={`${styles.floatCard} ${styles.floatOne}`}>
        <div className={styles.floatTitle}>
          <BookOpen size={15} />
          {copy.hero.etf}
        </div>
        <p className={styles.floatNote}>{copy.hero.etfNote}</p>
      </div>
      <div className={`${styles.floatCard} ${styles.floatTwo}`}>
        <div className={styles.floatTitle}>
          <ChartCandlestick size={15} />
          {copy.hero.price}
        </div>
        <svg viewBox="0 0 150 50" className={styles.tinyChart}>
          <path d="M3 40L23 29L43 34L65 19L85 25L108 8L130 15L147 3" fill="none" stroke="#5488d6" strokeWidth="2" />
          <path d="M3 48H147" stroke="#d4e3f4" />
        </svg>
        <p className={styles.floatNote}>{copy.hero.priceNote}</p>
      </div>
    </div>
  )
}

function ModuleScene({ id }: { id: string }) {
  const v = copy.visuals
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.glass}>
        {id === 'learn' && (
          <>
            <p className={styles.visualHeading}>
              <BookOpen />
              {v.lesson}
            </p>
            <div className={styles.lessonCards}>
              <div className={styles.lessonCard}>
                <ChartCandlestick size={42} strokeWidth={1.3} />
                <strong>K 线</strong>
                <span>{v.candle}</span>
              </div>
              <div className={styles.lessonCard}>
                <Layers3 size={42} strokeWidth={1.3} />
                <strong>{v.etf}</strong>
                <span>{v.basket}</span>
              </div>
            </div>
            <div className={styles.flow}>
              <span>{v.read}</span>
              <ArrowRight size={12} />
              <span>{v.observe}</span>
              <ArrowRight size={12} />
              <span>{v.question}</span>
            </div>
          </>
        )}
        {id === 'lab' && (
          <>
            <p className={styles.visualHeading}>
              <Search />
              {v.sample}
            </p>
            <div className={styles.searchMock}>
              <Search size={15} />
              {v.search}
            </div>
            {v.factors.map((name, index) => (
              <div key={name} className={styles.factor}>
                <span>{name}</span>
                <div className={styles.factorTrack}><span className={styles.factorBar} style={{ width: `${[78, 63, 55, 88][index]}%` }} /></div>
              </div>
            ))}
            <p className={styles.visualCaption}>{v.evidence}</p>
          </>
        )}
        {id === 'practice' && (
          <>
            <p className={styles.visualHeading}>
              <ChartCandlestick />
              {v.chart}
            </p>
            <CandleArt />
            <div className={styles.account}>
              <span>{v.account}</span>
              <strong>{v.amount}</strong>
            </div>
            <p className={styles.visualCaption}>{v.chartNote}</p>
          </>
        )}
        {id === 'review' && (
          <>
            <p className={styles.visualHeading}>
              <Files />
              {v.record}
            </p>
            {v.recordRows.map((label, index) => (
              <div className={styles.recordRow} key={label}>
                <span>
                  0
                  {index + 1}
                </span>
                <span>{label}</span>
                <Check />
              </div>
            ))}
            <p className={styles.visualCaption}>{v.recordNote}</p>
          </>
        )}
        {id === 'help' && (
          <>
            <div className={styles.helpCircle}>?</div>
            {v.helpRows.map((label, index) => (
              <div className={styles.recordRow} key={label}>
                <span>
                  0
                  {index + 1}
                </span>
                <span>{label}</span>
                <ChevronRight />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default function HomeView() {
  const { currentLocale } = useLocale()
  const { viewportRef, active, goTo } = useHomePager(chapterIds)
  return (
    <div className={styles.page} data-home-fullscreen>
      <div className={styles.ambient} aria-hidden="true" />
      <div ref={viewportRef} className={styles.viewport} role="region" aria-label={copy.navLabel} tabIndex={0}>
        <section
          id="welcome"
          className={styles.panel}
          aria-labelledby="home-title"
          onFocusCapture={() => {
            if (active !== 0) {
              goTo(0, true)
            }
          }}
        >
          <div className={styles.grid}>
            <div>
              <p className={styles.eyebrow}>{copy.brand}</p>
              <h1 id="home-title" className={`${styles.title} ${styles.heroTitle}`}>{copy.title}</h1>
              <p className={styles.description}>{copy.intro}</p>
              <div className={styles.actions}>
                <Link className={styles.primary} href={`/${currentLocale}/workspace`}>
                  {copy.start}
                  <ArrowRight size={16} />
                </Link>
                <button type="button" className={styles.textLink} onClick={() => goTo(1)}>
                  {copy.explore}
                  <ArrowDown size={14} />
                </button>
              </div>
              <p className={styles.note}>{copy.status}</p>
            </div>
            <HeroScene />
          </div>
        </section>
        {copy.sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={styles.panel}
            aria-labelledby={`${section.id}-title`}
            onFocusCapture={() => {
              if (active !== index + 1) {
                goTo(index + 1, true)
              }
            }}
          >
            <div className={styles.grid}>
              <div>
                <p className={styles.eyebrow}>
                  <span className={styles.number}>{section.number}</span>
                  {section.label}
                </p>
                <h2 id={`${section.id}-title`} className={styles.title}>{section.title}</h2>
                <p className={styles.description}>{section.description}</p>
                <div className={styles.tags}>{section.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}</div>
                <div className={styles.actions}>
                  <Link className={styles.primary} href={`/${currentLocale}/${section.path}`}>
                    {section.action}
                    <ArrowRight size={16} />
                  </Link>
                </div>
                <p className={styles.note}>{section.note}</p>
              </div>
              <ModuleScene id={section.id} />
            </div>
          </section>
        ))}
      </div>
      <div className={styles.bottom}>
        <div className={styles.progress} aria-live="polite">
          <span className={styles.pageNumber}>{String(active + 1).padStart(2, '0')}</span>
          <span>/ 06</span>
          <span className={styles.scrollHint}>{copy.scroll}</span>
        </div>
        <div className={styles.pager}>
          <ChapterDots active={active} onSelect={goTo} />
          <button type="button" className={styles.pageButton} aria-label={copy.pageUp} disabled={active === 0} onClick={() => goTo(active - 1)}><ArrowUp size={16} /></button>
          <button type="button" className={styles.pageButton} aria-label={active === chapters.length - 1 ? copy.previous : copy.pageDown} onClick={() => goTo(active === chapters.length - 1 ? 0 : active + 1)}>{active === chapters.length - 1 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}</button>
        </div>
        {active === chapters.length - 1 && <div className={styles.settings}><ThemeSettings /></div>}
      </div>
    </div>
  )
}
