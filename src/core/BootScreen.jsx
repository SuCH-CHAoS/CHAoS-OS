import { useEffect, useRef, useState } from 'react'
import './BiosBoot.css'

function BootScreen({ onFinish }) {
  const [lines, setLines] = useState([])
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    const print = (line) => setLines(prev => [...prev, line])

    // Print left + far right, similar to an 80-column BIOS layout
    const printLR = (left, right, col = 120) => {
      const space = Math.max(col - left.length, 1)
      print(
        <>
          {left}
          {' '.repeat(space)}
          <span className="bios-oem">{right}</span>
        </>
      )
    }

    const run = async () => {
      // HEADER
      print('CHAoS Modular BIOS v4.51PG, An Energy Star Ally')
      print('Copyright (C) 2026-06, CHAoS Systems, Inc.')
      print('----------------------------------------------------------------')

      await wait(300)

      // OEM ASCII BOX (STATIC FEEL)
      printLR('(55XWUQ0E) Intel i430VX PCIset(TM)', '+--------------------+')
      printLR('PENTIUM-S CPU at 75MHz', '|    SuCH  CHAoS     |')
      printLR('', '|    GLOBAL OS ROM   |')
      printLR('', '|    BUILD:  0.1     |')
      printLR('', '|    MODE:   INIT    |')
      printLR('', '+--------------------+')

      await wait(300)

      // MEMORY TEST
      print('Memory Test : 0K')
      for (let m = 0; m <= 32768; m += 1024) {
        await wait(65)
        setLines(prev => {
          const p = [...prev]
          p[p.length - 1] = `Memory Test : ${m}K`
          return p
        })
      }
      setLines(prev => {
        const p = [...prev]
        p[p.length - 1] = 'Memory Test : 32768K OK'
        return p
      })

      await wait(300)

      // CMOS / CHECKSUM
      print('CMOS Checksum .............. OK')
      await wait(200)
      print('Initializing DMA Controller')
      await wait(200)
      print('Initializing PIC Controller')
      await wait(200)
      print('IRQ Routing Table Loaded')

      await wait(300)

      // PCI / BUS SCAN
      print('')
      print('Detecting PCI Devices...')
      await wait(300)
      print('PCI Device 00: VGA Compatible Controller')
      await wait(200)
      print('PCI Device 01: IDE Controller')
      await wait(200)
      print('PCI Device 02: USB Controller')

      await wait(300)

      // IDE
      print('')
      print('Detecting IDE Primary Master   ... PCemHD')
      await wait(600)
      print('Detecting IDE Primary Slave    ... PCemCD')
      await wait(600)
      print('Detecting IDE Secondary Master ... None')
      await wait(600)
      print('Detecting IDE Secondary Slave  ... None')

      await wait(300)

      // FINAL FOOTER (LAST LINE)
      print('')
      print('Press DEL to enter SETUP  |  F8 Boot Menu')

      await wait(1200)
      onFinish()
    }

    run()
  }, [onFinish])

  return (
    <div className="bios">
      <div className="bios-text">
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  )
}

export default BootScreen
