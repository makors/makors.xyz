import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import App from './App.tsx'
import Photos from './pages/Photos.tsx'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

export default function Router() {
  const location = useLocation()

  // Pages animate themselves in (each sign panel has its own entrance), so the
  // wrapper only handles the quick fade out of the page being left.
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.08, ease: EASE_OUT } }}
      >
        <Routes location={location}>
          <Route path="/" element={<App />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="*" element={<App />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
