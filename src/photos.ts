// Photo manifest. To post a photo: upload it at https://cdn.makors.xyz, press
// "Entry" to copy the ready-made line, paste it below, then fill in alt and caption.
// width/height are the intrinsic pixel sizes; they reserve space so the grid never shifts.

export type Photo = {
  src: string
  alt: string
  width: number
  height: number
  caption?: string
  date?: string
}

export const photos: Photo[] = []
