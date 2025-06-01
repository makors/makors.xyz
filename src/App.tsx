import './App.css'
import '@fontsource-variable/figtree';
import confetti from 'canvas-confetti';
import { motion } from "motion/react"
function App() {
  return (
    <motion.div 
      className="bg-neutral-900 text-white h-screen w-screen flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div 
        className="w-full max-w-screen-md p-4 md:p-0 flex flex-col justify-center"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <motion.div 
          className="text-left"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h1 
            className="text-3xl font-bold cursor-pointer select-none" 
            onClick={() => confetti({
              particleCount: 100, // i set this to a thousand and clicked it way too many times ...
              spread: 70,
              origin: { y: 0.6 }
            })}
          >
            hello, world!
          </h1>
          <motion.p 
            className="text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
              i'm makors, a student, an experimenter, and a developer.
          </motion.p>
        </motion.div>
        <motion.hr 
          className="my-2 border-neutral-700"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        />
        {/* actual content */}
        <motion.div 
          className="flex flex-col text-left gap-2 text-lg"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            i don't have <i>too much</i> to say here, but i like to build, ship, and constantly iterate.
            i'm currently working on a few projects and am a sysadmin at the <a 
              href="https://github.com/tjCSL" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:text-blue-400"
            >tjCSL</a>.
            personally, i think that properietary software is the root of all evil (but a neccessary evil). i publish my other tangents on my blog,
            <a 
              href="https://readme.sh" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:text-blue-400"
            > readme.sh</a>.
          </motion.p>
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            i'm proficient in: <u>rust</u>, <u>python</u>, <u>typescript</u>, and <u>go</u>. i'm also familiar with <u>react</u>, <u>css</u>, and <u>ux design</u>.
          </motion.p>
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.6 }}
          >
            below are my current projects (or experiments):
            <motion.ul 
              className="list-disc list-inside"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <motion.li
                initial={{ x: -15, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 2.0 }}
              >
                <a 
                  href="https://github.com/makors/dexrs" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-500 hover:text-blue-400"
                >dexrs </a>
                - a rust library for interacting with the dexcom api
              </motion.li>
              <motion.li
                initial={{ x: -15, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 2.2 }}
              >
                <a 
                  href="https://github.com/makors/ticketize" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-500 hover:text-blue-400"
                >ticketize </a>
                - an open source event ticketing system for schools (in progress)
              </motion.li>
              {/* <motion.li
                initial={{ x: -15, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 2.4 }}
              >
                <a 
                  href="https://github.com/ShmooConTix/ticket-bot" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-500 hover:text-blue-400"
                >shmoocon ticket bot </a> (completed) 
                - a proof-of-concept bot to buy tickets for <a 
                  href="https://shmoocon.org" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-500 hover:text-blue-400"
                >shmoocon</a>
              </motion.li> */}
            </motion.ul>
          </motion.p>
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 2.6 }}
          >
            want to contact me? send me an email at <motion.a 
              href="mailto:makors@muko.io" 
              className="text-blue-500 hover:text-blue-400"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >makors@muko.io</motion.a> or check out <motion.a 
              href="https://github.com/makors" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:text-blue-400"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >my github</motion.a>.
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default App
