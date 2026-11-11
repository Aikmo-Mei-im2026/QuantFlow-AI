'use client'

import type { LearningLesson } from '@/i18n/learning'
import { ArrowRight, BookOpen, Check, ChevronRight, Clock3, Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks'
import { learningCopy as copy, learningLessons } from '@/i18n/learning'
import LearningDiagram from './LearningDiagram'

function LessonDetail({ lesson }: { lesson: LearningLesson }) {
  const { currentLocale } = useLocale()
  const [answer, setAnswer] = useState<number | null>(null)
  const correct = answer === lesson.correctAnswer

  return (
    <article id="learning-lesson" aria-labelledby="lesson-title" className="min-w-0 scroll-mt-24 rounded-3xl border border-border/80 bg-card p-5 shadow-[0_12px_45px_-30px_rgba(42,79,143,0.25)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium tracking-wide text-primary">{lesson.eyebrow}</span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {lesson.duration}
        </span>
      </div>
      <h2 id="lesson-title" className="mt-4 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">{lesson.headline}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{lesson.intro}</p>

      <figure className="mt-7">
        <LearningDiagram topic={lesson.id} />
        <figcaption className="mt-3 px-1 text-xs leading-6 text-muted-foreground">{lesson.diagramCaption}</figcaption>
      </figure>

      <div className="mt-8 space-y-6">
        {lesson.sections.map((section, index) => (
          <section key={section.title}>
            <h3 className="flex items-start gap-3 text-base font-semibold">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/8 font-mono text-[11px] text-primary" aria-hidden="true">{index + 1}</span>
              {section.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground sm:pl-8">{section.body}</p>
          </section>
        ))}
      </div>

      <aside className="mt-7 rounded-2xl border border-primary/10 bg-primary/5 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Lightbulb className="size-4" aria-hidden="true" />
          {copy.keyPoint}
        </h3>
        <p className="mt-2 text-sm leading-7">{lesson.takeaway}</p>
      </aside>
      <details className="mt-4 rounded-2xl border px-5 py-4">
        <summary className="cursor-pointer text-sm font-medium">{copy.misconception}</summary>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{lesson.misconception}</p>
      </details>

      <section className="mt-8 border-t pt-7" aria-labelledby="learning-question">
        <p className="text-xs font-medium text-primary">{copy.question}</p>
        <h3 id="learning-question" className="mt-2 text-base font-semibold leading-7">{lesson.question}</h3>
        <div className="mt-4 space-y-2">
          {lesson.answers.map((option, index) => (
            <button
              key={option}
              type="button"
              aria-pressed={answer === index}
              onClick={() => setAnswer(index)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-6 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${answer === index ? 'border-primary bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/40'}`}
            >
              <span className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border ${answer === index ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`} aria-hidden="true">{answer === index && <Check className="size-3" />}</span>
              {option}
            </button>
          ))}
        </div>
        <div role="status" aria-live="polite">
          {answer !== null && (
            <div className="mt-4 rounded-xl bg-muted/60 p-4 text-sm leading-6">
              <p className="font-semibold">{correct ? copy.correct : copy.incorrect}</p>
              <p className="mt-1 text-muted-foreground">{lesson.explanation}</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{copy.quizNote}</p>
      </section>
      <div className="mt-7 border-t pt-6">
        <Button asChild className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left">
          <Link href={`/${currentLocale}/${lesson.nextPath}`}>
            {lesson.nextLabel}
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  )
}

export default function LearningRoom() {
  const [selected, setSelected] = useState(learningLessons[0].id)
  const lesson = learningLessons.find(item => item.id === selected) ?? learningLessons[0]

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
      <div className="mb-8 max-w-2xl">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-primary">
          <BookOpen className="size-4" aria-hidden="true" />
          {copy.label}
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{copy.subtitle}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label={copy.navigation} className="min-w-0 lg:sticky lg:top-24">
          <p className="mb-3 px-1 text-xs font-medium tracking-wide text-muted-foreground">{copy.courseCount}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {learningLessons.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === item.id}
                aria-controls="learning-lesson"
                onClick={() => {
                  setSelected(item.id)
                  document.getElementById('learning-lesson')?.scrollIntoView({ block: 'start', behavior: 'instant' })
                }}
                className={`group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${selected === item.id ? 'border-primary/25 bg-card shadow-sm' : 'border-transparent hover:bg-card/70'}`}
              >
                <span className={`mt-1 font-mono text-xs ${selected === item.id ? 'text-primary' : 'text-muted-foreground/60'}`}>{item.number}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${selected === item.id ? 'text-primary' : ''}`}>{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.summary}</span>
                </span>
                <ChevronRight className={`mt-0.5 size-4 shrink-0 ${selected === item.id ? 'text-primary' : 'text-muted-foreground/30'}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="mt-4 hidden px-1 text-xs leading-6 text-muted-foreground lg:block">{copy.courseNote}</p>
        </nav>
        <LessonDetail key={lesson.id} lesson={lesson} />
      </div>
      <p className="mt-7 text-center text-xs leading-6 text-muted-foreground">{copy.footer}</p>
    </div>
  )
}
