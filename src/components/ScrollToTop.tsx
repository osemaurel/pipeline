import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Remet le scroll en haut à chaque changement de route.
 *
 * En SPA, le navigateur conserve la position de défilement entre les
 * navigations : si on cliquait sur un lien en bas de page, la nouvelle page
 * s'affichait au même offset, obligeant à défiler pour voir le haut.
 *
 * Monté une fois dans <App /> sous le <Router>.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // `instant` : pas d'animation (comportement attendu d'une navigation),
    // `scrollTo(0, 0)` : couvre les navigateurs qui ignorent l'option behavior.
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    } catch {
      window.scrollTo(0, 0)
    }
    // Remet aussi le focus racine en haut pour l'accessibilité (lecteurs d'écran).
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  return null
}
