import type { MapZone } from '../types'

export const cubaZones: MapZone[] = [
  {
    id: 'occidente',
    name: 'Occidente',
    description: 'Pinar del Rio, Artemisa y zonas cercanas.',
    labelPoint: { x: 213, y: 300 },
    path: 'M90 276 C137 227 194 210 261 221 L333 236 C355 241 365 266 351 283 L303 343 C282 370 241 380 202 371 L121 352 C78 341 61 307 90 276 Z',
  },
  {
    id: 'habana',
    name: 'La Habana',
    description: 'Alta demanda para venta, alquiler y permutas urbanas.',
    labelPoint: { x: 398, y: 254 },
    path: 'M302 215 C347 193 407 191 463 204 L500 213 C520 218 526 243 510 257 L455 305 C430 327 389 332 353 315 L314 297 C281 282 274 230 302 215 Z',
  },
  {
    id: 'centro',
    name: 'Centro',
    description: 'Mercado mixto para casas familiares, terrenos y alquiler.',
    labelPoint: { x: 570, y: 313 },
    path: 'M493 213 C571 209 634 224 692 258 C718 273 718 309 694 326 L628 374 C583 407 520 402 480 362 L435 317 C419 301 421 276 440 264 L493 213 Z',
  },
  {
    id: 'camaguey',
    name: 'Camaguey',
    description: 'Zona amplia para inventario residencial y rural.',
    labelPoint: { x: 737, y: 353 },
    path: 'M669 265 C731 259 799 274 847 303 C871 318 874 351 854 369 L797 421 C754 459 686 454 643 411 L610 378 C595 362 597 337 615 325 L669 265 Z',
  },
  {
    id: 'oriente',
    name: 'Oriente',
    description: 'Santiago, Holguin y areas de expansion.',
    labelPoint: { x: 905, y: 392 },
    path: 'M837 306 C904 300 968 319 1016 354 C1047 376 1038 422 1000 437 L891 480 C851 496 807 479 789 441 L774 410 C763 387 771 360 792 346 L837 306 Z',
  },
]
