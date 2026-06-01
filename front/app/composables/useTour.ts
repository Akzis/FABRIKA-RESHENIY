import type { DriveStep } from 'driver.js'

/**
 * Гайд-тур по платформе на базе driver.js.
 *
 * Запускается по клику на кнопку «Обучение» в навигации. driver.js работает
 * только с DOM, поэтому импортируется лениво и лишь на клиенте. Состав шагов
 * зависит от того, какие секции реально отрисованы (у PM и участника без
 * команды набор разделов отличается), поэтому шаги с несуществующими
 * элементами отбрасываются перед стартом.
 */
export function useTour() {
  const startTour = async () => {
    if (!import.meta.client) return

    const { driver } = await import('driver.js')

    const candidateSteps: DriveStep[] = [
      {
        popover: {
          title: 'Добро пожаловать!',
          description: 'За минуту покажу, как устроена Фабрика решений и где что находится.',
        },
      },
      {
        element: '[data-tour="nav"]',
        popover: {
          title: 'Навигация',
          description: 'Быстрый переход к разделам платформы. Кликни по пункту — страница плавно прокрутится к нужному блоку.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#how',
        popover: {
          title: 'Как это работает',
          description: '4 шага от задачи до награды: выбираешь челлендж, берёшь в работу, сдаёшь результат и забираешь баллы.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tasks',
        popover: {
          title: 'Задания',
          description: 'Ежедневные челленджи под уровень команды. Бери в работу и отправляй решение на проверку.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#achievements',
        popover: {
          title: 'Достижения',
          description: 'Ачивки и бейджи, которые ты открываешь по ходу игры.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#leaderboard',
        popover: {
          title: 'Рейтинг',
          description: 'Сравнивай прогресс команд и борись за верхние строчки.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#roles',
        popover: {
          title: 'Команды',
          description: 'Роли в команде и то, как вы распределяете задачи между собой.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '.profile-trigger',
        popover: {
          title: 'Профиль',
          description: 'Твои баллы, уровень и магазин наград. Здесь же — кастомизация профиля.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        popover: {
          title: 'Готово',
          description: 'Это всё! Запустить обучение снова можно по пункту «Как это работает» в шапке.',
        },
      },
    ]

    // Оставляем приветственный/финальный шаги (без element) и те шаги,
    // элемент которых реально присутствует на странице.
    const steps = candidateSteps.filter(
      s => !s.element || document.querySelector(s.element as string),
    )

    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 14,
      overlayColor: 'rgba(8, 8, 12, 0.78)',
      popoverClass: 'fr-tour',
      nextBtnText: 'Далее',
      prevBtnText: 'Назад',
      doneBtnText: 'Готово',
      progressText: '{{current}} из {{total}}',
      steps,
    })

    driverObj.drive()
  }

  return { startTour }
}
