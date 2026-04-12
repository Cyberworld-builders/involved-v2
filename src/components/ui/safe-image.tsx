'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'

/**
 * Image component that hides itself if the image fails to load.
 * Drop-in replacement for next/image — never shows a broken image icon.
 */
export default function SafeImage(props: ImageProps) {
  const [hidden, setHidden] = useState(false)

  if (hidden) return null

  return (
    <Image
      {...props}
      onError={() => setHidden(true)}
    />
  )
}
